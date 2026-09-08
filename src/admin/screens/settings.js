import { getGameSettings, createNewGame, adminSecretsAction } from '../../store.js';

const STATUS_LABEL = { scheduled: '예정', ongoing: '진행 중', ended: '종료' };
const fmtDate = d => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;

// 저장된 end는 "게임이 끝나는 순간"(마지막 날 자정 직후) = 경계값이라 하루 뒤 날짜다.
// 화면에는 실제 마지막 플레이 날(= end - 1일)을 보여줘야 "3주 = 21일"과 맞는다.
const fmtLastDay = end => {
  const d = new Date(end);
  d.setDate(d.getDate() - 1);
  return fmtDate(d);
};

// 시작일·기간(주) 입력값으로 종료 경계 계산 (아직 저장 전인 "신규 게임" 미리보기용)
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

    <p class="eyebrow" style="color:#3f3f46; margin-bottom:10px;">현재 게임</p>
    <div class="bezel" style="padding:18px; border-radius:20px; margin-bottom:20px;">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:10px;">
        <p id="cur-name-display" style="font-size:17px; font-weight:700; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">—</p>
        <span id="cur-status-badge" class="admin-badge" style="flex-shrink:0;">—</span>
      </div>
      <p id="cur-period" style="font-size:13px; color:#a1a1aa; line-height:1.6;">—</p>
    </div>

    <p class="eyebrow" style="color:#3f3f46; margin-bottom:10px;">신규 게임 생성</p>
    <div class="bezel" style="padding:18px; border-radius:20px; margin-bottom:12px;">
      <p style="font-size:12px; color:#fb7185; margin-bottom:14px;">⚠ 생성 시 현재 게이지·배정·번개·투표 기록과 참가자 명단까지 모두 삭제되고 복구할 수 없습니다. 새 시즌은 참가자가 이름을 직접 입력해 새로 모집됩니다.</p>
      <div class="admin-field">
        <label>게임명 <span style="color:#52525b; font-weight:400;">(선택 · 비우면 '섀도우 런')</span></label>
        <input class="input" id="new-name" placeholder="관리자 화면 제목에만 표시 — 비워도 됨" />
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
    <!-- 보안 — 팀·역할 은닉 상태와 참가 코드 관리 -->
    <div class="bezel" style="padding:16px 18px; border-radius:20px; margin-top:20px;">
      <p style="font-size:11px; color:#52525b; margin-bottom:10px; letter-spacing:.04em;">보안</p>
      <p id="sec-status" style="font-size:13px; line-height:1.6; color:#a1a1aa;">확인 중…</p>

      <button class="btn btn-primary" id="sec-migrate-btn" style="width:100%; height:46px; margin-top:12px; display:none;">
        팀·역할 숨기기 실행
      </button>

      <div id="sec-tools" style="display:none; margin-top:12px;">
        <div style="display:flex; gap:8px;">
          <button class="btn btn-secondary" id="sec-codes-btn" style="flex:1; height:40px; font-size:13px;">참가 코드 보기</button>
          <button class="btn btn-secondary" id="sec-require-btn" style="flex:1; height:40px; font-size:13px;">—</button>
        </div>
        <p style="font-size:11px; color:#52525b; margin-top:8px; line-height:1.5;">
          코드는 폰을 바꾸거나 캐시를 지운 참가자가 재입장할 때만 필요합니다.
          '코드 필수'를 켜면 처음 입장할 때도 코드를 요구합니다(다음 시즌 시작용).
        </p>
      </div>

      <div id="sec-codes" style="display:none; margin-top:12px; max-height:340px; overflow-y:auto;
        border:1px solid rgba(255,255,255,.07); border-radius:14px;"></div>
    </div>
  </div>
