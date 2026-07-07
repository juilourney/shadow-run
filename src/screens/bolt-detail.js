import { goToScreen } from '../utils/nav.js';
import { getBolts, getPlayers, setPendingBolt, toggleBoltLock, cancelBolt } from '../store.js';
import { openBuffView } from './bolt-buff.js';

let activeBoltId = 'b1'; // 현재 방장 뷰로 연 번개
let targetKm   = 8;      // 번개 설정 거리 (이 이상 달려야 인증)
let verifiedKm = null;   // 인식/입력된 인증 거리
let started    = false;  // 체크리스트(진행) 단계 여부

// 외부(bolt 목록)에서 방장 뷰 진입 시 호출 — 해당 번개 데이터로 채움
export function openHostView(boltId) {
  const bolt = getBolts().find(b => b.id === boltId);
  if (!bolt) return;
  activeBoltId = boltId;
  targetKm     = bolt.distance;
  verifiedKm   = null;
  started      = false;

  // 헤더
  document.getElementById('detail-title').textContent    = bolt.title;
  document.getElementById('detail-distance').textContent = bolt.distance.toFixed(1);
  document.getElementById('detail-pace').textContent     = (bolt.pace || '—').replace('/km', '');
  document.getElementById('detail-count').textContent    = `${bolt.count}/${bolt.max}`;
  document.getElementById('detail-place').innerHTML      = `📍 ${bolt.place || '장소 미정'}`;

  // 단일팀 알림 노출 여부
  const on = bolt.isSingleTeam ? '' : 'none';
  document.getElementById('detail-singleteam-notice').style.display   = on;
  document.getElementById('checklist-singleteam-notice').style.display = on;

  // 잠금 토글 — 해당 번개의 실제 상태 반영 (신규 번개는 기본 해제)
  applyLockToggle(document.getElementById('host-lock-toggle'), bolt.locked);

  // 참가자 목록 + 체크인 체크박스
  const players = getPlayers();
  const parts = bolt.participants.map(pid => players.find(p => p.id === pid)).filter(Boolean);

  document.getElementById('detail-participants').innerHTML = parts.map(p => {
    const host = p.id === bolt.hostId;
    return `
    <div class="bezel" style="padding:14px 16px; border-radius:18px; display:flex; align-items:center; gap:12px">
      <span style="width:36px;height:36px;border-radius:50%;
        background:${host ? 'var(--accent-tint)' : '#3f3f46'};
        ${host ? 'border:1.5px solid var(--accent);' : ''}
        display:flex;align-items:center;justify-content:center;font-size:13px">${p.name[0]}</span>
      <span style="font-size:14px; font-weight:${host ? '600' : '500'}; color:${host ? 'var(--accent)' : '#e4e4e7'}">
        ${p.name}${host ? ' <span style="font-size:12px; color:#3f3f46; font-weight:400">· 방장</span>' : ''}</span>
    </div>`;
  }).join('');

  document.getElementById('detail-checklist-people').innerHTML = parts.map(p => {
    const host = p.id === bolt.hostId;
    return `
    <label style="display:flex; align-items:center; gap:14px; padding:16px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.07); border-radius:18px; cursor:pointer;">
      <input type="checkbox" class="checkin-box" data-pid="${p.id}" checked style="width:20px; height:20px; accent-color:var(--accent); cursor:pointer;" />
      <span style="font-size:15px; font-weight:500">${p.name}${host ? ' (방장)' : ''}</span>
    </label>`;
  }).join('');

  // 뷰 초기화 (대기 화면)
  document.getElementById('bolt-detail-waiting').style.display   = 'block';
  document.getElementById('bolt-detail-checklist').style.display = 'none';
  const action = document.getElementById('bolt-detail-action');
  action.textContent = '번개 시작하기';
  action.style.opacity = ''; action.style.pointerEvents = '';
  document.getElementById('bolt-detail-cancel').style.display = '';
  document.getElementById('verify-target').textContent = `${bolt.distance.toFixed(1)}km`;

  goToScreen('s-bolt-detail');
}

