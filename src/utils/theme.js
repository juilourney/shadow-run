export function applyTeamTheme(team) {
  const app = document.getElementById('app');
  app.setAttribute('data-team', team);
  const meta = document.getElementById('theme-color-meta');
  if (team === 'pacer') {
    meta.content = '#030c14';
    app.classList.remove('mesh-ghost');
    app.classList.add('mesh-pacer');
  } else {
    meta.content = '#0a0310';
    app.classList.remove('mesh-pacer');
    app.classList.add('mesh-ghost');
  }
}
