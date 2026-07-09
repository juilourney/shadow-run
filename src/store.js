// ═══════════════════════════════════════════════════════════
//  STORE — 게임 상태의 유일한 창구 (Single Source of Truth)
//
//  설계 원칙:
//   1. 모든 액션은 async  → 내부에서 Firestore 호출
//   2. subscribe/notify   → 값이 바뀌면 구독한 화면이 자동 갱신 (실시간)
//   3. 게임 규칙은 store 안에만 → 화면은 결과값만 읽고, 규칙을 모른다
//
//  Firestore 구성:
//   - game/gauge · game/settings · game/assignment · roster: 서버 전용 쓰기
//     (allow write: if false + Cloudflare Function이 서비스 계정으로 대신 씀)
//   - players · bolts · votes · voteHistory · timeline: 클라이언트 직접 쓰기
//     (allow write: if true — 크루 내부용 게임이라 신뢰 기반으로 열어둠)
// ═══════════════════════════════════════════════════════════

import { ROLES, SPECIAL_ROLES, state as identity } from './state.js';
import {
  doc, collection, onSnapshot, addDoc, updateDoc, deleteDoc, getDocs,
  arrayUnion, arrayRemove, increment, disableNetwork, enableNetwork,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { db } from './firebase-config.js';

// ── 게임 설정 (룰) ────────────────────────────────────────
export const CONFIG = {
  name: '섀도우 런',             // 게임명 기본값 — 관리자 화면에서 변경 가능
  startDate: '2026-06-28',      // 게임 1일차 (일요일) — 관리자 화면에서 변경 가능
  weeks: 3,                     // 관리자 화면에서 변경 가능
  eliteMultiplier: 2,           // 엘리트 마일리지 배수
  votePenalty: 0.5,             // 투표 적발 시 마일리지 감소율
  roleRevealThreshold: 0.6,     // 역할 공개·능력 박탈: 지목 인원 중 동일 역할 비율 기준
  pacerSynergyPerHead: 50,      // 페이서 시너지: 인원 × 50km
  ghostGaugeShift: 100,         // 고스트 게이지 스킬: 100km 즉시 이동
  singleTeamMin: 3,             // 단일팀 번개 최소 인원
  boltMaxHeads: 4,              // 번개 최대 인원
  abilityWeeklyLimit: 2,        // 탐정/밀정 능력 사용 횟수 — 주(1~3주차)당 한도, 매주 초기화
  certBufferMin: 120,           // 인증 마감 버퍼(분) — 예상 완주시간 뒤 여유
  fallbackPaceSec: 420,         // 페이스 미공개 시 가정 페이스(초/km) = 7:00
  expiredPenalty: 0.5,          // 인증 마감 초과(자동 만료) 시 지급 마일리지 = 거리 × 이 값
};

// ── 상태 (스냅샷) — Firestore와 실시간 동기화되는 로컬 캐시 ────
const state = {
  game: {
    gauge: { pacer: 0, ghost: 0 },
    name: CONFIG.name,
    startDate: CONFIG.startDate,
    weeks: CONFIG.weeks,
  },

  voteHistory: [],   // 투표 히스토리 — voteHistory 컬렉션과 동기화
  roster: [],        // 참가자 명단(사전 등록) — roster 컬렉션과 동기화
  assignment: { assigned: false, players: [] },  // 팀·역할 배정 결과 — game/assignment와 동기화
  assignmentLoaded: false,   // game/assignment onSnapshot이 최초 1회라도 도착했는지 (부팅 라우팅 판정용)

  // 나 — 신원은 players[내 이름과 일치하는 항목]이 단일 출처. 여기엔 사적 정보만.
  // abilityLog/revealed는 의도적으로 로컬 전용(동기화 안 함) — 탐정/밀정 조사 결과가
  // 다른 사람에게 노출되면 안 되는데, 로그인이 없어 서버 규칙으로 개인별 보호가 불가능하기 때문.
  me: {
    abilityLog: [],   // [{ week }] — 주간 능력 사용 한도 판정용
    revealed: {},      // { [playerId]: {team} | {role} }
  },

  players: [],   // 배정 완료된 참가자 — players 컬렉션과 동기화
  bolts: [],     // 번개 — bolts 컬렉션과 동기화
  vote: { ballots: [] },  // 투표 지목 — votes 컬렉션과 동기화 (myVotesUsed는 파생값)
  timeline: [],  // 전체 공개 이벤트 — timeline 컬렉션과 동기화
};

// ── 화면간 데이터 전달 (bolt-detail → bolt-buff → bolt-result) ──
let _pendingBolt = null;
let _lastBoltResult = null;

export function setPendingBolt(data)    { _pendingBolt = data; }
export function getPendingBolt()        { return _pendingBolt; }
export function setLastBoltResult(data) { _lastBoltResult = data; }
export function getLastBoltResult()     { return _lastBoltResult; }

// ── 구독 (subscribe/notify) ──────────────────────────────
const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);   // unsubscribe
}

