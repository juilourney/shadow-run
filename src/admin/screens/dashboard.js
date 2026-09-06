import { subscribe, getGameSettings, getGauge, getPlayers, getVoteHistory, getBolts, getRoster, getAssignment, triggerAssignment, ROLES } from '../../store.js';

const TEAM = {
  pacer: { label: '페이서', color: '#38bdf8' },
  ghost: { label: '고스트', color: '#a78bfa' },
};
const STATUS_LABEL = { scheduled: '예정', ongoing: '진행 중', ended: '종료' };
// 번개 상태 배지 — 예전엔 완료·만료만 보였으나 모집 중/진행 중까지 목록에 노출
const BOLT_STATUS = {
  open:    { label: '모집 중', color: '#34d399' },
  running: { label: '진행 중', color: '#38bdf8' },
  done:    { label: '완료',    color: '#71717a' },
  expired: { label: '만료',    color: '#fb7185' },
};
const BOLT_RANK = { open: 0, running: 1, done: 2, expired: 3 };  // 진행 중인 것부터 위로
// 참여자 목록은 별도 '참가자 명단' 메뉴로 분리 — 대시보드는 히스토리·목록만
const TABS = [
  { key: 'votes',   label: '투표 히스토리' },
  { key: 'bolts',   label: '번개 목록' },
];

const fmt = n => n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtDate = ts => new Date(ts).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

let activeTab = 'votes';

// 최종 순위 한 줄 — 전원 정체 공개(관리자용). km 내림차순.
function rankRowAdmin(p, i) {
  const t = TEAM[p.team] ?? { label: p.team, color: '#a1a1aa' };
  const roleName = ROLES[p.role]?.name ?? p.role;
  const isFirst = i === 0;
  return `
  <div style="display:flex; align-items:center; gap:10px; padding:9px 11px; border-radius:11px;
    background:${isFirst ? 'rgba(250,204,21,.1)' : 'rgba(255,255,255,.02)'};">
    <span style="width:20px; text-align:center; font-size:${isFirst ? '15px' : '12px'}; color:#71717a;">${isFirst ? '👑' : i + 1}</span>
    <div style="flex:1; min-width:0;">
      <p style="font-size:13px; font-weight:600; line-height:1.2;">${p.name}</p>
      <p style="font-size:11px; color:${t.color}; margin-top:2px; line-height:1.2;">${t.label} · ${roleName}</p>
    </div>
    <span class="num" style="font-size:13px; font-weight:700; white-space:nowrap;">${fmt(p.km)} <span style="font-size:10px; color:#52525b;">km</span></span>
  </div>`;
}

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

    <!-- 게임 종료 시에만 노출되는 결과 배너 (누가 이겼는지 + 펼치면 최종 순위) -->
    <div id="admin-result" style="display:none; padding:16px 18px; border-radius:20px; margin-bottom:20px;
      background:linear-gradient(135deg, rgba(250,204,21,.09), rgba(255,255,255,.02)); border:1px solid rgba(250,204,21,.22);">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
        <div style="min-width:0;">
          <p id="admin-result-winner" style="font-size:17px; font-weight:800; line-height:1.3;">—</p>
          <p id="admin-result-diff" style="font-size:12px; color:#71717a; margin-top:3px;"></p>
        </div>
        <button class="btn btn-secondary" id="admin-result-toggle" style="height:36px; padding:0 14px; font-size:12px; flex-shrink:0;">결과 화면 보기</button>
      </div>
      <div id="admin-result-ranking" style="display:none; flex-direction:column; gap:6px; margin-top:14px;"></div>
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
  // 모집 중·진행 중·완료·만료 전부 — 진행 중인 것부터 위로, 같은 상태끼린 일정순
  const bolts = getBolts().slice().sort((a, b) =>
    (BOLT_RANK[a.status] ?? 9) - (BOLT_RANK[b.status] ?? 9) || (a.startAt || 0) - (b.startAt || 0));
  if (bolts.length === 0) return `<p style="padding:24px 16px; text-align:center; color:#52525b; font-size:13px;">등록된 번개가 없습니다.</p>`;
  return bolts.map(b => {
    const s = BOLT_STATUS[b.status] ?? { label: b.status, color: '#a1a1aa' };
    const when = b.startAt ? fmtDate(b.startAt) : (b.time || '시간 미정');
    return `
    <div class="admin-row" style="align-items:flex-start; flex-direction:column; gap:4px;">
      <div style="display:flex; justify-content:space-between; width:100%; gap:8px;">
        <span style="font-size:14px; font-weight:600;">${b.locked ? '🔒 ' : ''}${b.title}</span>
        <span style="font-size:11px; font-weight:700; color:${s.color}; flex-shrink:0;">${s.label}</span>
      </div>
      <p style="font-size:12px; color:#71717a;">${when} · ${b.place || '장소 미정'} · ${b.distance}km · ${b.pace}</p>
      <p style="font-size:12px; color:#52525b;">참여 ${b.count}/${b.max}명 · 방장 ${b.hostName}</p>
    </div>`;
  }).join('');
}

const BODY_RENDERERS = { votes: votesBody, bolts: boltsBody };

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

  // 게임 종료 시 결과 배너 — 누가 이겼는지 + (펼치면) 최종 순위
  const resultEl = document.getElementById('admin-result');
  if (gs.status === 'ended') {
    resultEl.style.display = 'block';
    const winnerEl = document.getElementById('admin-result-winner');
    const diffEl = document.getElementById('admin-result-diff');
    if (g.leader) {
      const w = TEAM[g.leader];
      winnerEl.innerHTML = `🏁 <span style="color:${w.color};">${w.label}</span> 승리로 종료`;
      diffEl.textContent = `최종 격차 +${fmt(Math.abs(g.diff))} km · 고스트 ${fmt(g.ghost)} / 페이서 ${fmt(g.pacer)}`;
    } else {
      winnerEl.textContent = '🏁 무승부로 종료';
      diffEl.textContent = '양 팀 게이지 동점';
    }
    const ranked = [...getPlayers()].sort((a, b) => b.km - a.km);
    document.getElementById('admin-result-ranking').innerHTML = ranked.map(rankRowAdmin).join('');
  } else {
    resultEl.style.display = 'none';
  }

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
  // 결과 배너 '결과 화면 보기' — 최종 순위 펼치기/접기
  document.getElementById('admin-result-toggle').addEventListener('click', () => {
    const rk = document.getElementById('admin-result-ranking');
    const btn = document.getElementById('admin-result-toggle');
    const showing = rk.style.display !== 'none';
    rk.style.display = showing ? 'none' : 'flex';
    btn.textContent = showing ? '결과 화면 보기' : '접기';
  });
  subscribe(refresh);
  refresh();
}
