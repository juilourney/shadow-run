// 아래로 당기면 새로고침 — 세로 스크롤 최상단(scrollTop<=0)에서 아래로 당기면 새로고침한다.
// 가로 스와이프(섹션/탭 이동)에는 즉시 양보해 좌우 네비를 막지 않는다.
// screens: 세로 스크롤이 일어나는 요소들(참가자 앱=.scroll-body). onRefresh 기본은 새로고침.
// (관리자 앱 src/admin/main.js에 동일 로직의 인라인 버전이 있음 — 추후 이 유틸로 합칠 수 있다.)
export function initPullToRefresh(screens, onRefresh = () => location.reload()) {
  const ind = document.createElement('div');
  ind.textContent = '↓ 당겨서 새로고침';
  ind.style.cssText = `position:fixed; top:0; left:50%; z-index:200;
    transform:translate(-50%,-40px); opacity:0; pointer-events:none;
    padding:8px 16px; border-radius:0 0 14px 14px; font-size:12px; font-weight:600;
    color:#a1a1aa; background:rgba(20,20,22,.96); border:1px solid rgba(255,255,255,.1);
    border-top:none; box-shadow:0 6px 20px rgba(0,0,0,.4);
    transition:transform .25s ease, opacity .2s;`;
  document.body.appendChild(ind);

  const THRESHOLD = 60, MAX = 80;   // 당긴 거리(저항 반영)가 THRESHOLD 넘으면 새로고침
  let startY = 0, startX = 0, pulling = false, dist = 0;

  const hide = () => {
    ind.style.transition = 'transform .25s ease, opacity .2s';
    ind.style.transform = 'translate(-50%,-40px)';
    ind.style.opacity = '0';
  };

  screens.forEach(screen => {
    screen.addEventListener('touchstart', e => {
      pulling = screen.scrollTop <= 0;
      if (pulling) { startY = e.touches[0].clientY; startX = e.touches[0].clientX; dist = 0; }
    }, { passive: true });

    screen.addEventListener('touchmove', e => {
      if (!pulling) return;
      const dy = e.touches[0].clientY - startY;
      const dx = e.touches[0].clientX - startX;
      // 가로로 더 많이 움직였으면 섹션 이동 제스처다 — preventDefault하면 좌우 스와이프가
      // 통째로 막히므로 즉시 양보한다.
      if (Math.abs(dx) > Math.abs(dy)) { pulling = false; hide(); return; }
      if (dy <= 0) { hide(); pulling = false; return; }   // 위로 올리면 일반 스크롤로 넘김
      dist = Math.min(MAX, dy * 0.5);   // 고무줄 저항감
      e.preventDefault();               // 네이티브 오버스크롤 방지
      ind.style.transition = 'none';
      ind.style.opacity = '1';
      ind.style.transform = `translate(-50%, ${dist - 8}px)`;
      ind.textContent = dist >= THRESHOLD ? '↑ 놓으면 새로고침' : '↓ 당겨서 새로고침';
    }, { passive: false });

    const finish = () => {
      if (!pulling) return;
      pulling = false;
      ind.style.transition = 'transform .25s ease, opacity .2s';
      if (dist >= THRESHOLD) {
        ind.textContent = '새로고침 중…';
        ind.style.transform = 'translate(-50%, 16px)'; ind.style.opacity = '1';
        setTimeout(onRefresh, 250);
      } else {
        hide();
      }
    };
    screen.addEventListener('touchend', finish, { passive: true });
    screen.addEventListener('touchcancel', finish, { passive: true });
  });
}
