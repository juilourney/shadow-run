// ═══════════════════════════════════════════════════════════
//  STORE — 게임 상태의 유일한 창구 (Single Source of Truth)
//
//  설계 원칙 (백엔드 교체를 쉽게 하기 위함):
//   1. 모든 액션은 async  → 나중에 이 함수 내부만 Firebase 호출로 교체
//   2. subscribe/notify   → 값이 바뀌면 구독한 화면이 자동 갱신 (실시간 대비)
//   3. 게임 규칙은 store 안에만 → 화면은 결과값만 읽고, 규칙을 모른다
//
//  나중 Firebase 교체 시:
//   - state 초기화 → Firestore 문서 읽기
//   - 각 액션의 로컬 mutation → Firestore update/transaction
//   - notify() → onSnapshot 리스너가 대체
// ═══════════════════════════════════════════════════════════

import { ROLES, SPECIAL_ROLES } from './state.js';

// ── 게임 설정 (룰) ────────────────────────────────────────
export const CONFIG = {
  startDate: '2026-06-28',      // 게임 1일차 (일요일)
  weeks: 3,
  eliteMultiplier: 2,           // 엘리트 마일리지 배수
  votePenalty: 0.5,             // 투표 적발 시 마일리지 감소율
  roleRevealThreshold: 0.6,     // 역할 공개·능력 박탈: 지목 인원 중 동일 역할 비율 기준
  pacerSynergyPerHead: 50,      // 페이서 시너지: 인원 × 50km
  ghostGaugeShift: 100,         // 고스트 게이지 스킬: 100km 즉시 이동
  singleTeamMin: 3,             // 단일팀 번개 최소 인원
  boltMaxHeads: 4,              // 번개 최대 인원
  abilityLimit: 3,              // 탐정/밀정 능력 사용 횟수
};

