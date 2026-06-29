import { state } from '../state.js';
import { goToScreen } from '../utils/nav.js';
import { applyTeamTheme } from '../utils/theme.js';
import { prepareRoleScreen } from './role.js';

export function render() {
  return `
<div class="screen" id="s-card" style="overflow:hidden;">

  <div id="card-bg-orb" style="position:absolute; inset:0; pointer-events:none; transition:opacity 1.2s var(--spring); opacity:0;">
    <div id="card-orb-a" style="position:absolute; top:-20%; left:-15%; width:75%; aspect-ratio:1; border-radius:50%; filter:blur(50px); transition:background 1s;"></div>
    <div id="card-orb-b" style="position:absolute; bottom:-15%; right:-15%; width:65%; aspect-ratio:1; border-radius:50%; filter:blur(50px); transition:background 1s;"></div>
  </div>

  <div class="scroll-body" style="position:relative; z-index:2; display:flex; flex-direction:column; align-items:center; justify-content:space-between; padding:calc(var(--safe-top) + 20px) 26px calc(var(--safe-bottom) + 32px);">

    <div class="anim-up" style="text-align:center; padding-top:12px; width:100%;">
      <p style="font-size:11px; letter-spacing:.2em; text-transform:uppercase; font-weight:700; color:#3f3f46;">TEAM ASSIGNMENT</p>
      <h2 id="card-title" style="font-size:26px; font-weight:700; letter-spacing:-.02em; line-height:1.25; margin-top:10px; color:#fafafa;">
        카드를 탭해서<br/>팀을 확인하세요
      </h2>
      <p id="card-hint" style="font-size:13px; color:#52525b; margin-top:8px;">결과는 오직 나만 알 수 있어요</p>
    </div>

    <div class="flip-container" style="width:100%; max-width:240px;" id="card-flip-area">
      <div class="flip-inner" id="flip-inner" style="width:100%; height:300px;">

        <div class="flip-face" style="
          background:rgba(255,255,255,.04);
          border:1px solid rgba(255,255,255,.09);
          box-shadow:inset 0 1px 0 rgba(255,255,255,.08);
          display:flex; flex-direction:column; align-items:center; justify-content:center; gap:28px;
          cursor:pointer;">
          <div style="text-align:center; line-height:1;">
            <p style="font-family:'Space Grotesk'; font-size:11px; letter-spacing:.3em; color:#2a2a2e; text-transform:uppercase; margin-bottom:20px;">SHADOW RUN</p>
            <p style="font-family:'Space Grotesk'; font-size:64px; font-weight:700; letter-spacing:-.04em; color:#1a1a1e; line-height:1; user-select:none;">?</p>
          </div>
          <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
            <div style="width:28px; height:1px; background:rgba(255,255,255,.12);"></div>
            <p style="font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:#3f3f46; font-weight:600;">탭하여 공개</p>
            <div style="width:28px; height:1px; background:rgba(255,255,255,.12);"></div>
          </div>
        </div>

        <div class="flip-face flip-back" id="card-back"
          style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; border:1px solid transparent;">
          <p class="eyebrow" id="card-team-label" style="letter-spacing:.22em;"></p>
          <p id="card-team-name" style="font-family:'Space Grotesk'; font-size:40px; font-weight:700; letter-spacing:-.03em; line-height:1;"></p>
          <div style="width:36px; height:1.5px; border-radius:99px;" id="card-divider"></div>
          <p id="card-team-desc" style="font-size:13px; text-align:center; padding:0 24px; line-height:1.6; opacity:.65;"></p>
        </div>

      </div>
    </div>

    <div style="width:100%;">
      <button class="btn btn-primary" id="card-confirm-btn"
        style="width:100%; height:56px; font-size:16px;
          opacity:0; pointer-events:none; transform:translateY(10px);
          transition:opacity .5s var(--spring), transform .5s var(--spring);">
        역할 확인하기
      </button>
    </div>

  </div>
</div>`;
}

export function init() {
  document.getElementById('card-flip-area').addEventListener('click', flipCard);
  document.getElementById('card-confirm-btn').addEventListener('click', () => {
    prepareRoleScreen();
    goToScreen('s-role');
  });
}

