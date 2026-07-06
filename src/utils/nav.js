let currentScreen = null;   // 아직 어떤 .screen도 활성화되지 않은 상태 — 첫 goToScreen 호출이 실제 전환으로 인식되게 함
let _programmaticScroll = false;

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

export function goToScreen(id) {
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

  const tb     = document.getElementById('global-tabbar');
  const handle = document.getElementById('tabbar-handle');
  if (!tb) return;

  tb.classList.remove('open');
  if (handle) handle.classList.remove('hidden');

  if (id === 's-game') {
    tb.style.display = 'flex';
    if (handle) handle.style.display = 'flex';
    setActiveTab('home');
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
