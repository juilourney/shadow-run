let currentScreen = 's-name';

const TAB_SCREENS = new Set(['s-dash', 's-bolt', 's-vote', 's-members', 's-guide', 's-settings', 's-waiting']);
const SCREEN_TAB  = {
  's-dash': 'home', 's-bolt': 'bolt', 's-vote': 'vote',
  's-members': 'members', 's-guide': 'guide', 's-settings': 'guide',
  's-waiting': 'home',
};

export function goToScreen(id) {
  const prev = document.getElementById(currentScreen);
  const next = document.getElementById(id);
  if (!next || id === currentScreen) return;
  prev.classList.remove('active');
  prev.classList.add('exit-left');
  setTimeout(() => prev.classList.remove('exit-left'), 500);
  next.classList.add('active');
  currentScreen = id;
  const sb = next.querySelector('.scroll-body');
  if (sb) sb.scrollTop = 0;
  syncTabbar(id);
}

export function syncTabbar(id) {
  const tb     = document.getElementById('global-tabbar');
  const handle = document.getElementById('tabbar-handle');
  if (!tb) return;
  // 화면 전환 시 항상 닫힌(손잡이) 상태로 시작
  tb.classList.remove('open');
  if (handle) handle.classList.remove('hidden');
  if (TAB_SCREENS.has(id)) {
    tb.style.display = 'flex';
    if (handle) handle.style.display = 'flex';
    tb.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
    const active = tb.querySelector(`[data-tab="${SCREEN_TAB[id]}"]`);
    if (active) active.classList.add('on');
  } else {
    tb.style.display = 'none';
    if (handle) handle.style.display = 'none';
  }
}
