import { goToScreen } from '../utils/nav.js';

let selectedBolt = null;
let joinedBoltId = null;

const BOLTS = [
  {
    id: 'b1',
    title: '한강 새벽 LSD',
    place: '반포 잠수교',
    distance: 8,
    pace: '5:30/km',
    time: '오늘 05:30',
    host: '김민수',
    count: 2,
    max: 4,
    locked: false,
  },
  {
    id: 'b2',
    title: '강남역 번개',
    place: '강남역 11번 출구',
    distance: 5,
    pace: '6:00/km',
    time: '오늘 19:00',
    host: '이서연',
    count: 1,
    max: 4,
    locked: false,
  },
  {
    id: 'b3',
    title: '비밀 작전조',
    place: '탄천',
    distance: 10,
    pace: '미공개',
    time: '내일 07:00',
    host: '서준',
    count: 3,
    max: 4,
    locked: true,
  },
];

function boltCard(bolt, animClass) {
  const lockedPrefix = bolt.locked
    ? `<span style="font-size:13px; margin-right:4px">🔒</span>` : '';
  return `
  <div class="bezel ${animClass}" id="bolt-card-${bolt.id}"
    style="padding:16px 18px; border-radius:22px; cursor:pointer;${bolt.locked ? ' opacity:.55;' : ''}">
    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px">
      <p style="font-size:15px; font-weight:600; line-height:1.3">${lockedPrefix}${bolt.title}</p>
      <span class="num" style="font-size:13px; font-weight:600; color:#71717a; white-space:nowrap; flex-shrink:0; margin-top:1px">${bolt.time}</span>
    </div>
    <p style="font-size:12px; color:#52525b; margin-top:5px">${bolt.place} · ${bolt.distance}km · ${bolt.pace}</p>
    <div style="display:flex; align-items:center; justify-content:space-between; margin-top:10px">
      <p style="font-size:12px; color:#52525b">방장 · ${bolt.host}</p>
      <div style="display:flex; align-items:center; gap:8px">
        <span id="joined-chip-${bolt.id}" style="display:none; font-size:11px; font-weight:700; color:#34d399; background:rgba(52,211,153,.1); border:1px solid rgba(52,211,153,.25); border-radius:8px; padding:2px 8px;">참여중</span>
        <span class="num" style="font-size:12px; color:#52525b">${bolt.count}/${bolt.max}명</span>
      </div>
    </div>
  </div>`;
}

