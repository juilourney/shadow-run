// 번개 완료 시 게이지·마일리지 계산 — src/store.js의 completeBolt/getPhase 규칙을 서버로 이전.
// 클라이언트가 게이지 증감량을 보내면 조작 가능하므로(승부 조작), 서버가 실제 번개·역할·설정
// 데이터에서 직접 계산한다. 역할/팀은 항상 서버가 읽은 players 문서 기준(클라 신뢰 안 함).

export const RULES = {
  eliteMultiplier: 2,
  votePenalty: 0.5,
  // 팀 고유 스킬 총 효과 = 인원 × 달린거리 × 5km (양 팀 동일).
  //   페이서 시너지 : 전부 우리 게이지에 적립
  //   고스트 게이지 : 절반을 상대에서 깎고 절반을 우리에게 더함(당겨오기) → 총 스윙 동일
  // 거리를 곱하므로 멀리 뛸수록 보너스도 커진다(4명×10km면 200km로 종전과 동일).
  skillPerHeadKm: 5,
  singleTeamMin: 3,
  expiredPenalty: 0.5,
  fallbackPaceSec: 420,   // 페이스 미공개 시 가정 페이스(초/km) = 7:00
  certBufferMin: 120,     // 인증 마감 버퍼(분)
};

// 버프 카드 풀 — src/screens/bolt-buff.js와 동일(서버가 draw해 항상 ×3 우회를 막는다).
// 결과 화면(bolt-result.js)이 result.card의 시각 속성을 그대로 쓰므로 전체 객체를 보존한다.
export const BUFF_CARDS = [
  { name: '트리플 적립', icon: '×3',   multiplier: 3,   color: '#fb923c', bg: 'rgba(251,146,60,.15)',  border: 'rgba(251,146,60,.35)',  desc: '달린 km ×3 적립 · 이번 번개 최고 버프!' },
  { name: '더블 적립',   icon: '×2',   multiplier: 2,   color: '#38bdf8', bg: 'rgba(56,189,248,.15)',  border: 'rgba(56,189,248,.35)',  desc: '달린 km ×2 적립 · 마일리지 두 배 획득' },
  { name: '1.5배 적립',  icon: '×1.5', multiplier: 1.5, color: '#a78bfa', bg: 'rgba(167,139,250,.12)', border: 'rgba(167,139,250,.3)',  desc: '달린 km ×1.5 적립 · 소소한 행운' },
  { name: '기본 적립',   icon: '×1',   multiplier: 1,   color: '#71717a', bg: 'rgba(113,113,122,.12)', border: 'rgba(113,113,122,.25)', desc: '달린 km 그대로 적립 · 기본 마일리지' },
];
export const PACER_SKILL = { name: '시너지 스킬', icon: '🔥', multiplier: 1, color: '#fb923c', bg: 'rgba(251,146,60,.18)', border: 'rgba(251,146,60,.4)',  desc: '참가자 1명당 추가 km 적립 · 팀 인원이 많을수록 유리' };
export const GHOST_SKILL = { name: '게이지 스킬', icon: '⚔️', multiplier: 1, color: '#fb7185', bg: 'rgba(251,113,133,.15)', border: 'rgba(251,113,133,.35)', desc: '달린 거리만큼 상대 게이지 직접 감소 · 전략형 스킬' };

const opponentOf = team => (team === 'pacer' ? 'ghost' : 'pacer');

// 줄다리기(tug) 여부 — startDate 기준 경과일. getCalendar/getPhase 이식.
// 서버는 UTC라 KST(+9h) 벽시계 날짜로 dayIndex를 계산해 클라(로컬=KST)와 일치시킨다.
// startDate는 일요일(1일차) 기준이므로 dayIndex mod 7 == 4~6(목·금·토)이면 줄다리기.
export function computeIsTug(startDate, nowMs = Date.now()) {
  if (!startDate) return false;
  const kst = new Date(nowMs + 9 * 3600 * 1000);
  const today0 = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate());
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const start0 = Date.UTC(sy, sm - 1, sd);
  const dayIndex = Math.round((today0 - start0) / 86400000);
  const started = dayIndex >= 0;
  const gameDay = ((dayIndex % 7) + 7) % 7;
  return started && gameDay >= 4 && gameDay <= 6;
}

