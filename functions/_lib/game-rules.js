// 번개 완료 시 게이지·마일리지 계산 — src/store.js의 completeBolt/getPhase 규칙을 서버로 이전.
// 클라이언트가 게이지 증감량을 보내면 조작 가능하므로(승부 조작), 서버가 실제 번개·역할·설정
// 데이터에서 직접 계산한다. 역할/팀은 항상 서버가 읽은 players 문서 기준(클라 신뢰 안 함).

export const RULES = {
  eliteMultiplier: 2,
  votePenalty: 0.5,
  penaltyClearBolts: 3,   // 적발 후 이만큼 번개를 완주(인증)하면 페널티 해제 (src/store.js CONFIG와 동일)
  // 팀 고유 스킬 총 효과 = 인원 × 달린거리 × 5km (양 팀 동일).
  //   페이서 시너지 : 전부 우리 게이지에 적립
  //   고스트 게이지 : 절반을 상대에서 깎고 절반을 우리에게 더함(당겨오기) → 총 스윙 동일
  // 거리를 곱하므로 멀리 뛸수록 보너스도 커진다(4명×10km면 200km로 종전과 동일).
  skillPerHeadKm: 5,
  runningMateSkillMult: 2,  // 러닝메이트가 낀 단일팀 번개 → 팀 스킬 ×이 값(히든 축포)
  singleTeamMin: 3,
  fallbackPaceSec: 420,   // 페이스 미공개 시 가정 페이스(초/km) = 7:00
  certBufferMin: 120,     // 인증 마감 버퍼(분)
  abilityWeeklyLimit: 3,  // 탐정/밀정 주당 사용 한도 (src/store.js CONFIG와 동일)
  roleRevealThreshold: 0.6, // 역할 공개·능력 박탈 기준 (동일)
  voteMinRatio: 0.3,      // 적발 최소 득표 비율 (동일)
};

// 현재 주차(1~weeks). 시작 전이면 0. src/store.js getCalendar().week와 같은 식이며,
// computeIsTug와 동일하게 KST 벽시계 날짜로 계산해 클라이언트와 일치시킨다.
export function computeWeek(startDate, weeks = 3, nowMs = Date.now()) {
  if (!startDate) return 0;
  const kst = new Date(nowMs + 9 * 3600 * 1000);
  const today0 = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate());
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const start0 = Date.UTC(sy, sm - 1, sd);
  const dayIndex = Math.round((today0 - start0) / 86400000);
  if (dayIndex < 0) return 0;
  return Math.min(weeks, Math.floor(dayIndex / 7) + 1);
}

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
// 혼자 달린 번개(참가자 1명) — 버프 미적용, 실제 거리만 ×1 적립.
export const SOLO_CARD = { name: '혼자 달림', icon: '×1', multiplier: 1, color: '#71717a', bg: 'rgba(113,113,122,.12)', border: 'rgba(113,113,122,.25)', desc: '혼자 달린 번개는 버프 없이 실제 거리만 적립됩니다' };
// 러닝메이트가 낀 단일팀 번개 — 팀 스킬 ×N 발동. 결과 화면엔 '축포' 카드로 뜨고(발동은 공개·축하),
// 누가 러닝메이트인지는 드러내지 않는다(정체만 비공개).
export const RUNNING_MATE_CARD = { name: '러닝메이트', icon: '🎆', multiplier: 1, color: '#fbbf24', bg: 'rgba(251,191,36,.15)', border: 'rgba(251,191,36,.4)', desc: '러닝메이트의 기운이 터졌다!' };
// 러닝메이트가 낀 혼합팀 번개 — 참가자 수만큼 배수(multiplier는 complete-bolt가 인원수로 채움).
export const RUNNING_MATE_MIX_CARD = { name: '러닝메이트', icon: '🤝', multiplier: 1, color: '#34d399', bg: 'rgba(52,211,153,.15)', border: 'rgba(52,211,153,.4)', desc: '러닝메이트가 함께 달렸습니다 · 함께 달린 인원만큼 배수 적립' };

