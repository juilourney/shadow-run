// 번개 — 동기화, 시간 판정(예상 완주·인증 마감)·자동 전환 스윕, 참여·완료 액션.

import { state as identity } from '../state.js';
import { playerAuthHeaders } from '../auth.js';
import { doc, collection, onSnapshot, addDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { db } from '../firebase-config.js';
import { CONFIG, state, notify, nameEq, myPlayer, playerById, pushTimelineEvent } from './core.js';
import { getCalendar } from './game.js';

// 번개 — 클라이언트 직접 쓰기
onSnapshot(collection(db, 'bolts'), snap => {
  state.bolts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  // 내가 참여 중인 번개의 단일팀 여부는 서버에만 있다 — 참가자가 바뀔 때마다 다시 묻는다
  // (3명이 모여 단일팀이 성립하는 순간 안내·글로우가 켜져야 하므로)
  refreshMyBoltTeamInfo();
  notify();
}, err => console.warn('번개 실시간 동기화 실패:', err.message));

// ── 화면간 데이터 전달 (bolt-detail → bolt-buff → bolt-result) ──
let _pendingBolt = null;
let _lastBoltResult = null;

export function setPendingBolt(data)    { _pendingBolt = data; }
export function getPendingBolt()        { return _pendingBolt; }
export function setLastBoltResult(data) { _lastBoltResult = data; }
export function getLastBoltResult()     { return _lastBoltResult; }

// bolts 상태 중 "아직 진행 중"(완료·만료 전) — 시작 전(open)이든 실행 중(running)이든 포함
const ACTIVE_BOLT_STATUSES = ['open', 'running'];

function boltRuntimeMs(bolt) {
  const m = /^(\d+):(\d+)/.exec(bolt.pace || '');
  const paceSec = m ? Number(m[1]) * 60 + Number(m[2]) : CONFIG.fallbackPaceSec;
  return bolt.distance * paceSec * 1000;
}

// 예상 완주 시각 = 시작 + 예상 완주시간(거리×페이스). 진행중 화면이 이 시각을
// 지나면 자동으로 인증(사진 업로드) 화면으로 넘어간다.
export function boltEstimatedFinish(bolt) {
  if (!bolt.startAt) return Infinity;
  return bolt.startAt + boltRuntimeMs(bolt);
}

// 인증 마감 시각 = 예상 완주 시각 + 버퍼(시간 초과 시 자동 만료).
export function boltDeadline(bolt) {
  if (!bolt.startAt) return Infinity;
  return boltEstimatedFinish(bolt) + CONFIG.certBufferMin * 60 * 1000;
}

// 마감 지난 진행 중(open/running) 번개를 만료 처리 — 인증을 안 했으므로 적립 없음(게이지·마일리지 0).
// 만료 판정·상태 전환은 서버(/api/expire-bolt)가 updateTime 선점으로 정확히 1회 처리한다.
// 로컬은 즉시 expired로 표시해 이 기기의 반복 호출만 막는다.
// 예정 시각(startAt)이 지난 '모집 중' 번개를 자동으로 '진행 중'으로 전환한다.
// startAt은 그대로 둬(예정 시각 유지) 인증 마감·유효 시간대가 예정 기준으로 계산되게 한다.
// 앱을 연 아무 기기나 감지해 반영(만료 스윕과 동일 패턴). 마감 지난 건은 만료 스윕이 처리.
const _autoStartRequested = new Set();
function sweepAutoStartBolts() {
  const now = Date.now();
  for (const b of state.bolts) {
    if (b.status === 'open' && b.startAt && now >= b.startAt && now <= boltDeadline(b)) {
      b.status = 'running';   // 로컬 즉시 반영
      if (_autoStartRequested.has(b.id)) continue;
      _autoStartRequested.add(b.id);
      updateDoc(doc(db, 'bolts', b.id), { status: 'running' })   // startAt은 건드리지 않음
        .catch(err => console.warn('자동 시작 실패:', err.message));
    }
  }
}

const _expireRequested = new Set();
function sweepExpiredBolts() {
  const now = Date.now();
  for (const b of state.bolts) {
    if (ACTIVE_BOLT_STATUSES.includes(b.status) && now > boltDeadline(b)) {
      b.status = 'expired';   // 로컬 즉시 반영(이 기기의 중복 스윕 방지)
      if (_expireRequested.has(b.id)) continue;
      _expireRequested.add(b.id);
      fetch('/api/expire-bolt', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ boltId: b.id }),
      }).catch(err => console.warn('만료 처리 요청 실패:', err.message));
    }
  }
}

// 게임이 끝나면 완료되지 못한 '모집 중(open·예정)' 번개는 이제 진행될 수 없으므로 정리(삭제)한다.
// 진행 중(running)은 삭제하지 않는다 — 그 참가자는 결과 화면으로 보내는 것으로 처리(라우팅).
const _endDeleteRequested = new Set();
function sweepEndedBolts() {
  if (!getCalendar().ended) return;
  for (const b of state.bolts) {
    if (b.status === 'open' && !_endDeleteRequested.has(b.id)) {
      _endDeleteRequested.add(b.id);
      deleteDoc(doc(db, 'bolts', b.id)).catch(err => console.warn('종료 정리 삭제 실패:', err.message));
    }
  }
}


