import { state, ROLES } from '../state.js';
import { goToScreen } from '../utils/nav.js';

// 관리자가 설정할 게임 시작 일시 — 추후 Firebase 연동
let GAME_START_TIME = new Date();
GAME_START_TIME.setHours(GAME_START_TIME.getHours() + 1, 0, 0, 0);

export function setGameStartTime(date) { GAME_START_TIME = date; }

// 대기 화면용 멤버 목록 (프로토타입 — Firebase 연동 시 교체)
const WAIT_MEMBERS = [
  { id: 'm0', name: '나',    isSelf: true,  km: 38.2 },
  { id: 'm1', name: '김민수', isSelf: false, km: 42.3 },
  { id: 'm2', name: '박현우', isSelf: false, km: 38.7 },
  { id: 'm3', name: '이서연', isSelf: false, km: 51.2 },
  { id: 'm4', name: '정윤아', isSelf: false, km: 44.1 },
  { id: 'm5', name: '최준호', isSelf: false, km: 29.8 },
  { id: 'm6', name: '한지우', isSelf: false, km: 33.5 },
];

function rowG(label, value, color = '#a1a1aa') {
  return `
  <div style="display:flex; gap:12px; padding:8px 0; border-bottom:1px solid rgba(255,255,255,.05);">
    <p style="font-size:12px; font-weight:600; color:#e4e4e7; width:80px; flex-shrink:0; line-height:1.5;">${label}</p>
    <p style="font-size:12px; color:${color}; line-height:1.6; flex:1;">${value}</p>
  </div>`;
}

function roleRowG(role, ability, desc) {
  return `
  <div style="padding:8px 0; border-bottom:1px solid rgba(255,255,255,.05);">
    <p style="font-size:13px; font-weight:700; color:#e4e4e7; margin-bottom:3px;">${role}</p>
    <p style="font-size:12px; color:#60a5fa; margin-bottom:2px;">${ability}</p>
    <p style="font-size:12px; color:#71717a; line-height:1.5;">${desc}</p>
  </div>`;
}

function sectionG(emoji, title, content) {
  return `
  <div class="bezel" style="padding:18px; border-radius:20px; margin-bottom:10px;">
    <div style="display:flex; align-items:center; gap:9px; margin-bottom:12px;">
      <span style="font-size:16px; line-height:1;">${emoji}</span>
      <h3 style="font-size:14px; font-weight:700;">${title}</h3>
    </div>
    ${content}
  </div>`;
}

const memberRows = WAIT_MEMBERS.map(m => `
  <div style="display:flex; align-items:center; gap:12px; padding:14px 0;
    border-bottom:1px solid rgba(255,255,255,.05);">
    <span style="width:38px; height:38px; border-radius:50%;
      background:${m.isSelf ? 'var(--accent-tint)' : 'rgba(255,255,255,.06)'};
      display:flex; align-items:center; justify-content:center;
      font-size:14px; font-weight:700; flex-shrink:0;
      color:${m.isSelf ? 'var(--accent)' : '#e4e4e7'};">
      ${m.name[0]}
    </span>
    <div style="flex:1; min-width:0;">
      <p style="font-size:15px; font-weight:${m.isSelf ? '700' : '600'};">
        ${m.name}${m.isSelf ? ' <span style="font-size:11px; color:var(--accent); font-weight:600;">나</span>' : ''}
      </p>
      <p class="num" style="font-size:11px; color:#52525b; margin-top:2px;">${m.km} km</p>
    </div>
    <span style="font-size:11px; color:#3f3f46; font-weight:600;">준비 중</span>
  </div>
`).join('');

