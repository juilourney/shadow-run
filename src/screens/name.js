import { state } from '../state.js';
import { goToScreen } from '../utils/nav.js';
import { prepareWaiting, enterAssignedPlayer } from './waiting.js';
import { joinRoster, getAssignment, saveName } from '../store.js';

const DEFAULT_HINT = '실명으로 입장하세요';
const REJECT_HINT  = '등록에 실패했습니다. 다시 시도해주세요';

export function render() {
  return `
<div class="screen" id="s-name" style="overflow:hidden;">

  <div style="position:absolute; inset:0; pointer-events:none; overflow:hidden;">
    <div style="position:absolute; top:-18%; left:-20%; width:70%; aspect-ratio:1;
      border-radius:50%;
      background:radial-gradient(circle, rgba(56,189,248,.22) 0%, transparent 70%);
      filter:blur(40px);
      animation:orb-drift-a 12s ease-in-out infinite alternate;"></div>
    <div style="position:absolute; top:5%; right:-22%; width:65%; aspect-ratio:1;
      border-radius:50%;
      background:radial-gradient(circle, rgba(192,132,252,.18) 0%, transparent 70%);
      filter:blur(40px);
      animation:orb-drift-b 14s ease-in-out infinite alternate;"></div>
    <div style="position:absolute; bottom:-10%; left:50%; transform:translateX(-50%); width:80%; aspect-ratio:1;
      border-radius:50%;
      background:radial-gradient(circle, rgba(14,165,233,.08) 0%, transparent 65%);
      filter:blur(50px);"></div>
  </div>

  <div class="scroll-body" style="position:relative; z-index:2; display:flex; flex-direction:column; padding:calc(var(--safe-top) + 20px) 26px 0;">

    <div style="flex:1; display:flex; flex-direction:column; justify-content:center; padding-top:12px; padding-bottom:28px; min-height:0;">

      <div class="anim-up" style="margin-bottom:20px;">
        <span style="font-size:11px; letter-spacing:.22em; font-weight:700; text-transform:uppercase;
          background:linear-gradient(90deg, rgba(56,189,248,.5), rgba(192,132,252,.5));
          -webkit-background-clip:text; -webkit-text-fill-color:transparent;">
          HNRC 2026 하반기 이벤트 런
        </span>
      </div>

      <div class="anim-up-1">
        <h1 style="font-family:'Space Grotesk', sans-serif; font-size:clamp(52px, 16vw, 68px); font-weight:700;
          letter-spacing:-.04em; line-height:.95; margin-bottom:0;">
          <span style="display:block;
            background:linear-gradient(135deg, #7dd3fc 0%, #38bdf8 35%, #818cf8 65%, #c084fc 100%);
            -webkit-background-clip:text; -webkit-text-fill-color:transparent;
            background-clip:text;">SHADOW</span>
          <span style="display:block; color:#fafafa; margin-top:2px;">RUN</span>
        </h1>
      </div>

      <div class="anim-up-2" style="margin-top:24px; display:flex; align-items:center; gap:12px;">
        <div style="flex:1; height:1px; background:linear-gradient(90deg, rgba(56,189,248,.4), rgba(192,132,252,.3));"></div>
        <span style="font-size:11px; letter-spacing:.14em; font-weight:600; color:#52525b; text-transform:uppercase; white-space:nowrap;">vs</span>
        <div style="flex:1; height:1px; background:linear-gradient(90deg, rgba(192,132,252,.3), rgba(56,189,248,.4));"></div>
      </div>

      <div class="anim-up-2" style="margin-top:16px; display:flex; justify-content:space-between; align-items:baseline;">
        <p style="font-family:'Space Grotesk'; font-size:22px; font-weight:700; letter-spacing:-.02em; color:#c084fc; line-height:1;">GHOST</p>
        <p style="font-family:'Space Grotesk'; font-size:22px; font-weight:700; letter-spacing:-.02em; color:#38bdf8; line-height:1;">PACER</p>
      </div>

      <p class="anim-up-3" style="font-size:14px; color:#71717a; margin-top:20px; line-height:1.75;">
        정체를 숨기고 아군을 찾아라!<br/>
        3주간의 치열한 실시간 줄다리기 레이스
      </p>

      <div class="anim-up-3" style="margin-top:36px;">
        <label style="font-size:12px; color:#71717a; display:block; margin-bottom:8px; letter-spacing:.06em; text-transform:uppercase; font-weight:600;">이름</label>
        <div style="display:flex; align-items:center; gap:10px;">
          <input class="input" type="text" id="name-input"
            placeholder="홍길동"
            autocomplete="off" autocorrect="off" spellcheck="false"
            style="flex:1; font-size:17px; font-weight:500;" />
          <button id="enter-btn" disabled
            style="width:50px; height:50px; flex-shrink:0; border-radius:15px; border:none; cursor:pointer;
              background:rgba(255,255,255,.06); color:rgba(255,255,255,.25);
              display:flex; align-items:center; justify-content:center; font-size:19px; font-weight:700;
              transition:background .3s var(--spring), color .3s var(--spring);">
            →
          </button>
        </div>
        <p id="name-hint" style="font-size:13px; color:#71717a; margin-top:10px; line-height:1.5; font-weight:600;">실명으로 입장하세요</p>
      </div>
    </div>
  </div>
</div>`;
}

export function init() {
  const input = document.getElementById('name-input');
  const btn   = document.getElementById('enter-btn');
  const hint  = document.getElementById('name-hint');
  input.addEventListener('input', () => {
    const has = input.value.trim().length > 0;
    btn.disabled = !has;
    btn.style.background = has ? 'linear-gradient(135deg, #0ea5e9, #7c3aed)' : 'rgba(255,255,255,.06)';
    btn.style.color      = has ? '#fff' : 'rgba(255,255,255,.25)';
    btn.style.boxShadow  = has ? '0 6px 20px -6px rgba(100,100,240,.5)' : 'none';
    input.style.borderColor = '';
    hint.textContent = DEFAULT_HINT;
    hint.style.color = '#71717a';
  });
  btn.addEventListener('click', enterGame);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); enterGame(); } });
}

async function enterGame() {
  const input = document.getElementById('name-input');
  const hint  = document.getElementById('name-hint');
  const btn   = document.getElementById('enter-btn');
  const name  = input.value.trim();
  if (!name) { input.focus(); input.style.borderColor = 'rgba(251,113,133,.6)'; return; }

  btn.disabled = true;
  try {
    await joinRoster(name); // 명단에 없으면 자동 등록, 있으면 그대로 통과
  } catch (e) {
    input.style.borderColor = 'rgba(251,113,133,.6)';
    hint.textContent = REJECT_HINT;
    hint.style.color = '#fb7185';
    btn.disabled = false;
    return;
  }
  btn.disabled = false;

  input.style.borderColor = '';
  state.name = name;
  saveName(name);   // 다음부터 이름 입력 없이 자동 입장

  state.team = null;
  state.role = null;
  state.cardFlipped = false;
  state.roleFlipped = false;
  state.roleConfirmed = false;

  // 이미 팀·역할 배정이 끝난 상태라면 대기실을 거치지 않고 바로 카드/게임 화면으로
  const { assigned, players } = getAssignment();
  const me = assigned ? players.find(p => p.name === name) : null;
  if (me) {
    enterAssignedPlayer(me);
    return;
  }

  // 아직 배정 전 — 대기실로 먼저 이동한 뒤 준비 (순서가 반대면 배정 완료 감지 전환을 되돌려버림)
  goToScreen('s-waiting');
  prepareWaiting();
}
