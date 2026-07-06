import { goToScreen } from '../utils/nav.js';
import { subscribe, getPlayers, getMe, getVote, castVote as storeCastVote, tallyVote, getCalendar, ROLES } from '../store.js';

const TEAM_META = {
  pacer: { label: '페이서', color: '#38bdf8', bg: 'rgba(56,189,248,.1)',  border: 'rgba(56,189,248,.25)' },
  ghost: { label: '고스트', color: '#a78bfa', bg: 'rgba(167,139,250,.1)', border: 'rgba(167,139,250,.25)' },
};

// 역할 지목 후보 (기권 기본 + 5개 특수역할)
const ROLE_GUESS = [
  { key: '',          label: '기권' },
  { key: 'elite',     label: '엘리트' },
  { key: 'double',    label: '더블' },
  { key: 'detective', label: '탐정' },
  { key: 'spy',       label: '밀정' },
  { key: 'anchor',    label: '앵커' },
];

// 투표 기간 체크 — 게임 기간 안 & 월(1)·목(4) 18:00~22:00
function getVoteStatus() {
  const now = new Date();
  const day  = now.getDay();   // 0=일 1=월 … 4=목
  const hour = now.getHours();
  const cal = getCalendar(now);
  const inGame = cal.started && !cal.ended;   // 게임 종료 후에는 투표 비활성
  const isVotingNow = inGame && (day === 1 || day === 4) && hour >= 18 && hour < 22;

  // 다음 투표 일시 계산
  const VOTING_DAYS = [1, 4];
  const DAY_NAMES   = ['일', '월', '화', '수', '목', '금', '토'];
  let minDiff = Infinity;
  let nextDate = null;

  for (const vd of VOTING_DAYS) {
    let diff = vd - day;
    if (diff < 0) diff += 7;
    // 같은 요일이지만 이미 18시 이후면 다음 주로
    if (diff === 0 && hour >= 18) diff = 7;
    if (diff < minDiff) { minDiff = diff; nextDate = new Date(now); }
  }
  nextDate.setDate(now.getDate() + minDiff);
  nextDate.setHours(18, 0, 0, 0);

  const m  = nextDate.getMonth() + 1;
  const d  = nextDate.getDate();
  const dn = DAY_NAMES[nextDate.getDay()];
  const nextLabel = `${m}월 ${d}일 (${dn})  18:00 ~ 22:00`;

  // 현재 진행 중이면 종료 시각(오늘 22:00)도 함께 계산
  const closeDate = new Date(now);
  closeDate.setHours(22, 0, 0, 0);

  return { isVotingNow, nextLabel, closeDate };
}