export function getBolts() {
  sweepAutoStartBolts();
  sweepExpiredBolts();
  sweepEndedBolts();
  const myId = myPlayer().id;
  return state.bolts.map(b => ({
    ...b,
    count: b.participants.length,
    joined: ACTIVE_BOLT_STATUSES.includes(b.status) && b.participants.includes(myId),
    hostName: playerById(b.hostId)?.name ?? '?',
    isHost: b.hostId === myId,
    isSingleTeam: isSingleTeamBolt(b),
    deadline: boltDeadline(b),
  }));
}

// 현재 참여 중인 번개 id — bolts에서 파생(별도 저장하지 않음)
export function getJoinedBoltId() {
  const myId = myPlayer().id;
  return state.bolts.find(b => ACTIVE_BOLT_STATUSES.includes(b.status) && b.participants.includes(myId))?.id ?? null;
}

// 방장 — 번개 시작. 일찍 누르면 그 시각이 실제 시작이 되고, 예정 시각을 넘겨 누르면
// 예정 시각을 유지한다(늦게 눌러 startAt이 뒤로 밀려 기록이 '너무 이르다'고 잘못 걸리는 것 방지).
export async function startBolt(boltId) {
  const bolt = state.bolts.find(b => b.id === boltId);
  if (!bolt) throw new Error('번개를 찾을 수 없습니다');
  if (bolt.hostId !== myPlayer().id) throw new Error('방장만 번개를 시작할 수 있습니다');
  if (bolt.status !== 'open') throw new Error('이미 시작됐거나 종료된 번개입니다');
  const startAt = bolt.startAt ? Math.min(Date.now(), bolt.startAt) : Date.now();
  await updateDoc(doc(db, 'bolts', boltId), { status: 'running', startAt });
}

// ── 단일팀 판정 ────────────────────────────────────────
// 단일팀 여부는 참가자 전원의 팀을 알아야 판정되는데, 클라이언트는 이제 남의 팀을 모른다.
// 서버(/api/bolt-team)에 물어 캐시한다 — 그 번개의 참가자에게만 답이 온다.
const _boltTeamInfo = {};   // { [boltId]: { isSingleTeam, team } }
let _boltTeamSig = null;    // 마지막으로 조회한 (번개, 참가자 구성) — 바뀔 때만 다시 묻는다

// 내가 참여 중인 번개의 단일팀 여부를 최신으로 유지 (bolts 스냅샷마다 호출)
function refreshMyBoltTeamInfo() {
  const myId = state.players.find(p => nameEq(p.name, identity.name))?.id;
  if (!myId) return;
  const bolt = state.bolts.find(b => ACTIVE_BOLT_STATUSES.includes(b.status) && (b.participants || []).includes(myId));
  if (!bolt) { _boltTeamSig = null; return; }
  const sig = `${bolt.id}|${(bolt.participants || []).join(',')}`;
  if (sig === _boltTeamSig) return;
  _boltTeamSig = sig;
  delete _boltTeamInfo[bolt.id];
  ensureBoltTeamInfo(bolt.id);
}

export async function ensureBoltTeamInfo(boltId) {
  if (!boltId || _boltTeamInfo[boltId]) return _boltTeamInfo[boltId];
  try {
    const res = await fetch('/api/bolt-team', {
      method: 'POST', headers: { 'content-type': 'application/json', ...playerAuthHeaders() },
      body: JSON.stringify({ boltId }),
    });
    if (!res.ok) return null;
    _boltTeamInfo[boltId] = await res.json();
    notify();
    return _boltTeamInfo[boltId];
  } catch { return null; }
}

export function getBoltTeamInfo(boltId) {
  return _boltTeamInfo[boltId] || null;
}

function isSingleTeamBolt(bolt) {
  if (bolt.participants.length < CONFIG.singleTeamMin) return false;
  return !!_boltTeamInfo[bolt.id]?.isSingleTeam;
}

// ═══════════════════════════════════════════════════════════
//  ACTIONS
// ═══════════════════════════════════════════════════════════

// 번개 만들기 — startAt: 시작 시각 타임스탬프(인증 마감 판정용)
export async function createBolt({ title, place, distance, pace, time, startAt }) {
  if (getJoinedBoltId()) throw new Error('이미 참여 중인 번개가 있습니다');
  const myId = myPlayer().id;
  // players 컬렉션 동기화가 아직 안 끝난 시점(예: 앱 진입 직후)에 번개를 만들면
  // 방장 본인 id가 null로 들어가버려, 이후 체크인/완료 목록에 본인이 안 보이는
  // 문제가 생긴다 — 그 전에 명확히 막는다.
  if (!myId) throw new Error('내 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요');
  const docRef = await addDoc(collection(db, 'bolts'), {
    title, place,
    distance: Number(distance) || 0,
    pace: pace || '미공개',
    time: time || '',
    startAt: startAt || null,
    hostId: myId,
    participants: [myId],
    max: CONFIG.boltMaxHeads,
    locked: false,
    status: 'open',
  });
  return { id: docRef.id };
}