// ── 상태 (스냅샷) — 나중에 Firebase 문서로 대체 ────────────
const state = {
  // 게임 전역
  game: {
    gauge: { pacer: 1248, ghost: 956 },  // 팀별 누적 게이지(km)
    dayIndex: 0,                          // 게임 며칠차 (0-base) — 서버시간 대체 예정
  },

  // 나 (현재 플레이어)
  me: {
    id: 'm0',
    name: '나',
    team: 'pacer',                        // 'pacer' | 'ghost'
    role: 'detective',                    // ROLES key
    pureKm: 64,                           // 순수 기여 (보너스 제외)
    boltsCompleted: 7,
    abilityUsed: 0,                       // 탐정/밀정 사용 횟수
    revealed: {},                         // { [playerId]: {team} | {role} } — 능력 확인 결과
    abilityStripped: false,               // 역할 60% 적중 적발 → 능력 박탈됐는지
  },

  // 참가자 (나 제외 목록도 여기 포함)
  players: [
    { id: 'm0', name: '나',    team: 'pacer', role: 'detective', km: 38.2, publicTeam: null },
    { id: 'm1', name: '김민수', team: 'pacer', role: 'elite',     km: 42.3, publicTeam: 'pacer' },
    { id: 'm2', name: '박현우', team: 'ghost', role: 'runner',    km: 38.7, publicTeam: null },
    { id: 'm3', name: '이서연', team: 'ghost', role: 'double',    km: 51.2, publicTeam: null },
    { id: 'm4', name: '정윤아', team: 'pacer', role: 'anchor',    km: 44.1, publicTeam: null },
    { id: 'm5', name: '최준호', team: 'ghost', role: 'spy',       km: 29.8, publicTeam: null },
    { id: 'm6', name: '한지우', team: 'pacer', role: 'runner',    km: 33.5, publicTeam: null },
  ],

  // 번개
  bolts: [
    { id: 'b1', title: '한강 새벽 LSD', place: '반포 잠수교', distance: 8,  pace: '5:30/km', time: '오늘 05:30', hostId: 'm1', participants: ['m1', 'm2'], max: 4, locked: false, status: 'open' },
    { id: 'b2', title: '강남역 번개',   place: '강남역 11번 출구', distance: 5, pace: '6:00/km', time: '오늘 19:00', hostId: 'm3', participants: ['m3'], max: 4, locked: false, status: 'open' },
    { id: 'b3', title: '비밀 작전조',   place: '탄천', distance: 10, pace: '미공개', time: '내일 07:00', hostId: 'm5', participants: ['m2', 'm5', 'm6'], max: 4, locked: true, status: 'open' },
    { id: 'b4', title: '페이서 단합런', place: '올림픽공원', distance: 6, pace: '6:00/km', time: '오늘 20:00', hostId: 'm1', participants: ['m1', 'm4', 'm0'], max: 4, locked: false, status: 'open' },
  ],

  // 내가 참여 중인 번개 (b4 단일팀 데모 — 참여 뷰 진입 시 팀 컬러 글로우 확인용)
  joinedBoltId: 'b4',

  // 투표 — 개별 지목 기록 (각 투표 1건 = 1명분, 더블은 2건 행사 가능)
  vote: {
    ballots: [],     // [{ voterId, targetId, roleGuess: role|null }]
    myVotesUsed: 0,
  },
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
//  SELECTORS — 계산된 값 (화면은 규칙을 몰라도 됨)
// ═══════════════════════════════════════════════════════════

export function getGauge() {
  const { pacer, ghost } = state.game.gauge;
  const total = pacer + ghost || 1;
  return {
    pacer, ghost,
    diff: pacer - ghost,
    leader: pacer === ghost ? null : (pacer > ghost ? 'pacer' : 'ghost'),
    pacerRatio: pacer / total,   // 게이지 바 렌더용 (0~1)
    ghostRatio: ghost / total,
  };
}

// 현재 단계: 탐색전(일~수) / 줄다리기(목~토)
// 지금은 로컬 요일 기반. 나중에 CONFIG.startDate + 서버시간으로 대체.
export function getPhase() {
  const day = new Date().getDay(); // 0=일 … 6=토
  const isTug = day >= 4 && day <= 6;
  return {
    phase: isTug ? 'tug' : 'scout',
    isTug,
    label: isTug ? '줄다리기 진행 중' : '탐색전',
    days: isTug ? '목 · 금 · 토' : '일 · 월 · 화 · 수',
  };
}

export function getMe() {
  return getSnapshot().me;
}

export function getPlayers({ excludeSelf = false } = {}) {
  const list = state.players.map(p => ({ ...p, isSelf: p.id === state.me.id }));
  return excludeSelf ? list.filter(p => !p.isSelf) : list;
}

export function getBolts() {
  return state.bolts.map(b => ({
    ...b,
    count: b.participants.length,
    joined: b.id === state.joinedBoltId,
    hostName: playerById(b.hostId)?.name ?? '?',
    isHost: b.hostId === state.me.id,
    // 단일팀 판정: 참가자 전원이 같은 팀 & 최소 인원 충족
    isSingleTeam: isSingleTeamBolt(b),
  }));
}

export function getJoinedBoltId() {
  return state.joinedBoltId;
}

export function getVote() {
  const me = state.me;
  // 역할(더블) 박탈되면 1표
  const total = (me.role === 'double' && !me.abilityStripped) ? 2 : 1;
  // 지목 표수 집계 (ballots에서 파생)
  const castCount = {};
  for (const b of state.vote.ballots) castCount[b.targetId] = (castCount[b.targetId] || 0) + 1;
  return {
    total,
    used: state.vote.myVotesUsed,
    left: total - state.vote.myVotesUsed,
    castCount,
  };
}

// 능력 남은 횟수 (탐정/밀정만)
export function getAbility() {
  const me = state.me;
  // 역할 적중 적발되면 능력 박탈 → 사용 불가 (이미 확인한 정보는 유지)
  const stripped = me.abilityStripped;
  const isSpecial = (me.role === 'detective' || me.role === 'spy') && !stripped;
  return {
    isSpecial,
    stripped,
    kind: me.role === 'detective' ? 'team' : me.role === 'spy' ? 'role' : null,
    limit: CONFIG.abilityLimit,
    used: me.abilityUsed,
    left: stripped ? 0 : CONFIG.abilityLimit - me.abilityUsed,
    revealed: { ...me.revealed },
  };
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
//  나중에 함수 본문만 Firebase 호출로 교체하면 됨
// ═══════════════════════════════════════════════════════════

// 번개 만들기
export async function createBolt({ title, place, distance, pace, time }) {
  if (state.joinedBoltId) throw new Error('이미 참여 중인 번개가 있습니다');
  const id = 'b' + (state.bolts.length + 1) + '_' + Date.now();
  const bolt = {
    id, title, place,
    distance: Number(distance) || 0,
    pace: pace || '미공개',
    time: time || '',
    hostId: state.me.id,
    participants: [state.me.id],
    max: CONFIG.boltMaxHeads,
    locked: false,
    status: 'open',
  };
  state.bolts.unshift(bolt);
  state.joinedBoltId = id;   // 방장은 자동 참여
  notify();
  return bolt;
}

// 번개 참여
export async function joinBolt(boltId) {
  if (state.joinedBoltId && state.joinedBoltId !== boltId) {
    throw new Error('이미 다른 번개에 참여 중입니다');
  }
  const bolt = state.bolts.find(b => b.id === boltId);
  if (!bolt) throw new Error('번개를 찾을 수 없습니다');
  if (bolt.locked) throw new Error('잠긴 번개입니다');
  if (bolt.participants.length >= bolt.max) throw new Error('정원이 찼습니다');

  if (!bolt.participants.includes(state.me.id)) bolt.participants.push(state.me.id);
  state.joinedBoltId = boltId;
  notify();
  return bolt;
}

// 번개 참여 취소
export async function leaveBolt() {
  const id = state.joinedBoltId;
  if (!id) return;
  const bolt = state.bolts.find(b => b.id === id);
  if (bolt) bolt.participants = bolt.participants.filter(pid => pid !== state.me.id);
  state.joinedBoltId = null;
  notify();
}

// 번개 방 잠금 토글 (방장)
export async function toggleBoltLock(boltId, locked) {
  const bolt = state.bolts.find(b => b.id === boltId);
  if (!bolt) return;
  bolt.locked = locked;
  notify();
}

// 번개 완료 → 마일리지·게이지 반영 (게임의 핵심 규칙)
//   distanceKm: 실제 완주 거리, participantIds: 완주 체크된 참가자
export async function completeBolt(boltId, distanceKm, participantIds, buffMultiplier = 1) {
  const bolt = state.bolts.find(b => b.id === boltId);
  if (!bolt) throw new Error('번개를 찾을 수 없습니다');

  const { isTug } = getPhase();
  const singleTeam = isSingleTeamBolt(bolt);

  participantIds.forEach(pid => {
    const p = playerById(pid);
    if (!p) return;

    // 1) 마일리지 페널티(팀 적발=무조건) / 역할 능력 박탈(역할 60% 적중=조건부) 분리
    const penalized = isPenalized(p);       // 팀 적발 → 마일리지 -50%
    const stripped  = isAbilityStripped(p); // 역할 적중 적발 → 역할 능력 무효
    let km = distanceKm * (singleTeam ? 1 : buffMultiplier); // 혼합팀만 버프 배수 적용
    if (p.role === 'elite' && !stripped) km *= CONFIG.eliteMultiplier;
    if (penalized) km *= CONFIG.votePenalty;

    // 2) 단계별 반영
    if (isTug) {
      // 줄다리기: 상대팀 게이지에서 삭감
      subtractOpponent(p.team, km);
      // 앵커: 달린 만큼 상대팀 추가 삭감 (능력 박탈 시 무효)
      if (p.role === 'anchor' && !stripped) subtractOpponent(p.team, km);
    } else {
      // 탐색전: 내 팀 게이지 1:1 적립
      state.game.gauge[p.team] += km;
      // 앵커: 탐색전에도 상대팀 삭감 (능력 박탈 시 무효)
      if (p.role === 'anchor' && !stripped) subtractOpponent(p.team, km);
    }

    // 개인 순수 누적거리 (보너스 제외한 실제 거리)
    // 방장이 출석 체크한 참가자는 함께 달린 것으로 보고 방장이 달린 거리를 동일 적용
    p.km += distanceKm;
    if (pid === state.me.id) {
      state.me.pureKm += distanceKm;
      state.me.boltsCompleted += 1;
    }
  });

  // 3) 단일팀 고유 스킬
  if (singleTeam) {
    const team = playerById(bolt.participants[0]).team;
    const heads = participantIds.length;
    if (team === 'pacer') {
      state.game.gauge.pacer += heads * CONFIG.pacerSynergyPerHead; // 페이서 시너지
    } else {
      subtractOpponent('ghost', distanceKm);                        // 게이지 삭감 +
      state.game.gauge.ghost += CONFIG.ghostGaugeShift;             // 100km 즉시 이동
    }
  }

  bolt.status = 'done';
  if (state.joinedBoltId === boltId) state.joinedBoltId = null;
  notify();

  const boltTeam = singleTeam ? playerById(bolt.participants[0])?.team ?? null : null;
  return { singleTeam, isTug, distanceKm, buffMultiplier, participantIds, participantCount: participantIds.length, boltTeam };
}

// 투표 지목 — 팀 지목(targetId) + 역할 지목(roleGuess: role|null=기권)
export async function castVote(targetId, roleGuess = null) {
  const v = getVote();
  if (v.left <= 0) throw new Error('투표권을 모두 사용했습니다');
  state.vote.ballots.push({ voterId: state.me.id, targetId, roleGuess: roleGuess || null });
  state.vote.myVotesUsed += 1;
  notify();
  return getVote();
}

// 시뮬레이션: 가상 상대 투표 주입 (역할 60% 합의 시연용)
export function injectVotes(list) {
  list.forEach(({ targetId, roleGuess }) => {
    state.vote.ballots.push({ voterId: `sim-${state.vote.ballots.length}`, targetId, roleGuess: roleGuess || null });
  });
  notify();
}

// 투표 종료 집계 → 팀(무조건) + 역할(60% 적중 조건부) 판정
export async function tallyVote() {
  const ballots = state.vote.ballots;
  if (ballots.length === 0) return null;

  // ① 팀: 지목 표수 최다 (더블의 2건도 각각 1표)
  const teamCount = {};
  for (const b of ballots) teamCount[b.targetId] = (teamCount[b.targetId] || 0) + 1;
  const topId = Object.entries(teamCount).sort((a, b) => b[1] - a[1])[0][0];
  const target = playerById(topId);
  if (!target) return null;

  // 팀 공개 + 마일리지 -50% (무조건)
  target.publicTeam = target.team;
  target.penalized  = true;

  // ② 역할: 대상 지목 인원 중 동일 역할 ≥60% → 실제 역할과 일치 시 공개·박탈
  const targetBallots = ballots.filter(b => b.targetId === topId);
  const roleCount = {};
  for (const b of targetBallots) if (b.roleGuess) roleCount[b.roleGuess] = (roleCount[b.roleGuess] || 0) + 1;
  let consensusRole = null, consensusN = 0;
  for (const [role, n] of Object.entries(roleCount)) if (n > consensusN) { consensusN = n; consensusRole = role; }
  const ratio = consensusRole ? consensusN / targetBallots.length : 0;

  let roleRevealed = false, guessFailed = false, guessedRole = null;
  if (consensusRole && ratio >= CONFIG.roleRevealThreshold) {
    if (consensusRole === target.role) {
      roleRevealed = true;
      target.publicRole      = target.role;   // 역할 공개(박제)
      target.abilityStripped = true;          // 능력 박탈
      if (topId === state.me.id) state.me.abilityStripped = true;
    } else {
      guessFailed = true;                      // 60% 모였지만 오답 → 추리 실패
      guessedRole = consensusRole;
    }
  }

  notify();
  return {
    id: target.id,
    name: target.name,
    team: target.team,
    roleRevealed,
    revealedRole: roleRevealed ? target.role : null,
    guessFailed,
    guessedRole,
  };
}

// 탐정/밀정 능력 사용
export async function useAbility(targetId) {
  const me = state.me;
  if (me.role !== 'detective' && me.role !== 'spy') throw new Error('능력이 없습니다');
  if (me.abilityStripped) throw new Error('적발되어 능력이 박탈되었습니다');
  if (me.abilityUsed >= CONFIG.abilityLimit) throw new Error('사용 횟수를 모두 소진했습니다');
  if (me.revealed[targetId]) return me.revealed[targetId]; // 이미 확인함

  const target = playerById(targetId);
  if (!target) throw new Error('대상을 찾을 수 없습니다');

  const result = me.role === 'detective'
    ? { team: target.team }
    : { role: target.role };

  me.revealed[targetId] = result;
  me.abilityUsed += 1;
  notify();
  return result;
}

// ── 내부 헬퍼 ─────────────────────────────────────────────
function subtractOpponent(myTeam, km) {
  const opp = myTeam === 'pacer' ? 'ghost' : 'pacer';
  state.game.gauge[opp] = Math.max(0, state.game.gauge[opp] - km);
}

function isPenalized(player) {
  return !!player.penalized;        // 팀 적발 → 마일리지 -50%
}

function isAbilityStripped(player) {
  return !!player.abilityStripped;  // 역할 적중 적발 → 역할 능력 무효
}

// 상수 재노출 (화면이 store 하나만 import하면 되도록)
export { ROLES, SPECIAL_ROLES };
