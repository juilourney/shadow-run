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
  doc, collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  arrayUnion, arrayRemove, increment,
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

  gameHistory: [],   // 지난 게임 히스토리 — 관리자 화면 조회용 (로컬, 새 게임 생성 시 누적)
  voteHistory: [],   // 투표 히스토리 — voteHistory 컬렉션과 동기화
  roster: [],        // 참가자 명단(사전 등록) — roster 컬렉션과 동기화
  assignment: { assigned: false, players: [] },  // 팀·역할 배정 결과 — game/assignment와 동기화

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

function writeGauge() {
  fetch('/api/set-gauge', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(state.game.gauge),
  }).catch(err => console.warn('게이지 저장 실패:', err.message));
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
    method: 'POST', headers: { 'content-type': 'application/json' },
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
    method: 'POST', headers: { 'content-type': 'application/json' },
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

// 현재 단계: 탐색전(1~4일차) / 줄다리기(5~7일차) — startDate 기준 경과일로 판정.
export function getPhase(now = new Date()) {
  const cal = getCalendar(now);
  const gameDay = ((cal.dayIndex % 7) + 7) % 7;
  const isTug = gameDay >= 4 && gameDay <= 6;
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

// 인증 마감 시각 = 시작 + 예상 완주시간(거리×페이스) + 버퍼.
export function boltDeadline(bolt) {
  if (!bolt.startAt) return Infinity;
  const m = /^(\d+):(\d+)/.exec(bolt.pace || '');
  const paceSec = m ? Number(m[1]) * 60 + Number(m[2]) : CONFIG.fallbackPaceSec;
  const runMs = bolt.distance * paceSec * 1000;
  return bolt.startAt + runMs + CONFIG.certBufferMin * 60 * 1000;
}

// 마감 지난 open 번개를 만료 처리 — 마일리지는 거리 × CONFIG.expiredPenalty(50%)만 지급.
// 로컬 상태를 즉시 갱신해 같은 기기에서 중복 처리되지 않게 막고, Firestore 반영은
// 백그라운드로 진행(다른 기기와 거의 동시에 감지되는 극히 드문 경우의 중복 반영은 감수).
function sweepExpiredBolts() {
  const now = Date.now();
  const { isTug } = getPhase();
  for (const b of state.bolts) {
    if (b.status === 'open' && now > boltDeadline(b)) {
      const km = b.distance * CONFIG.expiredPenalty;
      b.status = 'expired';   // 로컬 즉시 반영(중복 스윕 방지)
      for (const pid of b.participants) {
        const p = playerById(pid);
        if (!p) continue;
        if (isTug) subtractOpponent(p.team, km);
        else state.game.gauge[p.team] += km;
        p.km += km;
        updateDoc(doc(db, 'players', pid), { km: increment(km) })
          .catch(err => console.warn('만료 페널티 반영 실패:', err.message));
      }
      updateDoc(doc(db, 'bolts', b.id), { status: 'expired' })
        .catch(err => console.warn('번개 만료 처리 실패:', err.message));
      writeGauge();
    }
  }
}

export function getBolts() {
  sweepExpiredBolts();
  const myId = myPlayer().id;
  return state.bolts.map(b => ({
    ...b,
    count: b.participants.length,
    joined: b.status === 'open' && b.participants.includes(myId),
    hostName: playerById(b.hostId)?.name ?? '?',
    isHost: b.hostId === myId,
    isSingleTeam: isSingleTeamBolt(b),
    deadline: boltDeadline(b),
  }));
}

// 현재 참여 중인 번개 id — bolts에서 파생(별도 저장하지 않음)
export function getJoinedBoltId() {
  const myId = myPlayer().id;
  return state.bolts.find(b => b.status === 'open' && b.participants.includes(myId))?.id ?? null;
}

export function getVote() {
  const meP = myPlayer();
  const total = (meP.role === 'double' && !meP.abilityStripped) ? 2 : 1;
  const myVotesUsed = state.vote.ballots.filter(b => b.voterId === meP.id).length;
  const castCount = {};
  for (const b of state.vote.ballots) castCount[b.targetId] = (castCount[b.targetId] || 0) + 1;
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

export function getGameHistory() {
  return state.gameHistory.map(e => ({ ...e }));
}

export function getRoster() {
  return state.roster.map(r => ({ ...r })).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

export function isNameRegistered(name) {
  return state.roster.some(r => r.name === name.trim());
}

export function getAssignment() {
  return { ...state.assignment, players: state.assignment.players.map(p => ({ ...p })) };
}

// 이 기기에서 카드·역할 확인(뒤집기)을 이미 마쳤는지 — localStorage에 저장.
// 배정(assignedAt)이 바뀌면(재배정·새 게임) 자동으로 무효화되어 다시 확인 절차를 거친다.
const CONFIRMED_KEY = 'sr_confirmed';

export function hasConfirmedRole() {
  try {
    const saved = JSON.parse(localStorage.getItem(CONFIRMED_KEY) || 'null');
    return !!saved && saved.name === identity.name && saved.assignedAt === state.assignment.assignedAt;
  } catch {
    return false;
  }
}

export function markRoleConfirmed() {
  try {
    localStorage.setItem(CONFIRMED_KEY, JSON.stringify({ name: identity.name, assignedAt: state.assignment.assignedAt }));
  } catch {}
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

// 관리자 — 신규 게임 생성. 현재 게임은 히스토리로 보관, 게이지·번개·투표 기록 초기화.
export async function createNewGame({ name, startDate, weeks }) {
  state.gameHistory.unshift({
    name: state.game.name,
    startDate: state.game.startDate,
    weeks: state.game.weeks,
    winner: getGauge().leader,
    finalGauge: { ...state.game.gauge },
    participantCount: state.players.length,
  });

  state.game.name = name;
  state.game.startDate = startDate;
  state.game.weeks = Number(weeks);
  state.game.gauge = { pacer: 0, ghost: 0 };

  writeGauge();
  writeGameSettings();
  resetAssignment();
  notify();
  return getGameSettings();
}

// 관리자 — 참가자 명단(사전 등록) 추가
export async function addRosterMember(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) throw new Error('이름을 입력하세요');
  if (state.roster.some(r => r.name === trimmed)) throw new Error('이미 명단에 있는 이름입니다');
  const res = await fetch('/api/roster', {
    method: 'POST', headers: { 'content-type': 'application/json' },
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
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'update', id, name: trimmed }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '명단 수정에 실패했습니다');
  return data;
}

export async function removeRosterMember(id) {
  const res = await fetch('/api/roster', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'remove', id }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '명단 삭제에 실패했습니다');
}

// 번개 만들기 — startAt: 시작 시각 타임스탬프(인증 마감 판정용)
export async function createBolt({ title, place, distance, pace, time, startAt }) {
  if (getJoinedBoltId()) throw new Error('이미 참여 중인 번개가 있습니다');
  const myId = myPlayer().id;
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

  await updateDoc(doc(db, 'bolts', boltId), { participants: arrayUnion(myPlayer().id) });
  return bolt;
}

// 번개 참여 취소
export async function leaveBolt() {
  const id = getJoinedBoltId();
  if (!id) return;
  await updateDoc(doc(db, 'bolts', id), { participants: arrayRemove(myPlayer().id) });
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

  participantIds.forEach(pid => {
    const p = playerById(pid);
    if (!p) return;

    const penalized = isPenalized(p);
    const stripped  = isAbilityStripped(p);
    let km = distanceKm * (singleTeam ? 1 : buffMultiplier);
    if (p.role === 'elite' && !stripped) km *= CONFIG.eliteMultiplier;
    if (penalized) km *= CONFIG.votePenalty;

    if (p.role === 'anchor' && !stripped) {
      state.game.gauge[p.team] += km;
      subtractOpponent(p.team, km);
    } else if (isTug) {
      subtractOpponent(p.team, km);
    } else {
      state.game.gauge[p.team] += km;
    }

    writes.push(updateDoc(doc(db, 'players', pid), { km: increment(distanceKm), boltsCompleted: increment(1) }));
  });

  if (singleTeam) {
    const team = playerById(bolt.participants[0]).team;
    const heads = participantIds.length;
    if (team === 'pacer') {
      state.game.gauge.pacer += heads * CONFIG.pacerSynergyPerHead;
    } else {
      subtractOpponent('ghost', distanceKm);
      state.game.gauge.ghost += CONFIG.ghostGaugeShift;
    }
  }

  writes.push(updateDoc(doc(db, 'bolts', boltId), { status: 'done' }));
  await Promise.all(writes);
  writeGauge();

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
function subtractOpponent(myTeam, km) {
  const opp = myTeam === 'pacer' ? 'ghost' : 'pacer';
  state.game.gauge[opp] = Math.max(0, state.game.gauge[opp] - km);
}

function isPenalized(player) {
  return !!player.penalized;
}

function isAbilityStripped(player) {
  return !!player.abilityStripped;
}

// 상수 재노출 (화면이 store 하나만 import하면 되도록)
export { ROLES, SPECIAL_ROLES };
