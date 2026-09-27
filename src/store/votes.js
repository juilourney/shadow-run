// 투표 — 지목(votes)·히스토리(voteHistory) 동기화, 투표권 계산, 지목·집계 요청.

import { playerAuthHeaders } from '../auth.js';
import { collection, onSnapshot, addDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { db } from '../firebase-config.js';
import { state, notify, myPlayer } from './core.js';

// 투표 지목(진행 중인 회차) — 클라이언트 직접 쓰기
onSnapshot(collection(db, 'votes'), snap => {
  state.vote.ballots = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  notify();
}, err => console.warn('투표 실시간 동기화 실패:', err.message));

// 투표 히스토리 — 클라이언트 직접 쓰기
onSnapshot(collection(db, 'voteHistory'), snap => {
  state.voteHistory = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  notify();
}, err => console.warn('투표 히스토리 실시간 동기화 실패:', err.message));

export function getVote() {
  const meP = myPlayer();
  const total = (meP.role === 'double' && !meP.abilityStripped) ? 2 : 1;
  const myBallots = state.vote.ballots.filter(b => b.voterId === meP.id);
  const myVotesUsed = myBallots.length;
  // 투표는 익명 지목이라 남이 누구를 지목했는지는 본인도 알면 안 됨 —
  // castCount는 내가 직접 지목한 대상만 집계한다(집계·공개 판정은 tallyVote가 전체 ballots로 별도 처리).
  const castCount = {};
  for (const b of myBallots) castCount[b.targetId] = (castCount[b.targetId] || 0) + 1;
  return {
    total,
    used: myVotesUsed,
    left: total - myVotesUsed,
    castCount,
  };
}

export function getVoteHistory() {
  return [...state.voteHistory].sort((a, b) => b.at - a.at);
}

// 투표 지목 — '이 사람은 상대팀'이라는 추측 (+ 역할 지목: role|null=기권)
export async function castVote(targetId, roleGuess = null) {
  const v = getVote();
  if (v.left <= 0) throw new Error('투표권을 모두 사용했습니다');
  const myTeam = myPlayer().team;
  await addDoc(collection(db, 'votes'), { voterId: myPlayer().id, voterTeam: myTeam, targetId, roleGuess: roleGuess || null });
  return getVote();
}

// 투표 종료 집계 요청 — 판정 규칙(최소 득표 비율·동점 처리·역할 공개 기준)은 모두
// 서버 game-rules.js가 갖고 있다. 투표 탭이 "미집계 표가 남아있으면 집계"를 매 틱
// 시도하므로(마감 순간을 아무도 목격 못 해도 따라잡기 위함), 같은 기기에서 중복
// 호출되지 않도록 진행 중 재진입만 여기서 막는다(기기 간 중복은 서버가 막는다).
let _tallyInFlight = null;
export async function tallyVote() {
  if (_tallyInFlight) return _tallyInFlight;
  _tallyInFlight = _tallyVote().finally(() => { _tallyInFlight = null; });
  return _tallyInFlight;
}

async function _tallyVote() {
  // 집계는 서버(/api/tally-vote)가 한다.
  //  1) 집계에 대상의 team·role이 필요한데 클라이언트는 더 이상 그걸 모른다(비밀 분리).
  //  2) 예전 클라이언트 집계는 여러 기기가 동시에 돌면서 히스토리를 48개까지 중복 기록했다.
  //     서버는 표 삭제까지 한 번의 원자 커밋으로 처리해 정확히 한 번만 반영된다.
  if (state.vote.ballots.length === 0) return null;

  const res = await fetch('/api/tally-vote', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...playerAuthHeaders() },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.warn('투표 집계 실패:', data.error);
    return null;
  }
  // 다른 기기가 이미 집계함 — 결과는 voteHistory 구독으로 자연히 들어온다
  if (!data.tallied) return null;
  return data.result;
}
