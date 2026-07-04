import { goToScreen, setScrollLock } from '../utils/nav.js';
import { subscribe, getBolts, getJoinedBoltId,
         createBolt as storeCreateBolt, joinBolt as storeJoinBolt, leaveBolt } from '../store.js';
import { openHostView } from './bolt-detail.js';

let selectedBolt = null; // 참여 확인 시트용 임시 선택

const MIN_BOLT_DISTANCE = 4; // 번개 등록 최소 거리(km)

function boltCard(bolt, animClass) {
  const lockedPrefix = bolt.locked
    ? `<span style="font-size:13px; margin-right:4px">🔒</span>` : '';
  const joinedChip = bolt.joined
    ? `<span style="font-size:11px; font-weight:700; color:#34d399; background:rgba(52,211,153,.1); border:1px solid rgba(52,211,153,.25); border-radius:8px; padding:2px 8px;">${bolt.isHost ? '방장' : '참여중'}</span>`
    : '';
  return `
  <div class="bezel ${animClass}" id="bolt-card-${bolt.id}"
    style="padding:16px 18px; border-radius:22px; cursor:pointer;${bolt.locked ? ' opacity:.55;' : ''}">
    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px">
      <p style="font-size:16px; font-weight:700; line-height:1.3; color:#fafafa;">${lockedPrefix}${bolt.title}</p>
      <span class="num" style="font-size:13px; font-weight:600; color:#a1a1aa; white-space:nowrap; flex-shrink:0; margin-top:1px">${bolt.time}</span>
    </div>
    <p style="font-size:13px; color:#a1a1aa; margin-top:5px">${bolt.place} · ${bolt.distance.toFixed(1)}km · ${bolt.pace}</p>
    <div style="display:flex; align-items:center; justify-content:space-between; margin-top:10px">
      <p style="font-size:12px; color:#71717a">방장 · ${bolt.hostName}</p>
      <div style="display:flex; align-items:center; gap:8px">
        ${joinedChip}
        <span class="num" style="font-size:12px; color:#71717a">${bolt.count}/${bolt.max}명</span>
      </div>
    </div>
  </div>`;
}