// 인증자 중 러닝메이트가 1명 이상인가. 단일팀 팀 스킬 ×N 발동·축포 카드 판정에 쓴다.
// (엘리트·앵커에는 러닝메이트 태그가 안 붙으므로 그들은 러닝메이트가 아니다)
export function hasRunningMate(ids, playerMap) {
  return !!ids && ids.some(id => playerMap[id]?.runningMate);
}

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
// 기준은 '등록 인원'이 아니라 실제로 뛰고 인증한 사람(ids) — 등록만 해두고 안 온 사람이
// 판정에 섞이면, 혼자 뛴 번개에 버프가 붙는 식으로 어긋난다.
export function isSingleTeamBolt(ids, playerMap) {
  if (!ids || ids.length < RULES.singleTeamMin) return false;
  const teams = ids.map(id => playerMap[id]?.team);
  return teams.every(t => t && t === teams[0]);
}

// 번개 완료 계산 — completeBolt(src/store.js:811~885)의 delta 수식을 그대로 이식.
//  playerMap: { [id]: { team, role, penalized, abilityStripped } } (서버가 읽은 players)
//  반환: { gaugeDelta:{pacer,ghost}, perPlayerKmInc(=distanceKm), singleTeam, boltTeam }
export function computeCompletion({ bolt, playerMap, distanceKm, participantIds, buffMultiplier, isTug }) {
  const singleTeam = isSingleTeamBolt(participantIds, playerMap);
  const rm = hasRunningMate(participantIds, playerMap);
  // 러닝메이트 효과는 팀 구성에 따라 둘로 갈린다:
  //  · 혼합팀(mixedRM): 인원수 배수(buffMultiplier에 인원수가 담겨 옴) + 엘리트 ×2·앵커 양방향 무효
  //  · 단일팀: 팀 스킬 ×N (아래 skill 블록에서 rmBoost로 반영), 엘리트·앵커는 정상 동작
  const mixedRM = rm && !singleTeam;
  const delta = { pacer: 0, ghost: 0 };

  for (const pid of participantIds) {
    const p = playerMap[pid];
    if (!p) continue;
    const stripped = !!p.abilityStripped;
    let km = distanceKm * (singleTeam ? 1 : buffMultiplier);
    if (!mixedRM && p.role === 'elite' && !stripped) km *= RULES.eliteMultiplier;
    if (p.penalized) km *= RULES.votePenalty;

    // 앵커 양방향은 혼합팀 러닝메이트 발동 시 무효(러닝메이트 우선). 줄다리기 기간 양방향은
    // 기간 규칙이라 러닝메이트와 무관하게 유지된다.
    const bidirectional = isTug || (!mixedRM && p.role === 'anchor' && !stripped);
    if (bidirectional) {
      delta[p.team] += km;
      delta[opponentOf(p.team)] -= km;
    } else {
      delta[p.team] += km;
    }
  }

  let boltTeam = null;
  if (singleTeam) {
    boltTeam = playerMap[participantIds[0]]?.team ?? null;
    const heads = participantIds.length;
    // 러닝메이트가 낀 단일팀 번개는 팀 스킬 ×N(축포). 배수만 커질 뿐 정체는 드러나지 않는다.
    const skill = heads * distanceKm * RULES.skillPerHeadKm * (rm ? RULES.runningMateSkillMult : 1);
    if (boltTeam === 'pacer') {
      delta.pacer += skill;                 // 시너지 — 전부 우리 쪽에 적립
    } else {
      delta.pacer -= skill / 2;             // 게이지 — 절반씩 당겨온다(상대 −, 우리 +)
      delta.ghost += skill / 2;
    }
  }

  return { gaugeDelta: delta, perPlayerKmInc: distanceKm, singleTeam, boltTeam };
}
