import { goToScreen } from '../utils/nav.js';
import { getPendingBolt, completeBolt, setLastBoltResult } from '../store.js';
import { openResultView } from './bolt-result.js';

// ── 카드 풀 ───────────────────────────────────────────────
const BUFF_CARDS = [
  { name: '트리플 적립', icon: '×3', multiplier: 3,   color: '#fb923c', bg: 'rgba(251,146,60,.15)',  border: 'rgba(251,146,60,.35)',  desc: '이번 번개 마일리지가 3배로 적립됩니다' },
  { name: '더블 적립',  icon: '×2', multiplier: 2,   color: '#38bdf8', bg: 'rgba(56,189,248,.15)',  border: 'rgba(56,189,248,.35)',  desc: '이번 번개 마일리지가 2배로 적립됩니다' },
  { name: '1.5배 적립', icon: '×1.5', multiplier: 1.5, color: '#a78bfa', bg: 'rgba(167,139,250,.12)', border: 'rgba(167,139,250,.3)',  desc: '이번 번개 마일리지가 1.5배로 적립됩니다' },
  { name: '기본 적립', icon: '×1', multiplier: 1,   color: '#71717a', bg: 'rgba(113,113,122,.12)', border: 'rgba(113,113,122,.25)', desc: '1:1 정상 마일리지가 적립됩니다' },
];
const PACER_SKILL = { name: '시너지 스킬', icon: '🔥', multiplier: 1, color: '#fb923c', bg: 'rgba(251,146,60,.18)', border: 'rgba(251,146,60,.4)', desc: '팀 전체 마일리지가 추가 적립됩니다' };
const GHOST_SKILL = { name: '게이지 스킬', icon: '⚔️', multiplier: 1, color: '#fb7185', bg: 'rgba(251,113,133,.15)', border: 'rgba(251,113,133,.35)', desc: '상대팀 게이지에서 달린 거리만큼 직접 삭감됩니다' };

const CARD_W   = 88;
const CARD_H   = 124;
const CARD_GAP = 14;
const CARD_SLOT = CARD_W + CARD_GAP;
const POOL_SIZE = 4; // 루프 단위

// 모듈 스코프 — openBuffView에서 RAF 취소·상태 리셋을 위해
let _raf    = null;
let _locked = false;