export function render() {
  return `
<div class="game-section" id="gs-bolt">
  <!-- 번개 목록 뷰 -->
  <div id="bolt-list-view" class="scroll-body" style="padding:calc(var(--safe-top) + 12px) 18px 40px">
    <div class="anim-up" style="padding-top:4px; margin-bottom:16px; display:flex; align-items:center; justify-content:space-between">
      <div>
        <h2 style="font-size:22px; font-weight:700; letter-spacing:-.02em">번개</h2>
        <p id="bolt-count-label" style="font-size:12px; color:#52525b; margin-top:2px">진행 중인 번개</p>
      </div>
      <button id="bolt-create-btn"
        style="background:var(--accent-tint); border:1px solid var(--accent-border); color:var(--accent);
          border-radius:14px; padding:0 14px; height:36px; font-size:13px; font-weight:700;
          cursor:pointer; white-space:nowrap; flex-shrink:0;">
        ⚡ 번개 만들기
      </button>
    </div>
    <div id="bolt-cards" style="display:flex; flex-direction:column; gap:10px"></div>
  </div>

  <!-- 번개 생성 패널 (오른쪽 → 왼쪽 슬라이드) -->
  <div id="bolt-create-overlay"
    style="position:absolute; inset:0; z-index:60; display:none;">
    <div id="bolt-create-sheet"
      style="position:absolute; inset:0; background:#0e0e10;
        transform:translateX(100%); transition:transform .4s var(--spring);
        overflow-y:auto; display:flex; flex-direction:column;">

      <!-- 헤더 -->
      <div style="position:sticky; top:0; background:#0e0e10; z-index:5;
        padding:calc(var(--safe-top) + 8px) 18px 14px;
        border-bottom:1px solid rgba(255,255,255,.06);
        display:flex; align-items:center; gap:14px;">
        <button id="bolt-create-close"
          style="background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.08);
            color:#a1a1aa; border-radius:10px; width:34px; height:34px;
            font-size:18px; cursor:pointer; display:flex; align-items:center; justify-content:center;">
          ←
        </button>
        <h3 style="font-size:17px; font-weight:700;">번개 만들기</h3>
      </div>

      <!-- 폼 -->
      <div style="padding:24px 20px 30px; display:flex; flex-direction:column; gap:18px; flex:1;">

        <div>
          <label style="font-size:12px; color:#71717a; display:block; margin-bottom:8px; font-weight:600; letter-spacing:.04em;">제목 *</label>
          <input class="input" type="text" id="create-title" placeholder="한강 새벽 LSD" />
        </div>

        <div>
          <label style="font-size:12px; color:#71717a; display:block; margin-bottom:8px; font-weight:600; letter-spacing:.04em;">장소 *</label>
          <input class="input" type="text" id="create-place" placeholder="반포 잠수교 남단" />
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div>
            <label style="font-size:12px; color:#71717a; display:block; margin-bottom:8px; font-weight:600; letter-spacing:.04em;">거리(km) *</label>
            <input class="input num" type="number" id="create-distance" placeholder="0.0" inputmode="decimal" />
            <p style="font-size:11px; color:#3f3f46; margin-top:6px;">최소 ${MIN_BOLT_DISTANCE}km</p>
          </div>
          <div>
            <label style="font-size:12px; color:#71717a; display:block; margin-bottom:8px; font-weight:600; letter-spacing:.04em;">페이스</label>
            <input class="input" type="text" id="create-pace" placeholder="선택" readonly
              style="cursor:pointer;" />
          </div>
        </div>

        <div>
          <label style="font-size:12px; color:#71717a; display:block; margin-bottom:8px; font-weight:600; letter-spacing:.04em;">날짜 · 시간 *</label>
          <input class="input" type="datetime-local" id="create-datetime" style="color-scheme:dark;"
            min="2026-06-27T00:00" max="2026-07-17T23:59" />
        </div>

        <button class="btn btn-primary" id="create-submit-btn"
          style="width:100%; height:56px; font-size:16px; margin-top:8px;">
          번개 등록하기
        </button>

      </div>
    </div>
  </div>

  <!-- 페이스 선택 바텀시트 -->
  <div id="pace-picker-overlay"
    style="position:absolute; inset:0; z-index:70; display:none; align-items:flex-end;">
    <div style="position:absolute; inset:0; background:rgba(0,0,0,.65); backdrop-filter:blur(4px);" id="pace-picker-backdrop"></div>
    <div id="pace-picker-sheet"
      style="position:relative; z-index:1; background:#111113; border-radius:28px 28px 0 0;
        width:100%; transform:translateY(100%); transition:transform .4s var(--spring);
        border-top:1px solid rgba(255,255,255,.08); padding:24px 20px; padding-bottom:28px;">
      <div style="display:flex; justify-content:center; margin-bottom:18px;">
        <div style="width:36px; height:4px; border-radius:99px; background:rgba(255,255,255,.15);"></div>
      </div>
      <p style="font-size:11px; color:#52525b; letter-spacing:.08em; text-transform:uppercase; font-weight:600; margin-bottom:16px;">페이스 선택</p>
      <div id="pace-options" style="display:flex; flex-direction:column; gap:8px;"></div>
    </div>
  </div>


  <!-- 진행 중 뷰 -->
  <div id="bolt-progress-view" style="display:none; position:relative; isolation:isolate; flex:1; align-items:center; justify-content:center; flex-direction:column; gap:16px; padding:0 32px; text-align:center;">
    <!-- 단일팀 팀 컬러 글로우 (단일팀일 때만 표시) -->
    <div id="progress-team-glow" class="team-glow" style="display:none;"></div>
    <div style="width:64px; height:64px; border-radius:20px; background:var(--accent-tint); display:flex; align-items:center; justify-content:center; font-size:28px; margin-bottom:4px;">⚡</div>
    <p style="font-size:18px; font-weight:700; color:var(--accent);">번개 진행 중</p>
    <p style="font-size:13px; color:#52525b; line-height:1.7;">한강 새벽 LSD · 반포 잠수교<br/>방장이 완료 처리하면 결과가 공개됩니다</p>
    <div class="bezel" style="padding:14px 18px; border-radius:16px; width:100%; margin-top:8px;">
      <p style="font-size:12px; color:#52525b; margin-bottom:8px;">현재 참가자</p>
      <div style="display:flex; gap:8px; justify-content:center;">
        <div style="text-align:center"><span style="width:36px;height:36px;border-radius:50%;background:#3f3f46;display:flex;align-items:center;justify-content:center;font-size:13px;margin:0 auto">민</span><p style="font-size:10px;color:#71717a;margin-top:4px">김민수</p></div>
        <div style="text-align:center"><span style="width:36px;height:36px;border-radius:50%;background:#3f3f46;display:flex;align-items:center;justify-content:center;font-size:13px;margin:0 auto">현</span><p style="font-size:10px;color:#71717a;margin-top:4px">박현우</p></div>
        <div style="text-align:center"><span style="width:36px;height:36px;border-radius:50%;background:#3f3f46;display:flex;align-items:center;justify-content:center;font-size:13px;margin:0 auto">나</span><p style="font-size:10px;color:#71717a;margin-top:4px">나</p></div>
      </div>
    </div>
    <button class="btn btn-secondary" style="width:100%; height:48px; font-size:14px; margin-top:4px;" id="progress-result-btn">결과 확인 (시뮬레이션)</button>
  </div>

  <!-- 참여 확인 오버레이 (바텀시트) -->
  <div id="bolt-join-overlay"
    style="position:absolute; inset:0; z-index:50; display:none; align-items:flex-end;">
    <div style="position:absolute; inset:0; background:rgba(0,0,0,.65); backdrop-filter:blur(4px);" id="bolt-join-backdrop"></div>
    <div id="bolt-join-sheet"
      style="position:relative; z-index:1; background:#111113; border-radius:28px 28px 0 0;
        width:100%; transform:translateY(100%); transition:transform .45s var(--spring);
        border-top:1px solid rgba(255,255,255,.08); padding:24px 20px; padding-bottom:24px;">
      <div style="display:flex; justify-content:center; margin-bottom:20px;">
        <div style="width:36px; height:4px; border-radius:99px; background:rgba(255,255,255,.15);"></div>
      </div>
      <p style="font-size:11px; color:#52525b; letter-spacing:.08em; text-transform:uppercase; font-weight:600; margin-bottom:6px;">번개 참여</p>
      <h3 id="join-bolt-title" style="font-size:20px; font-weight:700; margin-bottom:4px;"></h3>
      <p id="join-bolt-info" style="font-size:13px; color:#52525b; margin-bottom:20px;"></p>
      <div class="bezel" style="padding:12px 16px; border-radius:16px; margin-bottom:20px;">
        <p style="font-size:13px; color:#a1a1aa; line-height:1.6;">이 일정에 참여하시겠습니까?<br/><span style="font-size:12px; color:#52525b;">참가자들의 팀과 역할은 공개되지 않습니다.</span></p>
      </div>
      <div style="display:flex; gap:10px;">
        <button class="btn btn-secondary" style="flex:1; height:52px;" id="join-cancel-btn">아니요</button>
        <button class="btn btn-primary" style="flex:2; height:52px;" id="join-confirm-btn">예, 참여합니다</button>
      </div>
    </div>
  </div>

</div>`;
}

