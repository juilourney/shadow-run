// ═══════════════════════════════════════════════════════════
//  공용 게임 규칙 — 참가자 앱(src/)과 서버(functions/)가 함께 import하는 단일 원본.
//  역할·수치를 바꾸거나 추가할 때는 이 파일만 고치면 양쪽에 동시에 반영된다.
//  (브라우저는 /shared/rules.js로, Pages Functions는 번들 시 상대경로로 불러온다)
//  팀·역할 '배정 결과'는 비밀이라 여기 두지 않는다 — secrets/assignment(서버 전용)에만.
// ═══════════════════════════════════════════════════════════

export const RULES = {
  eliteMultiplier: 2,           // 엘리트 마일리지 배수
  votePenalty: 0.5,             // 투표 적발 시 마일리지 감소율
  penaltyClearBolts: 3,         // 적발 후 이만큼 번개를 완주(인증)하면 페널티 자동 해제
  roleRevealThreshold: 0.6,     // 역할 공개·능력 박탈: 지목 인원 중 동일 역할 비율 기준
  voteMinRatio: 0.3,            // 페널티 최소 기준: 전체 표의 30% 이상 + 단독 1위여야 적발
  // 팀 고유 스킬 총 효과 = 인원 × 달린거리 × 5km (양 팀 동일).
  //   페이서 시너지 : 전부 우리 게이지에 적립
  //   고스트 게이지 : 절반을 상대에서 깎고 절반을 우리에게 더함(당겨오기) → 총 스윙 동일
  skillPerHeadKm: 5,
  runningMateSkillMult: 2,      // 러닝메이트가 낀 단일팀 번개 → 팀 스킬 ×이 값(히든 축포)
  singleTeamMin: 3,             // 단일팀 번개 최소 인원
  boltMaxHeads: 4,              // 번개 최대 인원
  abilityWeeklyLimit: 3,        // 탐정/밀정 능력 사용 횟수 — 주(1~3주차)당 한도, 매주 초기화
  certBufferMin: 120,           // 인증 마감 버퍼(분) — 예상 완주시간 뒤 여유
  fallbackPaceSec: 420,         // 페이스 미공개 시 가정 페이스(초/km) = 7:00
};

// 배정 순서 — 각 팀을 섞은 뒤 앞에서부터 이 순서대로 특수역할을 주고 나머지는 러너.
export const SPECIAL_ROLES = ['elite', 'anchor', 'double', 'detective', 'spy'];

export const ROLES = {
  runner:    { name:'러너',   short:'기본 역할',      headline:'팀의 든든한 기반', detail:'번개에 참여할 때마다 마일리지가 정상 적립됩니다. 꾸준한 참여가 힘이 됩니다.' },
  elite:     { name:'엘리트', short:'마일리지 2배',    headline:'팀의 메인 화력 — 정체를 들키면 위험', detail:'번개 마일리지가 2배 적립됩니다. 투표로 역할까지 밝혀지면 2배가 박탈되고 마일리지도 절반이 되어 0.5배로 전락하므로 정체 은폐가 핵심.' },
  double:    { name:'더블',   short:'투표권 2표',      headline:'투표로 게임의 판도를 바꿀 수 있는 역할', detail:'투표 시 2표를 행사합니다. 상대팀 핵심 인물을 집중 타격하세요.' },
  anchor:    { name:'앵커',   short:'게이지를 끌어온다', headline:'달린 거리만큼 게이지를 통째로 끌어온다', detail:'번개에서 얻은 마일리지(버프 포함)만큼 내 팀 게이지에 더하는 동시에 상대팀 게이지에서도 깎아, 양방향으로 게이지를 움직입니다. 예: 20km면 내 팀 +20 / 상대 −20.' },
  spy:       { name:'밀정',   short:'역할 확인 주 2회', headline:'상대팀 핵심 인물의 역할을 알아낸다', detail:'주 2회 제한으로 누가 어느 역할인지 확인할 수 있습니다.' },
  detective: { name:'탐정',   short:'팀 확인 주 2회',   headline:'의심 인물의 팀 소속을 확인한다', detail:'주 2회 제한으로 누가 어느 팀인지 확인할 수 있습니다.' },
};
