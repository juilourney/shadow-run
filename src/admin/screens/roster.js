import { subscribe, getRoster, addRosterMember, updateRosterMember, removeRosterMember } from '../../store.js';

export function render() {
  return `
<div class="admin-screen" id="admin-roster">
  <div class="admin-shell">
    <div class="admin-header">
      <h2 style="font-size:22px; font-weight:700;">참가자 명단</h2>
    </div>

    <p style="font-size:12px; color:#71717a; margin-bottom:14px;">게임 시작 전 참여 가능한 실명 목록입니다. 참가자는 이 명단에 있는 이름으로만 입장할 수 있습니다.</p>

    <div class="bezel" style="padding:16px 18px; border-radius:20px; margin-bottom:16px;">
      <div style="display:flex; gap:8px;">
        <input class="input" id="roster-new-name" placeholder="추가할 이름" style="flex:1;" />
        <button class="btn btn-primary" id="roster-add-btn" style="width:72px; height:52px; flex-shrink:0;">추가</button>
      </div>
      <p id="roster-error" style="font-size:12px; color:#fb7185; margin-top:8px; display:none;"></p>
    </div>

    <p class="eyebrow" style="color:#3f3f46; margin-bottom:10px;" id="roster-count"></p>
    <div class="bezel" style="border-radius:20px; overflow:hidden;" id="roster-body"></div>
  </div>
</div>`;
}

function rosterRow(r) {
  return `
    <div class="admin-row" data-id="${r.id}">
      <span style="font-size:14px; font-weight:600;">${r.name}</span>
      <div style="display:flex; gap:6px;">
        <button class="btn btn-secondary roster-edit-btn" style="height:32px; padding:0 12px; font-size:12px;">수정</button>
        <button class="btn btn-secondary roster-remove-btn" style="height:32px; padding:0 12px; font-size:12px; color:#fb7185;">삭제</button>
      </div>
    </div>`;
}

function refresh() {
  const roster = getRoster();
  document.getElementById('roster-count').textContent = `등록 인원 ${roster.length}명`;
  document.getElementById('roster-body').innerHTML = roster.length === 0
    ? `<p style="padding:24px 16px; text-align:center; color:#52525b; font-size:13px;">등록된 참가자가 없습니다.</p>`
    : roster.map(rosterRow).join('');
}

function showError(msg) {
  const el = document.getElementById('roster-error');
  el.textContent = msg;
  el.style.display = 'block';
}

export function init(goTo) {
  const nameInput = document.getElementById('roster-new-name');

  document.getElementById('roster-add-btn').addEventListener('click', async () => {
    try {
      await addRosterMember(nameInput.value);
      nameInput.value = '';
      document.getElementById('roster-error').style.display = 'none';
    } catch (e) { showError(e.message); }
  });
  nameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('roster-add-btn').click();
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
