import { goToScreen } from '../utils/nav.js';
import { cancelJoin } from './bolt.js';
import { subscribe, getJoinedBoltId, getBolts, getPlayers } from '../store.js';

export function render() {
  return `
<div class="screen" id="s-bolt-join">
  <div class="scroll-body" style="padding:calc(var(--safe-top) + 10px) 18px 120px">
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
      <button class="btn btn-secondary" style="height:34px; padding:0 14px; font-size:14px; border-radius:10px" id="bolt-join-back">← 번개</button>
      <span></span>
    </div>
    <div class="anim-up" style="padding-top:8px">
      <span class="chip" style="background:var(--accent-tint); color:var(--accent); margin-bottom:10px; display:inline-flex;">참여 완료</span>
      <h2 id="bj-title" style="font-size:24px; font-weight:700; letter-spacing:-.02em; margin-top:10px;"></h2>
      <p id="bj-time" style="font-size:13px; color:#52525b; margin-top:4px;"></p>
    </div>

    <div class="bezel anim-up-1" style="margin-top:16px; padding:2px; border-radius:24px">
      <div class="bezel-in" style="padding:18px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:0; text-align:center">
        <div>
          <p class="num" id="bj-distance" style="font-size:22px; font-weight:700; color:var(--accent)"></p>
          <p style="font-size:11px; color:#52525b">km</p>
        </div>
        <div style="border-left:1px solid rgba(255,255,255,.06); border-right:1px solid rgba(255,255,255,.06)">
          <p class="num" id="bj-pace" style="font-size:22px; font-weight:700"></p>
          <p style="font-size:11px; color:#52525b">페이스</p>
        </div>
        <div>
          <p class="num" id="bj-count" style="font-size:22px; font-weight:700"></p>
          <p style="font-size:11px; color:#52525b">참여</p>
        </div>
      </div>
    </div>

    <div class="bezel anim-up-2" style="margin-top:10px; padding:14px 16px; border-radius:18px; display:flex; align-items:center; gap:10px; font-size:14px; color:#71717a">
      📍 <span id="bj-place"></span>
    </div>

    <p class="eyebrow anim-up-2" style="color:#3f3f46; margin:20px 0 10px">참가자</p>
    <p style="font-size:11px; color:#52525b; margin-bottom:12px; margin-top:-6px;">팀과 역할은 공개되지 않습니다</p>
    <div id="bj-participants" style="display:flex; flex-direction:column; gap:8px" class="anim-up-3"></div>

    <!-- 시작까지 카운트다운 -->
    <div id="bj-countdown-card" class="bezel anim-up-4" style="display:none; margin-top:16px; padding:16px 20px; border-radius:20px; text-align:center;">
      <p style="font-size:11px; color:#52525b; margin-bottom:6px;">번개 시작까지</p>
      <p class="num" id="bj-countdown" style="font-size:36px; font-weight:700; color:var(--accent);"></p>
      <p style="font-size:11px; color:#3f3f46; margin-top:4px;">방장이 완료 처리하면 결과가 반영됩니다</p>
    </div>

    <!-- 참여 취소 -->
    <button id="bolt-join-cancel-btn"
      style="width:100%; margin-top:12px; height:48px; border-radius:16px;
        background:rgba(251,113,133,.08); border:1px solid rgba(251,113,133,.2);
        color:#f87171; font-size:14px; font-weight:600; cursor:pointer;">
      참여 취소하기
    </button>
  </div>
</div>`;
}

let currentBoltId = null;

function participantRow(p, hostId) {
  const isHost = p.id === hostId;
  const selfStyle = p.isSelf ? 'background:var(--accent-tint); border-color:var(--accent-border);' : '';
  const avatarStyle = p.isSelf ? 'background:var(--accent-tint);border:1.5px solid var(--accent);' : 'background:#3f3f46;';
  const textStyle = p.isSelf ? 'font-weight:600; color:var(--accent);' : 'font-weight:500;';
  const label = `${p.name}${p.isSelf ? ' (참여 완료)' : ''}${isHost ? ' <span style="font-size:12px; color:#3f3f46">· 방장</span>' : ''}`;
  return `
    <div class="bezel" style="padding:14px 16px; border-radius:18px; display:flex; align-items:center; gap:12px; ${selfStyle}">
      <span style="width:36px;height:36px;border-radius:50%;${avatarStyle}display:flex;align-items:center;justify-content:center;font-size:13px">${p.name[0]}</span>
      <span style="font-size:14px; ${textStyle}">${label}</span>
    </div>`;
}

function showToast(msg) {
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText = `
    position:fixed; bottom:36px; left:50%; transform:translateX(-50%);
    max-width:360px; width:calc(100% - 36px);
    background:#1c1c1e; border:1px solid rgba(255,255,255,.12); border-radius:14px;
    padding:14px 16px; font-size:13px; color:#e4e4e7; text-align:center;
    z-index:9999; animation:fadeUp .3s var(--spring) both;
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

function refresh() {
  const liveId = getJoinedBoltId();
  if (liveId) currentBoltId = liveId;
  if (!currentBoltId) return;

  const bolt = getBolts().find(b => b.id === currentBoltId);
  if (!bolt) {
    currentBoltId = null;
    if (document.getElementById('s-bolt-join').classList.contains('active')) {
      goToScreen('gs-bolt');
      showToast('방장이 번개를 취소했습니다');
    }
    return;
  }

  if (bolt.status === 'done' || bolt.status === 'expired') {
    currentBoltId = null;
    if (document.getElementById('s-bolt-join').classList.contains('active')) {
      goToScreen('gs-bolt');
      showToast(bolt.status === 'done' ? '번개가 완료됐습니다! 마일리지를 확인해보세요' : '번개가 인증 마감 시각을 넘겨 만료됐습니다');
    }
    return;
  }

  document.getElementById('bj-title').textContent = bolt.title;
  document.getElementById('bj-time').textContent = bolt.time ? `${bolt.time} 시작` : '';
  document.getElementById('bj-distance').textContent = bolt.distance.toFixed(1);
  document.getElementById('bj-pace').textContent = bolt.pace;
  document.getElementById('bj-count').textContent = `${bolt.count}/${bolt.max}`;
  document.getElementById('bj-place').textContent = bolt.place;

  const players = getPlayers();
  const rows = bolt.participants
    .map(id => players.find(p => p.id === id))
    .filter(Boolean)
    .map(p => participantRow(p, bolt.hostId))
    .join('');
  document.getElementById('bj-participants').innerHTML = rows;

  const countdownCard = document.getElementById('bj-countdown-card');
  if (bolt.startAt) {
    countdownCard.style.display = 'block';
    const diff = bolt.startAt - Date.now();
    const el = document.getElementById('bj-countdown');
    if (diff <= 0) {
      el.textContent = '시작됨';
    } else {
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      el.textContent = h > 0
        ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
  } else {
    countdownCard.style.display = 'none';
  }
}

export function init() {
  document.getElementById('bolt-join-back').addEventListener('click', () => goToScreen('gs-bolt'));

  document.getElementById('bolt-join-cancel-btn').addEventListener('click', () => {
    cancelJoin();
    goToScreen('gs-bolt');
  });

  refresh();
  subscribe(refresh);
  setInterval(refresh, 1000);   // 카운트다운 갱신
}