export function init() {
  document.getElementById('bolt-create-btn').addEventListener('click', () => {
    if (getJoinedBoltId()) { showToast('참여 중인 번개가 있으면 새 번개를 만들 수 없습니다'); return; }
    openCreateOverlay();
  });
  document.getElementById('bolt-create-close').addEventListener('click', closeCreateOverlay);

  document.getElementById('create-submit-btn').addEventListener('click', async () => {
    const title = document.getElementById('create-title').value.trim();
    if (!title) { document.getElementById('create-title').focus(); return; }

    const distanceInput = document.getElementById('create-distance');
    const distance = distanceInput.value;
    if (!distance || Number(distance) < MIN_BOLT_DISTANCE) {
      distanceInput.style.borderColor = 'rgba(251,113,133,.6)';
      distanceInput.focus();
      showToast(`최소 ${MIN_BOLT_DISTANCE}km 이상 입력해주세요`);
      return;
    }

    const place = document.getElementById('create-place').value.trim();
    const pace = document.getElementById('create-pace').value.trim();
    const time = formatBoltTime(document.getElementById('create-datetime').value);
    try {
      await storeCreateBolt({ title, place, distance, pace, time });
      closeCreateOverlay();
    } catch (e) {
      showToast(e.message);
    }
  });

  // 페이스 선택 피커
  initPacePicker();

  // 참여 확인 시트
  document.getElementById('bolt-join-backdrop').addEventListener('click', () => { closeJoinOverlay(); showSidebar(); });
  document.getElementById('join-cancel-btn').addEventListener('click',   () => { closeJoinOverlay(); showSidebar(); });
  document.getElementById('join-confirm-btn').addEventListener('click', async () => {
    try {
      await storeJoinBolt(selectedBolt.id);
      closeJoinOverlay(); // sidebar는 goToScreen('s-bolt-join')이 숨김 처리
      setTimeout(() => goToScreen('s-bolt-join'), 300);
    } catch (e) {
      closeJoinOverlay(); showSidebar();
      showToast(e.message);
    }
  });

  document.getElementById('progress-result-btn').addEventListener('click', () => {
    goToScreen('s-bolt-result');
  });

  renderBoltList();
  subscribe(renderBoltList);
}

