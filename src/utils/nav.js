let currentScreen = 's-name';

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
}