export function render() {
  const { nextLabel, isVotingNow } = getVoteStatus();
  const v = getVote();
  const me = getMe();
  const playerRows = getPlayers({ excludeSelf: true }).map((p, i) => `
    <div class="bezel anim-up-${Math.min(i + 1, 4)}" id="player-row-${p.id}"
      style="padding:14px 16px; border-radius:20px; display:flex; align-items:center; gap:12px;">
      <span style="width:36px;height:36px;border-radius:50%;background:#3f3f46;
        display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0">
        ${p.name[0]}
      </span>
      <div style="flex:1; min-width:0">
        <p style="font-size:15px; font-weight:600">${p.name}</p>
        <p class="num" style="font-size:11px; color:#52525b; margin-top:2px">${p.km.toFixed(1)} km</p>
      </div>
      <button class="vote-btn" data-id="${p.id}" data-name="${p.name}"
        style="background:rgba(251,113,133,.12); border:1px solid rgba(251,113,133,.3);
          color:#fb7185; border-radius:12px; padding:0 14px; height:34px;
          font-size:13px; font-weight:700; cursor:pointer; white-space:nowrap;
          transition:all .3s var(--spring);">
        지목하기
      </button>
    </div>
  `).join('');

  return `
<div class="game-section" id="gs-vote">
  <!-- 투표 컨텐츠 -->
  <div class="scroll-body" style="padding:calc(var(--safe-top) + 12px) 18px 40px">

    <!-- 상단 정보 카드 -->
    <div class="anim-up" style="padding-top:4px; margin-bottom:16px">
      <h2 style="font-size:22px; font-weight:700; letter-spacing:-.02em">투표</h2>
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px;">
      <!-- 투표권 -->
      <div class="bezel anim-up-1" style="padding:14px 16px; border-radius:20px; text-align:center;">
        <p style="font-size:11px; color:#52525b; margin-bottom:6px; font-weight:600; letter-spacing:.06em">보유 투표권</p>
        <p class="num" id="votes-remaining"
          style="font-size:32px; font-weight:800; color:#fb7185; line-height:1;">${v.left}</p>
        <p style="font-size:11px; color:#52525b; margin-top:4px">${ROLES[me.role]?.name ?? ''}</p>
      </div>
      <!-- 타이머 -->
      <div class="bezel anim-up-1" style="padding:14px 16px; border-radius:20px; text-align:center;">
        <p style="font-size:11px; color:#52525b; margin-bottom:6px; font-weight:600; letter-spacing:.06em">종료까지</p>
        <p class="num" id="vote-timer" style="font-size:22px; font-weight:800; color:#fb7185; line-height:1;">01:20:45</p>
        <p style="font-size:11px; color:#52525b; margin-top:4px;">남음</p>
      </div>
    </div>

    <div class="bezel" style="border-radius:16px; padding:14px 16px; margin-bottom:14px;">
      <p style="font-size:13px; color:#a1a1aa; line-height:1.6;">
        의심스러운 참가자 1명을 지목하세요.
      </p>
    </div>

    <p style="font-size:11px; color:#52525b; margin-bottom:10px; font-weight:600; letter-spacing:.08em; text-transform:uppercase;">
      참가자 중 지목하기
    </p>

    <div style="display:flex; flex-direction:column; gap:8px;" id="player-list">
      ${playerRows}
    </div>

    <!-- 완료 메시지 (초기 숨김) -->
    <div id="vote-done-msg" style="display:none; margin-top:20px; padding:16px 18px;
      background:rgba(251,113,133,.08); border:1px solid rgba(251,113,133,.2);
      border-radius:18px; text-align:center;">
      <p style="font-size:15px; font-weight:700; color:#fb7185;">🗳️ 투표를 모두 사용했습니다</p>
      <p style="font-size:12px; color:#52525b; margin-top:6px;">결과는 투표 종료 후 공개됩니다</p>
    </div>

  </div>

  <!-- ① 비활성 오버레이 (투표 기간 외) — z-index는 .screen(인트로 오버레이, 40)보다 반드시 낮아야
       인트로 화면이 위에 정상적으로 덮인다(같으면 DOM 순서로 게임 레이어가 이겨버림) -->
  <div id="vote-inactive-overlay"
    style="position:absolute; inset:0; z-index:20;
      background:rgba(5,5,5,.82); backdrop-filter:blur(8px);
      display:${isVotingNow ? 'none' : 'flex'}; flex-direction:column; align-items:center; justify-content:center;
      padding:32px; text-align:center;">
    <div style="font-size:40px; margin-bottom:16px;">🗳️</div>
    <p style="font-size:22px; font-weight:800; letter-spacing:-.02em; margin-bottom:8px;">투표 기간이 아닙니다</p>
    <p style="font-size:13px; color:#52525b; line-height:1.7; margin-bottom:28px;">
      다음 투표<br/>
      <span style="color:#a1a1aa; font-weight:600;">${nextLabel}</span>
    </p>
  </div>

  <!-- ② 결과 오버레이 (투표 종료 후) -->
  <div id="vote-result-overlay"
    style="position:absolute; inset:0; z-index:50;
      background:rgba(5,5,5,.88); backdrop-filter:blur(10px);
      display:none; flex-direction:column; align-items:center; justify-content:center;
      padding:32px; text-align:center;">

    <p style="font-size:11px; color:#52525b; letter-spacing:.14em; text-transform:uppercase; font-weight:700; margin-bottom:8px;">투표 결과</p>
    <p id="vote-result-subtitle" style="font-size:13px; color:#a1a1aa; margin-bottom:20px;">이번 투표의 최다 득표자</p>

    <!-- 적발된 인물 목록 (동점 시 여러 명) -->
    <div id="vote-result-list" style="width:100%; max-height:56vh; overflow-y:auto;
      display:flex; flex-direction:column; gap:14px;"></div>

    <button id="vote-result-close"
      class="btn btn-secondary" style="width:100%; height:52px; margin-top:20px;">
      확인
    </button>
  </div>

</div>

<!-- ═══ 투표 지목 · 전체화면 플로우 (중요 이벤트라 무게감 있게) ═══ -->
<div class="screen" id="s-vote-cast" style="overflow:hidden;">

  <!-- 헤더 -->
  <div style="padding:calc(var(--safe-top) + 12px) 20px 6px; display:flex; align-items:center; gap:14px;">
    <button id="vc-back" class="btn btn-secondary" style="height:36px; padding:0 12px; font-size:16px; border-radius:10px;">←</button>
    <div style="flex:1;">
      <p id="vc-header-label" style="font-size:11px; color:#52525b; letter-spacing:.14em; text-transform:uppercase; font-weight:700;">투표 · 지목</p>
      <div id="vc-steps" style="display:flex; gap:6px; margin-top:7px;">
        <span class="vc-dot" style="width:26px; height:3px; border-radius:2px; background:rgba(255,255,255,.12); transition:background .3s;"></span>
        <span class="vc-dot" style="width:26px; height:3px; border-radius:2px; background:rgba(255,255,255,.12); transition:background .3s;"></span>
        <span class="vc-dot" style="width:26px; height:3px; border-radius:2px; background:rgba(255,255,255,.12); transition:background .3s;"></span>
      </div>
    </div>
  </div>

  <div class="scroll-body" style="padding:8px 24px 0; display:flex; flex-direction:column;">

    <!-- STEP 1 · 인물 지목 -->
    <div id="vc-step-1" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:16px;">
      <p style="font-size:11px; color:#fb7185; letter-spacing:.12em; text-transform:uppercase; font-weight:700;">1 · 인물 지목</p>
      <div id="vc-avatar" style="width:92px; height:92px; border-radius:50%; background:#3f3f46;
        display:flex; align-items:center; justify-content:center; font-size:36px;
        border:2px solid rgba(251,113,133,.4); box-shadow:0 0 44px -10px rgba(251,113,133,.5);"></div>
      <h2 style="font-size:26px; font-weight:800; letter-spacing:-.02em;"><span id="vc-name-1"></span>님</h2>
      <p style="font-size:14px; color:#71717a; line-height:1.75; max-width:280px;">
        이 참가자를 지목합니다.<br/>가장 많이 지목되면 팀이 공개되고<br/>마일리지가 영구적으로 50% 감소합니다.</p>
    </div>

    <!-- STEP 2 · 역할 지목 -->
    <div id="vc-step-2" style="display:none; flex:1; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:14px;">
      <p style="font-size:11px; color:#fb7185; letter-spacing:.12em; text-transform:uppercase; font-weight:700;">2 · 역할 지목 · 선택</p>
      <h2 style="font-size:22px; font-weight:700;"><span id="vc-name-2"></span>님의 역할은?</h2>
      <p style="font-size:13px; color:#52525b;">확신이 있을 때만 · 애매하면 기권</p>
      <div id="role-guess-options" style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; width:100%; max-width:300px; margin-top:6px;"></div>
    </div>

    <!-- STEP 3 · 최종 확인 -->
    <div id="vc-step-3" style="display:none; flex:1; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:18px;">
      <p style="font-size:11px; color:#fb7185; letter-spacing:.12em; text-transform:uppercase; font-weight:700;">3 · 최종 확인</p>
      <div style="width:100%; max-width:320px; background:rgba(251,113,133,.06);
        border:1px solid rgba(251,113,133,.2); border-radius:20px; padding:20px; text-align:left;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
          <span style="font-size:13px; color:#52525b;">지목 인물</span>
          <span id="vc-sum-name" style="font-size:16px; font-weight:800;"></span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:13px; color:#52525b;">역할 지목</span>
          <span id="vc-sum-role" style="font-size:16px; font-weight:700; color:#fb7185;"></span>
        </div>
      </div>
      <p style="font-size:13px; color:#fb7185; line-height:1.6;">⚠️ 이 결정은 되돌릴 수 없습니다.</p>
    </div>

  </div>

  <!-- 푸터 -->
  <div style="padding:12px 24px calc(var(--safe-bottom) + 16px);">
    <button id="vc-primary" class="btn" style="width:100%; height:56px; font-size:16px;
      background:linear-gradient(135deg,#fb7185,#e11d48); color:#fff;
      box-shadow:0 8px 24px -6px rgba(251,113,133,.4);">다음</button>
  </div>
</div>`;
}

