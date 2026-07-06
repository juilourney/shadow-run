import { getGameSettings, updateGameSettings, createNewGame, getGameHistory } from '../../store.js';

const STATUS_LABEL = { scheduled: '예정', ongoing: '진행 중', ended: '종료' };
const fmt = n => n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function render() {
  return `
<div class="admin-screen" id="admin-settings">
  <div class="admin-shell">
    <div class="admin-header">
      <h2 style="font-size:22px; font-weight:700;">게임 기간 설정</h2>
      <button class="btn btn-secondary" id="settings-back-btn" style="height:40px; padding:0 16px;">← 대시보드</button>
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
      <p style="font-size:12px; color:#fb7185; margin-bottom:14px;">⚠ 생성 시 현재 게이지·번개·투표 기록이 초기화되고, 현재 게임은 히스토리로 보관됩니다.</p>
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
      <p style="font-size:11px; color:#52525b; margin-bottom:14px;">투표 요일 설정은 추후 지원 예정입니다 (현재 월·목 18:00~22:00 고정).</p>
      <button class="btn btn-secondary" id="new-create-btn" style="width:100%; height:48px;">신규 게임 생성</button>
    </div>

    <p class="eyebrow" style="color:#3f3f46; margin-bottom:10px;">게임 히스토리</p>
    <div class="bezel" style="border-radius:20px; overflow:hidden;" id="game-history-body"></div>
  </div>
</div>`;
}

function historyBody() {
  const history = getGameHistory();
  if (history.length === 0) return `<p style="padding:24px 16px; text-align:center; color:#52525b; font-size:13px;">지난 게임이 없습니다.</p>`;
  const TEAM_LABEL = { pacer: '페이서', ghost: '고스트', null: '무승부' };
  return history.map(h => `
    <div class="admin-row" style="align-items:flex-start; flex-direction:column; gap:4px;">
      <div style="display:flex; justify-content:space-between; width:100%;">
        <span style="font-size:14px; font-weight:600;">${h.name}</span>
        <span style="font-size:12px; color:#71717a;">우승: ${TEAM_LABEL[h.winner]}</span>
      </div>
      <p style="font-size:12px; color:#71717a;">${h.startDate} · ${h.weeks}주 · 참가 ${h.participantCount}명 · 최종 페이서 ${fmt(h.finalGauge.pacer)}km / 고스트 ${fmt(h.finalGauge.ghost)}km</p>
    </div>`).join('');
}

function loadCurrent() {
  const gs = getGameSettings();
  document.getElementById('cur-name').value = gs.name;
  document.getElementById('cur-startDate').value = gs.startDate;
  document.getElementById('cur-weeks').value = gs.weeks;
  document.getElementById('cur-status').textContent = `상태: ${STATUS_LABEL[gs.status]}`;
  document.getElementById('game-history-body').innerHTML = historyBody();
}

export function init(goTo) {
  document.getElementById('settings-back-btn').addEventListener('click', () => goTo('dashboard'));

  document.getElementById('cur-save-btn').addEventListener('click', async () => {
    await updateGameSettings({
      name: document.getElementById('cur-name').value.trim(),
      startDate: document.getElementById('cur-startDate').value,
      weeks: document.getElementById('cur-weeks').value,
    });
    loadCurrent();
  });

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
