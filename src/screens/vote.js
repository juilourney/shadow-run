import { goToScreen } from '../utils/nav.js';

// 투표 기간 체크 — 월(1), 목(4) 18:00~22:00
function getVoteStatus() {
  const now = new Date();
  const day  = now.getDay();   // 0=일 1=월 … 4=목
  const hour = now.getHours();
  const isVotingNow = (day === 1 || day === 4) && hour >= 18 && hour < 22;

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

  return { isVotingNow, nextLabel };
}

// 프로토타입 상태 — 실제 앱에서는 Firebase + 서버 시간으로 판단
const MY_ROLE = 'double'; // 'runner' | 'double'
const TOTAL_VOTES = MY_ROLE === 'double' ? 2 : 1;

const PLAYERS = [
  { id: 'p1', name: '김민수', km: 42.3 },
  { id: 'p2', name: '박현우', km: 38.7 },
  { id: 'p3', name: '이서연', km: 51.2 },
  { id: 'p4', name: '최준호', km: 29.8 },
  { id: 'p5', name: '정윤아', km: 44.1 },
];

// 결과 시뮬레이션용 (최다 득표자)
const RESULT = {
  name: '이서연',
  team: '페이서',
  teamColor: '#38bdf8',
  isElite: false,
};

export function render() {
  const { nextLabel } = getVoteStatus();
  const playerRows = PLAYERS.map((p, i) => `
    <div class="bezel anim-up-${Math.min(i + 1, 4)}" id="player-row-${p.id}"
      style="padding:14px 16px; border-radius:20px; display:flex; align-items:center; gap:12px;">
      <span style="width:36px;height:36px;border-radius:50%;background:#3f3f46;
        display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0">
        ${p.name[0]}
      </span>
      <div style="flex:1; min-width:0">
        <p style="font-size:15px; font-weight:600">${p.name}</p>
        <p class="num" style="font-size:11px; color:#52525b; margin-top:2px">${p.km} km</p>
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
<div class="screen" id="s-vote">
  <!-- 투표 컨텐츠 -->
  <div class="scroll-body" style="padding:calc(var(--safe-top) + 12px) 18px calc(var(--safe-bottom) + 24px)">

    <!-- 상단 정보 카드 -->
    <div class="anim-up" style="padding-top:4px; margin-bottom:16px">
      <h2 style="font-size:22px; font-weight:700; letter-spacing:-.02em">투표</h2>
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px;">
      <!-- 투표권 -->
      <div class="bezel anim-up-1" style="padding:14px 16px; border-radius:20px; text-align:center;">
        <p style="font-size:11px; color:#52525b; margin-bottom:6px; font-weight:600; letter-spacing:.06em">보유 투표권</p>
        <p class="num" id="votes-remaining"
          style="font-size:32px; font-weight:800; color:#fb7185; line-height:1;">${TOTAL_VOTES}</p>
        <p style="font-size:11px; color:#52525b; margin-top:4px">${MY_ROLE === 'double' ? '더블 역할' : '러너'}</p>
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
        상대 팀으로 의심되는 사람을 지목하세요. 최다 득표자는 팀 소속이 공개되고 마일리지가 50% 감소합니다.
      </p>
    </div>

    <p style="font-size:11px; color:#52525b; margin-bottom:10px; font-weight:600; letter-spacing:.08em; text-transform:uppercase;">
      상대 팀을 찾아 지목하기
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

    <!-- 투표 종료 시뮬레이션 버튼 -->
    <button id="sim-result-btn" style="display:none; width:100%; margin-top:16px; height:44px;
      border-radius:14px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08);
      color:#52525b; font-size:13px; cursor:pointer;">
      투표 종료 시뮬레이션
    </button>
  </div>

  <!-- ① 비활성 오버레이 (투표 기간 외) -->
  <div id="vote-inactive-overlay"
    style="position:absolute; inset:0; z-index:40;
      background:rgba(5,5,5,.82); backdrop-filter:blur(8px);
      display:flex; flex-direction:column; align-items:center; justify-content:center;
      padding:32px; text-align:center;">
    <div style="font-size:40px; margin-bottom:16px;">🗳️</div>
    <p style="font-size:22px; font-weight:800; letter-spacing:-.02em; margin-bottom:8px;">투표 기간이 아닙니다</p>
    <p style="font-size:13px; color:#52525b; line-height:1.7; margin-bottom:28px;">
      다음 투표<br/>
      <span style="color:#a1a1aa; font-weight:600;">${nextLabel}</span>
    </p>
    <!-- 시뮬레이션 전환 -->
    <button id="sim-activate-vote"
      style="background:rgba(251,113,133,.1); border:1px solid rgba(251,113,133,.25);
        color:#fb7185; border-radius:14px; padding:0 20px; height:42px;
        font-size:13px; font-weight:700; cursor:pointer;">
      투표 활성화 (시뮬레이션)
    </button>
  </div>

  <!-- ② 결과 오버레이 (투표 종료 후) -->
  <div id="vote-result-overlay"
    style="position:absolute; inset:0; z-index:50;
      background:rgba(5,5,5,.88); backdrop-filter:blur(10px);
      display:none; flex-direction:column; align-items:center; justify-content:center;
      padding:32px; text-align:center;">

    <p style="font-size:11px; color:#52525b; letter-spacing:.14em; text-transform:uppercase; font-weight:700; margin-bottom:8px;">투표 결과</p>
    <p style="font-size:13px; color:#a1a1aa; margin-bottom:20px;">이번 투표의 최다 득표자</p>

    <!-- 지목된 인물 -->
    <div style="width:72px;height:72px;border-radius:50%;background:#3f3f46;
      display:flex;align-items:center;justify-content:center;font-size:26px;margin-bottom:12px;
      border:2px solid rgba(251,113,133,.4); box-shadow:0 0 32px -8px rgba(251,113,133,.4);">
      이
    </div>
    <p style="font-size:24px; font-weight:800; letter-spacing:-.02em; margin-bottom:6px;">${RESULT.name}</p>
    <span style="font-size:13px; font-weight:700; color:${RESULT.teamColor};
      background:rgba(56,189,248,.1); border:1px solid rgba(56,189,248,.25);
      border-radius:10px; padding:4px 14px; margin-bottom:24px; display:inline-block;">
      ${RESULT.team}
    </span>

    <!-- 페널티 카드 -->
    <div style="width:100%; background:rgba(251,113,133,.08); border:1px solid rgba(251,113,133,.2);
      border-radius:20px; padding:18px 20px; margin-top:8px; text-align:left;">
      <p style="font-size:12px; color:#52525b; font-weight:600; letter-spacing:.06em; text-transform:uppercase; margin-bottom:10px;">적용 페널티</p>
      <div style="display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:14px;">⚡</span>
          <p style="font-size:13px; color:#e4e4e7;">이후 모든 번개 마일리지 <b style="color:#fb7185;">50% 감소</b></p>
        </div>
        ${RESULT.isElite ? `
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:14px;">👑</span>
          <p style="font-size:13px; color:#e4e4e7;">엘리트 능력 <b style="color:#fb7185;">박탈</b> + 마일리지 추가 0.5× 적용</p>
        </div>` : ''}
      </div>
    </div>

    <button id="vote-result-close"
      class="btn btn-secondary" style="width:100%; height:52px; margin-top:20px;">
      확인
    </button>
  </div>

  <!-- 확인 팝업 -->
  <div id="vote-confirm-overlay"
    style="position:absolute; inset:0; z-index:60; display:none; align-items:flex-end;">
    <div style="position:absolute; inset:0; background:rgba(0,0,0,.6); backdrop-filter:blur(4px);" id="vote-confirm-backdrop"></div>
    <div id="vote-confirm-sheet"
      style="position:relative; z-index:1; background:#111113; border-radius:28px 28px 0 0;
        width:100%; transform:translateY(100%); transition:transform .4s var(--spring);
        border-top:1px solid rgba(255,255,255,.08);
        padding:24px 20px; padding-bottom:calc(var(--safe-bottom) + 24px);">
      <div style="display:flex; justify-content:center; margin-bottom:18px;">
        <div style="width:36px; height:4px; border-radius:99px; background:rgba(255,255,255,.15);"></div>
      </div>
      <p style="font-size:11px; color:#52525b; letter-spacing:.08em; text-transform:uppercase; font-weight:600; margin-bottom:8px;">지목 확인</p>
      <p style="font-size:19px; font-weight:700; margin-bottom:4px;"><span id="confirm-target-name"></span>님을 상대 팀으로 지목합니다</p>
      <p style="font-size:13px; color:#52525b; margin-bottom:20px;">이 행동은 취소할 수 없습니다</p>
      <div style="display:flex; gap:10px;">
        <button id="vote-confirm-cancel" class="btn btn-secondary" style="flex:1; height:52px;">취소</button>
        <button id="vote-confirm-ok" class="btn" style="flex:2; height:52px;
          background:linear-gradient(135deg,#fb7185,#e11d48); color:#fff;
          box-shadow:0 8px 24px -6px rgba(251,113,133,.4);">지목하기</button>
      </div>
    </div>
  </div>

</div>`;
}

export function init() {
  // 타이머
  let timerSecs = 80 * 60 + 45;
  const timerEl = document.getElementById('vote-timer');
  const timerInterval = setInterval(() => {
    if (timerSecs <= 0) { clearInterval(timerInterval); return; }
    timerSecs--;
    const h = String(Math.floor(timerSecs / 3600)).padStart(2, '0');
    const m = String(Math.floor((timerSecs % 3600) / 60)).padStart(2, '0');
    const s = String(timerSecs % 60).padStart(2, '0');
    timerEl.textContent = `${h}:${m}:${s}`;
  }, 1000);

  // 투표 상태
  let votesLeft = TOTAL_VOTES;
  let pendingPlayerId = null;
  let pendingPlayerName = null;

  // 시뮬레이션: 비활성 → 활성
  document.getElementById('sim-activate-vote').addEventListener('click', () => {
    document.getElementById('vote-inactive-overlay').style.display = 'none';
  });

  // 지목하기 버튼들
  document.querySelectorAll('.vote-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (votesLeft <= 0) return;
      pendingPlayerId   = btn.dataset.id;
      pendingPlayerName = btn.dataset.name;
      document.getElementById('confirm-target-name').textContent = pendingPlayerName;
      openConfirmSheet();
    });
  });

  // 확인 팝업
  document.getElementById('vote-confirm-backdrop').addEventListener('click', closeConfirmSheet);
  document.getElementById('vote-confirm-cancel').addEventListener('click', closeConfirmSheet);
  document.getElementById('vote-confirm-ok').addEventListener('click', () => {
    closeConfirmSheet();
    setTimeout(() => castVote(pendingPlayerId, pendingPlayerName), 350);
  });

  // 결과 오버레이 닫기
  document.getElementById('vote-result-close').addEventListener('click', () => {
    document.getElementById('vote-result-overlay').style.display = 'none';
  });

  // 결과 시뮬레이션
  document.getElementById('sim-result-btn').addEventListener('click', () => {
    document.getElementById('vote-result-overlay').style.display = 'flex';
  });
}

