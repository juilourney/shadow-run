let currentScreen = 's-name';

const TAB_SCREENS = new Set(['s-dash', 's-bolt', 's-vote', 's-members', 's-guide', 's-settings']);
const SCREEN_TAB = { 's-dash': 'home', 's-bolt': 'bolt', 's-vote': 'vote', 's-members': 'members', 's-guide': 'guide', 's-settings': 'guide' };

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
  const tb   = document.getElementById('global-tabbar');
  const fill = document.getElementById('tabbar-safe-fill');
  if (!tb) return;
  if (TAB_SCREENS.has(id)) {
    tb.style.display   = 'flex';
    if (fill) fill.style.display = 'block';
    tb.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
    const key = SCREEN_TAB[id];
    const active = tb.querySelector(`[data-tab="${key}"]`);
    if (active) active.classList.add('on');
  } else {
    tb.style.display   = 'none';
    if (fill) fill.style.display = 'none';
  }
}