// 번개 인증 마감 시각(ms) — 시작 + 예상완주(거리×페이스) + 버퍼. src/store.js boltDeadline 이식.
export function boltDeadline(bolt) {
  if (!bolt.startAt) return Infinity;
  const m = /^(\d+):(\d+)/.exec(bolt.pace || '');
  const paceSec = m ? Number(m[1]) * 60 + Number(m[2]) : RULES.fallbackPaceSec;
  const runtimeMs = (bolt.distance || 0) * paceSec * 1000;
  return bolt.startAt + runtimeMs + RULES.certBufferMin * 60 * 1000;
}

// 참가자 전원이 같은 팀 & 최소 인원 이상 → 단일팀 번개(팀 고유 스킬 발동).
// bolt.participants(전체) 기준 — src/store.js isSingleTeamBolt와 동일.
export function isSingleTeamBolt(bolt, playerMap) {
  if (!bolt.participants || bolt.participants.length < RULES.singleTeamMin) return false;
  const teams = bolt.participants.map(id => playerMap[id]?.team);
  return teams.every(t => t && t === teams[0]);
}

// 번개 완료 계산 — completeBolt(src/store.js:811~885)의 delta 수식을 그대로 이식.
//  playerMap: { [id]: { team, role, penalized, abilityStripped } } (서버가 읽은 players)
//  반환: { gaugeDelta:{pacer,ghost}, perPlayerKmInc(=distanceKm), singleTeam, boltTeam }
export function computeCompletion({ bolt, playerMap, distanceKm, participantIds, buffMultiplier, isTug }) {
  const singleTeam = isSingleTeamBolt(bolt, playerMap);
  const delta = { pacer: 0, ghost: 0 };

  for (const pid of participantIds) {
    const p = playerMap[pid];
    if (!p) continue;
    const stripped = !!p.abilityStripped;
    let km = distanceKm * (singleTeam ? 1 : buffMultiplier);
    if (p.role === 'elite' && !stripped) km *= RULES.eliteMultiplier;
    if (p.penalized) km *= RULES.votePenalty;

    if (isTug || (p.role === 'anchor' && !stripped)) {
      // 줄다리기 기간엔 "게이지 줄다리기"라는 이름 그대로 전원이 양방향(내 팀 +, 상대 −)으로 움직인다.
      // 앵커는 탐색 기간에도 항상 양방향이라, 탐색 기간에만 일반 러너 대비 차별점을 갖는다.
      delta[p.team] += km;
      delta[opponentOf(p.team)] -= km;
    } else {
      delta[p.team] += km;
    }
  }

  let boltTeam = null;
  if (singleTeam) {
    boltTeam = playerMap[bolt.participants[0]]?.team ?? null;
    const heads = participantIds.length;
    const skill = heads * distanceKm * RULES.skillPerHeadKm;   // 총 효과(양 팀 동일)
    if (boltTeam === 'pacer') {
      delta.pacer += skill;                 // 시너지 — 전부 우리 쪽에 적립
    } else {
      delta.pacer -= skill / 2;             // 게이지 — 절반씩 당겨온다(상대 −, 우리 +)
      delta.ghost += skill / 2;
    }
  }

  return { gaugeDelta: delta, perPlayerKmInc: distanceKm, singleTeam, boltTeam };
}

// 자동 만료 페널티 계산 — sweepExpiredBolts(src/store.js) 이식. 거리 × 50%만 지급.
export function computeExpiry({ bolt, playerMap, isTug }) {
  const km = (bolt.distance || 0) * RULES.expiredPenalty;
  const delta = { pacer: 0, ghost: 0 };
  for (const pid of bolt.participants || []) {
    const p = playerMap[pid];
    if (!p) continue;
    if (isTug) {
      delta[p.team] += km;
      delta[opponentOf(p.team)] -= km;
    } else {
      delta[p.team] += km;
    }
  }
  return { gaugeDelta: delta, perPlayerKmInc: km };
}
