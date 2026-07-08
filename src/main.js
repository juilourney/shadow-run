import { createTabbar }   from './components/tabbar.js';
import { createEdgeBlur } from './components/edge-blur.js';
import { goToScreen, syncTabbarOnScroll, isProgrammaticScroll, reengageScrollSnap } from './utils/nav.js';
import { state } from './state.js';
import { peekConfirmedName, hasConfirmedRole, getAssignment, isAssignmentLoaded, subscribe, reconnectFirestore } from './store.js';

import * as name       from './screens/name.js';
import * as card       from './screens/card.js';
import * as role       from './screens/role.js';
import * as dash       from './screens/dash.js';
import * as bolt       from './screens/bolt.js';
import * as boltJoin     from './screens/bolt-join.js';
import * as boltDetail   from './screens/bolt-detail.js';
import * as boltProgress from './screens/bolt-progress.js';
import * as boltBuff     from './screens/bolt-buff.js';
import * as boltResult   from './screens/bolt-result.js';
import * as vote       from './screens/vote.js';
import * as members    from './screens/members.js';
import * as guide      from './screens/guide.js';
import * as waiting    from './screens/waiting.js';
import { enterAssignedPlayer } from './screens/waiting.js';
import * as end        from './screens/end.js';

const INTRO    = [name, card, role, waiting];
const GAME     = [dash, bolt, vote, members, guide];
const OVERLAYS = [boltJoin, boltDetail, boltProgress, boltBuff, boltResult, end];

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

// "홈 화면에 추가"한 PWA(standalone)는 백그라운드→포그라운드 전환이 일반 브라우저
// 탭처럼 새로고침되지 않고 그대로 이어지므로, 복귀 시점에 몇 가지를 직접
// 재점검해야 한다:
//  - scroll-snap 재인식(게임 화면일 때만 의미 있음)
//  - Firestore 실시간 연결 재확인(오래 백그라운드에 있으면 iOS가 소켓까지
//    끊어버려, 그 사이 다른 사람이 만든 변경(번개 시작 등)이 반영 안 된 채로
//    남는 문제가 있어 화면 종류와 무관하게 항상 재연결을 시도한다)
function onAppResume() {
  if (document.hidden) return;
  reconnectFirestore();
  if (document.getElementById('s-game')?.classList.contains('active')) reengageScrollSnap();
}
document.addEventListener('visibilitychange', onAppResume);
window.addEventListener('pageshow', onAppResume);

// iOS Safari는 빠르게 스와이프하면 scroll-snap-stop:always를 무시하고
// 한 번에 여러 섹션을 건너뛰는 경우가 있음 — 스와이프 시작 시점의 섹션을
// 기억해두고, 관성 스크롤 도중 그보다 2섹션 이상 벗어나면 즉시 1섹션 위치로 되돌린다.
function nearestSectionIndex() {
  let idx = -1, minDist = Infinity;
  SECTION_IDS.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    const dist = Math.abs(el.getBoundingClientRect().top);
    if (dist < minDist) { minDist = dist; idx = i; }
  });
  return idx;
}

let swipeStartIndex = null;
document.getElementById('s-game').addEventListener('touchstart', () => {
  swipeStartIndex = nearestSectionIndex();
}, { passive: true });
document.getElementById('s-game').addEventListener('touchend', () => {
  swipeStartIndex = null;
}, { passive: true });

window.addEventListener('scroll', () => {
  if (swipeStartIndex === null) return;
  if (document.documentElement.classList.contains('lock-scroll')) return;
  const idx = nearestSectionIndex();
  if (idx === -1) return;
  const diff = idx - swipeStartIndex;
  if (Math.abs(diff) > 1) {
    const clamped = swipeStartIndex + Math.sign(diff);
    document.getElementById(SECTION_IDS[clamped])?.scrollIntoView({ behavior: 'instant', block: 'start' });
  }
}, { passive: true });

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

// 이 기기에서 이미 카드·역할 확인을 마친 이름 기록이 있으면, 그 배정이 아직 유효한지
// 확인될 때까지 잠시 기다렸다가 이름 입력 화면 없이 바로 게임 화면으로 진입시킨다.
// (배정이 바뀌었거나 확인이 안 되면 일반적인 이름 입력 화면으로 진행)
const confirmedName = peekConfirmedName();
if (!confirmedName) {
  goToScreen('s-name');
} else {
  state.name = confirmedName;
  let resolved = false;
  let unsub = null;
  const finish = () => {
    if (resolved) return;
    resolved = true;
    if (unsub) unsub();
  };
  // 배정 문서가 아직 한 번도 로드되지 않았으면(=Firestore 연결/동기화 전) 절대 이름
  // 화면으로 보내지 않고 계속 기다린다. PWA 콜드 재개 시 Firestore 재연결이 수 초 걸릴 수
  // 있어, 시간 기반 폴백으로 이름 화면에 튕기면 "대시보드 보이다 이름창으로" 문제가 생긴다.
  // 배정이 실제로 로드된 뒤에만 판정한다:
  //   - 이 배정이 내가 확인한 배정과 일치하고 내 이름이 있으면 → 바로 게임 화면
  //   - 로드됐는데 일치하지 않으면(재배정·명단 이탈 등) → 이름 화면
  const decide = () => {
    if (resolved || !isAssignmentLoaded()) return;
    finish();
    const { assigned, players } = getAssignment();
    const me = assigned && hasConfirmedRole() ? players.find(p => p.name === confirmedName) : null;
    if (me) enterAssignedPlayer(me);
    else goToScreen('s-name');
  };
  unsub = subscribe(decide);
  decide();
}
