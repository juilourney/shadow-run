import { goToScreen } from '../utils/nav.js';
import { subscribe, getGauge, getMe, getCalendar } from '../store.js';
import { openEndView } from './end.js';
import { prepareWaiting } from './waiting.js';

const fmt = n => n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function render() {
  const cal = getCalendar();
  return `
<div class="game-section" id="gs-dash">
  <div class="scroll-body pb-tab" style="padding:calc(var(--safe-top) + 12px) 18px 0">

    <div class="anim-up" style="padding-top:4px; margin-bottom:16px;">
      <h2 style="font-size:22px; font-weight:700; letter-spacing:-.02em;">대시보드</h2>
    </div>

    <!-- ① 실시간 줄다리기 (게이지 카드 — 최상단) -->
    <div class="bezel anim-up-1" style="padding:18px 20px; border-radius:24px;">
      <div style="display:flex; align-items:baseline; justify-content:space-between; margin-bottom:14px;">
        <h2 style="font-size:16px; font-weight:700; letter-spacing:-.01em;">실시간 줄다리기</h2>
        <p style="font-size:11px; color:#52525b; letter-spacing:.04em;">${cal.monthLabel} · D-${cal.dday}</p>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:14px;">
        <div>
          <p style="font-size:10px; color:#a78bfa; font-weight:700; letter-spacing:.06em;">GHOST</p>
          <p class="num" style="font-size:24px; font-weight:800; color:#a78bfa; margin-top:3px; line-height:1;">
            <span id="gauge-ghost">956</span><span style="font-size:13px; font-weight:400; opacity:.6;"> km</span>
          </p>
        </div>
        <div style="text-align:center; padding-bottom:2px;">
          <p style="font-size:10px; color:#3f3f46; letter-spacing:.04em;">격차</p>
          <p class="num" id="gauge-diff" style="font-size:13px; font-weight:700; color:#38bdf8; margin-top:2px;">+292 km</p>
        </div>
        <div style="text-align:right;">
          <p style="font-size:10px; color:#38bdf8; font-weight:700; letter-spacing:.06em;">PACER</p>
          <p class="num" style="font-size:24px; font-weight:800; color:#38bdf8; margin-top:3px; line-height:1;">
            <span id="gauge-pacer">1,248</span><span style="font-size:13px; font-weight:400; opacity:.6;"> km</span>
          </p>
        </div>
      </div>

      <div class="gauge-wrap">
        <div class="gauge-center"></div>
        <div id="gauge-bar-pacer" style="position:absolute; left:50%; top:0; bottom:0; border-radius:0 99px 99px 0; width:22%;
          background:linear-gradient(90deg,#0ea5e9,#38bdf8); box-shadow:0 0 14px rgba(56,189,248,.5); transition:width .6s var(--spring);"></div>
        <div id="gauge-bar-ghost" style="position:absolute; right:50%; top:0; bottom:0; border-radius:99px 0 0 99px; width:12%;
          background:linear-gradient(270deg,#a855f7,#7c3aed); box-shadow:0 0 12px rgba(168,85,247,.45); transition:width .6s var(--spring);"></div>
      </div>
    </div>

    <!-- ② 탐색전 / 줄다리기 단계 표시 -->
    <div id="phase-card" class="anim-up-1"
      style="margin-top:8px; border-radius:18px; padding:14px 18px; display:flex; align-items:center; gap:12px;">
      <div id="phase-pulse" style="width:10px; height:10px; border-radius:50%; flex-shrink:0;"></div>
      <div style="flex:1; min-width:0;">
        <p id="phase-label" style="font-size:14px; font-weight:700; line-height:1;"></p>
        <p id="phase-message" style="font-size:12px; margin-top:4px; line-height:1.5; opacity:.75;"></p>
      </div>
      <p id="phase-days" style="font-size:10px; opacity:.5; flex-shrink:0; text-align:right; line-height:1.5;"></p>
    </div>

    <p class="eyebrow anim-up-3" style="color:#3f3f46; margin:16px 0 10px;">나의 활동</p>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;" class="anim-up-3">
      <div class="bezel" style="padding:16px; border-radius:20px;">
        <p style="font-size:11px; color:#52525b; line-height:1.4;">순수 기여<br/>
          <span style="font-size:10px; color:#3f3f46;">보너스 제외 실제 달린 거리</span></p>
        <p class="num" style="font-size:26px; font-weight:700; color:var(--accent); margin-top:8px;">
          <span id="stat-pure-km">64</span><span style="font-size:13px; color:#52525b; font-weight:400;"> km</span>
        </p>
      </div>
      <div class="bezel" style="padding:16px; border-radius:20px;">
        <p style="font-size:11px; color:#52525b; line-height:1.4;">번개 참여<br/>
          <span style="font-size:10px; color:#3f3f46;">완료한 번개 수</span></p>
        <p class="num" style="font-size:26px; font-weight:700; margin-top:8px;">
          <span id="stat-bolts">7</span><span style="font-size:13px; color:#52525b; font-weight:400;"> 회</span>
        </p>
      </div>
    </div>

    <p class="eyebrow anim-up-4" style="color:#3f3f46; margin:16px 0 10px;">나의 번개 일정</p>
    <div style="display:flex; flex-direction:column; gap:8px;" class="anim-up-4">
      <div class="bezel" style="padding:14px 16px; border-radius:20px; display:flex; align-items:center; justify-content:space-between;">
        <div>
          <p style="font-size:14px; font-weight:600;">한강 새벽 LSD</p>
          <p style="font-size:12px; color:#52525b; margin-top:2px;">반포 · 8.0km · 2/4</p>
        </div>
        <div style="text-align:right;">
          <p class="num" style="font-size:13px; font-weight:700; color:var(--accent);">02:14:30</p>
          <p style="font-size:10px; color:#3f3f46; margin-top:2px;">오늘 05:30</p>
        </div>
      </div>
      <div class="bezel" style="padding:14px 16px; border-radius:20px; display:flex; align-items:center; justify-content:space-between;">
        <div>
          <p style="font-size:14px; font-weight:600;">석촌호수 회복런</p>
          <p style="font-size:12px; color:#52525b; margin-top:2px;">송파 · 5.0km · 1/4</p>
        </div>
        <div style="text-align:right;">
          <p class="num" style="font-size:13px; font-weight:600; color:#71717a;">내일</p>
          <p style="font-size:10px; color:#3f3f46; margin-top:2px;">07.02 07:00</p>
        </div>
      </div>
    </div>

    <button class="btn" id="dash-waiting-btn" style="width:100%; height:48px; margin-top:20px;
      background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1); color:#a1a1aa; font-size:14px;">
      ⏳ 대기실 흐름 보기
    </button>

    <button class="btn" id="dash-end-btn" style="width:100%; height:48px; margin-top:10px;
      background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1); color:#a1a1aa; font-size:14px;">
      🏁 게임 종료 결과 보기
    </button>

  </div>

</div>`;
}