export function render() {
  const backs = Array(POOL_SIZE * 3).fill(0).map(() => `
    <div style="width:${CARD_W}px;height:${CARD_H}px;flex-shrink:0;border-radius:18px;
      background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);
      display:flex;align-items:center;justify-content:center;">
      <span style="font-family:'Space Grotesk';font-size:42px;font-weight:700;color:rgba(255,255,255,.07);">?</span>
    </div>`).join('');

  return `
<div class="screen" id="s-bolt-buff" style="overflow:hidden;">

  <div id="buff-orb-inner" style="position:absolute;top:-18%;left:50%;transform:translateX(-50%);
    width:80%;aspect-ratio:1;border-radius:50%;filter:blur(60px);opacity:0;pointer-events:none;
    transition:background .6s,opacity .8s var(--spring);
    background:radial-gradient(circle,rgba(56,189,248,.25) 0%,transparent 70%);"></div>

  <div id="buff-particles" style="position:absolute;inset:0;pointer-events:none;z-index:10;overflow:hidden;"></div>

  <div style="position:relative;z-index:2;flex:1;display:flex;flex-direction:column;align-items:center;
    justify-content:center;padding:calc(var(--safe-top)+8px) 0 24px;gap:20px;text-align:center;">

    <p class="anim-up" style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;font-weight:700;color:#52525b;">BUFF CARD</p>
    <h2 class="anim-up-1" style="font-size:24px;font-weight:700;letter-spacing:-.02em;">버프 카드 뽑기</h2>

    <!-- 슬롯 -->
    <div id="slot-outer" style="position:relative;width:100%;height:${CARD_H + 44}px;cursor:pointer;">
      <div style="position:absolute;inset:0;pointer-events:none;z-index:4;
        background:linear-gradient(90deg,var(--bg,#09090b) 0%,transparent 28%,transparent 72%,var(--bg,#09090b) 100%);"></div>
      <div id="slot-highlight" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
        width:${CARD_W+10}px;height:${CARD_H+10}px;border-radius:20px;
        border:2px solid var(--accent);opacity:.35;pointer-events:none;z-index:5;
        transition:opacity .4s,border-color .4s,box-shadow .4s;"></div>
      <div id="slot-shaker" style="position:absolute;inset:0;overflow:hidden;transform-origin:center;">
        <div id="slot-track" style="display:flex;gap:${CARD_GAP}px;position:absolute;top:50%;margin-top:-${CARD_H/2}px;will-change:transform;">
          ${backs}
        </div>
      </div>
      <!-- 공개된 카드 — 슬롯 카드와 동일 크기, 중앙 고정 (margin으로 centering → transform 충돌 방지) -->
      <div id="buff-revealed" style="display:none;position:absolute;left:50%;top:50%;
        margin-left:-${CARD_W/2}px;margin-top:-${CARD_H/2}px;
        width:${CARD_W}px;height:${CARD_H}px;
        border-radius:18px;flex-direction:column;align-items:center;justify-content:center;gap:6px;z-index:6;">
        <p id="buff-rev-icon" style="font-family:'Space Grotesk';font-size:36px;font-weight:700;line-height:1;"></p>
        <p id="buff-rev-name" style="font-size:12px;font-weight:700;letter-spacing:-.01em;"></p>
      </div>
      <p id="slot-hint" style="position:absolute;bottom:4px;left:0;right:0;z-index:6;
        font-size:12px;letter-spacing:.1em;color:#3f3f46;text-align:center;pointer-events:none;">탭하여 뽑기</p>
    </div>

    <!-- 카드 설명 (공개 후 카드 아래 등장) -->
    <div id="buff-rev-details" style="display:none;text-align:center;padding:0 28px;">
      <div id="buff-rev-divider" style="width:32px;height:2px;border-radius:99px;margin:0 auto 10px;"></div>
      <p id="buff-rev-desc" style="font-size:13px;line-height:1.6;opacity:.7;"></p>
    </div>

    <button id="buff-confirm-btn" class="btn btn-primary"
      style="width:calc(100% - 48px);max-width:300px;height:56px;font-size:16px;
        opacity:0;pointer-events:none;transform:translateY(8px);
        transition:opacity .4s var(--spring),transform .4s var(--spring);">
      결과 확인하기
    </button>
  </div>
</div>`;
}

export function openBuffView() {
  // 이전 RAF & 잠금 상태 초기화
  if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
  _locked = false;

  const shaker = document.getElementById('slot-shaker');
  if (!shaker) return;

  // 슬롯 복구
  shaker.style.display    = '';
  shaker.style.opacity    = '1';
  shaker.style.transform  = '';
  shaker.style.animation  = '';
  shaker.style.transition = '';

  // 공개 카드 & 설명 숨김
  const rev = document.getElementById('buff-revealed');
  rev.style.display   = 'none';
  rev.style.animation = '';

  const details = document.getElementById('buff-rev-details');
  details.style.display   = 'none';
  details.style.animation = '';

  // 힌트 & 하이라이트 초기화
  const hint = document.getElementById('slot-hint');
  hint.textContent  = '탭하여 뽑기';
  hint.style.opacity = '1';

  const hl = document.getElementById('slot-highlight');
  hl.style.opacity     = '.35';
  hl.style.borderColor = 'var(--accent)';
  hl.style.boxShadow   = '';

  // 오브 초기화
  const orb = document.getElementById('buff-orb-inner');
  orb.style.opacity = '0';

  // 확인 버튼 숨김
  const btn = document.getElementById('buff-confirm-btn');
  btn.style.opacity       = '0';
  btn.style.pointerEvents = 'none';
  btn.style.transform     = 'translateY(8px)';
}

