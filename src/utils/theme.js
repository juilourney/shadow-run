export function applyTeamTheme(team) {
  const app = document.getElementById('app');
  app.setAttribute('data-team', team);
  const meta = document.getElementById('theme-color-meta');
  let bg;
  if (team === 'pacer') {
    bg = '#050505';
    meta.content = bg;
    app.classList.remove('mesh-ghost');
    app.classList.add('mesh-pacer');
  } else {
    bg = '#050505';
    meta.content = bg;
    app.classList.remove('mesh-pacer');
    app.classList.add('mesh-ghost');
  }
  // body·html 배경도 동기화 → Home Indicator 영역까지 팀 컬러로 채움 (이제는 기본 어두운 색 유지)
  document.documentElement.style.background = bg;
  document.body.style.background = bg;
}
