import { goToScreen } from '../utils/nav.js';
import { getPendingBolt, completeBolt, setLastBoltResult } from '../store.js';
import { openResultView, markBoltResultSeen } from './bolt-result.js';

// 버프 카드는 서버가 draw한다(항상 ×3 우회 차단) — 완료 응답의 result.card로 리빌·결과 화면을 그린다.
// 슬롯 스핀은 '?' 카드 배경만 쓰는 순수 연출이라 카드 풀이 필요 없다.

const CARD_W    = 88;
const CARD_H    = 124;
const CARD_GAP  = 14;
const CARD_SLOT = CARD_W + CARD_GAP;
const POOL_SIZE = 4;

// ── 모듈 스코프 슬롯 상태 (openBuffView에서 재시작 가능하도록) ─────
let _raf    = null;
let _locked = false;
let _track  = null;
let _outer  = null;
let _baseX  = 0;   // 트랙 기준 위치 (카드 한 장 왼쪽 버퍼 포함)
let _offset = 0;   // [0, CARD_SLOT) 순환 오프셋 — 모든 카드가 동일하므로 이 폭마다 완벽히 반복
let _lastTs = null;

function _spinTick(ts) {
  if (!_lastTs) _lastTs = ts;
  const dt = Math.min((ts - _lastTs) / 1000, 0.05);
  _lastTs = ts;
  // 카드 한 장 폭마다 순환 → 리셋 지점이 시각적으로 완전히 이어짐 (끊김 없음)
  _offset = (_offset + 340 * dt) % CARD_SLOT;
  if (_track) _track.style.transform = `translateX(${_baseX - _offset}px)`;
  _raf = requestAnimationFrame(_spinTick);
}

function _startSpin() {
  if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
  _lastTs = null;
  _offset = 0;
  const containerW = (_outer?.offsetWidth) || window.innerWidth;
  // 왼쪽에 카드 한 장 버퍼를 둬서 순환 중에도 좌측이 비지 않게
  _baseX = containerW / 2 - CARD_W / 2 - CARD_SLOT;
  if (_track) _track.style.transform = `translateX(${_baseX}px)`;
  _raf = requestAnimationFrame(_spinTick);
}

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
    justify-content:center;padding:calc(var(--safe-top) + 8px) 0 24px;gap:20px;text-align:center;">

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
      <p id="slot-hint" style="position:absolute;bottom:-22px;left:0;right:0;z-index:6;
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

  // 슬롯 애니메이션 재시작
  _startSpin();
}

export function init() {
  ensureKeyframes();

  let drawnCard = null;
  let completionPromise = null;   // 탭 시점에 시작한 서버 완료(=버프 draw) 결과

  // 모듈 스코프 DOM 참조 설정
  _track = document.getElementById('slot-track');
  _outer = document.getElementById('slot-outer');
  const shaker = document.getElementById('slot-shaker');

  // 첫 방문 시 슬롯 시작 (offsetWidth 확보 후)
  requestAnimationFrame(() => _startSpin());

  // ── 탭: 슬롯 잠금 → 서버가 버프 draw + 완료 처리 ──────────
  _outer.addEventListener('click', () => {
    if (_locked) return;
    _locked = true;

    cancelAnimationFrame(_raf);
    _raf = null;
    _lastTs = null;
    document.getElementById('slot-hint').textContent = '';
    document.getElementById('slot-highlight').style.opacity = '1';   // 색은 카드 도착 시 확정

    // 탭 시점에 완료 요청 시작(서버가 버프를 뽑아 결과로 돌려줌). 리빌은 이 결과로 그린다.
    const p = getPendingBolt();
    completionPromise = p
      ? completeBolt(p.boltId, p.distanceKm, p.participantIds, null, null,
          { certPhoto: p.certPhoto ?? null, certAt: p.certAt ?? null })
          .then(result => { markBoltResultSeen(p.boltId); setLastBoltResult(result); return result; })
      : Promise.reject(new Error('번개 정보를 찾을 수 없습니다'));

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

  async function burst() {
    // 서버 완료 결과(=버프 카드) 대기 — 실패하면 다시 뽑을 수 있게 되돌린다.
    let result;
    try {
      result = await completionPromise;
    } catch (e) {
      console.error('번개 완료 실패:', e);
      shaker.style.animation = '';
      const hint = document.getElementById('slot-hint');
      hint.style.opacity = '1';
      hint.textContent = e.message || '완료 처리 실패 — 다시 눌러주세요';
      document.getElementById('slot-highlight').style.opacity = '0';
      _locked = false;
      _startSpin();
      return;
    }
    drawnCard = result.card;

    // 카드 색 확정 (하이라이트 링 · 오브)
    const hl = document.getElementById('slot-highlight');
    hl.style.borderColor = drawnCard.color;
    hl.style.boxShadow   = `0 0 20px ${drawnCard.color}55`;
    const orb = document.getElementById('buff-orb-inner');
    orb.style.background = `radial-gradient(circle,${drawnCard.color.replace(')', ',.28)').replace('rgb', 'rgba')} 0%,transparent 70%)`;
    orb.style.opacity = '1';

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
  // 완료는 이미 탭 시점에 서버에서 처리됨 — 여기서는 결과 화면으로 넘어가기만 한다.
  document.getElementById('buff-confirm-btn').addEventListener('click', () => {
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