export function init() {
  ensureKeyframes();

  let drawnCard = null;
  let pool      = BUFF_CARDS; // 탭 시점에 갱신

  const track   = document.getElementById('slot-track');
  const shaker  = document.getElementById('slot-shaker');
  const outer   = document.getElementById('slot-outer');

  // ── 슬롯 RAF 애니메이션 ──────────────────────────────────
  let lastTs = null;
  let slotX  = 0;

  function initSlot() {
    const containerW = outer.offsetWidth || window.innerWidth;
    // 컨테이너 중앙에 카드 하나 정렬
    slotX = containerW / 2 - CARD_W / 2;
    track.style.transform = `translateX(${slotX}px)`;
  }

  function spinTick(ts) {
    if (!lastTs) lastTs = ts;
    const dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;

    slotX -= 340 * dt;

    // 루프: POOL_SIZE 장 단위로 리셋
    const loopWidth = POOL_SIZE * CARD_SLOT;
    const containerW = outer.offsetWidth || window.innerWidth;
    const resetThreshold = containerW / 2 - CARD_W / 2 - loopWidth;
    if (slotX < resetThreshold) slotX += loopWidth;

    track.style.transform = `translateX(${slotX}px)`;
    _raf = requestAnimationFrame(spinTick);
  }

  // 첫 번째 requestAnimationFrame 에서 offsetWidth가 준비됨
  requestAnimationFrame(() => {
    initSlot();
    _raf = requestAnimationFrame(spinTick);
  });

  // ── 탭: 슬롯 잠금 ────────────────────────────────────────
  outer.addEventListener('click', () => {
    if (_locked) return;
    _locked = true;

    cancelAnimationFrame(_raf);
    _raf = null;
    lastTs = null;

    // 탭 시점에 pendingBolt 읽기 (init 시점엔 아직 null)
    const p = getPendingBolt();
    const isSingle = p?.isSingleTeam ?? false;
    pool = isSingle
      ? (p?.team === 'pacer' ? [PACER_SKILL] : [GHOST_SKILL])
      : BUFF_CARDS;

    drawnCard = pool[Math.floor(Math.random() * pool.length)];

    // 하이라이트 링 강조
    const hl = document.getElementById('slot-highlight');
    hl.style.opacity    = '1';
    hl.style.borderColor = drawnCard.color;
    hl.style.boxShadow  = `0 0 20px ${drawnCard.color}55`;

    // 오브 색
    document.getElementById('buff-orb-inner').style.background =
      `radial-gradient(circle,${drawnCard.color.replace(')', ',.28)').replace('rgb', 'rgba')} 0%,transparent 70%)`;
    document.getElementById('buff-orb-inner').style.opacity = '1';

    document.getElementById('slot-hint').textContent = '';

    runBuildup();
  });

  // ── 빌드업 → 팡! ─────────────────────────────────────────
  function runBuildup() {
    shaker.style.animation = `buff-shake-1 .14s ease-in-out infinite alternate`;
    setTimeout(() => { shaker.style.animation = `buff-shake-2 .1s ease-in-out infinite alternate`; }, 280);
    setTimeout(() => { shaker.style.animation = `buff-shake-3 .07s ease-in-out infinite alternate`; }, 520);
    setTimeout(() => {
      shaker.style.animation = '';
      burst();
    }, 760);
  }

  function burst() {
    spawnParticles(drawnCard.color);

    // 슬롯 트랙만 사라짐 (outer는 유지 — buff-revealed가 안에 있음)
    shaker.style.transition = 'opacity .18s, transform .18s';
    shaker.style.opacity    = '0';
    shaker.style.transform  = 'scale(.88)';
    document.getElementById('slot-hint').style.opacity = '0';

    setTimeout(() => {
      shaker.style.display = 'none';
      showReveal();
    }, 180);
  }

  function showReveal() {
    const rev = document.getElementById('buff-revealed');
    document.getElementById('buff-rev-icon').textContent      = drawnCard.icon;
    document.getElementById('buff-rev-icon').style.color      = drawnCard.color;
    document.getElementById('buff-rev-name').textContent      = drawnCard.name;
    document.getElementById('buff-rev-name').style.color      = drawnCard.color;
    document.getElementById('buff-rev-divider').style.background = drawnCard.color;
    document.getElementById('buff-rev-desc').textContent      = drawnCard.desc;
    rev.style.background = drawnCard.bg;
    rev.style.border     = `1px solid ${drawnCard.border}`;
    rev.style.display    = 'flex';
    rev.style.animation  = 'buff-pop .45s cubic-bezier(.17,.67,.36,1.35) both';

    // 설명 텍스트 (카드 아래, 살짝 늦게)
    setTimeout(() => {
      const details = document.getElementById('buff-rev-details');
      details.style.display    = 'block';
      details.style.animation  = 'buff-pop .35s cubic-bezier(.17,.67,.36,1.35) both';
    }, 220);

    setTimeout(() => {
      const btn = document.getElementById('buff-confirm-btn');
      btn.style.opacity       = '1';
      btn.style.pointerEvents = 'auto';
      btn.style.transform     = 'translateY(0)';
    }, 420);
  }

  // ── 파티클 ────────────────────────────────────────────────
  function spawnParticles(color) {
    const container = document.getElementById('buff-particles');
    const cx = container.offsetWidth  / 2;
    const cy = container.offsetHeight / 2;
    const count = 14;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * .4;
      const dist  = 70 + Math.random() * 90;
      const size  = 4 + Math.random() * 7;
      const tx    = Math.cos(angle) * dist;
      const ty    = Math.sin(angle) * dist;
      const delay = Math.random() * 80;

      const p = document.createElement('div');
      p.style.cssText = `
        position:absolute;left:${cx}px;top:${cy}px;
        width:${size}px;height:${size}px;border-radius:50%;
        background:${color};transform:translate(-50%,-50%);
        animation:particle-fly .55s ${delay}ms ease-out forwards;
        --ptx:${tx}px;--pty:${ty}px;`;
      container.appendChild(p);
      setTimeout(() => p.remove(), 700 + delay);
    }
  }

  // ── 확인 버튼 ─────────────────────────────────────────────
  document.getElementById('buff-confirm-btn').addEventListener('click', async () => {
    const pending = getPendingBolt(); // 클릭 시점에 fresh하게 읽기
    if (pending) {
      try {
        const result = await completeBolt(
          pending.boltId, pending.distanceKm, pending.participantIds,
          drawnCard?.multiplier ?? 1
        );
        setLastBoltResult({ ...result, card: drawnCard, boltTitle: pending.boltTitle });
      } catch (e) {
        console.error('completeBolt 실패:', e);
      }
    }
    openResultView();
    goToScreen('s-bolt-result');
  });
}

