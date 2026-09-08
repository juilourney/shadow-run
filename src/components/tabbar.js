import { scrollToSection } from '../utils/nav.js';

const TAB_SECTION_MAP = { home: 'gs-dash', bolt: 'gs-bolt', vote: 'gs-vote', members: 'gs-members', guide: 'gs-guide' };

const TAB_MARKUP = `
  <div class="tab" data-tab="home"><div class="tab-icon"><span class="ti-home-dot"></span></div></div>
  <div class="tab" data-tab="bolt"><div class="tab-icon"><span class="ti-bolt"></span></div></div>
  <div class="tab" data-tab="vote"><div class="tab-icon"><span class="ti-vote"></span></div></div>
  <div class="tab" data-tab="members"><div class="tab-icon"><span class="ti-users"></span></div></div>
  <div class="tab" data-tab="guide"><div class="tab-icon"><span class="ti-book"></span></div></div>
`;

// 하단 가운데 플로팅 탭바. 예전엔 오른쪽 가장자리 손잡이를 당겨 여는 사이드 메뉴였는데,
// 좌우 스와이프로 섹션을 넘기게 되면서 "지금 어느 탭인지"를 항상 보여주는 역할이 커졌다.
// 열고 닫는 개념이 없어져 손잡이·idle 타이머·바깥 터치 닫기가 전부 사라졌다.
export function createTabbar(mount) {
  const wrap = document.createElement('div');
  wrap.id = 'tabbar-wrap';
  wrap.style.display = 'none';

  const tabbar = document.createElement('div');
  tabbar.id = 'global-tabbar';
  tabbar.className = 'tabbar';
  tabbar.innerHTML = `<div id="tabbar-pill"></div>${TAB_MARKUP}`;

  wrap.appendChild(tabbar);
  mount.appendChild(wrap);

  tabbar.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', e => {
      e.stopPropagation();
      scrollToSection(TAB_SECTION_MAP[tab.dataset.tab]);
    });
  });

  return tabbar;
}
