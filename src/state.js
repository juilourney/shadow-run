export const SPECIAL_ROLES = ['elite', 'double', 'anchor', 'spy', 'detective'];

export const ROLES = {
  runner:    { name:'러너',   short:'기본 역할',      headline:'팀의 든든한 기반', detail:'번개에 참여할 때마다 마일리지가 정상 적립됩니다. 꾸준한 참여가 힘이 됩니다.' },
  elite:     { name:'엘리트', short:'마일리지 2배',    headline:'팀의 메인 화력 — 정체를 들키면 위험', detail:'번개 마일리지가 2배 적립됩니다. 투표에서 걸리면 0.5배로 전락하므로 정체 은폐가 핵심.' },
  double:    { name:'더블',   short:'투표권 2표',      headline:'투표로 게임의 판도를 바꿀 수 있는 역할', detail:'투표 시 2표를 행사합니다. 상대팀 핵심 인물을 집중 타격하세요.' },
  anchor:    { name:'앵커',   short:'상대팀 직접 삭감', headline:'달린 만큼 상대팀 마일리지를 직접 깎는다', detail:'번개에 참여할 때마다 내가 달린 거리만큼 상대팀 게이지에서 즉시 삭감됩니다.' },
  spy:       { name:'밀정',   short:'역할 확인 3회',   headline:'상대팀 핵심 인물의 역할을 알아낸다', detail:'3회 제한으로 누가 어느 역할인지 확인할 수 있습니다.' },
  detective: { name:'탐정',   short:'팀 확인 3회',     headline:'의심 인물의 팀 소속을 확인한다', detail:'3회 제한으로 누가 어느 팀인지 확인할 수 있습니다.' },
};

export const state = {
  name: '',
  team: null,        // 'pacer' | 'ghost'
  role: null,        // key of ROLES
  cardFlipped: false,
  roleFlipped: false,
  roleConfirmed: false,
};

// 이름별 팀·역할 배정 저장소 — 같은 이름으로 재입장 시 재추첨 없이 복원
// (추후 Firebase 연동 시 서버 조회로 교체)
const STORAGE_KEY = 'sr_assignments';

function readAll() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}

// 현재 state.name 의 팀·역할을 이름에 묶어 저장
export function saveState() {
  if (!state.name) return;
  const all = readAll();
  all[state.name] = { team: state.team, role: state.role };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

// 해당 이름에 이미 배정된 팀·역할이 있으면 반환, 없으면 null
export function getAssignment(name) {
  const saved = readAll()[name];
  if (saved && saved.team && saved.role) return saved;
  return null;
}
