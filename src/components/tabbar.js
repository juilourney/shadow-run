import { goToScreen } from '../utils/nav.js';

const TAB_SCREEN_MAP = { home: 's-dash', bolt: 's-bolt', vote: 's-vote', members: 's-members', guide: 's-guide' };

const TAB_MARKUP = `
  <div class="tab" data-tab="home"><div class="tab-icon"><span class="ti-home-dot"></span></div></div>
  <div class="tab" data-tab="bolt"><div class="tab-icon"><span class="ti-bolt"></span></div></div>
  <div class="tab" data-tab="vote"><div class="tab-icon"><span class="ti-vote"></span></div></div>
  <div class="tab" data-tab="members"><div class="tab-icon"><span class="ti-users"></span></div></div>
  <div class="tab" data-tab="guide"><div class="tab-icon"><span class="ti-book"></span></div></div>
`;

export function createTabbar(mount) {
  const tabbar = document.createElement('div');
  tabbar.id = 'global-tabbar';
  tabbar.className = 'tabbar';
  tabbar.style.display = 'none';
  tabbar.innerHTML = TAB_MARKUP;

  // 탭 선택: 화면 이동 후 즉시 닫힘
  tabbar.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', e => {
      e.stopPropagation();
      goToScreen(TAB_SCREEN_MAP[tab.dataset.tab]);
      tabbar.classList.remove('open');
    });
  });

  // 탭바 본체 클릭(탭 외 영역 또는 peek 상태): 토글
  tabbar.addEventListener('click', () => {
    tabbar.classList.toggle('open');
  });

  mount.appendChild(tabbar);

  // 바깥 터치 → 닫힘
  document.addEventListener('click', e => {
    if (tabbar.classList.contains('open') && !tabbar.contains(e.target)) {
      tabbar.classList.remove('open');
    }
  }, { capture: false });

  return tabbar;
}
