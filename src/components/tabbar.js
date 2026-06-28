import { goToScreen } from '../utils/nav.js';

// 탭 → 화면 id 매핑
const TAB_SCREEN_MAP = { home: 's-dash', bolt: 's-bolt', vote: 's-vote', members: 's-members', guide: 's-guide' };

const TAB_MARKUP = `
  <div class="tab" data-tab="home"><div class="tab-icon"><span class="ti-home-dot"></span></div><span>홈</span></div>
  <div class="tab" data-tab="bolt"><div class="tab-icon"><span class="ti-bolt"></span></div><span>번개</span></div>
  <div class="tab" data-tab="vote"><div class="tab-icon"><span class="ti-vote"></span></div><span>투표</span></div>
  <div class="tab" data-tab="members"><div class="tab-icon"><span class="ti-users"></span></div><span>참가자</span></div>
  <div class="tab" data-tab="guide"><div class="tab-icon"><span class="ti-book"></span></div><span>가이드</span></div>
`;

// 전역 탭바 — 단일 요소, 화면 전환 시 고정
export function createTabbar(mount) {
  const tabbar = document.createElement('div');
  tabbar.id = 'global-tabbar';
  tabbar.className = 'tabbar';
  tabbar.style.cssText = 'display:none;';
  tabbar.innerHTML = TAB_MARKUP;
  tabbar.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => goToScreen(TAB_SCREEN_MAP[tab.dataset.tab]));
  });
  mount.appendChild(tabbar);

  // safe area 채우개 — 탭바 아래 safe area 구역을 동일한 glass 배경으로 메워
  // 탭바가 보일 때 같이 보이고, 숨길 때 같이 숨김
  const safeFill = document.createElement('div');
  safeFill.id = 'tabbar-safe-fill';
  mount.appendChild(safeFill);

  return tabbar;
}
