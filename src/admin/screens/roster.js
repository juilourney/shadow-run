import { subscribe, getRoster, getAssignment, addRosterMember, updateRosterMember, removeRosterMember, ROLES } from '../../store.js';

// 배정 완료 후 관리자 마스터 뷰 — 팀 배지 색상
const TEAM = {
  pacer: { label: '페이서', color: '#38bdf8', bg: 'rgba(56,189,248,.12)', border: 'rgba(56,189,248,.3)' },
  ghost: { label: '고스트', color: '#a78bfa', bg: 'rgba(167,139,250,.12)', border: 'rgba(167,139,250,.3)' },
};

// 팀 + 역할 배지 (일반 러너는 회색, 특수 역할은 앰버 강조)
function assignBadges(p) {
  const t = TEAM[p.team] ?? { label: p.team, color: '#a1a1aa', bg: 'rgba(255,255,255,.06)', border: 'rgba(255,255,255,.12)' };
  const roleName = ROLES[p.role]?.name ?? p.role;
  const special = p.role && p.role !== 'runner';
  const rc = special ? '#fbbf24' : '#71717a';
  const rbg = special ? 'rgba(251,191,36,.12)' : 'rgba(255,255,255,.04)';
  const rbd = special ? 'rgba(251,191,36,.3)' : 'rgba(255,255,255,.08)';
  return `
    <span style="font-size:11px; font-weight:700; color:${t.color}; background:${t.bg}; border:1px solid ${t.border}; padding:2px 8px; border-radius:100px;">${t.label}</span>
    <span style="font-size:11px; font-weight:700; color:${rc}; background:${rbg}; border:1px solid ${rbd}; padding:2px 8px; border-radius:100px;">${roleName}</span>`;
}

export function render() {
  return `
<div class="admin-screen" id="admin-roster">
  <div class="admin-shell">
    <div class="admin-header">
      <h2 style="font-size:22px; font-weight:700;">참가자 명단</h2>
    </div>

    <p style="font-size:12px; color:#71717a; margin-bottom:14px;">게임 시작 전 참여 가능한 실명 목록입니다. 참가자는 이 명단에 있는 이름으로만 입장할 수 있습니다.</p>

    <div class="bezel" style="padding:16px 18px; border-radius:20px; margin-bottom:16px;">
      <textarea class="input" id="roster-bulk" rows="5"
        placeholder="이름을 한 줄에 하나씩 붙여넣기 (쉼표로 구분해도 됩니다)"
        style="width:100%; height:auto; min-height:120px; resize:vertical; line-height:1.7; padding:12px 14px;"></textarea>
      <button class="btn btn-primary" id="roster-add-btn" style="width:100%; height:48px; margin-top:10px;">일괄 등록</button>
      <p style="font-size:11px; color:#52525b; margin-top:8px; line-height:1.5;">카톡 명단을 그대로 붙여넣어도 돼요. 중복·이미 등록된 이름은 자동으로 건너뜁니다.</p>
      <p id="roster-error" style="font-size:12px; margin-top:6px; display:none;"></p>
    </div>

    <p class="eyebrow" style="color:#3f3f46; margin-bottom:10px;" id="roster-count"></p>
    <div class="bezel" style="border-radius:20px; overflow:hidden;" id="roster-body"></div>
  </div>
</div>`;
}

function rosterRow(r, player) {
  // 배정 완료 후 매칭되면 팀·역할 배지, 그 전(또는 미배정)엔 입장/미입장 배지
  const badge = player
    ? assignBadges(player)
    : r.enteredAt
    ? `<span style="font-size:11px; font-weight:700; color:#34d399; background:rgba(52,211,153,.12); border:1px solid rgba(52,211,153,.3); padding:2px 9px; border-radius:100px;">입장</span>`
    : `<span style="font-size:11px; font-weight:600; color:#71717a; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); padding:2px 9px; border-radius:100px;">미입장</span>`;
  return `
    <div class="admin-row" data-id="${r.id}">
      <span style="display:flex; align-items:center; gap:7px; flex-wrap:wrap;">
        <span style="font-size:14px; font-weight:600;">${r.name}</span>
        ${badge}
      </span>
      <div style="display:flex; gap:6px;">
        <button class="btn btn-secondary roster-edit-btn" style="height:32px; padding:0 12px; font-size:12px;">수정</button>
        <button class="btn btn-secondary roster-remove-btn" style="height:32px; padding:0 12px; font-size:12px; color:#fb7185;">삭제</button>
      </div>
    </div>`;
}

function refresh() {
  const roster = getRoster();
  const asg = getAssignment();
  const byName = asg.assigned ? new Map(asg.players.map(p => [p.name, p])) : null;

  const countEl = document.getElementById('roster-count');
  if (asg.assigned) {
    const pacer = asg.players.filter(p => p.team === 'pacer').length;
    const ghost = asg.players.filter(p => p.team === 'ghost').length;
    countEl.textContent = `배정 완료 ${asg.players.length}명 · 페이서 ${pacer} · 고스트 ${ghost}`;
  } else {
    const entered = roster.filter(r => r.enteredAt).length;
    countEl.textContent = `등록 ${roster.length}명 · 입장 ${entered} · 미입장 ${roster.length - entered}`;
  }

  document.getElementById('roster-body').innerHTML = roster.length === 0
    ? `<p style="padding:24px 16px; text-align:center; color:#52525b; font-size:13px;">등록된 참가자가 없습니다.</p>`
    : roster.map(r => rosterRow(r, byName ? byName.get(r.name) : null)).join('');
}

function showMsg(msg, color) {
  const el = document.getElementById('roster-error');
  el.textContent = msg;
  el.style.color = color;
  el.style.display = 'block';
}

export function init(goTo) {
  const bulkInput = document.getElementById('roster-bulk');

  document.getElementById('roster-add-btn').addEventListener('click', async () => {
    // 줄바꿈·쉼표로 분리 → 트림 → 빈값·중복 제거
    const names = [...new Set(bulkInput.value.split(/[\n,]+/).map(s => s.trim()).filter(Boolean))];
    if (names.length === 0) { showMsg('이름을 입력하세요.', '#fb7185'); return; }

    const existing = new Set(getRoster().map(r => r.name));
    const toAdd = names.filter(n => !existing.has(n));
    const skipped = names.length - toAdd.length;

    const btn = document.getElementById('roster-add-btn');
    btn.disabled = true; btn.textContent = '등록 중…';
    const results = await Promise.allSettled(toAdd.map(n => addRosterMember(n)));
    btn.disabled = false; btn.textContent = '일괄 등록';

    const added  = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    bulkInput.value = '';

    const parts = [`${added}명 등록`];
    if (skipped) parts.push(`${skipped}명 이미 있음`);
    if (failed)  parts.push(`${failed}명 실패`);
    showMsg(parts.join(' · '), failed ? '#fb7185' : '#34d399');
  });

  document.getElementById('roster-body').addEventListener('click', async e => {
    const row = e.target.closest('[data-id]');
    if (!row) return;
    const id = row.dataset.id;
    const current = getRoster().find(r => r.id === id);

    if (e.target.classList.contains('roster-edit-btn')) {
      const next = prompt('이름 수정', current?.name ?? '');
      if (next === null) return;
      try { await updateRosterMember(id, next); } catch (err) { alert(err.message); }
    }
    if (e.target.classList.contains('roster-remove-btn')) {
      if (!confirm(`'${current?.name}'을(를) 명단에서 삭제할까요?`)) return;
      await removeRosterMember(id);
    }
  });

  subscribe(refresh);
  refresh();
}

export function onShow() {
  refresh();
}
