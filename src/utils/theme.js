// 팀 공개 전 화면(대기실 등)으로 돌아올 때 — 이전에 적용된 팀 테마 잔재를 걷어내
// 팀이 비공개인 단계의 버튼/포인트 컬러로 소속이 비치지 않게 한다.
export function resetTeamTheme() {
  const app = document.getElementById('app');
  app.removeAttribute('data-team');
  app.classList.remove('mesh-pacer', 'mesh-ghost');
}

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
