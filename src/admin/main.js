import * as login     from './screens/login.js';
import * as dashboard from './screens/dashboard.js';
import * as certs     from './screens/certs.js';
import * as roster    from './screens/roster.js';
import * as settings  from './screens/settings.js';

// 본게임과 같은 상하 스냅 슬라이드 구조 — 메뉴는 오른쪽 플로팅 탭바로 이동
const PANELS = [
  { key: 'dashboard', icon: '🏠', label: '대시보드',   mod: dashboard },
  { key: 'certs',     icon: '🧾', label: '인증 관리',  mod: certs },
  { key: 'roster',    icon: '👥', label: '참가자 명단', mod: roster },
  { key: 'settings',  icon: '⚙️', label: '게임 설정',  mod: settings },
];

const AUTH_KEY = 'sr_admin_auth';
const app = document.getElementById('admin-app');

app.innerHTML = `
  ${login.render()}
  <div id="admin-scroll">
    ${PANELS.map(p => `<section class="admin-section">${p.mod.render()}</section>`).join('')}
  </div>
  <div id="admin-tab-handle"><span></span></div>
  <div id="admin-tabbar">
    ${PANELS.map((p, i) => `<div class="admin-side-tab" data-i="${i}" title="${p.label}">${p.icon}</div>`).join('')}
  </div>`;

const outer  = document.getElementById('admin-scroll');
const tabbar = document.getElementById('admin-tabbar');
const handle = document.getElementById('admin-tab-handle');

function paintTabs(index) {
  tabbar.querySelectorAll('.admin-side-tab').forEach((t, i) => t.classList.toggle('on', i === index));
}

const openMenu  = () => { tabbar.classList.add('open');    handle.classList.add('hidden'); };
const closeMenu = () => { tabbar.classList.remove('open'); handle.classList.remove('hidden'); };
handle.addEventListener('click', e => { e.stopPropagation(); openMenu(); });
document.addEventListener('click', e => {
  if (tabbar.classList.contains('open') && !tabbar.contains(e.target)) closeMenu();
});

// 프로그램 전환은 rAF 트윈 — mandatory 스냅 컨테이너에서 네이티브 smooth 스크롤은
// 스냅 엔진이 애니메이션을 끊어 동작하지 않는다(대기실과 같은 패턴)
let panelAnim = null;
function showPanel(index, instant = false) {
  paintTabs(index);
  closeMenu();
  const endTop = index * outer.clientHeight;
  if (instant) { outer.scrollTop = endTop; return; }
  const startTop = outer.scrollTop;
  if (Math.abs(endTop - startTop) < 2) return;

  outer.style.scrollSnapType = 'none';   // 트윈 중간 프레임을 스냅이 가로채지 않게
  cancelAnimationFrame(panelAnim);
  const t0 = performance.now();
  const DUR = 420;
  const ease = t => 1 - Math.pow(1 - t, 3);
  const step = now => {
    const p = Math.min(1, (now - t0) / DUR);
    outer.scrollTop = startTop + (endTop - startTop) * ease(p);
    if (p < 1) panelAnim = requestAnimationFrame(step);
    else { panelAnim = null; outer.style.scrollSnapType = 'y mandatory'; }
  };
  panelAnim = requestAnimationFrame(step);
}

// 트윈 도중 손가락이 닿으면 제어권을 사용자에게 — 스냅도 명시값으로 복원
outer.addEventListener('touchstart', () => {
  if (panelAnim === null) return;
  cancelAnimationFrame(panelAnim);
  panelAnim = null;
  outer.style.scrollSnapType = 'y mandatory';
}, { passive: true });

tabbar.querySelectorAll('.admin-side-tab').forEach(t => {
  t.addEventListener('click', e => { e.stopPropagation(); showPanel(Number(t.dataset.i)); });
});

// 손가락 스크롤로 패널이 바뀌면 탭 동기화 + 도착한 화면 최신화
let currentIndex = 0;
outer.addEventListener('scroll', () => {
  const idx = Math.round(outer.scrollTop / outer.clientHeight);
  if (idx !== currentIndex) {
    currentIndex = idx;
    paintTabs(idx);
    PANELS[idx]?.mod.onShow?.();
  }
}, { passive: true });

// 내부 스크롤이 경계에 닿으면 이전/다음 패널로 이어지게 — 본게임과 같은 iOS 보완
outer.querySelectorAll('.admin-screen').forEach((body, idx) => {
  let startY = 0;
  let chaining = false;
  body.addEventListener('touchstart', e => {
    startY = e.touches[0].clientY;
    chaining = false;
  }, { passive: true });
  body.addEventListener('touchmove', e => {
    if (chaining) return;
    if (body.scrollHeight <= body.clientHeight + 2) return;
    const dy = e.touches[0].clientY - startY;
    const atTop    = body.scrollTop <= 0;
    const atBottom = body.scrollHeight - body.scrollTop <= body.clientHeight + 2;
    if (atTop && dy > 8 && idx > 0) {
      chaining = true;
      showPanel(idx - 1);
    } else if (atBottom && dy < -8 && idx < PANELS.length - 1) {
      chaining = true;
      showPanel(idx + 1);
    }
  }, { passive: true });
});

export function goTo(name) {
  const loginEl = document.getElementById('admin-login');
  if (name === 'login') {
    loginEl.classList.add('active');
    outer.style.display  = 'none';
    handle.style.display = 'none';
    tabbar.style.display = 'none';
    return;
  }
  loginEl.classList.remove('active');
  outer.style.display  = '';
  handle.style.display = '';
  tabbar.style.display = '';
  const idx = Math.max(0, PANELS.findIndex(p => p.key === name));
  currentIndex = idx;
  showPanel(idx, true);
  PANELS[idx]?.mod.onShow?.();
}

login.init(goTo);
PANELS.forEach(p => p.mod.init(goTo));
goTo(sessionStorage.getItem(AUTH_KEY) ? 'dashboard' : 'login');
