import { createTabbar }   from './components/tabbar.js';
import { createEdgeBlur } from './components/edge-blur.js';
import { goToScreen, syncTabbarOnScroll, isProgrammaticScroll } from './utils/nav.js';

import * as name       from './screens/name.js';
import * as card       from './screens/card.js';
import * as role       from './screens/role.js';
import * as dash       from './screens/dash.js';
import * as bolt       from './screens/bolt.js';
import * as boltJoin   from './screens/bolt-join.js';
import * as boltDetail from './screens/bolt-detail.js';
import * as boltBuff   from './screens/bolt-buff.js';
import * as boltResult from './screens/bolt-result.js';
import * as vote       from './screens/vote.js';
import * as members    from './screens/members.js';
import * as guide      from './screens/guide.js';
import * as waiting    from './screens/waiting.js';
import * as end        from './screens/end.js';

const INTRO    = [name, card, role, waiting];
const GAME     = [dash, bolt, vote, members, guide];
const OVERLAYS = [boltJoin, boltDetail, boltBuff, boltResult, end];

const app = document.getElementById('app');

// 인트로 화면 (innerHTML으로 한번에)
app.innerHTML = INTRO.map(s => s.render()).join('');

// 고정 배경 orb
const gameBg = document.createElement('div');
gameBg.id = 'game-bg';
gameBg.innerHTML = '<div class="game-orb-a"></div><div class="game-orb-b"></div>';
app.appendChild(gameBg);

// 게임 컨테이너
const gameWrap = document.createElement('div');
gameWrap.id = 's-game';
gameWrap.className = 'game-wrap';
gameWrap.innerHTML = GAME.map(s => s.render()).join('');
app.appendChild(gameWrap);

// 오버레이 화면
OVERLAYS.forEach(s => {
  const tmp = document.createElement('div');
  tmp.innerHTML = s.render();
  app.appendChild(tmp.firstElementChild);
});

[...INTRO, ...GAME, ...OVERLAYS].forEach(s => s.init());

createTabbar(app);
createEdgeBlur(app);

// 수동 스크롤 시 탭 동기화
const SECTION_IDS = ['gs-dash', 'gs-bolt', 'gs-vote', 'gs-members', 'gs-guide'];
const gameObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting && entry.intersectionRatio >= 0.5 && !isProgrammaticScroll()) {
      syncTabbarOnScroll(entry.target.id);
    }
  });
}, { root: null, threshold: 0.5 });

SECTION_IDS.forEach(id => {
  const el = document.getElementById(id);
  if (el) gameObserver.observe(el);
});

// 사파리(브라우저 모드)에서 주소창/툴바가 접히고 펼쳐질 때 뷰포트 높이가
// 변하는데(100dvh 섹션 높이도 함께 변함), iOS는 scroll-snap을 다시 정렬해
// 주지 않아 섹션 경계가 어긋남 → 화면 하단에 다음 섹션 상단이 삐져나옴.
// 뷰포트 리사이즈가 잦아들면 가장 가까운 섹션 시작점으로 즉시 재스냅.
// (PWA standalone은 툴바가 없어 리사이즈 자체가 안 일어남 — 영향 없음)
let _resnapTimer = null;
function resnapNearestSection() {
  if (!document.getElementById('s-game')?.classList.contains('active')) return;
  if (document.documentElement.classList.contains('lock-scroll')) return;

  let nearest = null, minDist = Infinity;
  for (const id of SECTION_IDS) {
    const el = document.getElementById(id);
    if (!el) continue;
    const dist = Math.abs(el.getBoundingClientRect().top);
    if (dist < minDist) { minDist = dist; nearest = el; }
  }
  if (nearest && minDist > 2) {
    window.scrollTo({ top: window.scrollY + nearest.getBoundingClientRect().top, behavior: 'instant' });
  }
}
function onViewportResize() {
  clearTimeout(_resnapTimer);
  _resnapTimer = setTimeout(resnapNearestSection, 250);
}
window.addEventListener('resize', onViewportResize);
window.visualViewport?.addEventListener('resize', onViewportResize);

// iOS WebKit에서 내부 scroll-body 가 상단/하단 경계에 닿았을 때
// 외부 scroll-snap으로 touch가 전파되지 않는 문제를 JS로 보완
document.querySelectorAll('.game-section .scroll-body').forEach(body => {
  const section = body.closest('.game-section');
  let startY = 0;
  let chaining = false;

  body.addEventListener('touchstart', e => {
    startY = e.touches[0].clientY;
    chaining = false;
  }, { passive: true });

  body.addEventListener('touchmove', e => {
    if (chaining) return;

    // 내용이 화면에 다 들어오는 섹션은 네이티브 scroll-snap이 처리 →
    // JS 체이닝을 돌리면 이중 스크롤로 튐. 실제 내부 스크롤이 있을 때만 보완.
    if (body.scrollHeight <= body.clientHeight + 2) return;

    const dy = e.touches[0].clientY - startY;
    const idx = SECTION_IDS.indexOf(section.id);
    if (idx === -1) return;

    const atTop    = body.scrollTop <= 0;
    const atBottom = body.scrollHeight - body.scrollTop <= body.clientHeight + 2;

    if (atTop && dy > 8 && idx > 0) {
      chaining = true;
      document.getElementById(SECTION_IDS[idx - 1])?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (atBottom && dy < -8 && idx < SECTION_IDS.length - 1) {
      chaining = true;
      document.getElementById(SECTION_IDS[idx + 1])?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, { passive: true });
});

goToScreen('s-name');