export function init() {
  renderFromStore();
  subscribe(renderFromStore);

  document.getElementById('dash-waiting-btn').addEventListener('click', () => {
    prepareWaiting();
    goToScreen('s-waiting');
  });

  document.getElementById('dash-end-btn').addEventListener('click', () => {
    openEndView();
    goToScreen('s-end');
  });
}

function renderFromStore() {
  const g  = getGauge();
  const me = getMe();

  document.getElementById('gauge-ghost').textContent = fmt(g.ghost);
  document.getElementById('gauge-pacer').textContent = fmt(g.pacer);

  const diffEl = document.getElementById('gauge-diff');
  const sign = g.diff >= 0 ? '+' : '−';
  diffEl.textContent = `${sign}${fmt(Math.abs(g.diff))} km`;
  diffEl.style.color = g.leader === 'ghost' ? '#a78bfa' : '#38bdf8';

  // 점유율 비례 × 50% (중앙에서 뻗음)
  document.getElementById('gauge-bar-pacer').style.width = `${(g.pacerRatio * 50).toFixed(1)}%`;
  document.getElementById('gauge-bar-ghost').style.width = `${(g.ghostRatio * 50).toFixed(1)}%`;

  document.getElementById('stat-pure-km').textContent = fmt(me.pureKm);
  document.getElementById('stat-bolts').textContent   = me.boltsCompleted;
}