export function init() {
  // 실제 투표 기간(월·목 18~22시) 기준 타이머 — 활성/비활성 전환과 종료 시 자동 집계도 여기서 처리
  const timerEl = document.getElementById('vote-timer');
  const inactiveOverlay = document.getElementById('vote-inactive-overlay');
  let wasVotingNow = getVoteStatus().isVotingNow;
  let tallying = false;

  function tick() {
    const status = getVoteStatus();
    inactiveOverlay.style.display = status.isVotingNow ? 'none' : 'flex';

    if (status.isVotingNow) {
      const diff = Math.max(0, status.closeDate - new Date());
      const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
      timerEl.textContent = `${h}:${m}:${s}`;
    }

    // 투표 기간이 방금 종료됨 — 자동 집계 (getBolts의 만료 스윕과 같은 lazy 패턴)
    if (wasVotingNow && !status.isVotingNow && !tallying) {
      tallying = true;
      tallyVote().then(result => {
        if (result) {
          showVoteResult(result);
          document.getElementById('vote-result-overlay').style.display = 'flex';
        }
      }).catch(err => console.warn('투표 자동 집계 실패:', err.message)).finally(() => { tallying = false; });
    }
    wasVotingNow = status.isVotingNow;
  }
  tick();
  setInterval(tick, 1000);

  // 투표 상태는 store가 보유
  let pendingPlayerId = null;
  let pendingPlayerName = null;
  let pendingRole = '';   // 역할 지목 (기본 기권)

  // 역할 지목 칩 렌더 + 선택
  const roleWrap = document.getElementById('role-guess-options');
  roleWrap.innerHTML = ROLE_GUESS.map(r => `
    <button class="role-opt" data-role="${r.key}"
      style="width:100%; height:44px; border-radius:12px; font-size:14px; font-weight:600;
        cursor:pointer; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08);
        color:#a1a1aa;">${r.label}</button>`).join('');
  const paintRoleOpts = () => {
    roleWrap.querySelectorAll('.role-opt').forEach(b => {
      const on = b.dataset.role === pendingRole;
      b.style.background  = on ? 'rgba(251,113,133,.15)' : 'rgba(255,255,255,.04)';
      b.style.borderColor = on ? 'rgba(251,113,133,.4)'  : 'rgba(255,255,255,.08)';
      b.style.color       = on ? '#fb7185' : '#a1a1aa';
    });
  };
  roleWrap.querySelectorAll('.role-opt').forEach(b => {
    b.addEventListener('click', () => { pendingRole = b.dataset.role; paintRoleOpts(); });
  });

  // ── 전체화면 지목 플로우 (인물 → 역할 → 최종 확인) ──────────
  let currentStep = 1;
  const primary = document.getElementById('vc-primary');

  const showStep = (n) => {
    currentStep = n;
    [1, 2, 3].forEach(i =>
      document.getElementById(`vc-step-${i}`).style.display = i === n ? 'flex' : 'none');
    document.querySelectorAll('#vc-steps .vc-dot').forEach((d, i) =>
      d.style.background = i < n ? '#fb7185' : 'rgba(255,255,255,.12)');
    primary.textContent = n < 3 ? '다음' : '지목 확정';
    document.getElementById('vc-back').textContent = n === 1 ? '←' : '뒤로';
    if (n === 3) {
      document.getElementById('vc-sum-name').textContent = `${pendingPlayerName}님`;
      document.getElementById('vc-sum-role').textContent =
        pendingRole ? ROLES[pendingRole].name : '기권';
      lockPrimaryBriefly();  // 되돌릴 수 없는 확정 — 오탭 방지
    }
  };

  // 리스트 지목 버튼 → 전체화면 플로우 시작
  document.querySelectorAll('.vote-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const v = getVote();
      if (v.left <= 0) return;
      pendingPlayerId   = btn.dataset.id;
      pendingPlayerName = btn.dataset.name;
      pendingRole       = '';
      paintRoleOpts();
      document.getElementById('vc-avatar').textContent = pendingPlayerName[0];
      document.getElementById('vc-name-1').textContent = pendingPlayerName;
      document.getElementById('vc-name-2').textContent = pendingPlayerName;
      // 더블(2표)이면 회차 표시 — 투표 과정을 두 번 반복
      document.getElementById('vc-header-label').textContent =
        v.total > 1 ? `투표 · ${v.total - v.left + 1}번째 지목 (총 ${v.total}회)` : '투표 · 지목';
      showStep(1);
      goToScreen('s-vote-cast');
    });
  });

  // 다음 / 지목 확정
  primary.addEventListener('click', () => {
    if (currentStep < 3) { showStep(currentStep + 1); return; }
    const role = pendingRole;
    goToScreen('gs-vote');
    setTimeout(() => castVote(pendingPlayerId, pendingPlayerName, role), 320);
  });

  // 뒤로 / 취소
  document.getElementById('vc-back').addEventListener('click', () => {
    if (currentStep === 1) goToScreen('gs-vote');
    else showStep(currentStep - 1);
  });

  // 결과 오버레이 닫기
  document.getElementById('vote-result-close').addEventListener('click', () => {
    document.getElementById('vote-result-overlay').style.display = 'none';
  });

}