function notify() {
  listeners.forEach(fn => fn(getSnapshot()));
}

// 읽기 전용 스냅샷 (외부에서 직접 state 변조 방지)
function getSnapshot() {
  return structuredClone(state);
}

// 관리자 전용 서버 액션(명단·게임 설정·배정 초기화) 호출 시 붙이는 인증 헤더.
// 로그인 시 발급받은 토큰을 admin/screens/login.js가 여기에 저장해둔다.
// 참가자 기기는 이 키를 저장한 적이 없으니 항상 빈 헤더 — set-gauge처럼
// 참가자도 호출해야 하는 엔드포인트에는 애초에 붙이지 않는다.
const ADMIN_TOKEN_KEY = 'sr_admin_auth';
function adminAuthHeaders() {
  const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  return token ? { authorization: `Bearer ${token}` } : {};
}

// "홈 화면에 추가"한 PWA(standalone)는 오래 백그라운드에 있다가 돌아오면 iOS가
// 실제 네트워크 소켓까지 완전히 정지시켜, Firestore의 실시간 연결(WebChannel)이
// 끊긴 채로 남아있는 경우가 있다 — SDK의 자체 재연결 로직이 뒤늦게 돌거나 아예
// 멈춰서, 다른 사람이 그 사이 만든 변경사항(번개 시작 등)이 화면에 실시간으로
// 반영되지 않고 새로고침을 해야만 보이는 문제로 이어진다. 앱이 다시 포그라운드로
// 올 때 연결을 강제로 끊었다 다시 붙여 확실하게 재동기화시킨다.
export async function reconnectFirestore() {
  try {
    await disableNetwork(db);
    await enableNetwork(db);
  } catch (err) {
    console.warn('Firestore 재연결 실패:', err.message);
  }
}

// ═══════════════════════════════════════════════════════════
//  Firestore 실시간 동기화
// ═══════════════════════════════════════════════════════════

// 게이지 — 쓰기는 서버(/api/set-gauge)만
const gaugeDocRef = doc(db, 'game', 'gauge');
onSnapshot(gaugeDocRef, snap => {
  if (snap.exists()) state.game.gauge = snap.data();
  else writeGauge();
  notify();
}, err => console.warn('게이지 실시간 동기화 실패:', err.message));

// 절대값 기록 — 문서 초기화·신규 게임 리셋 전용.
// 게임 진행(번개 완료 등) 반영에는 절대 쓰지 말 것: 로컬 값을 통째로 올려보내면
// 스냅샷 수신과 겹칠 때 서로 덮어써서 증가분이 유실된다 → applyGaugeDelta 사용.
function writeGauge() {
  fetch('/api/set-gauge', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(state.game.gauge),
  }).catch(err => console.warn('게이지 저장 실패:', err.message));
}

// 증감 기록 — 서버가 원자 increment로 반영(동시 완료·스냅샷 경쟁에도 안전).
// 로컬에도 즉시 반영해 UI가 스냅샷 왕복을 기다리지 않게 한다(0 미만은 게임 규칙상 클램프).
function applyGaugeDelta(delta) {
  if (!delta.pacer && !delta.ghost) return;
  state.game.gauge.pacer = Math.max(0, state.game.gauge.pacer + delta.pacer);
  state.game.gauge.ghost = Math.max(0, state.game.gauge.ghost + delta.ghost);
  fetch('/api/set-gauge', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ pacerDelta: delta.pacer, ghostDelta: delta.ghost }),
  }).catch(err => console.warn('게이지 증감 저장 실패:', err.message));
}