</div>`;
}

// ── 보안 섹션 ──────────────────────────────────────────
let secCodesOpen = false;

async function loadSecurity() {
  const statusEl = document.getElementById('sec-status');
  if (!statusEl) return;
  try {
    const s = await adminSecretsAction('status');
    const migrateBtn = document.getElementById('sec-migrate-btn');
    const tools = document.getElementById('sec-tools');

    if (s.publicHasSecrets || !s.migrated) {
      statusEl.innerHTML = `<span style="color:#fb7185; font-weight:700;">⚠️ 팀·역할이 공개 문서에 남아 있습니다.</span><br>
        지금은 주소만 알면 로그인 없이 전원의 정체를 볼 수 있어요. 아래 버튼을 눌러 서버 뒤로 옮기세요.`;
      migrateBtn.style.display = '';
      tools.style.display = s.migrated ? '' : 'none';
    } else {
      statusEl.innerHTML = `<span style="color:#34d399; font-weight:700;">✅ 팀·역할이 서버에만 있습니다.</span><br>
        참가자 ${s.playerCount}명 · 코드 발급 ${s.codeCount} · 기기 등록 ${s.boundCount}
        ${s.boundCount < s.playerCount ? `<br><span style="color:#71717a;">아직 ${s.playerCount - s.boundCount}명은 앱을 열지 않아 기기 등록 전입니다.</span>` : ''}`;
      migrateBtn.style.display = 'none';
      tools.style.display = '';
    }
    const reqBtn = document.getElementById('sec-require-btn');
    reqBtn.textContent = s.requireCode ? '코드 필수: 켜짐' : '코드 필수: 꺼짐';
    reqBtn.style.color = s.requireCode ? '#fbbf24' : '';
    reqBtn.dataset.on = s.requireCode ? '1' : '';
  } catch (e) {
    statusEl.textContent = `상태를 불러오지 못했습니다: ${e.message}`;
  }
}

async function renderCodes() {
  const box = document.getElementById('sec-codes');
  const data = await adminSecretsAction('list');
  box.innerHTML = (data.players || [])
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    .map(p => `
      <div class="admin-row" data-id="${p.id}" style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
        <span style="font-size:13px; font-weight:600;">${p.name}</span>
        <span style="display:flex; align-items:center; gap:8px;">
          <span class="num" style="font-size:14px; font-weight:700; letter-spacing:.14em; color:#e4e4e7;">${p.code ?? '—'}</span>
          <span style="font-size:10px; font-weight:700; padding:2px 7px; border-radius:99px;
            color:${p.bound ? '#34d399' : '#71717a'}; background:${p.bound ? 'rgba(52,211,153,.12)' : 'rgba(255,255,255,.04)'};
            border:1px solid ${p.bound ? 'rgba(52,211,153,.3)' : 'rgba(255,255,255,.08)'};">${p.bound ? '등록됨' : '대기'}</span>
          ${p.bound ? `<button class="btn btn-secondary sec-unbind" style="height:28px; padding:0 10px; font-size:11px;">해제</button>` : ''}
        </span>
      </div>`).join('');
}

function loadCurrent() {
  const gs = getGameSettings();
  document.getElementById('cur-name-display').textContent = gs.name;
  const badge = document.getElementById('cur-status-badge');
  badge.textContent = STATUS_LABEL[gs.status];
  badge.className = `admin-badge ${gs.status}`;
  const extra = gs.status === 'ongoing' ? ` · D-${gs.dday} · ${gs.week}주차`
    : gs.status === 'scheduled' ? ' · 시작 예정' : '';
  document.getElementById('cur-period').textContent =
    `${fmtDate(gs.start)} ~ ${fmtLastDay(gs.end)}  (${gs.weeks}주 · ${gs.weeks * 7}일)${extra}`;
}

function refreshNewRange() {
  const range = computeRange(
    document.getElementById('new-startDate').value,
    document.getElementById('new-weeks').value
  );
  document.getElementById('new-range').textContent =
    range ? `${fmtDate(range.start)} ~ ${fmtLastDay(range.end)} (${Number(document.getElementById('new-weeks').value) * 7}일)` : '';
}

export function init(goTo) {
  document.getElementById('new-startDate').addEventListener('input', refreshNewRange);
  document.getElementById('new-weeks').addEventListener('input', refreshNewRange);
  refreshNewRange();

  document.getElementById('new-create-btn').addEventListener('click', async () => {
    const name = document.getElementById('new-name').value.trim();
    const startDate = document.getElementById('new-startDate').value;
    const weeks = document.getElementById('new-weeks').value;
    if (!startDate || !weeks) { alert('시작일·기간을 입력하세요.'); return; }
    if (!confirm('현재 게임을 종료하고 새 게임을 생성할까요? 되돌릴 수 없습니다.')) return;
    const btn = document.getElementById('new-create-btn');
    btn.disabled = true;
    try {
      await createNewGame({ name, startDate, weeks });
      loadCurrent();
      goTo('dashboard');
    } catch (e) {
      alert(e.message);
      goTo('login');   // 대개 인증 만료 — 재로그인 후 다시 시도
    } finally { btn.disabled = false; }
  });

  document.getElementById('sec-migrate-btn').addEventListener('click', async () => {
    if (!confirm('팀·역할을 서버 전용 저장소로 옮기고 공개 문서에서 지웁니다.\n\n참가자는 아무것도 다시 입력할 필요가 없고, 게이지·마일리지·기록은 그대로입니다.\n진행할까요?')) return;
    const btn = document.getElementById('sec-migrate-btn');
    btn.disabled = true;
    btn.textContent = '옮기는 중…';
    try {
      const r = await adminSecretsAction('migrate');
      alert(`완료했습니다.\n\n참가자 ${r.playerCount}명의 팀·역할을 서버로 옮기고 참가 코드를 발급했습니다.\n\n마지막으로 Firebase 콘솔에서 보안 규칙을 적용해야 완전히 막힙니다.`);
      await loadSecurity();
    } catch (e) {
      alert(e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = '팀·역할 숨기기 실행';
    }
  });

  document.getElementById('sec-codes-btn').addEventListener('click', async () => {
    const box = document.getElementById('sec-codes');
    secCodesOpen = !secCodesOpen;
    document.getElementById('sec-codes-btn').textContent = secCodesOpen ? '코드 접기' : '참가 코드 보기';
    box.style.display = secCodesOpen ? '' : 'none';
    if (secCodesOpen) await renderCodes();
  });

  document.getElementById('sec-require-btn').addEventListener('click', async () => {
    const btn = document.getElementById('sec-require-btn');
    const turningOn = !btn.dataset.on;
    if (turningOn && !confirm('처음 입장할 때도 참가 코드를 요구합니다.\n\n아직 앱을 열지 않은 참가자는 코드를 받아야 입장할 수 있습니다.\n코드를 모두 전달한 뒤에 켜세요. 계속할까요?')) return;
    btn.disabled = true;
    try {
      await adminSecretsAction('setRequireCode', { value: turningOn });
      await loadSecurity();
    } catch (e) { alert(e.message); } finally { btn.disabled = false; }
  });

  // 기기 등록 해제 — 폰을 바꿨는데 코드도 잃어버린 참가자 구제용
  document.getElementById('sec-codes').addEventListener('click', async e => {
    const btn = e.target.closest('.sec-unbind');
    if (!btn) return;
    const id = btn.closest('[data-id]')?.dataset.id;
    if (!id || !confirm('이 참가자의 기기 등록을 해제할까요?\n다음에 입장하는 기기가 새로 등록됩니다.')) return;
    btn.disabled = true;
    try {
      await adminSecretsAction('resetBinding', { playerId: id });
      await renderCodes();
      await loadSecurity();
    } catch (err) { alert(err.message); btn.disabled = false; }
  });

  loadCurrent();
  // loadSecurity()는 여기서 부르지 않는다 — init은 로그인 전에도 실행돼 401만 남긴다.
  // 설정 화면에 실제로 들어올 때(onShow) 부른다.
}

// 대시보드 → 설정 화면 전환마다 최신 값 반영 (main.js goTo가 호출)
export function onShow() {
  loadCurrent();
  loadSecurity();
}
