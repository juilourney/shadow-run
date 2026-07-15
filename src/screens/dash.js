import { goToScreen, setScrollLock } from '../utils/nav.js';
import { subscribe, getGauge, getMe, getCalendar, getAssignment, getBolts, getTimeline, isGaugeNumbersPublic, ROLES } from '../store.js';
import { openEndView } from './end.js';
import { openHostView } from './bolt-detail.js';
import { openBoltProgress } from './bolt-progress.js';

const fmt = n => n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function render() {
  const cal = getCalendar();
  return `
<div class="game-section" id="gs-dash">
  <div class="scroll-body pb-tab" style="padding:calc(var(--safe-top) + 12px) 18px 0">

    <div class="anim-up" style="padding-top:4px; margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; gap:10px;">
      <h2 style="font-size:22px; font-weight:700; letter-spacing:-.02em;">대시보드</h2>
      <div id="my-role-badge" style="display:flex; align-items:center; gap:7px; padding:7px 12px; border-radius:99px;
        background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1); flex-shrink:0;">
        <span id="my-role-team" style="font-family:'Space Grotesk'; font-size:11px; font-weight:700; letter-spacing:.02em;"></span>
        <span style="width:3px; height:3px; border-radius:50%; background:#3f3f46;"></span>
        <span id="my-role-name" style="font-size:12px; font-weight:600; color:#e4e4e7;"></span>
      </div>
    </div>

    <!-- ① 실시간 줄다리기 (게이지 카드 — 최상단) -->
    <div class="bezel anim-up-1" style="padding:18px 20px; border-radius:24px;">
      <div style="display:flex; align-items:baseline; justify-content:space-between; margin-bottom:14px;">
        <h2 style="font-size:16px; font-weight:700; letter-spacing:-.01em;">실시간 줄다리기</h2>
        <p id="dash-dday" style="font-size:11px; color:#52525b; letter-spacing:.04em;">${cal.monthLabel} · D-${cal.dday}</p>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:14px;">
        <div>
          <p style="font-size:10px; color:#a78bfa; font-weight:700; letter-spacing:.06em;">GHOST</p>
          <p class="num" style="font-size:24px; font-weight:800; color:#a78bfa; margin-top:3px; line-height:1;">
            <span id="gauge-ghost">0.0</span><span id="gauge-ghost-unit" style="font-size:13px; font-weight:400; opacity:.6;"> km</span>
          </p>
        </div>
        <div style="text-align:center; padding-bottom:2px;">
          <p style="font-size:10px; color:#3f3f46; letter-spacing:.04em;">격차</p>
          <p class="num" id="gauge-diff" style="font-size:13px; font-weight:700; color:#38bdf8; margin-top:2px;">비공개</p>
        </div>
        <div style="text-align:right;">
          <p style="font-size:10px; color:#38bdf8; font-weight:700; letter-spacing:.06em;">PACER</p>
          <p class="num" style="font-size:24px; font-weight:800; color:#38bdf8; margin-top:3px; line-height:1;">
            <span id="gauge-pacer">0.0</span><span id="gauge-pacer-unit" style="font-size:13px; font-weight:400; opacity:.6;"> km</span>
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
    <div id="dash-my-bolt" class="anim-up-4"></div>

    <p class="eyebrow anim-up-4" style="color:#3f3f46; margin:16px 0 10px;">최근 소식</p>
    <div id="dash-timeline-preview" class="anim-up-4" style="cursor:pointer;"></div>

    <button class="btn" id="dash-end-btn" style="display:none; width:100%; height:48px; margin-top:20px;
      background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1); color:#a1a1aa; font-size:14px;">
      🏁 게임 종료 결과 보기
    </button>

  </div>

  <!-- 타임라인 팝업 — 종이 한 장이 아래에서 올라오는 느낌(여백 남김, 전체화면 아님) -->
  <div id="timeline-overlay" style="position:absolute; inset:0; z-index:95; display:none;">
    <div id="timeline-backdrop" style="position:absolute; inset:0; background:rgba(0,0,0,.55);"></div>
    <div id="timeline-sheet"
      style="position:absolute; left:0; right:0; bottom:0; top:15%; background:#0e0e10;
        border-radius:28px 28px 0 0;
        transform:translateY(100%); transition:transform .4s var(--spring);
        display:flex; flex-direction:column; overflow:hidden;">
      <div id="timeline-header" style="background:#0e0e10;
        padding:14px 20px 14px;
        border-bottom:1px solid rgba(255,255,255,.06);
        touch-action:none; cursor:grab;">
        <div style="display:flex; justify-content:center; margin-bottom:14px;">
          <div style="width:36px; height:4px; border-radius:99px; background:rgba(255,255,255,.15);"></div>
        </div>
        <h3 style="font-size:17px; font-weight:700;">최근 소식</h3>
      </div>
      <div id="timeline-list" style="flex:1; overflow-y:auto; padding:16px 18px 30px;
        display:flex; flex-direction:column; gap:8px;"></div>
    </div>
  </div>

</div>`;
}