// 게임 설정(이름·시작일·기간) — 쓰기는 서버(/api/set-game-settings)만
const settingsDocRef = doc(db, 'game', 'settings');
onSnapshot(settingsDocRef, snap => {
  if (snap.exists()) {
    const { name, startDate, weeks } = snap.data();
    Object.assign(state.game, { name, startDate, weeks });
  } else {
    writeGameSettings();
  }
  notify();
}, err => console.warn('게임 설정 실시간 동기화 실패:', err.message));

function writeGameSettings() {
  fetch('/api/set-game-settings', {
    method: 'POST', headers: { 'content-type': 'application/json', ...adminAuthHeaders() },
    body: JSON.stringify({ name: state.game.name, startDate: state.game.startDate, weeks: state.game.weeks }),
  }).catch(err => console.warn('게임 설정 저장 실패:', err.message));
}

// 참가자 명단 — 쓰기는 서버(/api/roster)만
onSnapshot(collection(db, 'roster'), snap => {
  state.roster = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  notify();
}, err => console.warn('명단 실시간 동기화 실패:', err.message));

// 팀·역할 배정 결과 — 쓰기는 서버(/api/assign-teams)만
onSnapshot(doc(db, 'game', 'assignment'), snap => {
  state.assignment = snap.exists() ? snap.data() : { assigned: false, players: [] };
  state.assignmentLoaded = true;
  notify();
}, err => console.warn('배정 결과 실시간 동기화 실패:', err.message));

export async function triggerAssignment() {
  const res = await fetch('/api/assign-teams', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '배정에 실패했습니다');
  return data;
}

function resetAssignment() {
  fetch('/api/assign-teams', {
    method: 'POST', headers: { 'content-type': 'application/json', ...adminAuthHeaders() },
    body: JSON.stringify({ reset: true }),
  }).catch(err => console.warn('배정 초기화 실패:', err.message));
}

// 참가자(배정 완료 후 팀·역할·마일리지) — 클라이언트 직접 쓰기
onSnapshot(collection(db, 'players'), snap => {
  state.players = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  notify();
}, err => console.warn('참가자 실시간 동기화 실패:', err.message));

// 번개 — 클라이언트 직접 쓰기
onSnapshot(collection(db, 'bolts'), snap => {
  state.bolts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  notify();
}, err => console.warn('번개 실시간 동기화 실패:', err.message));

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

// 타임라인 — 클라이언트 직접 쓰기
onSnapshot(collection(db, 'timeline'), snap => {
  state.timeline = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  notify();
}, err => console.warn('타임라인 실시간 동기화 실패:', err.message));

function pushTimelineEvent(entry) {
  addDoc(collection(db, 'timeline'), { ...entry, at: Date.now() })
    .catch(err => console.warn('타임라인 기록 실패:', err.message));
}

// ═══════════════════════════════════════════════════════════
//  SELECTORS — 계산된 값 (화면은 규칙을 몰라도 됨)
// ═══════════════════════════════════════════════════════════

export function getGauge() {
  const { pacer, ghost } = state.game.gauge;
  const total = pacer + ghost || 1;
  return {
    pacer, ghost,
    diff: pacer - ghost,
    leader: pacer === ghost ? null : (pacer > ghost ? 'pacer' : 'ghost'),
    pacerRatio: pacer / total,
    ghostRatio: ghost / total,
  };
}

// 게임 캘린더 — state.game.startDate + weeks 를 단일 출처로 파생값 계산.
export function getCalendar(now = new Date()) {
  const { startDate, weeks } = state.game;
  const [y, m, d] = startDate.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const totalDays = weeks * 7;
  const end = new Date(start);
  end.setDate(start.getDate() + totalDays);

  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayIndex = Math.round((today0 - start) / 86400000);
  const started = dayIndex >= 0;
  const ended = dayIndex >= totalDays;
  const week = !started ? 0 : (ended ? weeks : Math.floor(dayIndex / 7) + 1);
  const dday = Math.ceil((end - today0) / 86400000);
  const monthLabel = `${now.getFullYear()} ${now.toLocaleDateString('en-US', { month: 'long' })}`;

  return { start, end, dayIndex, totalDays, week, weeks, started, ended, dday, monthLabel };
}