// 번개 참여
export async function joinBolt(boltId) {
  const joined = getJoinedBoltId();
  if (joined && joined !== boltId) throw new Error('이미 다른 번개에 참여 중입니다');
  const bolt = state.bolts.find(b => b.id === boltId);
  if (!bolt) throw new Error('번개를 찾을 수 없습니다');
  // 모집(open) 상태에서만 참가 가능 — 시작된 뒤엔 방장 인증 목록이 고정돼 늦게 참가하면
  // 명단엔 남아도 완료에서 누락된다(설계상 진행중 참가 불가).
  if (bolt.status !== 'open') throw new Error('이미 시작된 번개예요');
  if (bolt.locked) throw new Error('잠긴 번개입니다');
  if (bolt.participants.length >= bolt.max) throw new Error('정원이 찼습니다');

  const myId = myPlayer().id;
  if (!myId) throw new Error('내 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요');
  await updateDoc(doc(db, 'bolts', boltId), { participants: arrayUnion(myId) });
  return bolt;
}

// 번개 참여 취소
export async function leaveBolt() {
  const id = getJoinedBoltId();
  if (!id) return;
  await updateDoc(doc(db, 'bolts', id), { participants: arrayRemove(myPlayer().id) });
}

// 방장 — 시작 전 번개 자체를 취소(삭제). 참여자들에게도 실시간으로 목록에서 사라진다.
export async function cancelBolt(boltId) {
  const bolt = state.bolts.find(b => b.id === boltId);
  if (!bolt) throw new Error('번개를 찾을 수 없습니다');
  if (bolt.hostId !== myPlayer().id) throw new Error('방장만 번개를 취소할 수 있습니다');
  if (bolt.status !== 'open') throw new Error('이미 시작된 번개는 취소할 수 없습니다');
  await deleteDoc(doc(db, 'bolts', boltId));
}

// 번개 방 잠금 토글 (방장)
export async function toggleBoltLock(boltId, locked) {
  await updateDoc(doc(db, 'bolts', boltId), { locked });
}

// 번개 완료 → 마일리지·게이지 반영 (게임의 핵심 규칙)
// card: 방장이 뽑은 버프/스킬 카드 — 결과를 번개 문서에 저장해 참가자 전원이
// 같은 결과 화면을 볼 수 있게 한다(방장 기기에만 있으면 나머지는 결과를 못 봄).
// cert: { certPhoto, certAt } — 인증 사진과 사진 속 기록 시각. 관리자 인증 관리에서
// 심사하고, 불인정 시 저장된 gaugeDelta로 기여분을 정확히 원복한다.
// 게이지·마일리지 계산과 쓰기는 전부 서버(/api/complete-bolt)가 한다 — 클라가 게이지 증감을
// 보내던 방식은 승부 조작 통로였다. 버프 배수도 서버가 draw한다(항상 ×3 우회 차단).
// 서버가 { result, card }를 돌려주고, 그 카드로 버프 리빌·결과 화면을 그린다.
export async function completeBolt(boltId, distanceKm, participantIds, _ignoredBuff, _ignoredCard, cert = {}) {
  const bolt = state.bolts.find(b => b.id === boltId);
  const res = await fetch('/api/complete-bolt', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      boltId, distanceKm, participantIds,
      certPhoto: cert.certPhoto ?? null,
      certAt: cert.certAt ?? null,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '번개 완료 처리에 실패했습니다');

  // 전체 공개 소식 — km·버프 수치는 싣지 않는다(게이지 숫자 비공개 설계). boltId는 불인정 시 삭제용.
  pushTimelineEvent({ kind: 'bolt', title: bolt?.title ?? data.result.boltTitle, count: data.result.participantCount, boltId });
  // 단일팀(같은 팀) 러닝메이트 축포만 타임라인에 공개(혼합팀 러닝메이트는 알리지 않음). 정체는 비공개.
  if (data.result.singleTeam && data.result.card?.name === '러닝메이트') {
    pushTimelineEvent({ kind: 'runmate', title: bolt?.title ?? data.result.boltTitle, boltId });
  }

  return { ...data.result, card: data.card };
}

// 방장이 버프 리빌을 확인하고 결과화면으로 넘어가는 순간에 세우는 공개 플래그.
// 완료(status=done)는 버프 카드를 그리려 탭 시점에 이미 서버로 기록되지만, 참가자
// 자동 결과화면은 이 플래그를 봐야 뜨므로 방장 확인 시점에 다 같이 넘어간다.
export async function publishBoltResult(boltId) {
  try {
    await updateDoc(doc(db, 'bolts', boltId), { resultPublished: true });
  } catch (err) {
    console.warn('결과 공개 실패:', err.message);
  }
}