export function init() {
  renderFromStore();
  subscribe(renderFromStore);

  // 수치 공개 여부는 시각으로만 바뀌어(투표 18시 진입 등) store 이벤트가 없으므로,
  // 상태가 실제로 뒤집힐 때만 다시 그린다.
  let wasPublic = isGaugeNumbersPublic();
  setInterval(() => {
    const nowPublic = isGaugeNumbersPublic();
    if (nowPublic !== wasPublic) { wasPublic = nowPublic; renderFromStore(); }
  }, 30 * 1000);

  document.getElementById('dash-end-btn').addEventListener('click', () => {
    openEndView();
    goToScreen('s-end');
  });

  document.getElementById('dash-timeline-preview').addEventListener('click', openTimelineOverlay);
  document.getElementById('timeline-backdrop').addEventListener('click', closeTimelineOverlay);
  initTimelineDrag();
}

const TIMELINE_TRANSITION = 'transform .4s var(--spring)';

function openTimelineOverlay() {
  const overlay = document.getElementById('timeline-overlay');
  const sheet   = document.getElementById('timeline-sheet');
  sheet.style.transition = 'none';
  sheet.style.transform  = 'translateY(100%)';   // 닫힌 위치로 확실히 리셋
  overlay.style.display  = 'block';
  void sheet.offsetHeight;                        // 강제 리플로우 — 위 상태를 먼저 페인트시킴
  sheet.style.transition = TIMELINE_TRANSITION;
  setScrollLock(true);   // 뒤 배경(대시보드 섹션) 상하 스크롤·스냅 잠금
  requestAnimationFrame(() => {
    sheet.style.transform = 'translateY(0)';
  });
}

function closeTimelineOverlay() {
  const sheet = document.getElementById('timeline-sheet');
  sheet.style.transition = TIMELINE_TRANSITION;
  sheet.style.transform  = 'translateY(100%)';
  setScrollLock(false);
  setTimeout(() => { document.getElementById('timeline-overlay').style.display = 'none'; }, 400);
}

// 헤더(손잡이 영역)를 아래로 드래그하면 팝업이 따라 내려가고,
// 일정 거리 이상 끌면 그대로 닫힘 — 덜 끌면 원위치로 스냅
function initTimelineDrag() {
  const header = document.getElementById('timeline-header');
  const sheet  = document.getElementById('timeline-sheet');
  let startY = 0, dragging = false;

  header.addEventListener('pointerdown', (e) => {
    dragging = true;
    startY = e.clientY;
    sheet.style.transition = 'none';
    header.setPointerCapture(e.pointerId);
  });

  header.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const delta = Math.max(0, e.clientY - startY); // 위로는 안 끌림
    sheet.style.transform = `translateY(${delta}px)`;
  });

  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    const delta = Math.max(0, e.clientY - startY);
    sheet.style.transition = TIMELINE_TRANSITION;
    if (delta > 120) {
      closeTimelineOverlay();
    } else {
      sheet.style.transform = 'translateY(0)';
    }
  };
  header.addEventListener('pointerup', endDrag);
  header.addEventListener('pointercancel', endDrag);
}

const TIMELINE_TEAM_COLOR = { pacer: '#38bdf8', ghost: '#a78bfa' };
const TIMELINE_TEAM_LABEL = { pacer: '페이서', ghost: '고스트' };

