// 역할 정의는 서버와 공용 — shared/rules.js 한 곳에서 관리한다.
export { ROLES, SPECIAL_ROLES } from '../shared/rules.js';

export const state = {
  name: '',
  team: null,        // 'pacer' | 'ghost'
  role: null,        // key of ROLES
  cardFlipped: false,
  roleFlipped: false,
  roleConfirmed: false,
};
