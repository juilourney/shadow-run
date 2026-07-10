import { createTabbar }   from './components/tabbar.js';
import { createEdgeBlur } from './components/edge-blur.js';
import { goToScreen, syncTabbarOnScroll, isProgrammaticScroll, reengageScrollSnap } from './utils/nav.js';
import { state } from './state.js';
import { getConfirmedRecord, getSavedName, clearConfirmedRecord, clearSavedIdentity, isSavedNameStale, isNameRegistered, getAssignment, isAssignmentLoaded, isRosterLoaded, subscribe, reconnectFirestore } from './store.js';
import { applyTeamTheme } from './utils/theme.js';
import { initPhase } from './utils/phase.js';

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
import { enterAssignedPlayer, prepareWaiting } from './screens/waiting.js';
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
function onAppResume(e) {
  if (document.hidden) return;
  // 최초 페이지 로드의 pageshow는 제외 — 연결이 새것이라 재연결이 불필요할 뿐 아니라,
  // disableNetwork 순간 Firestore가 "빈 캐시" 스냅샷을 쏴서 부팅 라우팅(배정 로드 판정)이
  // 배정 없음으로 오판하는 원인이 된다. bfcache 복원(persisted)일 때만 재연결.
  if (e.type === 'pageshow' && !e.persisted) return;
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

// iOS는 키보드가 올라와 있는 동안 html의 overflow:hidden(lock-scroll)을 무시하고
// 배경 문서를 손가락으로 스크롤할 수 있게 풀어버린다 — 번개 만들기 등 입력 화면
// 밑에서 게임 섹션이 위아래로 흘러다니는 문제. 잠금 중에는 오버레이 내부의 실제
// 스크롤 영역(overflow auto/scroll + 넘치는 내용)이 아닌 곳의 touchmove를 직접 차단한다.
document.addEventListener('touchmove', e => {
  if (!document.documentElement.classList.contains('lock-scroll')) return;
  if (!e.cancelable) return;
  let el = e.target;
  while (el && el !== document.documentElement) {
    if (el.scrollHeight > el.clientHeight + 2) {
      const oy = getComputedStyle(el).overflowY;
      if (oy === 'auto' || oy === 'scroll') return;   // 오버레이 내부 스크롤은 허용
    }
    el = el.parentElement;
  }
  e.preventDefault();
}, { passive: false });

// 이름은 알지만 이 배정에서의 확인은 안 된 상태 — 로드된 배정 기준으로 화면을 정한다.
//   - 배정에 내 이름이 있으면 → 카드/게임 화면(확인 여부는 enterAssignedPlayer가 판단)
//   - 게임 진행 중(배정 완료)인데 내 이름이 없으면 → 중간 난입 불가, 이름 화면으로
//   - 배정 전(모집 기간)이고 명단에 있으면 → 대기실 / 명단에 없으면(관리자 삭제) → 이름 화면
function routeByAssignment(name) {
  // 관리자가 그 사이 "신규 게임 생성"으로 새 시즌을 열었으면, 이 기기가 기억하고 있던
  // 이전 시즌 이름으로 조용히 재등록되지 않도록 기록을 지우고 이름 입력부터 다시 받는다.
  // (확인 완료 기기의 stale 복구 경로와 단순 "이름 기억하기" 경로 양쪽에서 공유하는 최종 관문)
  if (isSavedNameStale()) {
    clearSavedIdentity();
    goToScreen('s-name');
    return;
  }
  const { assigned, players } = getAssignment();
  const me = assigned ? players.find(p => p.name === name) : null;
  if (me) {
    enterAssignedPlayer(me);
  } else if (assigned) {
    goToScreen('s-name');
  } else if (isNameRegistered(name)) {
    goToScreen('s-waiting');
    prepareWaiting();
  } else {
    // 같은 시즌에 명단에서 이름이 사라지는 경로는 관리자 삭제뿐 — 자동 재등록으로
    // 이름을 되살리지 않고, 저장된 기록을 지우고 처음(이름 입력)부터 다시 받는다.
    clearSavedIdentity();
    goToScreen('s-name');
  }
}

// 이 기기에 저장된 이름(마지막 입장 이름 또는 카드·역할 확인 기록)이 있으면
// 이름 입력 화면을 건너뛰고 자동 입장시킨다. 잘못 저장된 경우를 위한 탈출구는
// 대기실의 "다른 이름으로 입장" 버튼(clearSavedIdentity).
const confirmed = getConfirmedRecord();
const rememberedName = confirmed?.name || getSavedName();

if (confirmed && confirmed.team && confirmed.role) {
  // 카드·역할까지 확인한 기기 — 저장된 팀·역할로 Firestore 응답을 기다리지 않고
  // 즉시 게임 화면으로. (PWA 재개 시 Firestore 재연결이 느려도 준비/카드 화면으로
  // 잘못 튕기지 않게 한다.) 배정이 실제로 로드된 뒤 재배정·명단 이탈이 확인되면
  // 확인 기록만 지우고(이름은 유지) 새 배정 기준으로 다시 라우팅한다.
  state.name = confirmed.name;
  state.team = confirmed.team;
  state.role = confirmed.role;
  state.cardFlipped = true;
  state.roleFlipped = true;
  state.roleConfirmed = true;
  applyTeamTheme(confirmed.team);
  initPhase();
  goToScreen('s-game');

  const unsub = subscribe(() => {
    // routeByAssignment가 배정과 명단을 모두 판정 근거로 쓰므로 둘 다 로드된 뒤에만
    if (!isAssignmentLoaded() || !isRosterLoaded()) return;
    unsub();
    const { assigned, assignedAt, players } = getAssignment();
    const stillValid = assigned && assignedAt === confirmed.assignedAt
      && players.some(p => p.name === confirmed.name);
    if (!stillValid) {
      clearConfirmedRecord();   // 이름은 유지, 확인 기록만 삭제
      routeByAssignment(confirmed.name);
    }
  });
} else if (!rememberedName) {
  goToScreen('s-name');
} else {
  state.name = rememberedName;
  let resolved = false;
  let unsub = null;
  const finish = () => {
    if (resolved) return;
    resolved = true;
    if (unsub) unsub();
  };
  // 배정·명단 문서가 아직 로드되지 않았으면(=Firestore 연결/동기화 전) 화면 판정을
  // 하지 않고 계속 기다린다. 둘 다 로드된 뒤에만 라우팅한다.
  const decide = () => {
    if (resolved || !isAssignmentLoaded() || !isRosterLoaded()) return;
    finish();
    routeByAssignment(rememberedName);
  };
  unsub = subscribe(decide);
  decide();
}