export function render() {
  return `
<div class="screen" id="s-bolt-detail">
  <!-- 상세/대기 뷰 -->
  <div id="bolt-detail-waiting" class="scroll-body" style="padding:calc(var(--safe-top) + 10px) 18px 140px">
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
      <button class="btn btn-secondary" style="height:34px; padding:0 14px; font-size:14px; border-radius:10px" id="bolt-detail-back">← 번개</button>
      <span style="font-size:13px; font-weight:600; color:#52525b;">방장 뷰</span>
      <span style="width:60px;"></span>
    </div>
    <div class="anim-up" style="padding-top:8px">
      <span class="chip" style="background:var(--accent-tint); color:var(--accent); margin-bottom:10px; display:inline-flex;">D-DAY · 05:30</span>
      <h2 id="detail-title" style="font-size:26px; font-weight:700; letter-spacing:-.02em; margin-top:10px;">한강 새벽 LSD</h2>
      <p style="font-size:13px; color:#52525b; margin-top:4px;">호스트 · 나 (방장)</p>
    </div>

    <div class="bezel anim-up-1" style="margin-top:16px; padding:2px; border-radius:24px">
      <div class="bezel-in" style="padding:18px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:0; text-align:center">
        <div><p id="detail-distance" class="num" style="font-size:22px; font-weight:700; color:var(--accent)">8.0</p><p style="font-size:11px; color:#52525b">km</p></div>
        <div style="border-left:1px solid rgba(255,255,255,.06); border-right:1px solid rgba(255,255,255,.06)">
          <p id="detail-pace" class="num" style="font-size:22px; font-weight:700">5:30</p><p style="font-size:11px; color:#52525b">/km</p></div>
        <div><p id="detail-count" class="num" style="font-size:22px; font-weight:700">3/4</p><p style="font-size:11px; color:#52525b">참여</p></div>
      </div>
    </div>

    <div id="detail-place" class="bezel anim-up-2" style="margin-top:10px; padding:14px 16px; border-radius:18px; display:flex; align-items:center; gap:10px; font-size:14px; color:#71717a">
      📍 반포 잠수교 남단 광장
    </div>

    <!-- 단일팀 조건 충족 알림 (방장에게만 노출) -->
    <div id="detail-singleteam-notice" class="anim-up-2" style="margin-top:10px; background:rgba(251,146,60,.12); border:1px solid rgba(251,146,60,.35); border-radius:18px; padding:14px 18px; display:flex; align-items:flex-start; gap:10px;">
      <span style="font-size:18px; flex-shrink:0;">🔥</span>
      <div>
        <p style="font-size:13px; font-weight:700; color:#fb923c;">단일팀 번개 조건 충족!</p>
        <p style="font-size:12px; color:rgba(251,146,60,.7); margin-top:3px; line-height:1.5;">참가자 전원이 같은 팀입니다. 잠금을 걸면 단일팀 번개로 전환되어 팀 고유 스킬이 발동됩니다.</p>
      </div>
    </div>

    <!-- 잠금 토글 -->
    <div class="bezel anim-up-3" style="margin-top:10px; padding:16px; border-radius:18px; display:flex; align-items:center; justify-content:space-between">
      <div>
        <p style="font-size:14px; font-weight:600">단일팀 번개로 잠금</p>
        <p style="font-size:12px; color:#52525b; margin-top:3px">외부인 입장을 차단합니다</p>
      </div>
      <div id="host-lock-toggle" class="unlocked" style="width:44px; height:26px; border-radius:99px; background:rgba(255,255,255,.10); position:relative; cursor:pointer; transition:.4s var(--spring)">
        <span style="position:absolute; left:3px; top:3px; width:20px; height:20px; border-radius:50%; background:#52525b; transition:.4s var(--spring)"></span>
      </div>
    </div>

    <p class="eyebrow anim-up-3" style="color:#3f3f46; margin:20px 0 10px">참가자 확인</p>
    <div id="detail-participants" style="display:flex; flex-direction:column; gap:8px" class="anim-up-4"></div>
  </div>

  <!-- 체크리스트 뷰 (번개 시작 후) -->
  <div id="bolt-detail-checklist" class="scroll-body" style="display:none; padding:calc(var(--safe-top) + 10px) 18px 140px">
    <div style="padding:8px 18px 0;">

      <!-- 단일팀 번개 시작 알림 -->
      <div id="checklist-singleteam-notice" style="background:rgba(251,146,60,.12); border:1px solid rgba(251,146,60,.3); border-radius:18px; padding:16px 18px; text-align:center; margin-bottom:16px;">
        <p style="font-size:15px; font-weight:700; color:#fb923c;">🔥 단일팀 번개 진행 중!</p>
        <p style="font-size:12px; color:rgba(251,146,60,.7); margin-top:4px;">완료 후 팀 고유 스킬이 발동됩니다</p>
      </div>

      <p style="font-size:16px; font-weight:700; margin-bottom:6px;">참여 체크인</p>
      <p style="font-size:12px; color:#52525b; margin-bottom:20px;">실제로 완주한 참가자를 체크하세요</p>

      <div id="detail-checklist-people" style="display:flex; flex-direction:column; gap:10px;"></div>

      <!-- 방장 거리 인증 (기록 사진 업로드 → AI 인식) -->
      <div style="margin-top:22px;">
        <p style="font-size:14px; font-weight:700; margin-bottom:6px;">방장 거리 인증</p>
        <p style="font-size:12px; color:#52525b; margin-bottom:12px;">
          설정 거리 <b id="verify-target" style="color:var(--accent);">8.0km</b> 이상 달린 기록 사진을 올려주세요.
          인식된 거리가 방장·참가자 전원에게 적용됩니다.
        </p>
        <div id="verify-zone"></div>
      </div>
    </div>
  </div>

  <!-- 하단 버튼 -->
  <div id="bolt-detail-btn-area" style="position:absolute; left:18px; right:18px; bottom:16px; display:flex; gap:10px; z-index:30">
    <button class="btn btn-secondary" style="width:80px; height:56px; font-size:14px" id="bolt-detail-cancel">취소</button>
    <button class="btn btn-primary" style="flex:1; height:56px" id="bolt-detail-action">번개 시작하기</button>
  </div>
</div>`;
}