// 플레이어별 지목 횟수 추적
const voteCount = {};

function castVote(playerId, playerName) {
  let votesLeft = parseInt(document.getElementById('votes-remaining').textContent);
  votesLeft--;
  document.getElementById('votes-remaining').textContent = votesLeft;

  voteCount[playerId] = (voteCount[playerId] || 0) + 1;

  // 지목된 행 하이라이트 + 지목 횟수 배지
  const row = document.getElementById(`player-row-${playerId}`);
  if (row) {
    row.style.background = 'rgba(251,113,133,.08)';
    row.style.border = '1px solid rgba(251,113,133,.25)';
    const btn = row.querySelector('.vote-btn');
    if (btn && votesLeft > 0) {
      // 투표권이 남아있으면 재지목 가능 — 버튼은 활성 유지
      btn.textContent = voteCount[playerId] > 1 ? `지목됨 ×${voteCount[playerId]}` : '지목됨';
    }
  }

  if (votesLeft <= 0) {
    // 모든 버튼 비활성화
    document.querySelectorAll('.vote-btn').forEach(b => {
      const pid = b.dataset.id;
      b.style.background = 'rgba(255,255,255,.03)';
      b.style.borderColor = 'rgba(255,255,255,.06)';
      b.style.color = '#3f3f46';
      b.style.pointerEvents = 'none';
      const cnt = voteCount[pid] || 0;
      b.textContent = cnt > 1 ? `지목됨 ×${cnt}` : cnt === 1 ? '지목됨' : '마감';
    });
    document.getElementById('vote-done-msg').style.display = 'block';
    document.getElementById('sim-result-btn').style.display = 'block';
  }
}

function openConfirmSheet() {
  const overlay = document.getElementById('vote-confirm-overlay');
  const sheet   = document.getElementById('vote-confirm-sheet');
  overlay.style.display = 'flex';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    sheet.style.transform = 'translateY(0)';
  }));
}

function closeConfirmSheet() {
  const sheet = document.getElementById('vote-confirm-sheet');
  sheet.style.transform = 'translateY(100%)';
  setTimeout(() => { document.getElementById('vote-confirm-overlay').style.display = 'none'; }, 380);
}

function showTooltip(msg) {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = `
    position:absolute; bottom:calc(var(--safe-bottom) + 20px); left:18px; right:18px;
    background:#1c1c1e; border:1px solid rgba(251,113,133,.25); border-radius:14px;
    padding:14px 16px; font-size:13px; color:#fb7185; text-align:center;
    z-index:35; animation:fadeUp .3s var(--spring);
  `;
  document.getElementById('s-vote').appendChild(t);
  setTimeout(() => t.remove(), 3000);
}