async function castVote(playerId, playerName, roleGuess) {
  const v = await storeCastVote(playerId, roleGuess);
  document.getElementById('votes-remaining').textContent = v.left;

  // 지목된 행 하이라이트 + 지목 횟수 배지
  const cnt = v.castCount[playerId] || 0;
  const row = document.getElementById(`player-row-${playerId}`);
  if (row) {
    row.style.background = 'rgba(251,113,133,.08)';
    row.style.border = '1px solid rgba(251,113,133,.25)';
    const btn = row.querySelector('.vote-btn');
    if (btn && v.left > 0) {
      btn.textContent = cnt > 1 ? `지목됨 ×${cnt}` : '지목됨';
    }
  }

  if (v.left <= 0) {
    // 모든 버튼 비활성화
    document.querySelectorAll('.vote-btn').forEach(b => {
      const pid = b.dataset.id;
      b.style.background = 'rgba(255,255,255,.03)';
      b.style.borderColor = 'rgba(255,255,255,.06)';
      b.style.color = '#3f3f46';
      b.style.pointerEvents = 'none';
      const c = v.castCount[pid] || 0;
      b.textContent = c > 1 ? `지목됨 ×${c}` : c === 1 ? '지목됨' : '마감';
    });
    document.getElementById('vote-done-msg').style.display = 'block';
  } else if (v.total > 1) {
    // 더블 — 표가 남았으면 한 번 더 지목하도록 안내
    showTooltip(`한 표 남았어요 · 한 번 더 지목하세요 (${v.total - v.left}/${v.total})`);
  }
}