export function prepareCard() {
  // 뒷면 내용 초기화 — 스핀 중 노출 방지 (내용은 animationend 후에 채움)
  const back   = document.getElementById('card-back');
  const label  = document.getElementById('card-team-label');
  const nameEl = document.getElementById('card-team-name');
  const desc   = document.getElementById('card-team-desc');
  back.style.background = 'rgba(255,255,255,.04)';
  back.style.border     = '1px solid rgba(255,255,255,.09)';
  back.style.boxShadow  = 'none';
  label.textContent     = '';
  nameEl.textContent    = '';
  desc.textContent      = '';

  // 플립 상태 리셋
  const inner = document.getElementById('flip-inner');
  inner.classList.remove('flipped', 'spinning');
  state.cardFlipped = false;

  const btn = document.getElementById('card-confirm-btn');
  btn.style.opacity      = '0';
  btn.style.transform    = 'translateY(10px)';
  btn.style.pointerEvents = 'none';

  document.getElementById('card-bg-orb').style.opacity = '0';
}

function flipCard() {
  if (state.cardFlipped) return;
  state.cardFlipped = true;

  const isPacer = state.team === 'pacer';
  const inner = document.getElementById('flip-inner');
  inner.classList.add('spinning');

  const orbA = document.getElementById('card-orb-a');
  const orbB = document.getElementById('card-orb-b');
  const bg   = document.getElementById('card-bg-orb');
  if (isPacer) {
    orbA.style.background = 'radial-gradient(circle, rgba(56,189,248,.28) 0%, transparent 70%)';
    orbB.style.background = 'radial-gradient(circle, rgba(14,165,233,.18) 0%, transparent 70%)';
  } else {
    orbA.style.background = 'radial-gradient(circle, rgba(192,132,252,.26) 0%, transparent 70%)';
    orbB.style.background = 'radial-gradient(circle, rgba(168,85,247,.18) 0%, transparent 70%)';
  }
  setTimeout(() => { bg.style.opacity = '1'; }, 200);

  applyTeamTheme(state.team);

  inner.addEventListener('animationend', () => {
    inner.classList.add('flipped');
    state.cardFlipped = true;

    // 스핀 멈춘 후 뒷면 내용 채우기
    const back    = document.getElementById('card-back');
    const label   = document.getElementById('card-team-label');
    const nameEl  = document.getElementById('card-team-name');
    const divider = document.getElementById('card-divider');
    const desc    = document.getElementById('card-team-desc');

    if (isPacer) {
      back.style.background    = 'linear-gradient(160deg, rgba(56,189,248,.20) 0%, rgba(14,165,233,.06) 100%)';
      back.style.border        = '1px solid rgba(56,189,248,.35)';
      back.style.boxShadow     = 'inset 0 1px 0 rgba(255,255,255,.08)';
      label.style.color        = 'rgba(125,211,252,.7)';
      nameEl.style.color       = '#38bdf8';
      divider.style.background = '#38bdf8';
      desc.style.color         = 'rgba(125,211,252,.65)';
      nameEl.textContent       = '페이서';
      desc.textContent         = '번개를 달려 게이지를\n오른쪽으로 당겨라';
    } else {
      back.style.background    = 'linear-gradient(160deg, rgba(192,132,252,.18) 0%, rgba(168,85,247,.05) 100%)';
      back.style.border        = '1px solid rgba(192,132,252,.32)';
      back.style.boxShadow     = 'inset 0 1px 0 rgba(255,255,255,.07)';
      label.style.color        = 'rgba(216,180,254,.7)';
      nameEl.style.color       = '#c084fc';
      divider.style.background = '#c084fc';
      desc.style.color         = 'rgba(216,180,254,.65)';
      nameEl.textContent       = '고스트';
      desc.textContent         = '보이지 않게 달려 게이지를\n왼쪽으로 당겨라';
    }
    label.textContent = 'YOUR TEAM';

    setTimeout(() => {
      const btn = document.getElementById('card-confirm-btn');
      btn.style.opacity       = '1';
      btn.style.pointerEvents = 'all';
      btn.style.transform     = 'translateY(0)';
    }, 300);
  }, { once: true });
}