// 투표 시간(게임 기간 중 월·목 18~22시) 여부 — vote.js와 대시보드 공개 판정이 공유
export function isVoteWindowNow(now = new Date()) {
  const cal = getCalendar(now);
  if (!cal.started || cal.ended) return false;
  const day = now.getDay(), hour = now.getHours();
  return (day === 1 || day === 4) && hour >= 18 && hour < 22;
}

// 팀 마일리지 "숫자" 공개 여부 — 평소엔 게이지 바(비율)만 보여 개별 번개의
// 증가분으로 참가자 팀·역할을 역추적하는 것을 막는다. 정확한 수치는
// ① 투표 시간 동안(추리 재료) ② 종료 3일 전부터(마지막 줄다리기 스퍼트) 공개.
export function isGaugeNumbersPublic(now = new Date()) {
  const cal = getCalendar(now);
  if (cal.ended) return true;
  if (cal.started && cal.dday <= 3) return true;
  return isVoteWindowNow(now);
}

// 현재 단계: 탐색전(1~4일차) / 줄다리기(5~7일차) — startDate 기준 경과일로 판정.
// 게임 시작 전(dayIndex 음수)에는 나머지 연산이 6 등으로 감겨 줄다리기로 오판되므로
// (상대 게이지를 깎는 규칙이 잘못 발동) 시작 전에는 항상 탐색전으로 취급한다.
export function getPhase(now = new Date()) {
  const cal = getCalendar(now);
  const gameDay = ((cal.dayIndex % 7) + 7) % 7;
  const isTug = cal.started && gameDay >= 4 && gameDay <= 6;
  return {
    phase: isTug ? 'tug' : 'scout',
    isTug,
    label: isTug ? '줄다리기 진행 중' : '탐색전',
    days: isTug ? '목 · 금 · 토' : '일 · 월 · 화 · 수',
    week: cal.week,
    dday: cal.dday,
    started: cal.started,
    ended: cal.ended,
  };
}

// 나 — players에서 내 이름과 일치하는 항목을 찾음. 배정 전(또는 매칭 실패)에는
// 안전한 기본값을 반환해 초기 렌더링에서 크래시가 나지 않게 한다.
function myPlayer() {
  return state.players.find(p => p.name === identity.name) || {
    id: null, name: identity.name || '', team: null, role: null, km: 0,
    publicTeam: null, publicRole: null, penalized: false, abilityStripped: false, boltsCompleted: 0,
  };
}

export function getMe() {
  const p = myPlayer();
  return {
    ...p,
    pureKm: p.km,
    abilityUsed: abilityUsedThisWeek(),
    revealed: { ...state.me.revealed },
    abilityStripped: !!p.abilityStripped,
  };
}

export function getPlayers({ excludeSelf = false } = {}) {
  const list = state.players.map(p => ({ ...p, isSelf: p.name === identity.name }));
  return excludeSelf ? list.filter(p => !p.isSelf) : list;
}

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

// 마감 지난 진행 중(open/running) 번개를 만료 처리 — 마일리지는 거리 × CONFIG.expiredPenalty(50%)만 지급.
// 로컬 상태를 즉시 갱신해 같은 기기에서 중복 처리되지 않게 막고, Firestore 반영은
// 백그라운드로 진행(다른 기기와 거의 동시에 감지되는 극히 드문 경우의 중복 반영은 감수).
function sweepExpiredBolts() {
  const now = Date.now();
  const { isTug } = getPhase();
  for (const b of state.bolts) {
    if (ACTIVE_BOLT_STATUSES.includes(b.status) && now > boltDeadline(b)) {
      const km = b.distance * CONFIG.expiredPenalty;
      b.status = 'expired';   // 로컬 즉시 반영(중복 스윕 방지)
      const delta = { pacer: 0, ghost: 0 };
      for (const pid of b.participants) {
        const p = playerById(pid);
        if (!p) continue;
        if (isTug) delta[opponentOf(p.team)] -= km;
        else delta[p.team] += km;
        p.km += km;
        updateDoc(doc(db, 'players', pid), { km: increment(km) })
          .catch(err => console.warn('만료 페널티 반영 실패:', err.message));
      }
      updateDoc(doc(db, 'bolts', b.id), { status: 'expired' })
        .catch(err => console.warn('번개 만료 처리 실패:', err.message));
      applyGaugeDelta(delta);
    }
  }
}

