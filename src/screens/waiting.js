import { state } from '../state.js';
import { goToScreen } from '../utils/nav.js';
import { subscribe, getGameSettings, getRoster, getAssignment, triggerAssignment, hasConfirmedRole } from '../store.js';
import { prepareCard } from './card.js';
import { applyTeamTheme } from '../utils/theme.js';
import { initPhase } from '../utils/phase.js';


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

const guideContent = `
  ${sectionG('🎯', '게임 개요 및 승리 조건', `
    <p style="font-size:12px; color:#a1a1aa; line-height:1.75; margin-bottom:8px;">페이서팀과 고스트팀이 3주 동안 번개(달리기)를 통해 마일리지를 쌓으며 중앙의 게이지를 자기 쪽으로 당기는 줄다리기 게임입니다.</p>
    <div style="padding:8px 0; border-bottom:1px solid rgba(255,255,255,.05);">
      <p style="font-size:12px; font-weight:600; color:#e4e4e7; margin-bottom:4px;">승리</p>
      <p style="font-size:12px; color:#34d399; line-height:1.6;">3주 후 게이지가 더 기운 팀이 우승합니다</p>
    </div>
  `)}
  ${sectionG('🎭', '팀 및 특수 역할', `
    <p style="font-size:12px; color:#a1a1aa; line-height:1.75; margin-bottom:8px;">각 팀에는 엘리트, 앵커, 더블, 탐정, 밀정이 하나씩 존재하며 정체는 팀원에게도 비공개입니다.</p>
    ${roleRowG('👑 엘리트', '번개 마일리지 2배 적립', '팀의 핵심 마일리지 기여자. 투표로 적발되면 마일리지가 0.5배로 급감합니다.')}
    ${roleRowG('⚓ 앵커', '게이지를 통째로 끌어온다', '번개 마일리지(버프 포함)만큼 상대팀 게이지에서 깎는 동시에 내 팀 게이지에 더합니다.')}
    ${roleRowG('×2 더블', '투표 시 2표 행사', '같은 사람에게 2표 모두 사용할 수 있습니다.')}
    ${roleRowG('🔍 탐정', '누군가의 팀 확인 (주 2회)', '[참가자 탭]에서 아군인지 적군인지 은밀히 판별합니다.')}
    ${roleRowG('🕵️ 밀정', '누군가의 역할 확인 (주 2회)', '[참가자 탭]에서 상대의 구체적인 역할을 파악합니다.')}
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
    ${rowG('일반 번개', '팀 혼합 시 스킬 없음. 버프카드가 랜덤으로 적용되어 마일리지가 최대 3배까지 오를 수 있습니다.')}
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
      padding:calc(var(--safe-top) + 16px) 18px 0;">

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
      <div class="bezel" style="padding:16px; border-radius:20px; text-align:center; display:flex; flex-direction:column; justify-content:center;">
        <p style="font-size:10px; color:#52525b; font-weight:600; letter-spacing:.06em; margin-bottom:8px;">참가 등록</p>
        <p class="num" id="waiting-reg-count"
          style="font-size:26px; font-weight:800; color:#fafafa; line-height:1; letter-spacing:-.02em;">—</p>
        <p style="font-size:10px; color:#52525b; margin-top:6px;">참가 중</p>
      </div>
    </div>

    <div style="background:rgba(56,189,248,.06); border:1px solid rgba(56,189,248,.16);
      border-radius:20px; padding:16px 18px; margin-bottom:12px; display:flex; gap:12px; align-items:flex-start;">
      <span style="font-size:20px; line-height:1.2;">🎭</span>
      <div>
        <p style="font-size:13px; font-weight:700; color:#7dd3fc; margin-bottom:3px;">팀 · 역할은 아직 비공개</p>
        <p style="font-size:12px; color:#a1a1aa; line-height:1.6;">게임이 시작되면 전체 참가자를 두 팀으로 나누고 역할이 배정·공개됩니다. 그 동안 가이드를 확인하세요.</p>
      </div>
    </div>

    <button id="waiting-start-btn" class="btn btn-primary"
      style="width:100%; height:50px; font-size:15px; display:none; margin-bottom:10px;">
      🚀 게임 시작!
    </button>

    <button id="waiting-view-guide" class="btn btn-secondary"
      style="width:100%; height:46px; font-size:13px;">
      📖 게임 가이드 보기
    </button>
  </div>

  <!-- 가이드 패널 -->
  <div id="wpanel-guide" class="scroll-body"
    style="position:absolute; inset:0; display:none;
      padding:calc(var(--safe-top) + 16px) 18px 0;">

    <div style="margin-bottom:16px;">
      <h2 style="font-size:22px; font-weight:700; letter-spacing:-.02em;">가이드</h2>
      <p style="font-size:12px; color:#52525b; margin-top:2px;">정체를 숨기고 아군을 찾아라! 3주간의 줄다리기 레이스</p>
    </div>

    ${guideContent}
  </div>

  <!-- 내부 탭바 (홈·가이드만) - 본게임처럼 오른쪽 사이드 스타일 적용 -->
  <div id="waiting-tabbar-handle"><span class="handle-grip"></span></div>
  <div id="waiting-tabbar" class="tabbar">
    <div class="tab on" id="wtab-home"><div class="tab-icon"><span class="ti-home-dot"></span></div></div>
    <div class="tab" id="wtab-guide"><div class="tab-icon"><span class="ti-book"></span></div></div>
  </div>
