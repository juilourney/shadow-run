export function initPhase() {
  const day   = new Date().getDay(); // 0=일 … 6=토
  const isTug = day >= 4 && day <= 6; // 목~토
  const card  = document.getElementById('phase-card');
  const dot   = document.getElementById('phase-pulse');
  const label = document.getElementById('phase-label');
  const days  = document.getElementById('phase-days');
  const msg   = document.getElementById('phase-message');
  if (!card) return;

  if (isTug) {
    card.style.background = 'linear-gradient(120deg,rgba(251,113,133,.15) 0%,rgba(239,68,68,.04) 100%)';
    card.style.border     = '1px solid rgba(251,113,133,.30)';
    dot.style.background  = '#fb7185';
    dot.style.boxShadow   = '0 0 0 4px rgba(251,113,133,.25)';
    dot.style.animation   = 'phase-dot-pulse 1.5s ease-in-out infinite';
    label.textContent     = '줄다리기 진행 중';
    label.style.color     = '#fb7185';
    days.textContent      = '목 · 금 · 토';
    days.style.color      = 'rgba(251,113,133,.5)';
    msg.textContent       = '열심히 달려 마일리지를 당겨오세요!';
    msg.style.color       = 'rgba(251,113,133,.75)';
  } else {
    card.style.background = 'linear-gradient(120deg,var(--accent-tint) 0%,rgba(0,0,0,0) 100%)';
    card.style.border     = '1px solid var(--accent-border)';
    dot.style.background  = 'var(--accent)';
    dot.style.boxShadow   = '0 0 0 4px var(--accent-tint)';
    dot.style.animation   = 'none';
    label.textContent     = '탐색전';
    label.style.color     = 'var(--accent)';
    days.textContent      = '일 · 월 · 화 · 수';
    days.style.color      = 'var(--accent)';
    msg.textContent       = '마일리지를 쌓아 게이지를 올리세요!';
    msg.style.color       = 'var(--accent)';
  }
}