export function getBolts() {
  sweepExpiredBolts();
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

// 방장 — 번개 시작. 예정 시각과 무관하게 지금을 실제 시작 시각으로 기록한다.
export async function startBolt(boltId) {
  const bolt = state.bolts.find(b => b.id === boltId);
  if (!bolt) throw new Error('번개를 찾을 수 없습니다');
  if (bolt.hostId !== myPlayer().id) throw new Error('방장만 번개를 시작할 수 있습니다');
  if (bolt.status !== 'open') throw new Error('이미 시작됐거나 종료된 번개입니다');
  await updateDoc(doc(db, 'bolts', boltId), { status: 'running', startAt: Date.now() });
}

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

function abilityUsedThisWeek() {
  const { week } = getPhase();
  return state.me.abilityLog.filter(e => e.week === week).length;
}

export function getAbility() {
  const meP = myPlayer();
  const stripped = !!meP.abilityStripped;
  const isSpecial = (meP.role === 'detective' || meP.role === 'spy') && !stripped;
  const used = abilityUsedThisWeek();
  return {
    isSpecial,
    stripped,
    kind: meP.role === 'detective' ? 'team' : meP.role === 'spy' ? 'role' : null,
    limit: CONFIG.abilityWeeklyLimit,
    used,
    left: stripped ? 0 : CONFIG.abilityWeeklyLimit - used,
    revealed: { ...state.me.revealed },
  };
}

export function getTimeline() {
  return [...state.timeline].sort((a, b) => b.at - a.at);
}

// ── 관리자 화면(A-02·A-03) 전용 셀렉터 ────────────────────
export function getGameSettings() {
  const cal = getCalendar();
  return {
    name: state.game.name,
    startDate: state.game.startDate,
    weeks: state.game.weeks,
    status: !cal.started ? 'scheduled' : (cal.ended ? 'ended' : 'ongoing'),
    ...cal,
  };
}

export function getVoteHistory() {
  return [...state.voteHistory].sort((a, b) => b.at - a.at);
}

export function getRoster() {
  return state.roster.map(r => ({ ...r })).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

export function isNameRegistered(name) {
  return state.roster.some(r => r.name === name.trim());
}

// 참가자가 이름 입력 화면에서 직접 자기 이름을 명단에 등록 — 이미 있으면 그대로 통과.
export async function joinRoster(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) throw new Error('이름을 입력하세요');
  const res = await fetch('/api/roster', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'selfJoin', name: trimmed }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '등록에 실패했습니다');
  return data;
}

export function getAssignment() {
  return { ...state.assignment, players: state.assignment.players.map(p => ({ ...p })) };
}

// game/assignment onSnapshot이 최초 1회라도 도착했는지 — 부팅 시 이름 화면으로 보낼지
// 판정하기 전에, Firestore가 실제로 응답했는지 확인하는 용도.
export function isAssignmentLoaded() {
  return state.assignmentLoaded;
}

// 이 기기에서 카드·역할 확인(뒤집기)을 이미 마쳤는지 — localStorage에 저장.
// 배정(assignedAt)이 바뀌면(재배정·새 게임) 자동으로 무효화되어 다시 확인 절차를 거친다.
const CONFIRMED_KEY = 'sr_confirmed';

export function hasConfirmedRole() {
  try {
    const saved = JSON.parse(localStorage.getItem(CONFIRMED_KEY) || 'null');
    return !!saved && !!saved.team && !!saved.role
      && saved.name === identity.name && saved.assignedAt === state.assignment.assignedAt;
  } catch {
    return false;
  }
}

