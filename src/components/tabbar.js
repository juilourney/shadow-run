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
  mount.appendChild(tabbar);

  // 볼록한 손잡이 — 평소엔 이것만 보이고, 누르면 탭바가 나옴
  const handle = document.createElement('div');
  handle.id = 'tabbar-handle';
  handle.style.display = 'none';
  handle.innerHTML = '<span class="handle-grip"></span>';
  mount.appendChild(handle);

  const open  = () => { tabbar.classList.add('open');    handle.classList.add('hidden'); };
  const close = () => { tabbar.classList.remove('open'); handle.classList.remove('hidden'); };

  // 손잡이 터치 → 탭바 펼침
  handle.addEventListener('click', e => { e.stopPropagation(); open(); });

  // 탭 선택 → 화면 이동 후 즉시 닫힘
  tabbar.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', e => {
      e.stopPropagation();
      goToScreen(TAB_SCREEN_MAP[tab.dataset.tab]);
      close();
    });
  });

  // 바깥 터치 → 닫힘
  document.addEventListener('click', e => {
    if (tabbar.classList.contains('open') && !tabbar.contains(e.target) && e.target !== handle) {
      close();
    }
  });

  return tabbar;
}
