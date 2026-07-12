import { subscribe, getGameSettings, getGauge, getPlayers, getVoteHistory, getBolts, getRoster, getAssignment, triggerAssignment, ROLES } from '../../store.js';

const TEAM = {
  pacer: { label: '페이서', color: '#38bdf8' },
  ghost: { label: '고스트', color: '#a78bfa' },
};
const STATUS_LABEL = { scheduled: '예정', ongoing: '진행 중', ended: '종료' };
const TABS = [
  { key: 'players', label: '참여자' },
  { key: 'votes',   label: '투표 히스토리' },
  { key: 'bolts',   label: '번개 히스토리' },
];

const fmt = n => n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtDate = ts => new Date(ts).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

let activeTab = 'players';

export function render() {
  return `
<div class="admin-screen" id="admin-dashboard">
  <div class="admin-shell">
    <div class="admin-header">
      <div>
        <h2 id="admin-game-name" style="font-size:22px; font-weight:700;">—</h2>
        <div style="display:flex; align-items:center; gap:8px; margin-top:6px;">
          <span id="admin-game-status" class="admin-badge">—</span>
          <span id="admin-game-dday" style="font-size:12px; color:#71717a;"></span>
        </div>
      </div>
      <span id="admin-certs-pending" style="font-size:12px; color:#fbbf24; font-weight:700; flex-shrink:0;"></span>
    </div>

    <div class="bezel" style="padding:16px 18px; border-radius:20px; margin-bottom:20px;">
      <p style="font-size:11px; color:#52525b; margin-bottom:8px; letter-spacing:.04em;">실시간 게이지</p>
      <div style="display:flex; height:14px; border-radius:7px; overflow:hidden;">
        <div id="admin-bar-ghost" style="background:#a78bfa;"></div>
        <div id="admin-bar-pacer" style="background:#38bdf8;"></div>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:12px; margin-top:6px;">
        <span style="color:#a78bfa;">고스트 <span id="admin-km-ghost" class="num">—</span> km</span>
        <span style="color:#38bdf8;">페이서 <span id="admin-km-pacer" class="num">—</span> km</span>
      </div>
    </div>

    <div class="bezel" style="padding:16px 18px; border-radius:20px; margin-bottom:20px; display:flex; align-items:center; justify-content:space-between; gap:12px;">
      <div>
        <p style="font-size:11px; color:#52525b; margin-bottom:4px; letter-spacing:.04em;">팀·역할 배정</p>
        <p id="admin-assignment-status" style="font-size:14px; font-weight:600;">—</p>
      </div>
      <button class="btn btn-primary" id="admin-assign-btn" style="height:40px; padding:0 16px; font-size:13px;">지금 마감하고 배정</button>
    </div>

    <div class="admin-tabs" id="admin-tabs">
      ${TABS.map(t => `<div class="admin-tab" data-tab="${t.key}">${t.label}</div>`).join('')}
    </div>

    <div class="bezel" style="border-radius:20px; overflow:hidden;" id="admin-tab-body"></div>
  </div>
</div>`;
}

function playersBody() {
  const players = getPlayers();
  const groups = ['pacer', 'ghost'].map(team => {
    const list = players.filter(p => p.team === team);
    const t = TEAM[team];
    return `
      <div style="padding:10px 16px; font-size:12px; font-weight:700; color:${t.color}; background:rgba(255,255,255,.02);">${t.label} · ${list.length}명</div>
      ${list.map(p => `
        <div class="admin-row">
          <div>
            <p style="font-size:14px; font-weight:600;">${p.name}</p>
            <p style="font-size:11px; color:#71717a; margin-top:2px;">${ROLES[p.role]?.name ?? p.role}</p>
          </div>
          <span class="num" style="font-size:14px; font-weight:700;">${fmt(p.km)} km</span>
        </div>`).join('')}
    `;
  }).join('');
  return groups;
}

