import { goToScreen } from '../utils/nav.js';
import { subscribe, getBolts, getPlayers, boltEstimatedFinish } from '../store.js';
import { enterChecklist } from './bolt-detail.js';

let currentBoltId = null;
let tickTimer      = null;
let autoAdvanced   = false;

export function render() {
  return `
<div class="screen" id="s-bolt-progress">
  <div class="scroll-body" style="padding:calc(var(--safe-top) + 10px) 18px 40px">
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
      <button class="btn btn-secondary" style="height:34px; padding:0 14px; font-size:14px; border-radius:10px" id="bp-back">← 대시보드</button>
      <span></span>
    </div>

    <div style="position:relative; isolation:isolate;">
      <div id="bp-team-glow" class="team-glow" style="display:none;"></div>
      <div class="anim-up" style="text-align:center; padding:12px 0 4px;">
        <div style="width:64px; height:64px; border-radius:20px; background:var(--accent-tint); display:flex; align-items:center; justify-content:center; font-size:28px; margin:0 auto 12px;">⚡</div>
        <p style="font-size:18px; font-weight:700; color:var(--accent);">번개 진행 중</p>
        <p id="bp-title" style="font-size:13px; color:#52525b; margin-top:6px; line-height:1.6;"></p>
      </div>
    </div>

    <div class="bezel anim-up-1" style="margin-top:16px; padding:20px; border-radius:22px; text-align:center;">
      <p style="font-size:11px; color:#52525b; letter-spacing:.06em; text-transform:uppercase; margin-bottom:8px;">경과 시간</p>
      <p class="num" id="bp-elapsed" style="font-size:40px; font-weight:800; color:var(--accent);">00:00</p>
      <p id="bp-eta" style="font-size:12px; color:#52525b; margin-top:8px;"></p>
    </div>

    <p class="eyebrow anim-up-2" style="color:#3f3f46; margin:20px 0 10px;">참가자</p>
    <div id="bp-participants" style="display:flex; gap:14px; flex-wrap:wrap;" class="anim-up-2"></div>

    <div id="bp-host-action" style="display:none; margin-top:28px;">
      <p style="font-size:12px; color:#52525b; text-align:center; margin-bottom:10px; line-height:1.6;">완주 예상 시간이 지나면 자동으로 인증(사진 업로드) 화면으로 넘어가요</p>
      <button class="btn btn-secondary" id="bp-certify-now" style="width:100%; height:48px;">지금 바로 인증하기</button>
    </div>
  </div>
</div>`;
}

// 번개 시작 직후(방장) 또는 진행중 번개 재진입(방장·참가자 공통) 시 호출
export function openBoltProgress(boltId) {
  currentBoltId  = boltId;
  autoAdvanced   = false;
  goToScreen('s-bolt-progress');
  refresh();
}

export function init() {
  document.getElementById('bp-back').addEventListener('click', () => goToScreen('gs-dash'));
  document.getElementById('bp-certify-now').addEventListener('click', advanceToChecklist);
  subscribe(refresh);
}

function advanceToChecklist() {
  if (autoAdvanced || !currentBoltId) return;
  autoAdvanced = true;
  clearInterval(tickTimer);
  enterChecklist(currentBoltId);
}

function refresh() {
  if (!currentBoltId) return;
  if (!document.getElementById('s-bolt-progress').classList.contains('active')) return;

  const bolt = getBolts().find(b => b.id === currentBoltId);
  if (!bolt || bolt.status === 'done' || bolt.status === 'expired') {
    clearInterval(tickTimer);
    currentBoltId = null;
    goToScreen('gs-dash');
    return;
  }

  document.getElementById('bp-title').textContent = `${bolt.title} · ${bolt.place}`;
  document.getElementById('bp-team-glow').style.display = bolt.isSingleTeam ? 'block' : 'none';

  const players = getPlayers();
  document.getElementById('bp-participants').innerHTML = bolt.participants.map(pid => {
    const p = players.find(pp => pp.id === pid);
    if (!p) return '';
    const isHostP = pid === bolt.hostId;
    return `
      <div style="text-align:center;">
        <span style="width:40px;height:40px;border-radius:50%;
          background:${p.isSelf ? 'var(--accent-tint)' : '#3f3f46'};
          ${p.isSelf ? 'border:1.5px solid var(--accent);' : ''}
          display:flex;align-items:center;justify-content:center;font-size:14px;margin:0 auto;">${p.name[0]}</span>
        <p style="font-size:11px; color:#71717a; margin-top:4px;">${p.isSelf ? '나' : p.name}${isHostP ? ' 👑' : ''}</p>
      </div>`;
  }).join('');

  document.getElementById('bp-host-action').style.display = bolt.isHost ? 'block' : 'none';

  startTicking(bolt);
}

function startTicking(bolt) {
  clearInterval(tickTimer);
  const finishAt = boltEstimatedFinish(bolt);

  const tick = () => {
    const elapsedS = Math.max(0, Math.floor((Date.now() - bolt.startAt) / 1000));
    const h = Math.floor(elapsedS / 3600), m = Math.floor((elapsedS % 3600) / 60), s = elapsedS % 60;
    document.getElementById('bp-elapsed').textContent = h > 0
      ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    const remain = finishAt - Date.now();
    const etaEl = document.getElementById('bp-eta');
    if (remain > 0) {
      etaEl.textContent = `완주까지 약 ${Math.ceil(remain / 60000)}분 남았어요`;
    } else {
      etaEl.textContent = '완주 예상 시간이 지났어요';
      if (bolt.isHost) advanceToChecklist();
    }
  };
  tick();
  tickTimer = setInterval(tick, 1000);
}
