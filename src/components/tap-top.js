// 상단(상태바 영역) 탭 → 현재 보이는 스크롤을 맨 위로. (iOS 상태바 탭 패턴의 웹 구현)
// 웹앱은 네이티브 상태바 탭 이벤트를 못 받으므로, 화면을 덮는 오버레이 없이
// 전역 click의 좌표로 "상단 스트립 탭"을 감지한다(스크롤/드래그는 전혀 방해 안 함).
// 시트가 열렸거나 인터랙티브 요소를 눌렀을 땐 무시한다.

export function createTapTop(mount) {
  // safe-area-inset-top 실측용 프로브 — env()는 getComputedStyle로 못 읽어 DOM 높이로 측정한다.
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed; top:0; left:0; width:0; height:env(safe-area-inset-top, 0px);' +
    'pointer-events:none; visibility:hidden;';
  mount.appendChild(probe);

  document.addEventListener('click', (e) => {
    if (document.querySelector('.faq-overlay.show')) return;               // 시트 열림 → 무시
    if (e.target.closest('button, a, input, textarea, select, label, [role="button"], .tab')) return;

    const topStrip = probe.offsetHeight + 20;                              // 상태바 영역 + 여유 탭 밴드
    if (e.clientY > topStrip) return;

    const vh = window.innerHeight;
    document.querySelectorAll('.scroll-body').forEach((b) => {
      const r = b.getBoundingClientRect();
      // 지금 뷰포트 중앙을 덮고 있는(=현재 보이는) 스크롤 컨테이너만, 이미 맨 위가 아니면 올린다.
      if (r.height > 0 && r.top < vh / 2 && r.bottom > vh / 2 && b.scrollTop > 0) {
        b.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });
}
