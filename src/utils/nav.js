let currentScreen = null;   // 아직 어떤 .screen도 활성화되지 않은 상태 — 첫 goToScreen 호출이 실제 전환으로 인식되게 함
let _programmaticScroll = false;
let _bootGateRemoved = false;

// 부팅 라우팅이 어느 화면으로 갈지 정해지는 순간(첫 goToScreen 호출) 부팅 게이트를 걷는다 —
// 그 전까지는 boot-gate가 화면을 덮고 있어 대기실/카드 같은 엉뚱한 화면이 잠깐이라도 비치지 않는다.
function removeBootGate() {
  if (_bootGateRemoved) return;
  _bootGateRemoved = true;
  document.getElementById('boot-gate')?.remove();
}

export function isProgrammaticScroll() { return _programmaticScroll; }

// 바텀시트 등 오버레이가 뜬 동안 배경(게임 섹션) 스크롤 잠금 + 사이드 메뉴(탭바) 비활성
export function setScrollLock(locked) {
  document.documentElement.classList.toggle('lock-scroll', locked);
  const tb     = document.getElementById('global-tabbar');
  const handle = document.getElementById('tabbar-handle');
  if (locked) {
    tb?.classList.remove('open');                 // 열려 있던 사이드 메뉴 닫기
    if (handle) handle.style.visibility = 'hidden'; // 손잡이 비활성 (팝업 위로 못 열게)
  } else if (handle) {
    handle.style.visibility = '';
  }
}

const SECTION_TAB = {
  'gs-dash': 'home', 'gs-bolt': 'bolt', 'gs-vote': 'vote',
  'gs-members': 'members', 'gs-guide': 'guide',
};

// 사파리(WebKit)는 scroll-snap-type을 최초 페인트 이후 동적으로 바꾸면(클래스 토글 등)
// 스냅 엔진이 새 값을 인식하지 못해 스와이프 잠금이 풀린 것처럼 동작하는 경우가 있다.
// 강제로 none → 리플로우 → 원래값 순서로 재적용해 즉시 재인식시킨다.
// - 게임 화면 진입 시(goToScreen)뿐 아니라, "홈 화면에 추가"한 PWA(standalone)를
//   백그라운드에서 복귀시킬 때도 필요하다 — 일반 브라우저 탭과 달리 standalone은
//   백그라운드→포그라운드 전환이 페이지 새로고침 없이 그대로 이어지기 때문에,
//   재진입 시점에 한 번 재적용해도 복귀 시점엔 다시 풀린 채로 남을 수 있다.
export function reengageScrollSnap() {
  const html = document.documentElement;
  if (html.classList.contains('lock-scroll')) return;
  // none → 리플로우 → 인라인 제거 → 리플로우 를 모두 "동기"로 처리.
  // requestAnimationFrame에 의존하면(백그라운드 탭·저전력 등으로) rAF가 지연될 때
  // 인라인 scroll-snap-type:none이 그대로 남아 CSS의 y mandatory를 덮어써서
  // 오히려 스냅이 영구히 풀리는 부작용이 있었다. 인라인을 최종적으로 비워
  // lock-scroll 클래스 메커니즘(오버레이 열릴 때 none)도 그대로 유지된다.
  html.style.scrollSnapType = 'none';
  void html.offsetHeight;
  html.style.scrollSnapType = '';
  void html.offsetHeight;
}

export function goToScreen(id) {
  removeBootGate();
  if (id.startsWith('gs-')) { scrollToSection(id); return; }

  const prev = document.getElementById(currentScreen);
  const next = document.getElementById(id);
  if (!next || id === currentScreen) return;

  if (prev) {
    prev.classList.remove('active');
    prev.classList.add('exit-left');
    setTimeout(() => prev.classList.remove('exit-left'), 500);
  }
  next.classList.add('active');
  currentScreen = id;

  // 오버레이(.screen)가 뜨면 뒤의 게임 섹션(html) 스크롤 잠금 —
  // 안 그러면 오버레이 내부에 스크롤이 없을 때 드래그가 배경으로 새어
  // 다른 섹션(투표 등)이 올라옴
  document.documentElement.classList.toggle('lock-scroll', id !== 's-game');

  if (id === 's-game') reengageScrollSnap();

  const tb     = document.getElementById('global-tabbar');
  const handle = document.getElementById('tabbar-handle');
  if (!tb) return;

  tb.classList.remove('open');
  if (handle) handle.classList.remove('hidden');

  if (id === 's-game') {
    tb.style.display = 'flex';
    if (handle) handle.style.display = 'flex';
    setActiveTab('home');
    // 게임 화면 진입 시 항상 홈(대시보드)에서 시작 — 예전 스크롤 위치가 남아있으면
    // 엉뚱한 섹션이 먼저 보이는 문제 방지. scrollToSection이 다른 섹션을 원하면
    // 뒤이어 다시 스크롤하므로 여기서는 무조건 gs-dash로 리셋해도 안전하다.
    document.getElementById('gs-dash')?.scrollIntoView({ block: 'start' });
  } else {
    tb.style.display = 'none';
    if (handle) handle.style.display = 'none';
  }
}

export function scrollToSection(gsId) {
  const gameWrap = document.getElementById('s-game');
  const enter    = !gameWrap.classList.contains('active');

  _programmaticScroll = true;
  clearTimeout(_scrollTimer);
  _scrollTimer = setTimeout(() => { _programmaticScroll = false; }, 800);

  if (enter) {
    goToScreen('s-game');
    setTimeout(() => {
      document.getElementById(gsId)?.scrollIntoView({ block: 'start' });
      setActiveTab(SECTION_TAB[gsId] || 'home');
    }, 60);
  } else {
    document.getElementById(gsId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveTab(SECTION_TAB[gsId] || 'home');
  }
}

let _scrollTimer = null;

export function setActiveTab(tabName) {
  const tb = document.getElementById('global-tabbar');
  if (!tb) return;
  tb.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
  tb.querySelector(`[data-tab="${tabName}"]`)?.classList.add('on');
}

export function syncTabbarOnScroll(gsId) {
  setActiveTab(SECTION_TAB[gsId] || 'home');
}