function timelineRow(e) {
  const time = new Date(e.at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

  let icon, tint, textColor, body;
  if (e.kind === 'team') {
    const color = TIMELINE_TEAM_COLOR[e.team];
    icon = '🎯'; tint = 'rgba(251,113,133,.06)'; textColor = '#e4e4e7';
    body = `<b>${e.name}</b> 님의 팀이 공개됐습니다 (<span style="color:${color}; font-weight:700;">${TIMELINE_TEAM_LABEL[e.team]}</span>)`;
  } else if (e.kind === 'role') {
    icon = '🎭'; tint = 'rgba(52,211,153,.06)'; textColor = '#e4e4e7';
    body = `<b>${e.name}</b> 님의 역할이 공개됐습니다 (<span style="color:#34d399; font-weight:700;">${ROLES[e.role].name}</span>)`;
  } else if (e.kind === 'bolt') {
    // km·버프 수치는 비공개(게이지 숫자 비공개 설계와 일관) — 참가자는 결과 화면에서 상세 확인
    icon = '⚡'; tint = 'rgba(56,189,248,.05)'; textColor = '#a1a1aa';
    body = `<b style="color:#e4e4e7;">${e.title}</b> 번개가 완료됐습니다 · ${e.count}명 완주`;
  } else if (e.kind === 'reject') {
    icon = '🚫'; tint = 'rgba(251,113,133,.06)'; textColor = '#a1a1aa';
    body = `<b style="color:#e4e4e7;">${e.title}</b> 번개 기록이 관리자 심사로 취소됐습니다`;
  } else if (e.kind === 'ability') {
    // 신원·대상·확인 결과는 비공개 — 어떤 역할이 움직였는지만 익명 표시
    const isSpy = e.abilityRole === 'spy';
    icon = isSpy ? '🕵️' : '🔍';
    const roleColor = isSpy ? '#2dd4bf' : '#fbbf24'; // 팀컬러(파랑/보라)·역할공개색(초록)과 겹치지 않게 청록/호박
    const roleName  = isSpy ? '밀정' : '탐정';
    const verb      = isSpy ? '몰래 엿봤습니다' : '추리했습니다';
    tint = 'rgba(255,255,255,.03)'; textColor = '#a1a1aa';
    body = `<span style="color:${roleColor}; font-weight:700;">${roleName}</span>이 능력을 사용해 ${verb}`;
  } else {
    icon = '🗳️'; tint = 'rgba(255,255,255,.03)'; textColor = '#71717a';
    body = '이번 투표는 적중하지 못했습니다';
  }

  return `
  <div class="bezel" style="padding:14px 16px; border-radius:18px; display:flex; align-items:center; gap:12px; background:${tint};">
    <span style="font-size:18px; flex-shrink:0;">${icon}</span>
    <p style="flex:1; min-width:0; font-size:13px; color:${textColor}; line-height:1.5;">${body}</p>
    <span style="font-size:11px; color:#52525b; flex-shrink:0;">${time}</span>
  </div>`;
}

const TIMELINE_EMPTY = `
  <div class="bezel" style="padding:18px 16px; border-radius:20px; text-align:center;">
    <p style="font-size:13px; color:#52525b;">아직 새로운 소식이 없어요</p>
  </div>`;

// 게임 종료 시(설정 종료일 경과) 결과 화면을 자동으로 한 번 띄운다.
// 기기당 시즌 1회만(sr_end_seen = 그 시즌의 assignedAt) — 이후엔 대시보드 '결과 보기'로 재열람.
const END_SEEN_KEY = 'sr_end_seen';
let _endAutoShown = false;   // 이 세션에서 이미 자동 표시했는지(중복 팝업 방지)
function maybeAutoShowEnd() {
  if (_endAutoShown) return;
  if (!getCalendar().ended) return;
  if (!getMe().team) return;   // 배정된 참가자에게만(이름 화면 등엔 안 뜸)
  if (!document.getElementById('s-game')?.classList.contains('active')) return;

  const seasonKey = String(getAssignment().assignedAt ?? '');
  _endAutoShown = true;
  if (localStorage.getItem(END_SEEN_KEY) === seasonKey) return;   // 이 시즌 결과를 이미 봄
  try { localStorage.setItem(END_SEEN_KEY, seasonKey); } catch {}

  openEndView();
  goToScreen('s-end');
}

function renderFromStore() {
  const g  = getGauge();
  const me = getMe();

  // 부팅 시 박제된 라벨 갱신 — 관리자가 게임 기간을 바꾸거나 자정을 넘겨도 반영되게
  const cal = getCalendar();
  document.getElementById('dash-dday').textContent = `${cal.monthLabel} · D-${cal.dday}`;

  if (me.team) {
    const isPacer = me.team === 'pacer';
    const teamEl  = document.getElementById('my-role-team');
    teamEl.textContent  = isPacer ? 'PACER' : 'GHOST';
    teamEl.style.color  = isPacer ? '#38bdf8' : '#c084fc';
    document.getElementById('my-role-name').textContent = ROLES[me.role]?.name ?? '';
    document.getElementById('my-role-badge').style.borderColor = isPacer ? 'rgba(56,189,248,.3)' : 'rgba(192,132,252,.3)';
  }

  // 정확한 수치는 투표 시간·종료 3일 전부터만 공개 — 평소엔 게이지 바(비율)만.
  // 개별 번개 완료 직후 수치 변화로 참가자의 팀·역할이 역추적되는 것을 막는다.
  const diffEl = document.getElementById('gauge-diff');
  if (isGaugeNumbersPublic()) {
    document.getElementById('gauge-ghost').textContent = fmt(g.ghost);
    document.getElementById('gauge-pacer').textContent = fmt(g.pacer);
    document.getElementById('gauge-ghost-unit').style.display = '';
    document.getElementById('gauge-pacer-unit').style.display = '';
    const sign = g.diff >= 0 ? '+' : '−';
    diffEl.textContent = `${sign}${fmt(Math.abs(g.diff))} km`;
    diffEl.style.color = g.leader === 'ghost' ? '#a78bfa' : '#38bdf8';
  } else {
    document.getElementById('gauge-ghost').textContent = '???';
    document.getElementById('gauge-pacer').textContent = '???';
    document.getElementById('gauge-ghost-unit').style.display = 'none';
    document.getElementById('gauge-pacer-unit').style.display = 'none';
    diffEl.textContent = '🔒 비공개';
    diffEl.style.color = '#52525b';
  }

  // 점유율 비례 × 50% (중앙에서 뻗음)
  document.getElementById('gauge-bar-pacer').style.width = `${(g.pacerRatio * 50).toFixed(1)}%`;
  document.getElementById('gauge-bar-ghost').style.width = `${(g.ghostRatio * 50).toFixed(1)}%`;

  document.getElementById('stat-pure-km').textContent = fmt(me.pureKm);
  document.getElementById('stat-bolts').textContent   = me.boltsCompleted;

  // 게임이 실제로 종료됐을 때만 결과 보기 버튼 노출
  document.getElementById('dash-end-btn').style.display = getCalendar().ended ? 'block' : 'none';

  // 종료 시 결과 화면 자동 표시(기기당 시즌 1회) — 나머지는 위 '결과 보기' 버튼으로 재열람
  maybeAutoShowEnd();

  // 나의 번개 일정 — 룰상 참여 중인 번개는 항상 1개뿐 (없으면 0개)
  const myBolt = getBolts().find(b => b.joined);
  const wrap = document.getElementById('dash-my-bolt');
  wrap.innerHTML = myBolt ? `
    <div class="bezel" id="dash-my-bolt-card" style="padding:14px 16px; border-radius:20px; display:flex; align-items:center; justify-content:space-between; cursor:pointer;">
      <div>
        <p style="font-size:14px; font-weight:600;">${myBolt.title}</p>
        <p style="font-size:12px; color:#52525b; margin-top:2px;">${myBolt.place} · ${myBolt.distance.toFixed(1)}km · ${myBolt.count}/${myBolt.max}명</p>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <p class="num" style="font-size:13px; font-weight:600; color:var(--accent);">${myBolt.time}</p>
        <span style="color:#3f3f46; font-size:16px;">›</span>
      </div>
    </div>` : `
    <div class="bezel" style="padding:18px 16px; border-radius:20px; text-align:center;">
      <p style="font-size:13px; color:#52525b;">참여 중인 번개가 없어요</p>
    </div>`;

  if (myBolt) {
    document.getElementById('dash-my-bolt-card').addEventListener('click', () => {
      if (myBolt.status === 'running') openBoltProgress(myBolt.id);  // 진행중 — 방장·참가자 공통
      else if (myBolt.isHost) openHostView(myBolt.id);                // 방장(시작 전) → 대기 뷰
      else goToScreen('s-bolt-join');                                 // 참가자(시작 전) → 참여 뷰
    });
  }

  // 최근 소식 — 홈엔 최신 1~2개 미리보기, 탭하면 전체 목록
  const timeline = getTimeline();
  document.getElementById('dash-timeline-preview').innerHTML =
    timeline.length ? timeline.slice(0, 2).map(timelineRow).join('') : TIMELINE_EMPTY;
  document.getElementById('timeline-list').innerHTML =
    timeline.length ? timeline.map(timelineRow).join('') : TIMELINE_EMPTY;
}