export function init() {
  document.getElementById('bolt-detail-back').addEventListener('click', () => goToScreen('gs-bolt'));
  document.getElementById('bolt-detail-cancel').addEventListener('click', async () => {
    if (!confirm('이 번개를 취소할까요? 참여자 전원에게서 사라지며 되돌릴 수 없습니다.')) return;
    try {
      await cancelBolt(activeBoltId);
      goToScreen('gs-bolt');
    } catch (e) {
      alert(e.message);
    }
  });

  document.getElementById('bolt-detail-action').addEventListener('click', async () => {
    if (!started) {
      // 번개 시작 → 체크리스트 뷰로 전환
      started = true;
      verifiedKm = null;
      document.getElementById('bolt-detail-waiting').style.display = 'none';
      document.getElementById('bolt-detail-checklist').style.display = 'block';
      document.getElementById('bolt-detail-action').textContent = '번개 완료 · 제출';
      document.getElementById('bolt-detail-cancel').style.display = 'none';
      document.getElementById('verify-target').textContent = `${targetKm.toFixed(1)}km`;
      renderVerifyIdle();
      updateSubmitState();
    } else {
      // 제출: 인증 확인 → store에 마일리지 반영
      if (verifiedKm === null || verifiedKm < targetKm) return;
      const checked = [...document.querySelectorAll('#detail-checklist-people .checkin-box:checked')]
        .map(el => el.dataset.pid);
      const bolt = getBolts().find(b => b.id === activeBoltId);
      const allPlayers = getPlayers();
      const firstParticipant = allPlayers.find(p => bolt?.participants.includes(p.id));
      setPendingBolt({
        boltId: activeBoltId,
        distanceKm: verifiedKm,
        participantIds: checked,
        isSingleTeam: bolt?.isSingleTeam ?? false,
        team: bolt?.isSingleTeam ? (firstParticipant?.team ?? null) : null,
        boltTitle: bolt?.title ?? '번개',
      });
      openBuffView();
      goToScreen('s-bolt-buff');
    }
  });

  document.getElementById('host-lock-toggle').addEventListener('click', function() {
    this.classList.toggle('unlocked');
    const locked = !this.classList.contains('unlocked');
    applyLockToggle(this, locked);
    toggleBoltLock(activeBoltId, locked); // 잠금은 옵션 — 기본 해제
  });
}