// store 기준으로 번개 목록 렌더 + 카드 탭 핸들러 부착
function renderBoltList() {
  const bolts = getBolts().filter(b => b.status !== 'done');
  const wrap  = document.getElementById('bolt-cards');
  if (!wrap) return;
  wrap.innerHTML = bolts.map((b, i) => boltCard(b, `anim-up-${Math.min(i + 1, 4)}`)).join('');
  document.getElementById('bolt-count-label').textContent = `진행 중인 번개 ${bolts.length}`;

  bolts.forEach(b => {
    document.getElementById(`bolt-card-${b.id}`).addEventListener('click', () => {
      if (b.locked && !b.joined) { showToast('잠긴 번개입니다.'); return; }
      const joinedId = getJoinedBoltId();
      if (b.joined) {
        if (b.isHost) openHostView(b.id);   // 방장 → 인증/완료 뷰
        else goToScreen('s-bolt-join');     // 참가자 → 참여 뷰
        return;
      }
      if (joinedId)  { showToast('이미 다른 번개에 참여 중입니다'); return; }
      selectedBolt = b;
      openJoinOverlay(b);
    });
  });
}

// 참여 취소 시 외부(bolt-join)에서 호출
export async function cancelJoin() {
  await leaveBolt();
}

// datetime-local 값(2026-07-05T05:30) → 'MM.DD HH:MM' 표시용 (앱 공통 날짜 스타일)
function formatBoltTime(val) {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d)) return val;
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 7:00 ~ 4:00, 30초 단위
const PACE_OPTIONS = ['7:00', '6:30', '6:00', '5:30', '5:00', '4:30', '4:00'];

function initPacePicker() {
  const input = document.getElementById('create-pace');
  const opts  = document.getElementById('pace-options');

  opts.innerHTML = PACE_OPTIONS.map(p => `
    <button type="button" class="pace-opt" data-pace="${p}"
      style="width:100%; height:52px; border-radius:16px; cursor:pointer;
        background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.07);
        color:#e4e4e7; font-size:16px; font-weight:600; font-family:'Space Grotesk',sans-serif;">
      ${p} <span style="font-size:12px; color:#52525b; font-weight:400;">/km</span>
    </button>`).join('');

  // pointerdown에서 focus를 막아 iOS에서 입력칸으로 스크롤 점프하는 문제 방지
  // 열기 전에 현재 포커스(거리 입력 등)를 blur해서 키보드를 접음
  input.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    document.activeElement?.blur();
    openPacePicker();
  });
  document.getElementById('pace-picker-backdrop').addEventListener('click', closePacePicker);

  opts.querySelectorAll('.pace-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      input.value = `${btn.dataset.pace}/km`;
      closePacePicker();
    });
  });
}

