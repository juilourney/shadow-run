import { getGameSettings, updateGameSettings, createNewGame } from '../../store.js';

const STATUS_LABEL = { scheduled: '예정', ongoing: '진행 중', ended: '종료' };
const fmtDate = d => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;

// 시작일·기간(주) 입력값으로 종료일 계산 (아직 저장 전인 "신규 게임" 미리보기용)
function computeRange(startDateStr, weeks) {
  if (!startDateStr || !weeks) return null;
  const [y, m, d] = startDateStr.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(start);
  end.setDate(start.getDate() + Number(weeks) * 7);
  return { start, end };
}

export function render() {
  return `
<div class="admin-screen" id="admin-settings">
  <div class="admin-shell">
    <div class="admin-header">
      <h2 style="font-size:22px; font-weight:700;">게임 기간 설정</h2>
    </div>

    <p class="eyebrow" style="color:#3f3f46; margin-bottom:10px;">현재 게임 관리</p>
    <div class="bezel" style="padding:18px; border-radius:20px; margin-bottom:12px;">
      <div class="admin-field">
        <label>게임명</label>
        <input class="input" id="cur-name" />
      </div>
      <div class="admin-field">
        <label>시작일</label>
        <input class="input" type="date" id="cur-startDate" />
      </div>
      <div class="admin-field">
        <label>기간(주)</label>
        <input class="input" type="number" min="1" id="cur-weeks" />
      </div>
      <p id="cur-status" style="font-size:12px; color:#71717a; margin-bottom:12px;"></p>
      <button class="btn btn-primary" id="cur-save-btn" style="width:100%; height:48px;">현재 게임 수정 저장</button>
    </div>

    <p class="eyebrow" style="color:#3f3f46; margin-bottom:10px;">신규 게임 생성</p>
    <div class="bezel" style="padding:18px; border-radius:20px; margin-bottom:12px;">
      <p style="font-size:12px; color:#fb7185; margin-bottom:14px;">⚠ 생성 시 현재 게이지·배정·번개·투표 기록과 참가자 명단까지 모두 삭제되고 복구할 수 없습니다. 새 시즌은 참가자가 이름을 직접 입력해 새로 모집됩니다.</p>
      <div class="admin-field">
        <label>게임명</label>
        <input class="input" id="new-name" placeholder="예: 2026년 7월 섀도우런 Vol.2" />
      </div>
      <div class="admin-field">
        <label>시작일</label>
        <input class="input" type="date" id="new-startDate" />
      </div>
      <div class="admin-field">
        <label>기간(주)</label>
        <input class="input" type="number" min="1" id="new-weeks" value="3" />
      </div>
      <p id="new-range" style="font-size:12px; color:#a1a1aa; margin-bottom:8px;"></p>
      <p style="font-size:11px; color:#52525b; margin-bottom:14px;">투표 요일 설정은 추후 지원 예정입니다 (현재 월·목 18:00~22:00 고정).</p>
      <button class="btn btn-secondary" id="new-create-btn" style="width:100%; height:48px;">신규 게임 생성</button>
    </div>
  </div>
</div>`;
}

function loadCurrent() {
  const gs = getGameSettings();
  document.getElementById('cur-name').value = gs.name;
  document.getElementById('cur-startDate').value = gs.startDate;
  document.getElementById('cur-weeks').value = gs.weeks;
  document.getElementById('cur-status').textContent =
    `${fmtDate(gs.start)} ~ ${fmtDate(gs.end)} (${gs.weeks}주) · 상태: ${STATUS_LABEL[gs.status]}`;
}

function refreshNewRange() {
  const range = computeRange(
    document.getElementById('new-startDate').value,
    document.getElementById('new-weeks').value
  );
  document.getElementById('new-range').textContent =
    range ? `${fmtDate(range.start)} ~ ${fmtDate(range.end)}` : '';
}

export function init(goTo) {
  document.getElementById('cur-save-btn').addEventListener('click', async () => {
    await updateGameSettings({
      name: document.getElementById('cur-name').value.trim(),
      startDate: document.getElementById('cur-startDate').value,
      weeks: document.getElementById('cur-weeks').value,
    });
    loadCurrent();
  });

  document.getElementById('new-startDate').addEventListener('input', refreshNewRange);
  document.getElementById('new-weeks').addEventListener('input', refreshNewRange);
  refreshNewRange();

  document.getElementById('new-create-btn').addEventListener('click', async () => {
    const name = document.getElementById('new-name').value.trim();
    const startDate = document.getElementById('new-startDate').value;
    const weeks = document.getElementById('new-weeks').value;
    if (!name || !startDate || !weeks) { alert('게임명·시작일·기간을 모두 입력하세요.'); return; }
    if (!confirm('현재 게임을 종료하고 새 게임을 생성할까요? 되돌릴 수 없습니다.')) return;
    await createNewGame({ name, startDate, weeks });
    loadCurrent();
    goTo('dashboard');
  });

  loadCurrent();
}

// 대시보드 → 설정 화면 전환마다 최신 값 반영 (main.js goTo가 호출)
export function onShow() {
  loadCurrent();
}