// 잠금 토글 시각 반영 (locked=true면 ON)
function applyLockToggle(el, locked) {
  el.classList.toggle('unlocked', !locked);
  const dot = el.querySelector('span');
  if (locked) {
    el.style.background = 'var(--accent-deep)';
    dot.style.left = ''; dot.style.right = '3px';
    dot.style.background = '#fff';
  } else {
    el.style.background = 'rgba(255,255,255,.10)';
    dot.style.right = ''; dot.style.left = '3px';
    dot.style.background = '#52525b';
  }
}

// ── 제출 버튼 활성/비활성 ────────────────────────────────
function updateSubmitState() {
  const btn = document.getElementById('bolt-detail-action');
  if (!btn) return;
  const ok = verifiedKm !== null && verifiedKm >= targetKm;
  btn.style.opacity       = ok ? '1' : '.5';
  btn.style.pointerEvents = ok ? 'auto' : 'none';
}

// ── 인증 존 상태별 렌더 ──────────────────────────────────
function renderVerifyIdle() {
  const zone = document.getElementById('verify-zone');
  zone.innerHTML = `
    <button id="verify-upload-btn" type="button"
      style="width:100%; height:52px; border-radius:16px; cursor:pointer;
        background:var(--accent-tint); border:1px solid var(--accent-border); color:var(--accent);
        font-size:14px; font-weight:700;">📸 거리 기록 사진 올리기</button>
    <input type="file" id="verify-file" accept="image/*" style="display:none" />`;
  zone.querySelector('#verify-upload-btn').onclick = () => zone.querySelector('#verify-file').click();
  zone.querySelector('#verify-file').onchange = e => { const f = e.target.files[0]; if (f) handleUpload(f); };
}

function showAnalyzing() {
  ensureSpinKeyframe();
  document.getElementById('verify-zone').innerHTML = `
    <div style="display:flex; align-items:center; gap:12px; padding:16px; background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.07); border-radius:16px;">
      <div style="width:20px; height:20px; border:2px solid rgba(255,255,255,.15); border-top-color:var(--accent); border-radius:50%; animation:verify-spin .8s linear infinite;"></div>
      <p style="font-size:13px; color:#a1a1aa;">AI가 거리를 분석하고 있어요…</p>
    </div>`;
}