// 확인 기록 전체(name·assignedAt·team·role)를 반환 — 부팅 시 Firestore 배정을
// 기다리지 않고 저장된 팀·역할로 바로 게임 화면을 그리는 데 쓴다(PWA 재개 시
// Firestore 재연결이 느려도 확인한 기기는 즉시 게임 화면으로).
export function getConfirmedRecord() {
  try {
    return JSON.parse(localStorage.getItem(CONFIRMED_KEY) || 'null');
  } catch {
    return null;
  }
}

export function peekConfirmedName() {
  return getConfirmedRecord()?.name || null;
}

export function markRoleConfirmed() {
  try {
    localStorage.setItem(CONFIRMED_KEY, JSON.stringify({
      name: identity.name,
      assignedAt: state.assignment.assignedAt,
      team: identity.team,
      role: identity.role,
    }));
  } catch {}
}

// 이 기기에서 마지막으로 입장한 이름 — 매번 이름을 다시 입력하지 않도록 저장.
// (카드·역할 확인 전 대기실 단계에서도 자동 입장되게 하는 용도)
const SAVED_NAME_KEY = 'sr_name';

export function getSavedName() {
  try { return localStorage.getItem(SAVED_NAME_KEY) || null; } catch { return null; }
}

export function saveName(name) {
  try { localStorage.setItem(SAVED_NAME_KEY, name); } catch {}
}

// "다른 이름으로 입장" — 저장된 이름과 확인 기록을 모두 지워 이름 입력 화면으로
export function clearSavedIdentity() {
  try {
    localStorage.removeItem(SAVED_NAME_KEY);
    localStorage.removeItem(CONFIRMED_KEY);
  } catch {}
}

// 확인(카드·역할 뒤집기) 기록만 삭제 — 저장된 이름은 유지.
// 재배정으로 확인 기록이 무효화됐을 때, 이름은 그대로 두고 다시 카드/대기실로 보낼 때 쓴다.
export function clearConfirmedRecord() {
  try { localStorage.removeItem(CONFIRMED_KEY); } catch {}
}

// ── 내부 규칙 헬퍼 ────────────────────────────────────────
function isSingleTeamBolt(bolt) {
  if (bolt.participants.length < CONFIG.singleTeamMin) return false;
  const teams = bolt.participants.map(id => playerById(id)?.team);
  return teams.every(t => t && t === teams[0]);
}

function playerById(id) {
  return state.players.find(p => p.id === id);
}

// ═══════════════════════════════════════════════════════════
//  ACTIONS — 상태를 바꾸는 유일한 방법 (모두 async)
// ═══════════════════════════════════════════════════════════

// 관리자 — 진행 중인 게임의 이름/기간 수정 (A-03 "현재 게임 관리")
export async function updateGameSettings({ name, startDate, weeks }) {
  if (name) state.game.name = name;
  if (startDate) state.game.startDate = startDate;
  if (weeks) state.game.weeks = Number(weeks);
  writeGameSettings();
  notify();
  return getGameSettings();
}

// 관리자 — 신규 게임 생성. 이전 게임의 게이지·배정·번개·투표·타임라인을 전부 삭제하고 새로 시작.
// (참가자 명단(roster)은 크루 소속 정보라 시즌과 무관하게 유지)
export async function createNewGame({ name, startDate, weeks }) {
  state.game.name = name;
  state.game.startDate = startDate;
  state.game.weeks = Number(weeks);
  state.game.gauge = { pacer: 0, ghost: 0 };

  writeGauge();
  writeGameSettings();
  resetAssignment();

  await Promise.all(
    ['bolts', 'votes', 'voteHistory', 'timeline'].map(async coll => {
      const snap = await getDocs(collection(db, coll));
      return Promise.all(snap.docs.map(d => deleteDoc(doc(db, coll, d.id))));
    })
  );

  // 참가자 명단도 새 시즌마다 새로 모집 — roster는 서버 전용 쓰기라 관리자 인증이 붙은
  // removeRosterMember(각 항목 삭제 API 호출)로 지운다.
  await Promise.all(state.roster.map(r => removeRosterMember(r.id).catch(err => console.warn('명단 삭제 실패:', err.message))));

  notify();
  return getGameSettings();
}

