export const SPECIAL_ROLES = ['elite', 'double', 'anchor', 'spy', 'detective'];

export const ROLES = {
  runner:    { name:'러너',   short:'기본 역할',      headline:'팀의 든든한 기반', detail:'번개에 참여할 때마다 마일리지가 정상 적립됩니다. 꾸준한 참여가 힘이 됩니다.' },
  elite:     { name:'엘리트', short:'마일리지 2배',    headline:'팀의 메인 화력 — 정체를 들키면 위험', detail:'번개 마일리지가 2배 적립됩니다. 투표에서 걸리면 0.5배로 전락하므로 정체 은폐가 핵심.' },
  double:    { name:'더블',   short:'투표권 2표',      headline:'투표로 게임의 판도를 바꿀 수 있는 역할', detail:'투표 시 2표를 행사합니다. 상대팀 핵심 인물을 집중 타격하세요.' },
  anchor:    { name:'앵커',   short:'게이지를 끌어온다', headline:'달린 거리만큼 게이지를 통째로 끌어온다', detail:'번개에서 얻은 마일리지(버프 포함)만큼 상대팀 게이지에서 깎는 동시에 내 팀 게이지에 더합니다. 줄다리기 기간(목~토)에는 상대에게서 깎는 양이 2배가 됩니다. 예: 20km면 탐색 기간엔 상대 −20/내 팀 +20, 줄다리기 기간엔 상대 −40/내 팀 +20.' },
  spy:       { name:'밀정',   short:'역할 확인 주 2회', headline:'상대팀 핵심 인물의 역할을 알아낸다', detail:'주 2회 제한으로 누가 어느 역할인지 확인할 수 있습니다.' },
  detective: { name:'탐정',   short:'팀 확인 주 2회',   headline:'의심 인물의 팀 소속을 확인한다', detail:'주 2회 제한으로 누가 어느 팀인지 확인할 수 있습니다.' },
};

export const state = {
  name: '',
  team: null,        // 'pacer' | 'ghost'
  role: null,        // key of ROLES
  cardFlipped: false,
  roleFlipped: false,
  roleConfirmed: false,
};