// ── 키프레임 ──────────────────────────────────────────────
function ensureKeyframes() {
  if (document.getElementById('buff-kf')) return;
  const s = document.createElement('style');
  s.id = 'buff-kf';
  s.textContent = `
    @keyframes buff-shake-1 {
      from { transform: translateX(-3px) scale(1.00); }
      to   { transform: translateX( 3px) scale(1.00); }
    }
    @keyframes buff-shake-2 {
      from { transform: translateX(-6px) scale(1.04); }
      to   { transform: translateX( 6px) scale(1.04); }
    }
    @keyframes buff-shake-3 {
      from { transform: translateX(-11px) scale(1.08) rotate(-1.2deg); }
      to   { transform: translateX( 11px) scale(1.08) rotate( 1.2deg); }
    }
    @keyframes buff-pop {
      0%  { transform: scale(.55); opacity: 0; }
      65% { transform: scale(1.06); opacity: 1; }
      100%{ transform: scale(1);   opacity: 1; }
    }
    @keyframes particle-fly {
      0%   { transform: translate(-50%,-50%) scale(1);   opacity: 1; }
      100% { transform: translate(calc(-50% + var(--ptx)), calc(-50% + var(--pty))) scale(0); opacity: 0; }
    }
  `;
  document.head.appendChild(s);
}