const guideContent = `
  ${sectionG('🎯', '게임 개요 및 승리 조건', `
    <p style="font-size:12px; color:#a1a1aa; line-height:1.75; margin-bottom:8px;">페이서팀과 고스트팀이 3주 동안 번개(달리기)를 통해 마일리지를 쌓으며 중앙의 게이지를 자기 쪽으로 당기는 줄다리기 게임입니다.</p>
    ${rowG('페이서', '게이지를 오른쪽(+)으로 당깁니다', '#38bdf8')}
    ${rowG('고스트', '게이지를 왼쪽(-)으로 당깁니다', '#a78bfa')}
    ${rowG('승리', '3주 후 게이지가 더 기운 팀이 우승하며, 최고 기여자 표창이 수여됩니다', '#34d399')}
  `)}
  ${sectionG('🎭', '팀 및 특수 역할', `
    <p style="font-size:12px; color:#a1a1aa; line-height:1.75; margin-bottom:8px;">각 팀에는 엘리트, 앵커, 더블, 탐정, 밀정이 하나씩 존재하며 정체는 팀원에게도 비공개입니다.</p>
    ${roleRowG('👑 엘리트', '번개 마일리지 2배 적립', '팀의 핵심 마일리지 기여자. 투표로 적발되면 마일리지가 0.5배로 급감합니다.')}
    ${roleRowG('⚓ 앵커', '달린 만큼 상대팀 마일리지 즉시 삭감', '줄다리기 기간(목~토)에 능력이 2배로 중첩됩니다.')}
    ${roleRowG('×2 더블', '투표 시 2표 행사', '같은 사람에게 2표 모두 사용할 수 있습니다.')}
    ${roleRowG('🔍 탐정', '누군가의 팀 확인 (3회)', '[참가자 탭]에서 아군인지 적군인지 은밀히 판별합니다.')}
    ${roleRowG('🕵️ 밀정', '누군가의 역할 확인 (3회)', '[참가자 탭]에서 상대의 구체적인 역할을 파악합니다.')}
  `)}
  ${sectionG('📅', '주간 운영 체계', `
    <div style="display:flex; flex-direction:column; gap:8px;">
      <div style="background:rgba(255,255,255,.04); border-radius:12px; padding:12px 14px;">
        <p style="font-size:11px; font-weight:700; color:#a1a1aa; letter-spacing:.04em; margin-bottom:4px;">탐색 기간 · 일 ~ 수</p>
        <p style="font-size:12px; color:#e4e4e7; line-height:1.6;">달린 마일리지가 1:1로 게이지에 반영됩니다. 아군을 탐색하고 정보를 수집하세요.</p>
      </div>
      <div style="background:rgba(255,255,255,.04); border-radius:12px; padding:12px 14px;">
        <p style="font-size:11px; font-weight:700; color:#a1a1aa; letter-spacing:.04em; margin-bottom:4px;">줄다리기 기간 · 목 ~ 토</p>
        <p style="font-size:12px; color:#e4e4e7; line-height:1.6;">달린 만큼 상대팀 게이지에서 직접 삭감합니다. 본격적인 승부를 벌이는 시기입니다.</p>
      </div>
    </div>
  `)}
  ${sectionG('⚡', '번개와 팀 고유 스킬', `
    ${rowG('단일팀 번개', '3~4명이 같은 팀일 때 팀 고유 스킬이 자동 발동됩니다.')}
    ${rowG("'페이서 시너지'", '참여 인원 × 50km의 마일리지를 추가 적립합니다.', '#38bdf8')}
    ${rowG("'고스트 게이지'", '상대팀 마일리지 삭감에 더해 게이지 바를 100km 즉시 이동시킵니다.', '#a78bfa')}
    ${rowG('일반 번개', '팀 혼합 시 스킬 없음. 랜덤 특수 버프 카드(최대 3배)가 발동할 수 있습니다.')}
  `)}
  ${sectionG('🗳️', '투표 및 정체 공개', `
    ${rowG('일시', '주 2회 — 월요일, 목요일 18:00 ~ 22:00')}
    ${rowG('진행', '상대 팀으로 의심되는 플레이어 1명을 지목합니다.')}
    ${rowG('결과', '최다 득표자는 팀 소속이 공개되며, 마일리지가 영구적으로 50% 감소합니다.')}
  `)}
  <div style="background:rgba(56,189,248,.06); border:1px solid rgba(56,189,248,.15);
    border-radius:18px; padding:16px 18px; margin-bottom:10px;">
    <p style="font-size:11px; font-weight:700; color:var(--accent); margin-bottom:6px;
      letter-spacing:.06em; text-transform:uppercase;">전략 팁</p>
    <p style="font-size:12px; color:#a1a1aa; line-height:1.75;">탐색 기간에는 아군을 찾아 세력을 확보하고, 줄다리기 기간에는 고유 스킬과 앵커의 능력을 총동원해 게이지를 뺏어오세요. 투표를 통해 상대팀의 엘리트를 찾아내는 것이 역전의 발판입니다.</p>
  </div>
`;

