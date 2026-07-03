import { state, ROLES } from '../state.js';
import { goToScreen } from '../utils/nav.js';
import { initPhase } from '../utils/phase.js';

export function render() {
  return `
<div class="screen" id="s-role" style="overflow:hidden;">

  <div style="position:absolute; inset:0; pointer-events:none;">
    <div style="position:absolute; bottom:-15%; right:-20%; width:70%; aspect-ratio:1;
      border-radius:50%;
      background:radial-gradient(circle, var(--accent-glow) 0%, transparent 70%);
      filter:blur(48px); opacity:.55;"></div>
    <div style="position:absolute; top:10%; left:-15%; width:55%; aspect-ratio:1;
      border-radius:50%;
      background:radial-gradient(circle, var(--accent-tint) 0%, transparent 70%);
      filter:blur(40px); opacity:.7;"></div>
  </div>

  <div class="scroll-body" style="position:relative; z-index:2;
    display:flex; flex-direction:column; align-items:center; justify-content:center; gap:32px;
    padding:calc(var(--safe-top) + 20px) 26px 0;">

    <div class="anim-up" style="position:absolute; top:calc(var(--safe-top) + 40px); left:0; right:0; text-align:center; padding:0 26px;">
      <span id="role-team-badge" class="chip" style="background:var(--accent-tint); color:var(--accent);"></span>
      <p style="font-size:11px; letter-spacing:.2em; text-transform:uppercase; font-weight:700; color:#3f3f46; margin-top:14px;">ROLE ASSIGNMENT</p>
      <h2 style="font-size:26px; font-weight:700; letter-spacing:-.02em; line-height:1.25; margin-top:10px;">
        카드를 탭해서<br/>역할을 확인하세요
      </h2>
      <p style="font-size:13px; color:#52525b; margin-top:8px;">배정된 역할은 게임이 끝날 때까지 비밀</p>
    </div>

    <div class="flip-container" style="width:100%; max-width:240px;" id="role-flip-area">
      <div class="flip-inner" id="role-flip-inner" style="width:100%; height:300px;">

        <div class="flip-face" style="
          background: var(--accent-tint);
          border: 1px solid var(--accent-border);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.07);
          display:flex; flex-direction:column; align-items:center; justify-content:center; gap:28px;
          cursor:pointer;">
          <div style="text-align:center; line-height:1;">
            <p style="font-family:'Space Grotesk'; font-size:11px; letter-spacing:.3em;
              color:var(--accent); opacity:.3; text-transform:uppercase; margin-bottom:20px;">SHADOW RUN</p>
            <p style="font-family:'Space Grotesk'; font-size:64px; font-weight:700;
              letter-spacing:-.04em; color:var(--accent); opacity:.2; line-height:1; user-select:none;">?</p>
          </div>
          <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
            <div style="width:28px; height:1px; background:var(--accent-border);"></div>
            <p style="font-size:12px; letter-spacing:.14em; text-transform:uppercase;
              color:var(--accent); opacity:.5; font-weight:600;">탭하여 공개</p>
            <div style="width:28px; height:1px; background:var(--accent-border);"></div>
          </div>
        </div>

        <div class="flip-face flip-back" id="role-card-back"
          style="display:flex; flex-direction:column; align-items:center; justify-content:center;
            gap:12px; border:1px solid transparent;">
          <div id="role-back-cover" style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:28px;">
            <div style="text-align:center; line-height:1;">
              <p style="font-family:'Space Grotesk'; font-size:11px; letter-spacing:.3em; color:var(--accent); opacity:.3; text-transform:uppercase; margin-bottom:20px;">SHADOW RUN</p>
              <p style="font-family:'Space Grotesk'; font-size:64px; font-weight:700; letter-spacing:-.04em; color:var(--accent); opacity:.2; line-height:1; user-select:none;">?</p>
            </div>
            <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
              <div style="width:28px; height:1px; background:var(--accent-border);"></div>
              <p style="font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:var(--accent); opacity:.5; font-weight:600;">탭하여 공개</p>
              <div style="width:28px; height:1px; background:var(--accent-border);"></div>
            </div>
          </div>
          <p class="eyebrow" id="role-card-label" style="letter-spacing:.22em; opacity:.7;"></p>
          <p id="role-card-name" style="font-family:'Space Grotesk'; font-size:40px; font-weight:700; letter-spacing:-.03em; line-height:1;"></p>
          <div style="width:36px; height:1.5px; border-radius:99px;" id="role-card-divider"></div>
          <p id="role-card-sub" style="font-size:13px; text-align:center; padding:0 24px; line-height:1.6; opacity:.65;"></p>
          <p id="role-continue-hint"
            style="font-size:11px; letter-spacing:.14em; text-transform:uppercase; font-weight:600;
              margin-top:6px; opacity:0; transition:opacity .45s .12s var(--spring);">
            탭하여 계속
          </p>
        </div>

      </div>
    </div>

    <div style="width:100%; display:flex; flex-direction:column; gap:12px;">

      <div id="role-desc-reveal"
        style="max-height:0; overflow:hidden; opacity:0; pointer-events:none;
          transition: max-height .6s var(--spring), opacity .45s var(--spring);">
        <div class="bezel-accent" style="padding:20px 22px; border-radius:22px; margin-bottom:12px;">
          <p id="role-desc-headline" style="font-size:16px; font-weight:700; line-height:1.4; color:#fafafa;"></p>
          <div style="height:1px; background:rgba(255,255,255,.07); margin:12px 0;"></div>
          <p id="role-desc-detail" style="font-size:15px; color:#a1a1aa; line-height:1.75;"></p>
        </div>
      </div>


    </div>
  </div>
</div>`;
}

