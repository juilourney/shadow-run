let currentScreen = 's-name';

const TAB_SCREENS = new Set(['s-dash', 's-bolt', 's-vote', 's-members', 's-guide', 's-settings']);
const SCREEN_TAB   = { 's-dash': 'home', 's-bolt': 'bolt', 's-vote': 'vote', 's-members': 'members', 's-guide': 'guide', 's-settings': 'guide' };
const SCREEN_TITLE = { 's-dash': '홈', 's-bolt': '번개', 's-vote': '투표', 's-members': '참가자', 's-guide': '가이드', 's-settings': '설정' };

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
  const tb    = document.getElementById('global-tabbar');
  const title = document.getElementById('screen-title');
  if (!tb) return;
  if (TAB_SCREENS.has(id)) {
    tb.style.display = 'flex';
    if (title) { title.textContent = SCREEN_TITLE[id] || ''; title.style.display = 'flex'; }
    tb.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
    const active = tb.querySelector(`[data-tab="${SCREEN_TAB[id]}"]`);
    if (active) active.classList.add('on');
  } else {
    tb.style.display = 'none';
    if (title) title.style.display = 'none';
  }
}
