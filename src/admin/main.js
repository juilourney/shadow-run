import { isAdminTokenValid, clearAdminToken } from '../store.js';
import * as login     from './screens/login.js';
import * as dashboard from './screens/dashboard.js';
import * as certs     from './screens/certs.js';
import * as roster    from './screens/roster.js';
import * as settings  from './screens/settings.js';

// 좌우 스와이프로 메뉴를 넘긴다 — 세로는 화면 안 스크롤 전용.
// 예전엔 상하 스냅이라 탭 이동과 내부 스크롤이 같은 축을 나눠 써서, "이 손짓이
// 스크롤인가 탭 이동인가"를 거리(30px)·머문 시간(120ms)으로 추측해야 했다.
// 축을 나누니 그 추측 코드(경계 감지·체이닝·트윈 중단 처리)가 전부 필요 없어졌다.
const PANELS = [
  { key: 'dashboard', icon: '🏠', label: '대시보드',   mod: dashboard },
  { key: 'certs',     icon: '🧾', label: '인증 관리',  mod: certs },
  { key: 'roster',    icon: '👥', label: '참가자 명단', mod: roster },
  { key: 'settings',  icon: '⚙️', label: '게임 설정',  mod: settings },
];

const app = document.getElementById('admin-app');

app.innerHTML = `
  ${login.render()}
  <div id="admin-scroll">
    ${PANELS.map(p => `<section class="admin-section">${p.mod.render()}</section>`).join('')}
  </div>
  <nav id="admin-tabbar-wrap"><div id="admin-tabbar">
    <div id="admin-pill"></div>
    ${PANELS.map((p, i) => `<div class="admin-side-tab" data-i="${i}" title="${p.label}" aria-label="${p.label}">${p.icon}</div>`).join('')}
  </div></nav>`;

const outer  = document.getElementById('admin-scroll');
const wrap   = document.getElementById('admin-tabbar-wrap');
const tabbar = document.getElementById('admin-tabbar');
const pill   = document.getElementById('admin-pill');
const tabEls = [...tabbar.querySelectorAll('.admin-side-tab')];

// 알약은 스와이프 진행도(소수 인덱스)를 그대로 따라 미끄러진다.
// 첫/마지막 패널에서 더 밀면 고무줄 바운스로 scrollLeft가 범위를 벗어나므로 가둔다 —
// 안 그러면 알약이 바 바깥으로 빠져나간다.
function currentPos() {
  const raw = outer.scrollLeft / outer.clientWidth;
  return Math.max(0, Math.min(PANELS.length - 1, raw || 0));
}

function paint(pos) {
  const i = Math.round(pos);
  tabEls.forEach((t, n) => t.classList.toggle('on', n === i));
  const w = tabEls[0].offsetWidth;
  if (w) {
    pill.style.width = `${w}px`;
    pill.style.transform = `translateX(${w * pos}px)`;
  }
}

// mandatory 스냅 컨테이너에서 네이티브 smooth 스크롤은 스냅 엔진이 애니메이션을
// 가로채 아무 동작도 하지 않는다(탭을 눌러도 화면이 안 넘어감). rAF로 직접 트윈하고
// 그동안만 스냅을 꺼둔다. 도중에 손가락이 닿으면 목표로 즉시 맞추고 제어권을 넘긴다.
let panelAnim = null;
let panelTarget = null;

outer.addEventListener('touchstart', () => {
  if (panelAnim === null) return;
  cancelAnimationFrame(panelAnim);
  panelAnim = null;
  if (panelTarget !== null) { outer.scrollLeft = panelTarget; panelTarget = null; }
  outer.style.scrollSnapType = '';
}, { passive: true });

function showPanel(index, instant = false) {
  // 도착할 패널은 항상 맨 위(첫 항목)부터 보이게 — 이전 스크롤 위치가 남지 않도록
  const targetScreen = outer.querySelectorAll('.admin-section')[index]?.querySelector('.admin-screen');
  if (targetScreen) targetScreen.scrollTop = 0;

  const endLeft = outer.clientWidth * index;
  cancelAnimationFrame(panelAnim);
  panelAnim = null;
  if (instant || Math.abs(endLeft - outer.scrollLeft) < 2) {
    panelTarget = null;
    outer.style.scrollSnapType = '';
    outer.scrollLeft = endLeft;
  } else {
    const startLeft = outer.scrollLeft;
    panelTarget = endLeft;
    outer.style.scrollSnapType = 'none';
    const t0 = performance.now();
    const DUR = 380;
    const ease = t => 1 - Math.pow(1 - t, 3);
    const step = now => {
      const p = Math.min(1, (now - t0) / DUR);
      outer.scrollLeft = startLeft + (endLeft - startLeft) * ease(p);
      if (p < 1) panelAnim = requestAnimationFrame(step);
      else { panelAnim = null; panelTarget = null; outer.style.scrollSnapType = ''; }
    };
    panelAnim = requestAnimationFrame(step);
  }
  paint(index);
}

tabEls.forEach(t => {
  t.addEventListener('click', () => showPanel(Number(t.dataset.i)));
});