let revealComplete = false;

export function init() {
  document.getElementById('role-flip-area').addEventListener('click', handleRoleTap);
}

function handleRoleTap() {
  if (!state.roleFlipped) {
    flipRoleCard();
  } else if (revealComplete) {
    initPhase();
    state.roleConfirmed = true;
    goToScreen('s-game');
  }
}

export function prepareRoleScreen() {
  const teamName = state.team === 'pacer' ? '페이서팀' : '고스트팀';
  document.getElementById('role-team-badge').textContent = teamName;

  // 뒷면 내용 초기화 — 스핀 중 노출 방지
  const back   = document.getElementById('role-card-back');
  const label  = document.getElementById('role-card-label');
  const nameEl = document.getElementById('role-card-name');
  const sub    = document.getElementById('role-card-sub');
  // 회전 중엔 앞면과 동일한 톤(accent-tint) — 검정 면 방지
  back.style.background = 'var(--accent-tint)';
  back.style.border     = '1px solid var(--accent-border)';
  back.style.boxShadow  = 'inset 0 1px 0 rgba(255,255,255,.07)';
  label.textContent     = '';
  nameEl.textContent    = '';
  sub.textContent       = '';

  // 회전 중 뒷면: 앞면과 동일한 커버 표시, 공개용 이름/구분선은 숨김
  document.getElementById('role-back-cover').style.display = 'flex';
  document.getElementById('role-card-divider').style.opacity = '0';

  const fi = document.getElementById('role-flip-inner');
  fi.classList.remove('flipped', 'spinning');
  state.roleFlipped = false;
  revealComplete = false;

  const descEl = document.getElementById('role-desc-reveal');
  descEl.style.maxHeight     = '0';
  descEl.style.opacity       = '0';
  descEl.style.pointerEvents = 'none';
  const hint = document.getElementById('role-continue-hint');
  hint.style.opacity = '0';
  hint.style.color   = '';

  // 설정 화면 반영 — settings 화면이 아직 마운트 안 된 경우가 있어 null 가드
  // (없으면 여기서 throw 되어 역할 화면 전환이 막힘)
  const n = state.name;
  const setText = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  setText('settings-name',      n || '참가자');
  setText('settings-initial',   n ? n[0] : '?');
  setText('settings-team-chip', teamName);
  setText('settings-role-chip', '· ' + ROLES[state.role].name);
}

function flipRoleCard() {
  if (state.roleFlipped) return;
  state.roleFlipped = true;

  const inner = document.getElementById('role-flip-inner');
  inner.classList.add('spinning');

  let revealed = false;
  const finishReveal = () => {
    if (revealed) return;
    revealed = true;
    inner.classList.add('flipped');

    // 스핀 멈춘 후 뒷면 내용 채우기
    const r        = ROLES[state.role];
    const isRunner = state.role === 'runner';
    const back     = document.getElementById('role-card-back');
    const label    = document.getElementById('role-card-label');
    const nameEl   = document.getElementById('role-card-name');
    const divider  = document.getElementById('role-card-divider');
    const sub      = document.getElementById('role-card-sub');

    const hint = document.getElementById('role-continue-hint');
    if (isRunner) {
      back.style.background    = 'rgba(255,255,255,.04)';
      back.style.border        = '1px solid rgba(255,255,255,.09)';
      back.style.boxShadow     = 'inset 0 1px 0 rgba(255,255,255,.07)';
      label.style.color        = 'rgba(255,255,255,.4)';
      nameEl.style.color       = '#fafafa';
      divider.style.background = 'rgba(255,255,255,.2)';
      sub.style.color          = 'rgba(255,255,255,.4)';
      hint.style.color         = 'rgba(255,255,255,.5)';
    } else {
      back.style.background    = 'var(--accent-tint)';
      back.style.border        = '1px solid var(--accent-border)';
      back.style.boxShadow     = 'inset 0 1px 0 rgba(255,255,255,.08), 0 0 40px -10px var(--accent-glow)';
      label.style.color        = 'var(--accent)';
      nameEl.style.color       = 'var(--accent)';
      divider.style.background = 'var(--accent)';
      sub.style.color          = 'var(--accent)';
      hint.style.color         = 'var(--accent)';
    }
    label.textContent  = 'YOUR ROLE';
    nameEl.textContent = r.name;
    sub.textContent    = r.short;

    document.getElementById('role-desc-headline').textContent = r.headline;
    document.getElementById('role-desc-detail').textContent   = r.detail;

    // 커버 감추고 구분선 노출
    document.getElementById('role-back-cover').style.display = 'none';
    divider.style.opacity = '1';

    revealComplete = true;                                  // 공개 즉시 다음 탭 허용

    setTimeout(() => {
      const descEl = document.getElementById('role-desc-reveal');
      descEl.style.maxHeight     = descEl.scrollHeight + 'px';
      descEl.style.opacity       = '1';
      descEl.style.pointerEvents = 'auto';
      hint.style.opacity = isRunner ? '1' : '0.55';
    }, 300);
  };
  inner.addEventListener('animationend', finishReveal, { once: true });
  setTimeout(finishReveal, 3700);   // animationend 미발생(모바일/백그라운드) 대비 안전망
}
