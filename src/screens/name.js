import { state, SPECIAL_ROLES } from '../state.js';
import { goToScreen } from '../utils/nav.js';
import { prepareCard } from './card.js';

export function render() {
  return `
<div class="screen active" id="s-name" style="background:#050505; overflow:hidden;">

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

  <div class="scroll-body" style="position:relative; z-index:2; display:flex; flex-direction:column; padding:calc(var(--safe-top) + 20px) 26px calc(var(--safe-bottom) + 32px);">

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
    </div>

    <div class="anim-up-3">
      <label style="font-size:12px; color:#71717a; display:block; margin-bottom:8px; letter-spacing:.06em; text-transform:uppercase; font-weight:600;">이름</label>
      <input class="input" type="text" id="name-input"
        placeholder="홍길동"
        autocomplete="off" autocorrect="off" spellcheck="false"
        style="font-size:17px; font-weight:500;" />
      <p style="font-size:12px; color:#3f3f46; margin-top:8px; line-height:1.5;">실명으로 입장하세요.</p>
    </div>

    <button class="btn btn-primary anim-up-4"
      style="width:100%; height:56px; margin-top:14px; font-size:16px; border-radius:18px;
        background:linear-gradient(135deg, #0ea5e9, #7c3aed);
        box-shadow: 0 10px 36px -8px rgba(100,100,240,.45), inset 0 1px 0 rgba(255,255,255,.2);"
      id="enter-btn">
      입장하기
    </button>
  </div>
</div>`;
}

export function init() {
  const input = document.getElementById('name-input');
  const btn   = document.getElementById('enter-btn');
  btn.addEventListener('click', enterGame);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); enterGame(); } });
}

function enterGame() {
  const input = document.getElementById('name-input');
  const name  = input.value.trim();
  if (!name) { input.focus(); input.style.borderColor = 'rgba(251,113,133,.6)'; return; }
  input.style.borderColor = '';
  state.name = name;
  state.team = Math.random() < .5 ? 'pacer' : 'ghost';
  // TODO: 실제 배포 시 서버 배정으로 교체
  state.role = SPECIAL_ROLES[Math.floor(Math.random() * SPECIAL_ROLES.length)];
  state.cardFlipped = false;
  state.roleFlipped = false;
  prepareCard();
  goToScreen('s-card');
}