function votesBody() {
  const history = getVoteHistory();
  if (history.length === 0) return `<p style="padding:24px 16px; text-align:center; color:#52525b; font-size:13px;">아직 투표 기록이 없습니다.</p>`;
  return history.map(v => `
    <div class="admin-row" style="align-items:flex-start; flex-direction:column; gap:6px;">
      <div style="display:flex; justify-content:space-between; width:100%;">
        <span style="font-size:12px; color:#71717a;">${fmtDate(v.at)}</span>
        <span style="font-size:12px; color:#71717a;">지목 ${v.ballotCount}건</span>
      </div>
      ${v.caught.length === 0
        ? `<p style="font-size:13px; color:#52525b;">적발 실패</p>`
        : v.caught.map(c => `<p style="font-size:13px;">
            <b>${c.name}</b>
            ${c.teamCaught ? ` · 팀 공개(${TEAM[c.team]?.label ?? c.team})` : ''}
            ${c.roleRevealed ? ` · 역할 공개(${ROLES[c.revealedRole]?.name ?? c.revealedRole})` : ''}
          </p>`).join('')}
    </div>`).join('');
}

function boltsBody() {
  const done = getBolts().filter(b => b.status === 'done' || b.status === 'expired');
  if (done.length === 0) return `<p style="padding:24px 16px; text-align:center; color:#52525b; font-size:13px;">완료된 번개가 없습니다.</p>`;
  return done.map(b => `
    <div class="admin-row" style="align-items:flex-start; flex-direction:column; gap:4px;">
      <div style="display:flex; justify-content:space-between; width:100%;">
        <span style="font-size:14px; font-weight:600;">${b.title}</span>
        <span style="font-size:11px; color:${b.status === 'expired' ? '#fb7185' : '#71717a'};">${b.status === 'expired' ? '인증 마감 만료' : '완료'}</span>
      </div>
      <p style="font-size:12px; color:#71717a;">${b.place} · ${b.distance}km · 참여 ${b.count}명 · 방장 ${b.hostName}</p>
    </div>`).join('');
}

const BODY_RENDERERS = { players: playersBody, votes: votesBody, bolts: boltsBody };

function renderTabBody() {
  document.getElementById('admin-tab-body').innerHTML = BODY_RENDERERS[activeTab]();
  document.querySelectorAll('#admin-tabs .admin-tab').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === activeTab);
  });
}

function refresh() {
  const gs = getGameSettings();
  document.getElementById('admin-game-name').textContent = gs.name;
  const statusEl = document.getElementById('admin-game-status');
  statusEl.textContent = STATUS_LABEL[gs.status];
  statusEl.className = `admin-badge ${gs.status}`;
  document.getElementById('admin-game-dday').textContent =
    gs.status === 'ongoing' ? `D-${gs.dday} · ${gs.week}주차` : gs.status === 'scheduled' ? `시작 ${gs.start.toLocaleDateString('ko-KR')}` : '';

  const g = getGauge();
  const total = g.pacer + g.ghost || 1;
  document.getElementById('admin-bar-pacer').style.width = `${(g.pacer / total * 100).toFixed(1)}%`;
  document.getElementById('admin-bar-ghost').style.width = `${(g.ghost / total * 100).toFixed(1)}%`;
  document.getElementById('admin-km-pacer').textContent = fmt(g.pacer);
  document.getElementById('admin-km-ghost').textContent = fmt(g.ghost);

  const assignment = getAssignment();
  const assignBtn = document.getElementById('admin-assign-btn');
  document.getElementById('admin-assignment-status').textContent = assignment.assigned
    ? `배정 완료 · ${assignment.players.length}명`
    : `배정 전 · 명단 ${getRoster().length}명 등록`;
  assignBtn.disabled = assignment.assigned;
  assignBtn.textContent = assignment.assigned ? '배정 완료됨' : '지금 마감하고 배정';

  const pendingCerts = getBolts().filter(b => b.status === 'done' && b.reviewStatus === 'pending').length;
  document.getElementById('admin-certs-pending').textContent =
    pendingCerts ? `인증 대기 ${pendingCerts}건` : '';

  renderTabBody();
}

export function init(goTo) {
  document.getElementById('admin-assign-btn').addEventListener('click', async () => {
    if (!confirm('지금 모집을 마감하고 팀·역할을 배정할까요? 되돌릴 수 없습니다.')) return;
    try {
      await triggerAssignment();
    } catch (e) {
      alert(e.message);
    }
  });
  document.getElementById('admin-tabs').addEventListener('click', e => {
    const tab = e.target.closest('.admin-tab');
    if (!tab) return;
    activeTab = tab.dataset.tab;
    renderTabBody();
  });
  subscribe(refresh);
  refresh();
}