</div>`;
}

export function init() {
  // 가이드 보기 — 기존 가이드 탭 재사용
  document.getElementById('waiting-view-guide').addEventListener('click', () => {
    document.getElementById('wtab-guide').click();
  });

  document.getElementById('waiting-start-btn').addEventListener('click', enterGame);

  const tb = document.getElementById('waiting-tabbar');
  const handle = document.getElementById('waiting-tabbar-handle');

  const open  = () => { tb.classList.add('open');    handle.classList.add('hidden'); };
  const close = () => { tb.classList.remove('open'); handle.classList.remove('hidden'); };

  handle.addEventListener('click', e => { e.stopPropagation(); open(); });

  document.addEventListener('click', e => {
    if (tb.classList.contains('open') && !tb.contains(e.target) && e.target !== handle) {
      close();
    }
  });

  // 내부 탭 전환
  const tabs = [
    { tab: 'wtab-home',  panel: 'wpanel-home' },
    { tab: 'wtab-guide', panel: 'wpanel-guide' },
  ];

  function showPanel(index) {
    tabs.forEach((t, i) => {
      document.getElementById(t.tab).classList.toggle('on', i === index);
      document.getElementById(t.panel).style.display = i === index ? 'block' : 'none';
    });
    close();
  }

  tabs.forEach(({ tab }, index) => {
    document.getElementById(tab).addEventListener('click', e => {
      e.stopPropagation();
      showPanel(index);
    });
  });

  // 위/아래 스와이프로도 홈 ↔ 가이드 전환 (사이드 탭바는 그대로 유지)
  const screen = document.getElementById('s-waiting');
  let touchStartY = null;

  screen.addEventListener('touchstart', e => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  screen.addEventListener('touchend', e => {
    if (touchStartY === null) return;
    const dy = e.changedTouches[0].clientY - touchStartY;
    touchStartY = null;
    if (Math.abs(dy) < 60) return;   // 짧은 터치/스크롤은 무시

    const currentIndex = tabs.findIndex(t => document.getElementById(t.tab).classList.contains('on'));
    if (dy < 0 && currentIndex < tabs.length - 1) showPanel(currentIndex + 1);   // 위로 스와이프 → 다음
    else if (dy > 0 && currentIndex > 0) showPanel(currentIndex - 1);           // 아래로 스와이프 → 이전
  }, { passive: true });
}

let countdownInterval = null;
let unsubscribeStore = null;
let assigning = false;   // 배정 요청 중복 호출 방지
let entered = false;     // 게임 화면 진입 중복 방지
let pendingMe = null;    // 배정은 완료됐지만 아직 "게임 시작!" 버튼을 누르기 전인 내 정보

export function prepareWaiting() {
  entered = false;
  pendingMe = null;
  document.getElementById('waiting-start-btn').style.display = 'none';
  refreshRegCount();

  // 홈 탭 초기화
  ['wtab-home','wtab-guide'].forEach(id =>
    document.getElementById(id).classList.remove('on'));
  ['wpanel-home','wpanel-guide'].forEach(id =>
    document.getElementById(id).style.display = 'none');
  document.getElementById('wtab-home').classList.add('on');
  document.getElementById('wpanel-home').style.display = 'block';

  startCountdown();

  if (unsubscribeStore) unsubscribeStore();
  unsubscribeStore = subscribe(() => {
    refreshRegCount();
    checkAssignment();
  });
  checkAssignment(); // 이미 배정된 상태로 대기실에 들어온 경우 대비
}

function refreshRegCount() {
  document.getElementById('waiting-reg-count').innerHTML =
    `${getRoster().length}<span style="font-size:13px; font-weight:600; color:#52525b;"> 명</span>`;
}

// 배정 완료 감지 — 내 이름에 해당하는 team/role을 찾아 "게임 시작!" 버튼을 노출
// (바로 팀배정 화면으로 넘기지 않고, 사용자가 버튼을 눌러야 진입)
function checkAssignment() {
  if (entered || pendingMe) return;
  const { assigned, players } = getAssignment();
  if (!assigned) return;
  const me = players.find(p => p.name === state.name);
  if (!me) return;

  pendingMe = me;
  if (unsubscribeStore) { unsubscribeStore(); unsubscribeStore = null; }
  if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }

  document.getElementById('waiting-start-btn').style.display = 'block';
}

function enterGame() {
  if (entered || !pendingMe) return;
  entered = true;
  const me = pendingMe;

  state.team = me.team;
  state.role = me.role;

  // 이 기기에서 같은 배정으로 카드·역할을 이미 확인했다면 — 재입장 시 다시 뒤집게 하지 않고
  // 바로 게임 화면으로 (팀 테마·단계 표시는 card.js/role.js가 하던 걸 여기서 대신 적용)
  if (hasConfirmedRole()) {
    state.cardFlipped = true;
    state.roleFlipped = true;
    state.roleConfirmed = true;
    applyTeamTheme(state.team);
    initPhase();
    goToScreen('s-game');
    return;
  }

  state.cardFlipped = false;
  state.roleFlipped = false;
  prepareCard();
  goToScreen('s-card');
}

function startCountdown() {
  if (countdownInterval) clearInterval(countdownInterval);
  const el = document.getElementById('waiting-timer');

  function tick() {
    const diff = getGameSettings().start - new Date();
    if (diff <= 0) {
      el.textContent = '00:00';
      if (!assigning && !getAssignment().assigned) {
        assigning = true;
        triggerAssignment().catch(err => console.warn('배정 실패:', err.message)).finally(() => { assigning = false; });
      }
      return;
    }
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
