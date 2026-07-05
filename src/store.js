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

  // 나 (현재 플레이어) — 신원·팀·역할·거리는 players[myId]가 단일 출처.
  // 여기엔 '나만의 개인 상태'만 둔다.
  me: {
    id: 'm0',
    boltsCompleted: 7,
    abilityUsed: 0,                       // 탐정/밀정 사용 횟수
    revealed: {},                         // { [playerId]: {team} | {role} } — 능력 확인 결과
  },

  // 참가자 (나 포함) — 신원·팀·역할·누적거리의 단일 출처
  players: [
    { id: 'm0', name: '나',    team: 'pacer', role: 'detective', km: 64,   publicTeam: null },
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

  // 타임라인 — 전체 공개 주요 이벤트만 (개별 번개 완료 등 잡다한 정보는 제외).
  // kind로 종류만 구분해 데이터로 두고, 화면(dash.js)이 팀/역할 색을 입혀 렌더.
  // 목업 시연용 초기 데이터 — 최신이 배열 앞
  timeline: [
    { kind: 'role', name: '이서연', role: 'double',   at: Date.now() - 10 * 60 * 1000 },
    { kind: 'team', name: '이서연', team: 'ghost',    at: Date.now() - 11 * 60 * 1000 },
    { kind: 'fail',                                   at: Date.now() - 27 * 60 * 60 * 1000 },
    { kind: 'team', name: '박현우', team: 'ghost',    at: Date.now() - 53 * 60 * 60 * 1000 },
    { kind: 'role', name: '김민수', role: 'elite',    at: Date.now() - 73 * 60 * 60 * 1000 },
    { kind: 'team', name: '김민수', team: 'pacer',    at: Date.now() - 74 * 60 * 60 * 1000 },
  ],   // [{ kind: 'team'|'role'|'fail', name?, team?, role?, at }]
};

function pushTimelineEvent(entry) {
  state.timeline.unshift({ ...entry, at: Date.now() });
}

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

// 게임 캘린더 — CONFIG.startDate + weeks 를 단일 출처로 파생값 계산.
// 나중에 관리자 페이지에서 startDate/weeks만 바꾸면 전체가 따라 움직인다.
export function getCalendar(now = new Date()) {
  const [y, m, d] = CONFIG.startDate.split('-').map(Number);
  const start = new Date(y, m - 1, d);                 // 게임 1일차 00:00 (로컬)
  const totalDays = CONFIG.weeks * 7;
  const end = new Date(start);
  end.setDate(start.getDate() + totalDays);            // 종료 경계(마지막날 다음 00:00)

  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayIndex = Math.round((today0 - start) / 86400000); // 경과일 (0-base)
  const started = dayIndex >= 0;
  const ended = dayIndex >= totalDays;
  const week = !started ? 0 : (ended ? CONFIG.weeks : Math.floor(dayIndex / 7) + 1);
  const dday = Math.ceil((end - today0) / 86400000);   // 종료까지 남은 일수 → 헤더 D-N
  const monthLabel = `${now.getFullYear()} ${now.toLocaleDateString('en-US', { month: 'long' })}`;

  return { start, end, dayIndex, totalDays, week, weeks: CONFIG.weeks, started, ended, dday, monthLabel };
}