function openPacePicker() {
  const overlay = document.getElementById('pace-picker-overlay');
  const sheet   = document.getElementById('pace-picker-sheet');
  overlay.style.display = 'flex';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    sheet.style.transform = 'translateY(0)';
  }));
}

function closePacePicker() {
  const sheet = document.getElementById('pace-picker-sheet');
  sheet.style.transform = 'translateY(100%)';
  setTimeout(() => { document.getElementById('pace-picker-overlay').style.display = 'none'; }, 380);
}

function openCreateOverlay() {
  const overlay = document.getElementById('bolt-create-overlay');
  const sheet   = document.getElementById('bolt-create-sheet');
  // 이전 입력값 초기화
  document.getElementById('create-title').value    = '';
  document.getElementById('create-place').value    = '';
  const distanceInput = document.getElementById('create-distance');
  distanceInput.value = '';
  distanceInput.style.borderColor = '';
  document.getElementById('create-pace').value     = '';
  overlay.style.display = 'block';
  document.documentElement.style.overflow = 'hidden';
  hideSidebar();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    sheet.style.transform = 'translateX(0)';
  }));
}

function closeCreateOverlay() {
  const sheet = document.getElementById('bolt-create-sheet');
  sheet.style.transform = 'translateX(100%)';
  document.documentElement.style.overflow = '';
  showSidebar();
  setTimeout(() => { document.getElementById('bolt-create-overlay').style.display = 'none'; }, 400);
}

function openJoinOverlay(bolt) {
  const overlay = document.getElementById('bolt-join-overlay');
  const sheet   = document.getElementById('bolt-join-sheet');
  document.getElementById('join-bolt-title').textContent = bolt.title;
  document.getElementById('join-bolt-info').textContent  = `${bolt.place} · ${bolt.distance.toFixed(1)}km · ${bolt.pace}`;
  overlay.style.display = 'flex';
  setScrollLock(true);
  hideSidebar();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    sheet.style.transform = 'translateY(0)';
  }));
}

function closeJoinOverlay() {
  const sheet = document.getElementById('bolt-join-sheet');
  sheet.style.transform = 'translateY(100%)';
  setScrollLock(false);
  setTimeout(() => { document.getElementById('bolt-join-overlay').style.display = 'none'; }, 400);
}

function hideSidebar() {
  const tb     = document.getElementById('global-tabbar');
  const handle = document.getElementById('tabbar-handle');
  if (tb)     tb.style.display = 'none';
  if (handle) handle.style.display = 'none';
}

function showSidebar() {
  const tb     = document.getElementById('global-tabbar');
  const handle = document.getElementById('tabbar-handle');
  if (tb)     tb.style.display = 'flex';
  if (handle) handle.style.display = 'flex';
}

function showToast(msg) {
  const existing = document.getElementById('bolt-toast');
  if (existing) existing.remove();
  if (!document.getElementById('toast-keyframe')) {
    const s = document.createElement('style');
    s.id = 'toast-keyframe';
    s.textContent = `@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(14px);}to{opacity:1;transform:translateX(-50%) translateY(0);}}`;
    document.head.appendChild(s);
  }
  const toast = document.createElement('div');
  toast.id = 'bolt-toast';
  toast.textContent = msg;
  toast.style.cssText = `
    position:fixed; bottom:36px; left:50%; transform:translateX(-50%);
    max-width:360px; width:calc(100% - 36px);
    background:#1c1c1e; border:1px solid rgba(255,255,255,.12); border-radius:14px;
    padding:14px 16px; font-size:13px; color:#e4e4e7; text-align:center;
    z-index:9999; animation:toastIn .3s var(--spring) both;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

export function showProgressView(boltId = getJoinedBoltId()) {
  document.getElementById('bolt-list-view').style.display = 'none';
  const pv = document.getElementById('bolt-progress-view');
  pv.style.display = 'flex';

  // 단일팀(같은 팀원끼리 모임)이면 팀 컬러 글로우 표시
  const bolt = getBolts().find(b => b.id === boltId);
  document.getElementById('progress-team-glow').style.display = bolt?.isSingleTeam ? 'block' : 'none';
}
