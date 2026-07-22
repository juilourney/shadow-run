import { getPhase } from '../store.js';

// 단계 컬러 — 팀 컬러(페이서 파랑 / 고스트 보라)와 겹치지 않는 고유 색을 쓴다.
// 예전엔 탐색전이 --accent(내 팀 색)를 빌려 써서 팀마다 다르게 보이고 팀 컬러와 혼동됐다.
//   탐색전   = 에메랄드 그린 — 내 팀에 마일리지를 '쌓는' 기간
//   줄다리기 = 로즈 레드   — 상대에게서 '뺏는' 기간
const PHASE_STYLE = {
  scout: {
    color:      '#34d399',
    background: 'linear-gradient(120deg,rgba(52,211,153,.15) 0%,rgba(16,185,129,.04) 100%)',
    border:     '1px solid rgba(52,211,153,.30)',
    dotShadow:  '0 0 0 4px rgba(52,211,153,.25)',
    dotAnim:    'none',
    daysColor:  'rgba(52,211,153,.5)',
    msgColor:   'rgba(52,211,153,.75)',
    message:    '마일리지를 쌓아 게이지를 올리세요!',
  },
  tug: {
    color:      '#fb7185',
    background: 'linear-gradient(120deg,rgba(251,113,133,.15) 0%,rgba(239,68,68,.04) 100%)',
    border:     '1px solid rgba(251,113,133,.30)',
    dotShadow:  '0 0 0 4px rgba(251,113,133,.25)',
    dotAnim:    'phase-dot-pulse 1.5s ease-in-out infinite',
    daysColor:  'rgba(251,113,133,.5)',
    msgColor:   'rgba(251,113,133,.75)',
    message:    '열심히 달려 마일리지를 당겨오세요!',
  },
};

export function initPhase() {
  const card = document.getElementById('phase-card');
  if (!card) return;

  // 단계 판정은 store가 단일 출처 — 시작일 기준 경과일로 계산하며 게임 시작 전에는
  // 항상 탐색전으로 취급한다(요일만 보면 시작 전에도 줄다리기로 잘못 표시됨).
  const { phase, label, days } = getPhase();
  const s = PHASE_STYLE[phase];

  const dot     = document.getElementById('phase-pulse');
  const labelEl = document.getElementById('phase-label');
  const daysEl  = document.getElementById('phase-days');
  const msgEl   = document.getElementById('phase-message');

  card.style.background = s.background;
  card.style.border     = s.border;
  dot.style.background  = s.color;
  dot.style.boxShadow   = s.dotShadow;
  dot.style.animation   = s.dotAnim;
  labelEl.textContent   = label;
  labelEl.style.color   = s.color;
  daysEl.textContent    = days;
  daysEl.style.color    = s.daysColor;
  msgEl.textContent     = s.message;
  msgEl.style.color     = s.msgColor;
}