export function render() {
  return `
<div class="screen" id="s-waiting" >

  <!-- 홈 패널 -->
  <div id="wpanel-home" class="scroll-body"
    style="position:absolute; inset:0;
      padding:calc(var(--safe-top) + 16px) 18px calc(var(--safe-bottom) + 90px);">

    <div style="margin-bottom:20px;">
      <p style="font-size:11px; letter-spacing:.18em; text-transform:uppercase; font-weight:700;
        color:#3f3f46; margin-bottom:6px;">GAME READY</p>
      <h2 style="font-size:24px; font-weight:800; letter-spacing:-.02em; line-height:1.2;">
        게임 시작까지<br/>잠시 기다려주세요
      </h2>
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px;">
      <div class="bezel" style="padding:16px; border-radius:20px; text-align:center;">
        <p style="font-size:10px; color:#52525b; font-weight:600; letter-spacing:.06em; margin-bottom:8px;">시작까지</p>
        <p class="num" id="waiting-timer"
          style="font-size:26px; font-weight:800; color:var(--accent); line-height:1; letter-spacing:-.02em;">00:00</p>
        <p style="font-size:10px; color:#52525b; margin-top:6px;">남음</p>
      </div>
      <div class="bezel-accent" style="padding:16px; border-radius:20px; display:flex; flex-direction:column; justify-content:center; gap:6px;">
        <span id="waiting-team-badge" class="chip"
          style="background:var(--accent-tint); color:var(--accent); font-size:10px; align-self:flex-start;"></span>
        <p id="waiting-role-name"
          style="font-size:18px; font-weight:800; letter-spacing:-.02em; color:var(--accent); line-height:1;"></p>
        <p id="waiting-role-short"
          style="font-size:11px; color:#71717a; line-height:1.4;"></p>
      </div>
    </div>

    <div class="bezel" style="border-radius:20px; padding:16px 18px; margin-bottom:16px;">
      <p style="font-size:12px; color:#52525b; line-height:1.7;">
        관리자가 게임을 시작하면 자동으로 화면이 전환됩니다.<br/>그 동안 참가자와 가이드를 확인하세요.
      </p>
    </div>

    <button id="waiting-start-sim" class="btn btn-secondary"
      style="width:100%; height:46px; font-size:13px; color:#52525b;">
      게임 시작 (시뮬레이션)
    </button>
  </div>

  <!-- 참가자 패널 -->
  <div id="wpanel-members" class="scroll-body"
    style="position:absolute; inset:0; display:none;
      padding:calc(var(--safe-top) + 16px) 18px calc(var(--safe-bottom) + 90px);">

    <div style="margin-bottom:16px;">
      <h2 style="font-size:22px; font-weight:700; letter-spacing:-.02em;">참가자</h2>
      <p style="font-size:12px; color:#52525b; margin-top:2px;">${WAIT_MEMBERS.length}명 참가 중 · 팀 배정 완료</p>
    </div>

    <div class="bezel" style="border-radius:20px; padding:0 16px;">
      ${memberRows}
    </div>
  </div>

  <!-- 가이드 패널 -->
  <div id="wpanel-guide" class="scroll-body"
    style="position:absolute; inset:0; display:none;
      padding:calc(var(--safe-top) + 16px) 18px calc(var(--safe-bottom) + 90px);">

    <div style="margin-bottom:16px;">
      <h2 style="font-size:22px; font-weight:700; letter-spacing:-.02em;">가이드</h2>
      <p style="font-size:12px; color:#52525b; margin-top:2px;">정체를 숨기고 아군을 찾아라! 3주간의 줄다리기 레이스</p>
    </div>

    ${guideContent}
  </div>

  <!-- 내부 탭바 (홈·참가자·가이드만) - 하단 플로팅 스타일 적용 -->
  <style>
    #waiting-tabbar {
      position: absolute;
      bottom: calc(var(--safe-bottom) + 12px);
      left: 18px; right: 18px;
      height: 64px;
      background: var(--tb-bg, rgba(16, 16, 20, 0.65));
      backdrop-filter: blur(32px) saturate(200%);
      -webkit-backdrop-filter: blur(32px) saturate(200%);
      border: 1px solid var(--tb-border-side, rgba(255,255,255,0.08));
      border-radius: 20px;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: space-around;
      z-index: 50;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      transform: none; /* override right-side peek defaults */
      opacity: 1; pointer-events: auto;
    }
    #waiting-tabbar .tab {
      flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
      color: rgba(255,255,255,0.35); font-size: 11px; font-weight: 600;
    }
    #waiting-tabbar .tab.on { color: var(--accent); }
    #waiting-tabbar .tab-icon { margin-bottom: 2px; }
  </style>
  <div id="waiting-tabbar">
    <div class="tab on" id="wtab-home">
      <div class="tab-icon"><span class="ti-home-dot"></span></div><span>홈</span>
    </div>
    <div class="tab" id="wtab-members">
      <div class="tab-icon"><span class="ti-users"></span></div><span>참가자</span>
    </div>
    <div class="tab" id="wtab-guide">
      <div class="tab-icon"><span class="ti-book"></span></div><span>가이드</span>
    </div>
  </div>

</div>`;
}

