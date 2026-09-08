let currentScreen = null;   // 아직 어떤 .screen도 활성화되지 않은 상태 — 첫 goToScreen 호출이 실제 전환으로 인식되게 함
let _bootGateRemoved = false;

// 부팅 라우팅이 어느 화면으로 갈지 정해지는 순간(첫 goToScreen 호출) 부팅 게이트를 걷는다 —
// 그 전까지는 boot-gate가 화면을 덮고 있어 대기실/카드 같은 엉뚱한 화면이 잠깐이라도 비치지 않는다.
function removeBootGate() {
  if (_bootGateRemoved) return;
  _bootGateRemoved = true;
  document.getElementById('boot-gate')?.remove();
}

// 바텀시트 등 오버레이가 뜬 동안 배경(게임 섹션) 스크롤 잠금
export function setScrollLock(locked) {
  document.documentElement.classList.toggle('lock-scroll', locked);
}

export const SECTION_IDS = ['gs-dash', 'gs-bolt', 'gs-vote', 'gs-members', 'gs-guide'];

const SECTION_TAB = {
  'gs-dash': 'home', 'gs-bolt': 'bolt', 'gs-vote': 'vote',
  'gs-members': 'members', 'gs-guide': 'guide',
};

// 사파리(WebKit)는 scroll-snap-type을 최초 페인트 이후 동적으로 바꾸면(클래스 토글 등)
// 스냅 엔진이 새 값을 인식하지 못해 스와이프 잠금이 풀린 것처럼 동작하는 경우가 있다.
// none → 리플로우 → 원래값 순서로 재적용해 즉시 재인식시킨다.
// "홈 화면에 추가"한 PWA(standalone)는 백그라운드→포그라운드 복귀가 새로고침 없이
// 그대로 이어지므로, 복귀 시점에도 한 번 다시 물려준다.
export function reengageScrollSnap() {
  const wrap = document.getElementById('s-game');
  if (!wrap || document.documentElement.classList.contains('lock-scroll')) return;
  // rAF에 의존하면(백그라운드 탭·저전력 등으로) 인라인 none이 그대로 남아 CSS의
  // x mandatory를 덮어써 스냅이 영구히 풀리는 부작용이 있었다 — 전부 동기로 처리한다.
  wrap.style.scrollSnapType = 'none';
  void wrap.offsetHeight;
  wrap.style.scrollSnapType = '';
  void wrap.offsetHeight;
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

  // 오버레이(.screen)가 뜨면 뒤의 게임 섹션 스크롤 잠금 — 안 그러면 오버레이 내부에
  // 스크롤이 없을 때 드래그가 배경으로 새어 다른 섹션이 넘어간다
  document.documentElement.classList.toggle('lock-scroll', id !== 's-game');

  // 화면이 바뀌면 열려 있던 FAQ 시트는 닫는다.
  document.getElementById('faq-overlay')?.classList.remove('show');

  if (id === 's-game') {
    reengageScrollSnap();
    // iOS WebKit은 lock-scroll 해제와 같은 프레임의 재적용을 무시하는 경우가 있다
    // (이전 화면의 500ms 퇴장 애니메이션과 겹칠 때) — 전환이 끝난 뒤 한 번 더 물린다.
    setTimeout(reengageScrollSnap, 550);
  }

  const wrap = document.getElementById('tabbar-wrap');
  if (!wrap) return;

  if (id === 's-game') {
    wrap.style.display = 'flex';
    setActiveTab('home');
    // 게임 화면 진입 시 항상 홈(대시보드)에서 시작 — 예전 위치가 남아 엉뚱한 섹션이
    // 먼저 보이는 문제 방지. scrollToSection이 다른 섹션을 원하면 뒤이어 다시 옮긴다.
    jumpToSection('gs-dash', 'instant');
  } else {
    wrap.style.display = 'none';
  }
}

// mandatory 스냅 컨테이너에서 네이티브 smooth 스크롤은 스냅 엔진이 애니메이션을
// 가로채 아무 동작도 하지 않는다(탭을 눌러도 화면이 안 넘어감). rAF로 직접 트윈하고,
// 그동안만 스냅을 꺼둔다. 도중에 손가락이 닿으면 목표 위치로 즉시 맞추고 제어권을 넘긴다.
let _tween = null;
let _tweenTarget = null;

function tweenTo(wrap, endLeft) {
  const startLeft = wrap.scrollLeft;
  if (Math.abs(endLeft - startLeft) < 2) return;
  cancelAnimationFrame(_tween);
  _tweenTarget = endLeft;
  wrap.style.scrollSnapType = 'none';
  const t0 = performance.now();
  const DUR = 380;
  const ease = t => 1 - Math.pow(1 - t, 3);
  const step = now => {
    const p = Math.min(1, (now - t0) / DUR);
    wrap.scrollLeft = startLeft + (endLeft - startLeft) * ease(p);
    if (p < 1) _tween = requestAnimationFrame(step);
    else { _tween = null; _tweenTarget = null; wrap.style.scrollSnapType = ''; }
  };
  _tween = requestAnimationFrame(step);
}

// 트윈 중간에 손가락이 닿으면, 어중간한 위치에서 스냅을 되살리는 대신 목표로 정렬한다 —
// 그러지 않으면 스냅 엔진이 가까운 쪽(=출발 섹션)으로 되돌리는 동안 스크롤이 씹힌다.
let _tweenGuardBound = false;
function bindTweenGuard(wrap) {
  if (_tweenGuardBound) return;
  _tweenGuardBound = true;
  wrap.addEventListener('touchstart', () => {
    if (_tween === null) return;
    cancelAnimationFrame(_tween);
    _tween = null;
    if (_tweenTarget !== null) { wrap.scrollLeft = _tweenTarget; _tweenTarget = null; }
    wrap.style.scrollSnapType = '';
  }, { passive: true });
}

// 가로 스냅 컨테이너를 해당 섹션 위치로 옮긴다
function jumpToSection(gsId, behavior) {
  const wrap = document.getElementById('s-game');
  const idx = SECTION_IDS.indexOf(gsId);
  if (!wrap || idx < 0) return;
  bindTweenGuard(wrap);
  const left = wrap.clientWidth * idx;
  if (behavior === 'smooth') tweenTo(wrap, left);
  else { cancelAnimationFrame(_tween); _tween = null; _tweenTarget = null; wrap.scrollLeft = left; }
}

export function scrollToSection(gsId) {
  const gameWrap = document.getElementById('s-game');
  const enter = !gameWrap.classList.contains('active');

  if (enter) {
    goToScreen('s-game');
    // 동기 + instant로 즉시 목표 섹션에 정렬 — 화면 퇴장 애니메이션과 경합하지 않게
    jumpToSection(gsId, 'instant');
  } else {
    jumpToSection(gsId, 'smooth');
  }
  setActiveTab(SECTION_TAB[gsId] || 'home');
}

export function setActiveTab(tabName) {
  const tb = document.getElementById('global-tabbar');
  if (!tb) return;
  tb.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
  tb.querySelector(`[data-tab="${tabName}"]`)?.classList.add('on');
}

export function syncTabbarOnScroll(gsId) {
  setActiveTab(SECTION_TAB[gsId] || 'home');
}