// 새로고침(당겨서 새로고침 포함) 후에도 보던 탭에 그대로 머물도록 기억해둔다.
// sessionStorage라 탭을 닫으면 사라지고, 관리자 토큰과 수명이 같다.
const PANEL_KEY = 'sr_admin_panel';
function rememberPanel(idx) {
  try { sessionStorage.setItem(PANEL_KEY, PANELS[idx]?.key ?? ''); } catch {}
}
function lastPanelKey() {
  try {
    const k = sessionStorage.getItem(PANEL_KEY);
    return PANELS.some(p => p.key === k) ? k : 'dashboard';
  } catch { return 'dashboard'; }
}

// 손가락으로 패널이 바뀌면 탭 동기화 + 도착한 화면 최신화
let currentIndex = 0;
let raf = null;
outer.addEventListener('scroll', () => {
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = null;
    const pos = currentPos();
    paint(pos);
    const idx = Math.round(pos);
    if (idx !== currentIndex) {
      currentIndex = idx;
      rememberPanel(idx);
      PANELS[idx]?.mod.onShow?.();
    }
  });
}, { passive: true });

// 회전 등으로 폭이 바뀌면 scrollLeft가 새 폭과 어긋나 패널이 어중간하게 걸린다
addEventListener('resize', () => {
  const i = Math.round(currentPos());
  outer.scrollLeft = outer.clientWidth * i;
  paint(i);
});

// 아래로 당기면 새로고침 — 모든 탭에서 동작한다.
// 표시기는 하나만 만들어 공유한다(탭마다 만들면 4개가 겹쳐 뜬다).
function initPullToRefresh(screens) {
  const ind = document.createElement('div');
  ind.textContent = '↓ 당겨서 새로고침';
  ind.style.cssText = `position:fixed; top:0; left:50%; z-index:200;
    transform:translate(-50%,-40px); opacity:0; pointer-events:none;
    padding:8px 16px; border-radius:0 0 14px 14px; font-size:12px; font-weight:600;
    color:#a1a1aa; background:rgba(20,20,22,.96); border:1px solid rgba(255,255,255,.1);
    border-top:none; box-shadow:0 6px 20px rgba(0,0,0,.4);
    transition:transform .25s ease, opacity .2s;`;
  document.body.appendChild(ind);

  const THRESHOLD = 60, MAX = 80;   // 당긴 거리(저항 반영)가 THRESHOLD 넘으면 새로고침
  let startY = 0, startX = 0, pulling = false, dist = 0;

  const hide = () => {
    ind.style.transition = 'transform .25s ease, opacity .2s';
    ind.style.transform = 'translate(-50%,-40px)';
    ind.style.opacity = '0';
  };

  screens.forEach(screen => {
    screen.addEventListener('touchstart', e => {
      pulling = screen.scrollTop <= 0;
      if (pulling) { startY = e.touches[0].clientY; startX = e.touches[0].clientX; dist = 0; }
    }, { passive: true });

    screen.addEventListener('touchmove', e => {
      if (!pulling) return;
      const dy = e.touches[0].clientY - startY;
      const dx = e.touches[0].clientX - startX;
      // 가로로 더 많이 움직였으면 탭 이동 제스처다 — 여기서 preventDefault를 하면
      // 좌우 스와이프가 통째로 막히므로 즉시 양보한다.
      if (Math.abs(dx) > Math.abs(dy)) { pulling = false; hide(); return; }
      if (dy <= 0) { hide(); pulling = false; return; }   // 위로 올리면 일반 스크롤로 넘김
      dist = Math.min(MAX, dy * 0.5);   // 고무줄 저항감
      e.preventDefault();               // 네이티브 오버스크롤 방지
      ind.style.transition = 'none';
      ind.style.opacity = '1';
      ind.style.transform = `translate(-50%, ${dist - 8}px)`;
      ind.textContent = dist >= THRESHOLD ? '↑ 놓으면 새로고침' : '↓ 당겨서 새로고침';
    }, { passive: false });

    const finish = () => {
      if (!pulling) return;
      pulling = false;
      ind.style.transition = 'transform .25s ease, opacity .2s';
      if (dist >= THRESHOLD) {
        ind.textContent = '새로고침 중…';
        ind.style.transform = 'translate(-50%, 16px)'; ind.style.opacity = '1';
        setTimeout(() => location.reload(), 250);
      } else {
        hide();
      }
    };
    screen.addEventListener('touchend', finish, { passive: true });
    screen.addEventListener('touchcancel', finish, { passive: true });
  });
}

initPullToRefresh([...outer.querySelectorAll('.admin-screen')]);   // 모든 탭

export function goTo(name) {
  const loginEl = document.getElementById('admin-login');
  if (name === 'login') {
    loginEl.classList.add('active');
    outer.style.display = 'none';
    wrap.style.display  = 'none';
    return;
  }
  loginEl.classList.remove('active');
  outer.style.display = '';
  wrap.style.display  = '';
  const idx = Math.max(0, PANELS.findIndex(p => p.key === name));
  currentIndex = idx;
  rememberPanel(idx);
  showPanel(idx, true);
  PANELS[idx]?.mod.onShow?.();
}

login.init(goTo);
PANELS.forEach(p => p.mod.init(goTo));
// 토큰이 '있는지'가 아니라 '유효(미만료)한지'로 판정 — 만료된 토큰으로 대시보드에
// 들어가면 모든 관리자 액션이 조용히 401 나므로, 만료면 지우고 로그인부터 다시.
if (!isAdminTokenValid()) clearAdminToken();
goTo(isAdminTokenValid() ? lastPanelKey() : 'login');