export function init() {
  document.getElementById('waiting-start-sim').addEventListener('click', () => {
    goToScreen('s-dash');
  });

  // 내부 탭 전환
  const tabs = [
    { tab: 'wtab-home',    panel: 'wpanel-home' },
    { tab: 'wtab-members', panel: 'wpanel-members' },
    { tab: 'wtab-guide',   panel: 'wpanel-guide' },
  ];

  tabs.forEach(({ tab, panel }) => {
    document.getElementById(tab).addEventListener('click', () => {
      tabs.forEach(t => {
        document.getElementById(t.tab).classList.remove('on');
        document.getElementById(t.panel).style.display = 'none';
      });
      document.getElementById(tab).classList.add('on');
      document.getElementById(panel).style.display = 'block';
    });
  });
}

export function prepareWaiting() {
  const r = ROLES[state.role];
  const teamName = state.team === 'pacer' ? '페이서팀' : '고스트팀';
  document.getElementById('waiting-team-badge').textContent = teamName;
  document.getElementById('waiting-role-name').textContent = r.name;
  document.getElementById('waiting-role-short').textContent = r.short;

  // 홈 탭 초기화
  ['wtab-home','wtab-members','wtab-guide'].forEach(id =>
    document.getElementById(id).classList.remove('on'));
  ['wpanel-home','wpanel-members','wpanel-guide'].forEach(id =>
    document.getElementById(id).style.display = 'none');
  document.getElementById('wtab-home').classList.add('on');
  document.getElementById('wpanel-home').style.display = 'block';

  startCountdown();
}

let countdownInterval = null;

function startCountdown() {
  if (countdownInterval) clearInterval(countdownInterval);
  const el = document.getElementById('waiting-timer');

  function tick() {
    const diff = GAME_START_TIME - new Date();
    if (diff <= 0) { el.textContent = '00:00'; clearInterval(countdownInterval); return; }
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    el.textContent = h > 0
      ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
      : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  tick();
  countdownInterval = setInterval(tick, 1000);
}