export function render() {
  return `
<div class="screen" id="s-bolt">
  <!-- 번개 목록 뷰 -->
  <div id="bolt-list-view" class="scroll-body" style="padding:calc(var(--safe-top) + 12px) 18px calc(var(--safe-bottom) + 120px)">
    <div class="anim-up" style="padding-top:4px; margin-bottom:16px; display:flex; align-items:center; justify-content:space-between">
      <div>
        <h2 style="font-size:22px; font-weight:700; letter-spacing:-.02em">번개</h2>
        <p style="font-size:12px; color:#52525b; margin-top:2px">진행 중인 번개 3</p>
      </div>
      <button id="bolt-create-btn"
        style="background:var(--accent-tint); border:1px solid var(--accent-border); color:var(--accent);
          border-radius:14px; padding:0 14px; height:36px; font-size:13px; font-weight:700;
          cursor:pointer; white-space:nowrap; flex-shrink:0;">
        ⚡ 번개 만들기
      </button>
    </div>
    <div style="display:flex; flex-direction:column; gap:10px">
      ${boltCard(BOLTS[0], 'anim-up-1')}
      ${boltCard(BOLTS[1], 'anim-up-2')}
      ${boltCard(BOLTS[2], 'anim-up-3')}
    </div>
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
      <div style="padding:24px 20px calc(var(--safe-bottom) + 32px); display:flex; flex-direction:column; gap:18px; flex:1;">

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
          </div>
          <div>
            <label style="font-size:12px; color:#71717a; display:block; margin-bottom:8px; font-weight:600; letter-spacing:.04em;">페이스</label>
            <input class="input" type="text" id="create-pace" placeholder="5:30/km" />
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

  <!-- 진행 중 뷰 -->
  <div id="bolt-progress-view" style="display:none; flex:1; align-items:center; justify-content:center; flex-direction:column; gap:16px; padding:0 32px; text-align:center;">
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
        border-top:1px solid rgba(255,255,255,.08); padding:24px 20px; padding-bottom:calc(var(--safe-bottom) + 24px);">
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
  document.getElementById('bolt-create-btn').addEventListener('click', openCreateOverlay);
  document.getElementById('bolt-create-close').addEventListener('click', closeCreateOverlay);

  document.getElementById('create-submit-btn').addEventListener('click', () => {
    const title = document.getElementById('create-title').value.trim();
    if (!title) { document.getElementById('create-title').focus(); return; }
    closeCreateOverlay();
  });

  // 번개 카드 탭
  ['b1', 'b2'].forEach(id => {
    document.getElementById(`bolt-card-${id}`).addEventListener('click', () => {
      if (joinedBoltId && joinedBoltId !== id) {
        showToast('이미 다른 번개에 참여 중입니다');
        return;
      }
      if (joinedBoltId === id) {
        goToScreen('s-bolt-join');
        return;
      }
      selectedBolt = BOLTS.find(b => b.id === id);
      openJoinOverlay(selectedBolt);
    });
  });

  document.getElementById('bolt-card-b3').addEventListener('click', () => {
    showToast('이미 잠긴 번개입니다.');
  });

  document.getElementById('bolt-join-backdrop').addEventListener('click', closeJoinOverlay);
  document.getElementById('join-cancel-btn').addEventListener('click', closeJoinOverlay);
  document.getElementById('join-confirm-btn').addEventListener('click', () => {
    joinedBoltId = selectedBolt.id;
    markJoined(joinedBoltId);
    closeJoinOverlay();
    setTimeout(() => goToScreen('s-bolt-join'), 300);
  });

  document.getElementById('progress-result-btn').addEventListener('click', () => {
    goToScreen('s-bolt-result');
  });
}

// 참여 취소 시 외부에서 호출
export function cancelJoin() {
  if (joinedBoltId) {
    const chip = document.getElementById(`joined-chip-${joinedBoltId}`);
    if (chip) chip.style.display = 'none';
    joinedBoltId = null;
  }
}

function markJoined(id) {
  const chip = document.getElementById(`joined-chip-${id}`);
  if (chip) chip.style.display = 'inline-block';
}

function openCreateOverlay() {
  const overlay = document.getElementById('bolt-create-overlay');
  const sheet   = document.getElementById('bolt-create-sheet');
  overlay.style.display = 'block';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    sheet.style.transform = 'translateX(0)';
  }));
}

function closeCreateOverlay() {
  const sheet = document.getElementById('bolt-create-sheet');
  sheet.style.transform = 'translateX(100%)';
  setTimeout(() => { document.getElementById('bolt-create-overlay').style.display = 'none'; }, 400);
}

function openJoinOverlay(bolt) {
  const overlay = document.getElementById('bolt-join-overlay');
  const sheet   = document.getElementById('bolt-join-sheet');
  document.getElementById('join-bolt-title').textContent = bolt.title;
  document.getElementById('join-bolt-info').textContent  = `${bolt.place} · ${bolt.distance}km · ${bolt.pace}`;
  overlay.style.display = 'flex';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    sheet.style.transform = 'translateY(0)';
  }));
}

function closeJoinOverlay() {
  const sheet = document.getElementById('bolt-join-sheet');
  sheet.style.transform = 'translateY(100%)';
  setTimeout(() => { document.getElementById('bolt-join-overlay').style.display = 'none'; }, 400);
}

function showToast(msg) {
  const existing = document.getElementById('bolt-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'bolt-toast';
  toast.textContent = msg;
  toast.style.cssText = `
    position:absolute; bottom:calc(var(--safe-bottom) + 90px); left:18px; right:18px;
    background:#1c1c1e; border:1px solid rgba(255,255,255,.1); border-radius:14px;
    padding:14px 16px; font-size:13px; color:#a1a1aa; text-align:center;
    z-index:100; animation:fadeUp .3s var(--spring);
  `;
  document.getElementById('s-bolt').appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

export function showProgressView() {
  document.getElementById('bolt-list-view').style.display = 'none';
  const pv = document.getElementById('bolt-progress-view');
  pv.style.display = 'flex';
}
