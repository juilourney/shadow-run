import { goToScreen } from '../utils/nav.js';

const BUFF_CARDS = [
  { name: '더블 적립', icon: '×2', color: '#38bdf8', bg: 'rgba(56,189,248,.15)', border: 'rgba(56,189,248,.35)', desc: '이번 번개 마일리지가 2배로 적립됩니다' },
  { name: '회복 카드', icon: '♻', color: '#34d399', bg: 'rgba(52,211,153,.12)', border: 'rgba(52,211,153,.3)', desc: '다음 투표 패널티 1회가 면제됩니다' },
  { name: '스피드 부스트', icon: '⚡', color: '#fb923c', bg: 'rgba(251,146,60,.15)', border: 'rgba(251,146,60,.35)', desc: '다음 번개 보너스 +3km 추가 적립' },
  { name: '기본 적립', icon: '✓', color: '#71717a', bg: 'rgba(113,113,122,.12)', border: 'rgba(113,113,122,.25)', desc: '1:1 정상 마일리지가 적립됩니다' },
];

const SINGLE_TEAM_SKILLS = [
  { name: '시너지 스킬', icon: '🔥', color: '#fb923c', bg: 'rgba(251,146,60,.18)', border: 'rgba(251,146,60,.4)', desc: '이번 번개 마일리지 ×1.5 팀 전체 적립' },
  { name: '게이지 스킬', icon: '⚔️', color: '#fb7185', bg: 'rgba(251,113,133,.15)', border: 'rgba(251,113,133,.35)', desc: '상대팀 게이지에서 달린 거리만큼 직접 삭감' },
];

export function render() {
  return `
<div class="screen" id="s-bolt-buff" style="background:#050505; overflow:hidden;">

  <div style="position:absolute; inset:0; pointer-events:none;">
    <div id="buff-orb" style="position:absolute; top:-10%; left:50%; transform:translateX(-50%); width:80%; aspect-ratio:1;
      border-radius:50%; filter:blur(60px); opacity:0; transition:all 1s var(--spring);
      background:radial-gradient(circle, rgba(56,189,248,.3) 0%, transparent 70%);"></div>
  </div>

  <div class="statusbar" style="position:relative; z-index:2;">
    <span class="num">9:41</span>
    <span></span>
  </div>

  <div style="position:relative; z-index:2; flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:0 28px; gap:20px; text-align:center;">

    <p class="anim-up" style="font-size:11px; letter-spacing:.2em; text-transform:uppercase; font-weight:700; color:#52525b;">BUFF CARD</p>
    <h2 class="anim-up-1" style="font-size:24px; font-weight:700; letter-spacing:-.02em;">버프 카드 뽑기</h2>

    <!-- 카드 플립 컨테이너 -->
    <div style="width:100%; max-width:280px; margin:8px 0;" id="buff-flip-container">
      <div id="buff-flip-inner" style="position:relative; width:100%; height:340px; transform-style:preserve-3d; transition:transform 1.2s cubic-bezier(0.16,1,0.3,1);">

        <!-- 앞면 (탭하여 공개) -->
        <div style="position:absolute; inset:0; backface-visibility:hidden; border-radius:28px;
          background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1);
          display:flex; flex-direction:column; align-items:center; justify-content:center; gap:24px; cursor:pointer;"
          id="buff-card-front">
          <p style="font-family:'Space Grotesk'; font-size:80px; font-weight:700; color:rgba(255,255,255,.08); line-height:1;">?</p>
          <p style="font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:#3f3f46; font-weight:600;">탭하여 공개</p>
        </div>

        <!-- 뒷면 (버프 결과) -->
        <div id="buff-card-back" style="position:absolute; inset:0; backface-visibility:hidden; border-radius:28px;
          transform:rotateY(180deg);
          display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px;">
          <p id="buff-icon" style="font-family:'Space Grotesk'; font-size:56px; font-weight:700; line-height:1;"></p>
          <p id="buff-name" style="font-family:'Space Grotesk'; font-size:28px; font-weight:700; letter-spacing:-.02em;"></p>
          <div style="width:36px; height:2px; border-radius:99px;" id="buff-divider"></div>
          <p id="buff-desc" style="font-size:13px; line-height:1.6; padding:0 20px; opacity:.7;"></p>
        </div>

      </div>
    </div>

    <!-- 확인 버튼 (카드 뒤집힌 후 등장) -->
    <button id="buff-confirm-btn" class="btn btn-primary"
      style="width:100%; max-width:280px; height:56px; font-size:16px;
        opacity:0; pointer-events:none; transform:translateY(8px);
        transition:opacity .4s var(--spring), transform .4s var(--spring);">
      결과 확인하기
    </button>

  </div>
</div>`;
}

export function init() {
  let flipped = false;

  document.getElementById('buff-flip-container').addEventListener('click', () => {
    if (flipped) return;
    flipped = true;

    // 랜덤 버프 선택 (단일팀이면 스킬 카드)
    const isSingleTeam = true; // 프로토타입에서 단일팀 시뮬레이션
    const pool = isSingleTeam ? SINGLE_TEAM_SKILLS : BUFF_CARDS;
    const card = pool[Math.floor(Math.random() * pool.length)];

    // 카드 뒷면 채우기
    const back    = document.getElementById('buff-card-back');
    const icon    = document.getElementById('buff-icon');
    const name    = document.getElementById('buff-name');
    const divider = document.getElementById('buff-divider');
    const desc    = document.getElementById('buff-desc');

    back.style.background = card.bg;
    back.style.border     = `1px solid ${card.border}`;
    icon.textContent      = card.icon;
    icon.style.color      = card.color;
    name.textContent      = card.name;
    name.style.color      = card.color;
    divider.style.background = card.color;
    desc.textContent      = card.desc;

    // 오브 색상 변경
    const orb = document.getElementById('buff-orb');
    orb.style.background = `radial-gradient(circle, ${card.color.replace(')', ',.3)').replace('rgb', 'rgba')} 0%, transparent 70%)`;
    orb.style.opacity = '1';

    // 카드 뒤집기
    document.getElementById('buff-flip-inner').style.transform = 'rotateY(180deg)';

    // 확인 버튼 등장
    setTimeout(() => {
      const btn = document.getElementById('buff-confirm-btn');
      btn.style.opacity       = '1';
      btn.style.pointerEvents = 'all';
      btn.style.transform     = 'translateY(0)';
    }, 1000);
  });

  document.getElementById('buff-confirm-btn').addEventListener('click', () => {
    goToScreen('s-bolt-result');
  });
}