// 관리자 — 참가자 명단(사전 등록) 추가
export async function addRosterMember(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) throw new Error('이름을 입력하세요');
  if (state.roster.some(r => r.name === trimmed)) throw new Error('이미 명단에 있는 이름입니다');
  const res = await fetch('/api/roster', {
    method: 'POST', headers: { 'content-type': 'application/json', ...adminAuthHeaders() },
    body: JSON.stringify({ action: 'add', name: trimmed }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '명단 추가에 실패했습니다');
  return data;
}

export async function updateRosterMember(id, name) {
  const trimmed = (name || '').trim();
  if (!trimmed) throw new Error('이름을 입력하세요');
  const res = await fetch('/api/roster', {
    method: 'POST', headers: { 'content-type': 'application/json', ...adminAuthHeaders() },
    body: JSON.stringify({ action: 'update', id, name: trimmed }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '명단 수정에 실패했습니다');
  return data;
}

export async function removeRosterMember(id) {
  const res = await fetch('/api/roster', {
    method: 'POST', headers: { 'content-type': 'application/json', ...adminAuthHeaders() },
    body: JSON.stringify({ action: 'remove', id }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '명단 삭제에 실패했습니다');
}

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
export async function completeBolt(boltId, distanceKm, participantIds, buffMultiplier = 1) {
  const bolt = state.bolts.find(b => b.id === boltId);
  if (!bolt) throw new Error('번개를 찾을 수 없습니다');

  const { isTug } = getPhase();
  const singleTeam = isSingleTeamBolt(bolt);
  const writes = [];
  const delta = { pacer: 0, ghost: 0 };

  participantIds.forEach(pid => {
    const p = playerById(pid);
    if (!p) return;

    const penalized = isPenalized(p);
    const stripped  = isAbilityStripped(p);
    let km = distanceKm * (singleTeam ? 1 : buffMultiplier);
    if (p.role === 'elite' && !stripped) km *= CONFIG.eliteMultiplier;
    if (penalized) km *= CONFIG.votePenalty;

    if (p.role === 'anchor' && !stripped) {
      delta[p.team] += km;
      delta[opponentOf(p.team)] -= km;
    } else if (isTug) {
      delta[opponentOf(p.team)] -= km;
    } else {
      delta[p.team] += km;
    }

    writes.push(updateDoc(doc(db, 'players', pid), { km: increment(distanceKm), boltsCompleted: increment(1) }));
  });

  if (singleTeam) {
    const team = playerById(bolt.participants[0]).team;
    const heads = participantIds.length;
    if (team === 'pacer') {
      delta.pacer += heads * CONFIG.pacerSynergyPerHead;
    } else {
      delta.pacer -= distanceKm;
      delta.ghost += CONFIG.ghostGaugeShift;
    }
  }

  writes.push(updateDoc(doc(db, 'bolts', boltId), { status: 'done' }));
  await Promise.all(writes);
  applyGaugeDelta(delta);

  const boltTeam = singleTeam ? playerById(bolt.participants[0])?.team ?? null : null;
  return { singleTeam, isTug, distanceKm, buffMultiplier, participantIds, participantCount: participantIds.length, boltTeam };
}

// 투표 지목 — '이 사람은 상대팀'이라는 추측 (+ 역할 지목: role|null=기권)
export async function castVote(targetId, roleGuess = null) {
  const v = getVote();
  if (v.left <= 0) throw new Error('투표권을 모두 사용했습니다');
  const myTeam = myPlayer().team;
  await addDoc(collection(db, 'votes'), { voterId: myPlayer().id, voterTeam: myTeam, targetId, roleGuess: roleGuess || null });
  return getVote();
}

// 투표 종료 집계 → 팀(무조건) + 역할(60% 적중 조건부) 판정
export async function tallyVote() {
  const ballots = state.vote.ballots;
  if (ballots.length === 0) return null;

  const teamCount = {};
  for (const b of ballots) teamCount[b.targetId] = (teamCount[b.targetId] || 0) + 1;
  const maxCount = Math.max(...Object.values(teamCount));
  const topIds = Object.keys(teamCount).filter(id => teamCount[id] === maxCount);

  const caught = [];
  const playerWrites = [];

  for (const topId of topIds) {
    const target = playerById(topId);
    if (!target) continue;

    const targetBallots = ballots.filter(b => b.targetId === topId);
    const update = {};

    const correctN = targetBallots.filter(b => b.voterTeam && b.voterTeam !== target.team).length;
    const teamCaught = correctN > targetBallots.length / 2;
    if (teamCaught) {
      update.publicTeam = target.team;
      update.penalized  = true;
    }

    let roleRevealed = false, guessFailed = false, guessedRole = null;
    const roleCount = {};
    for (const b of targetBallots) if (b.roleGuess) roleCount[b.roleGuess] = (roleCount[b.roleGuess] || 0) + 1;
    let consensusRole = null, consensusN = 0;
    for (const [role, n] of Object.entries(roleCount)) if (n > consensusN) { consensusN = n; consensusRole = role; }
    const ratio = consensusRole ? consensusN / targetBallots.length : 0;

    if (consensusRole && ratio >= CONFIG.roleRevealThreshold) {
      if (consensusRole === target.role) {
        roleRevealed = true;
        update.publicRole      = target.role;
        update.abilityStripped = true;
      } else {
        guessFailed = true;
        guessedRole = consensusRole;
      }
    }

    if (Object.keys(update).length > 0) {
      playerWrites.push(updateDoc(doc(db, 'players', topId), update));
    }

    caught.push({
      id: target.id,
      name: target.name,
      teamCaught,
      team: teamCaught ? target.team : null,
      roleRevealed,
      revealedRole: roleRevealed ? target.role : null,
      guessFailed,
      guessedRole,
    });
  }

  if (caught.length === 0) return null;
  const result = { tie: caught.length > 1, caught };

  let anyReveal = false;
  for (const c of caught) {
    if (c.teamCaught) { pushTimelineEvent({ kind: 'team', name: c.name, team: c.team }); anyReveal = true; }
    if (c.roleRevealed) { pushTimelineEvent({ kind: 'role', name: c.name, role: c.revealedRole }); anyReveal = true; }
  }
  if (!anyReveal) pushTimelineEvent({ kind: 'fail' });

  await Promise.all(playerWrites);

  addDoc(collection(db, 'voteHistory'), {
    at: Date.now(),
    ballotCount: ballots.length,
    caught: caught.map(c => ({ name: c.name, teamCaught: c.teamCaught, team: c.team, roleRevealed: c.roleRevealed, revealedRole: c.revealedRole })),
  }).catch(err => console.warn('투표 히스토리 기록 실패:', err.message));

  // 라운드 종료 — 다음 회차를 위해 표 초기화(적발 결과는 players에 영구 반영되어 유지됨)
  Promise.all(ballots.map(b => deleteDoc(doc(db, 'votes', b.id))))
    .catch(err => console.warn('투표 초기화 실패:', err.message));

  return result;
}

// 탐정/밀정 능력 사용
export async function useAbility(targetId) {
  const meP = myPlayer();
  if (meP.role !== 'detective' && meP.role !== 'spy') throw new Error('능력이 없습니다');
  if (meP.abilityStripped) throw new Error('적발되어 능력이 박탈되었습니다');
  if (abilityUsedThisWeek() >= CONFIG.abilityWeeklyLimit) throw new Error('이번 주 사용 횟수를 모두 소진했습니다');
  if (state.me.revealed[targetId]) return state.me.revealed[targetId];

  const target = playerById(targetId);
  if (!target) throw new Error('대상을 찾을 수 없습니다');

  const result = meP.role === 'detective' ? { team: target.team } : { role: target.role };

  state.me.revealed[targetId] = result;
  state.me.abilityLog.push({ week: getPhase().week });

  pushTimelineEvent({ kind: 'ability', abilityRole: meP.role });

  notify();
  return result;
}

// ── 내부 헬퍼 ─────────────────────────────────────────────
function opponentOf(team) {
  return team === 'pacer' ? 'ghost' : 'pacer';
}

function isPenalized(player) {
  return !!player.penalized;
}

function isAbilityStripped(player) {
  return !!player.abilityStripped;
}

// 상수 재노출 (화면이 store 하나만 import하면 되도록)
export { ROLES, SPECIAL_ROLES };