// 집계 결과로 결과 오버레이 채우기
function showVoteResult(r) {
  const caught = r.caught ?? [r];   // 하위호환 (단일 객체도 허용)
  document.getElementById('vote-result-subtitle').textContent =
    caught.length > 1 ? `최다 득표 동점 · ${caught.length}명 적발` : '이번 투표의 최다 득표자';
  document.getElementById('vote-result-list').innerHTML = caught.map(personCard).join('');
}

function personCard(c) {
  const caughtOk = c.teamCaught !== false;   // 하위호환: 필드 없으면 기존(적발) 취급
  const t = caughtOk ? TEAM_META[c.team] : null;
  const teamContent = caughtOk
    ? `<span style="font-size:12px; font-weight:700; border-radius:8px; padding:3px 12px; white-space:nowrap;
        color:${t.color}; background:${t.bg}; border:1px solid ${t.border};">${t.label}</span>
      <span style="font-size:12px; color:#fb7185; margin-left:10px;">마일리지 −50%</span>`
    : `<span style="font-size:14px; margin-right:8px;">❌</span>
      <p style="font-size:13px; color:#e4e4e7; line-height:1.5;">적발 실패 — 정체는 공개되지 않습니다</p>`;
  return `
  <div style="background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.08);
    border-radius:18px; padding:16px 18px; text-align:left;">
    <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
      <div style="width:44px;height:44px;border-radius:50%;background:#3f3f46;flex-shrink:0;
        display:flex;align-items:center;justify-content:center;font-size:16px;
        border:2px solid rgba(251,113,133,.4);">${c.name[0]}</div>
      <p style="font-size:19px; font-weight:800; letter-spacing:-.02em;">${c.name}</p>
    </div>
    <div style="border-top:1px solid rgba(255,255,255,.06); padding-top:10px;">
      ${resultRow('팀', teamContent)}
      ${resultRow('역할', roleContent(c))}
    </div>
  </div>`;
}