// 현재 단계: 탐색전(1~4일차) / 줄다리기(5~7일차) — 실제 요일이 아니라
// CONFIG.startDate 기준 경과일(dayIndex % 7)로 판정. 이래야 startDate를
// 어떤 요일로 바꾸든 항상 같은 주기로 맞물린다(실제 요일과 무관).
export function getPhase(now = new Date()) {
  const cal = getCalendar(now);
  const gameDay = ((cal.dayIndex % 7) + 7) % 7; // 0~6, 게임 시작일 기준 그 주의 며칠째
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

export function getMe() {
  const p = playerById(state.me.id);
  return {
    ...structuredClone(p),               // id·name·team·role·km·publicTeam·penalized·publicRole·abilityStripped
    pureKm: p.km,                         // 대시보드 등 기존 코드 호환용 별칭
    boltsCompleted: state.me.boltsCompleted,
    abilityUsed: state.me.abilityUsed,
    revealed: { ...state.me.revealed },
    abilityStripped: !!p.abilityStripped,
  };
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
  const meP = playerById(state.me.id);
  // 역할(더블) 박탈되면 1표
  const total = (meP.role === 'double' && !meP.abilityStripped) ? 2 : 1;
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
  const meP = playerById(state.me.id);
  // 역할 적중 적발되면 능력 박탈 → 사용 불가 (이미 확인한 정보는 유지)
  const stripped = !!meP.abilityStripped;
  const isSpecial = (meP.role === 'detective' || meP.role === 'spy') && !stripped;
  return {
    isSpecial,
    stripped,
    kind: meP.role === 'detective' ? 'team' : meP.role === 'spy' ? 'role' : null,
    limit: CONFIG.abilityLimit,
    used: state.me.abilityUsed,
    left: stripped ? 0 : CONFIG.abilityLimit - state.me.abilityUsed,
    revealed: { ...state.me.revealed },
  };
}

// 타임라인 — 전체 공개 주요 이벤트, 최신순
export function getTimeline() {
  return state.timeline.map(e => ({ ...e }));
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

    // 2) 게이지 반영
    if (p.role === 'anchor' && !stripped) {
      // 앵커: 끌어온다 — 버프 반영된 km만큼 내 팀 +km AND 상대 −km (단계·배수 무관)
      state.game.gauge[p.team] += km;
      subtractOpponent(p.team, km);
    } else if (isTug) {
      // 줄다리기: 상대팀 게이지에서 삭감
      subtractOpponent(p.team, km);
    } else {
      // 탐색전: 내 팀 게이지 1:1 적립
      state.game.gauge[p.team] += km;
    }

    // 개인 순수 누적거리 (보너스 제외한 실제 거리) — players가 단일 출처
    // 방장이 출석 체크한 참가자는 함께 달린 것으로 보고 방장이 달린 거리를 동일 적용
    p.km += distanceKm;
    if (pid === state.me.id) {
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

// 투표 지목 — '이 사람은 상대팀'이라는 추측 (+ 역할 지목: role|null=기권)
// 지목자의 팀을 함께 기록 → 집계 때 '실제로 상대팀이었는지(적중)' 판정에 사용
export async function castVote(targetId, roleGuess = null) {
  const v = getVote();
  if (v.left <= 0) throw new Error('투표권을 모두 사용했습니다');
  const myTeam = playerById(state.me.id).team;
  state.vote.ballots.push({ voterId: state.me.id, voterTeam: myTeam, targetId, roleGuess: roleGuess || null });
  state.vote.myVotesUsed += 1;
  notify();
  return getVote();
}

// 시뮬레이션: 가상 상대 투표 주입
// voterTeam 미지정 시 대상의 상대팀으로 기록(=팀 적중 투표) — 기존 시연 흐름 유지
export function injectVotes(list) {
  list.forEach(({ targetId, roleGuess, voterTeam }) => {
    const target = playerById(targetId);
    const vt = voterTeam ?? (target?.team === 'pacer' ? 'ghost' : 'pacer');
    state.vote.ballots.push({ voterId: `sim-${state.vote.ballots.length}`, voterTeam: vt, targetId, roleGuess: roleGuess || null });
  });
  notify();
}

// 투표 종료 집계 → 팀(무조건) + 역할(60% 적중 조건부) 판정
//   동점이면 최다 득표자를 모두 적발. 역할은 각 대상별로 독립 판정.
export async function tallyVote() {
  const ballots = state.vote.ballots;
  if (ballots.length === 0) return null;

  // ① 팀: 지목 표수 최다 (더블의 2건도 각각 1표) — 동점자 전원
  const teamCount = {};
  for (const b of ballots) teamCount[b.targetId] = (teamCount[b.targetId] || 0) + 1;
  const maxCount = Math.max(...Object.values(teamCount));
  const topIds = Object.keys(teamCount).filter(id => teamCount[id] === maxCount);

  const caught = [];
  for (const topId of topIds) {
    const target = playerById(topId);
    if (!target) continue;

    const targetBallots = ballots.filter(b => b.targetId === topId);

    // ② 팀 적중 판정 — 투표는 '이 사람이 상대팀'이라는 추측.
    //    지목자 과반이 실제 상대팀을 지목했을 때만 팀 공개 + 마일리지 -50%.
    //    과반 미달(팀을 못 맞힘)이면 팀 비공개·페널티 없음 → '적발 실패'.
    const correctN = targetBallots.filter(b => b.voterTeam && b.voterTeam !== target.team).length;
    const teamCaught = correctN > targetBallots.length / 2;
    if (teamCaught) {
      target.publicTeam = target.team;
      target.penalized  = true;
    }

    // ③ 역할 판정 — 팀 적중 여부와 무관하게 독립 진행.
    //    팀을 못 맞혔어도 역할(구체적 행동 패턴 등)은 따로 맞힐 수 있음.
    //    지목 인원 중 동일 역할 ≥60% AND 실제 일치 → 공개·박탈(마일리지 페널티와 별개 플래그)
    let roleRevealed = false, guessFailed = false, guessedRole = null;
    const roleCount = {};
    for (const b of targetBallots) if (b.roleGuess) roleCount[b.roleGuess] = (roleCount[b.roleGuess] || 0) + 1;
    let consensusRole = null, consensusN = 0;
    for (const [role, n] of Object.entries(roleCount)) if (n > consensusN) { consensusN = n; consensusRole = role; }
    const ratio = consensusRole ? consensusN / targetBallots.length : 0;

    if (consensusRole && ratio >= CONFIG.roleRevealThreshold) {
      if (consensusRole === target.role) {
        roleRevealed = true;
        target.publicRole      = target.role;   // 역할 공개(박제)
        target.abilityStripped = true;          // 능력 박탈 (내가 대상이면 players[me]에 반영됨)
      } else {
        guessFailed = true;                      // 60% 모였지만 오답 → 추리 실패
        guessedRole = consensusRole;
      }
    }

    caught.push({
      id: target.id,
      name: target.name,
      teamCaught,
      team: teamCaught ? target.team : null,   // 적발 실패 시 팀 정보 비노출
      roleRevealed,
      revealedRole: roleRevealed ? target.role : null,
      guessFailed,
      guessedRole,
    });
  }

  if (caught.length === 0) return null;
  const result = { tie: caught.length > 1, caught };

  // 타임라인 기록 — 전체 공개된 사실만 (적발 실패는 대상 비노출)
  let anyReveal = false;
  for (const c of caught) {
    if (c.teamCaught) {
      pushTimelineEvent({ kind: 'team', name: c.name, team: c.team });
      anyReveal = true;
    }
    if (c.roleRevealed) {
      pushTimelineEvent({ kind: 'role', name: c.name, role: c.revealedRole });
      anyReveal = true;
    }
  }
  if (!anyReveal) {
    pushTimelineEvent({ kind: 'fail' });
  }

  // 라운드 종료 — 다음 회차를 위해 표 초기화
  // (팀 공개·마일리지 페널티·역할 박탈 등 적발 결과는 players에 영구 반영되어 유지됨)
  state.vote.ballots = [];
  state.vote.myVotesUsed = 0;

  notify();
  return result;
}

// 탐정/밀정 능력 사용
export async function useAbility(targetId) {
  const meP = playerById(state.me.id);
  if (meP.role !== 'detective' && meP.role !== 'spy') throw new Error('능력이 없습니다');
  if (meP.abilityStripped) throw new Error('적발되어 능력이 박탈되었습니다');
  if (state.me.abilityUsed >= CONFIG.abilityLimit) throw new Error('사용 횟수를 모두 소진했습니다');
  if (state.me.revealed[targetId]) return state.me.revealed[targetId]; // 이미 확인함

  const target = playerById(targetId);
  if (!target) throw new Error('대상을 찾을 수 없습니다');

  const result = meP.role === 'detective'
    ? { team: target.team }
    : { role: target.role };

  state.me.revealed[targetId] = result;
  state.me.abilityUsed += 1;
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