function showResult(km) {
  const ok = km >= targetKm;
  verifiedKm = ok ? km : null;
  const zone = document.getElementById('verify-zone');
  zone.innerHTML = `
    <div style="padding:16px; border-radius:16px;
      background:${ok ? 'rgba(52,211,153,.08)' : 'rgba(251,113,133,.08)'};
      border:1px solid ${ok ? 'rgba(52,211,153,.25)' : 'rgba(251,113,133,.25)'};">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
        <div>
          <p style="font-size:12px; color:#52525b;">인식된 거리</p>
          <p class="num" style="font-size:26px; font-weight:800; color:${ok ? '#34d399' : '#fb7185'};">
            ${km.toFixed(1)}<span style="font-size:13px; font-weight:400;"> km</span></p>
        </div>
        <span style="font-size:13px; font-weight:700; text-align:right; color:${ok ? '#34d399' : '#fb7185'};">
          ${ok ? '✅ 인증 완료' : `❌ ${targetKm.toFixed(1)}km 미달`}</span>
      </div>
      <button id="verify-retry" type="button"
        style="margin-top:12px; width:100%; height:40px; border-radius:12px;
          background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1);
          color:#a1a1aa; font-size:13px; cursor:pointer;">다시 올리기</button>
    </div>`;
  zone.querySelector('#verify-retry').onclick = renderVerifyIdle;
  updateSubmitState();
}

// 자동 인식 불가(로컬/실패) 시 수동 입력 폴백
function showManualFallback() {
  const zone = document.getElementById('verify-zone');
  zone.innerHTML = `
    <div style="padding:16px; border-radius:16px; background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.08);">
      <p style="font-size:13px; color:#fb7185; font-weight:600; margin-bottom:4px;">자동 인식을 사용할 수 없습니다</p>
      <p style="font-size:12px; color:#52525b; margin-bottom:12px;">거리를 직접 입력하세요 (사진은 기록으로 보관됩니다)</p>
      <div style="display:flex; align-items:center; gap:10px;">
        <input type="number" id="manual-km" step="0.1" min="0" placeholder="0.0"
          style="width:90px; padding:8px 12px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.1); border-radius:10px; color:#fafafa; font-family:'Space Grotesk'; font-size:16px; font-weight:700; text-align:center;" />
        <span style="font-size:13px; color:#71717a;">km</span>
        <button id="manual-ok" type="button"
          style="margin-left:auto; height:40px; padding:0 18px; border-radius:12px;
            background:var(--accent-tint); border:1px solid var(--accent-border); color:var(--accent);
            font-size:13px; font-weight:700; cursor:pointer;">확인</button>
      </div>
    </div>`;
  zone.querySelector('#manual-ok').onclick = () => {
    const v = parseFloat(zone.querySelector('#manual-km').value);
    if (isNaN(v) || v <= 0) return;
    showResult(v);
  };
}

// ── 업로드 + AI 인식 (runluck 방식) ──────────────────────
async function handleUpload(file) {
  showAnalyzing();
  const small = await resizeImage(file, 600, 0.65);
  if (!small) { showManualFallback(); return; }
  const km = await recognizeDistance(small);
  if (km === null) { showManualFallback(); return; }
  showResult(km);
}

function resizeImage(file, max, q) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      let { width: w, height: h } = img;
      const sc = Math.min(1, max / Math.max(w, h));
      const cv = document.createElement('canvas');
      cv.width = Math.round(w * sc); cv.height = Math.round(h * sc);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      res(cv.toDataURL('image/jpeg', q));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => res(null);
    img.src = URL.createObjectURL(file);
  });
}

async function recognizeDistance(dataUrl) {
  const b64   = dataUrl.split(',')[1];
  const media = dataUrl.slice(5, dataUrl.indexOf(';'));
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 20000);
  try {
    const res = await fetch('/api/recognize', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ imageData: b64, mediaType: media }),
      signal: abort.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const txt = (data.content?.[0]?.text ?? '').trim();
    if (/NONE/i.test(txt)) return null;
    const m = txt.match(/(\d+(?:\.\d+)?)/);
    if (!m) return null;
    const v = parseFloat(m[1]);
    if (isNaN(v) || v <= 0 || v > 200) return null;
    return Math.round(v * 100) / 100;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

function ensureSpinKeyframe() {
  if (document.getElementById('verify-spin-kf')) return;
  const s = document.createElement('style');
  s.id = 'verify-spin-kf';
  s.textContent = '@keyframes verify-spin{to{transform:rotate(360deg)}}';
  document.head.appendChild(s);
}