function resultRow(label, content) {
  return `
  <div style="display:flex; align-items:center; gap:12px; padding:6px 0;">
    <span style="width:34px; flex-shrink:0; font-size:11px; font-weight:700; color:#52525b; letter-spacing:.04em;">${label}</span>
    <div style="flex:1; min-width:0; display:flex; align-items:center;">${content}</div>
  </div>`;
}

// 역할: 맞음(공개·박탈) / 틀림(보존) / 미합의(보존)
function roleContent(c) {
  if (c.roleRevealed) {
    return `<span style="font-size:14px; margin-right:8px;">✅</span>
      <p style="font-size:13px; color:#e4e4e7; line-height:1.5;"><b style="color:#34d399;">${ROLES[c.revealedRole]?.name ?? '역할'}</b> 적중 · 공개 + 능력 <b style="color:#34d399;">박탈</b></p>`;
  }
  if (c.guessFailed) {
    // 지목한 역할명·능력 언급 없음 — 역할 후보 제거/특수역할 보유 여부의 단서가 되므로
    return `<span style="font-size:14px; margin-right:8px;">❌</span>
      <p style="font-size:13px; color:#e4e4e7; line-height:1.5;">추리 실패</p>`;
  }
  return `<span style="font-size:14px; margin-right:8px;">▫️</span>
    <p style="font-size:13px; color:#71717a; line-height:1.5;">미공개</p>`;
}

let _okUnlockTimer = null;

// 되돌릴 수 없는 확정 — '지목 확정'이 나타난 직후 잠깐 잠가 오탭 방지
function lockPrimaryBriefly() {
  const btn = document.getElementById('vc-primary');
  btn.style.pointerEvents = 'none';
  btn.style.opacity       = '.45';
  clearTimeout(_okUnlockTimer);
  _okUnlockTimer = setTimeout(() => {
    btn.style.pointerEvents = '';
    btn.style.opacity       = '';
  }, 450);
}

function showTooltip(msg) {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = `
    position:absolute; bottom:20px; left:18px; right:18px;
    background:#1c1c1e; border:1px solid rgba(251,113,133,.25); border-radius:14px;
    padding:14px 16px; font-size:13px; color:#fb7185; text-align:center;
    z-index:35; animation:fadeUp .3s var(--spring);
  `;
  document.getElementById('s-vote').appendChild(t);
  setTimeout(() => t.remove(), 3000);
}
