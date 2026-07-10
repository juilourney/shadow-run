import { state } from '../state.js';
import { goToScreen } from '../utils/nav.js';
import { subscribe, getGameSettings, getRoster, getAssignment, triggerAssignment, hasConfirmedRole, clearSavedIdentity, isNameRegistered, isRosterLoaded } from '../store.js';
import { prepareCard } from './card.js';
import { guideBody } from './guide.js';
import { applyTeamTheme, resetTeamTheme } from '../utils/theme.js';
import { initPhase } from '../utils/phase.js';

export function render() {
  return `
<div class="screen" id="s-waiting" >

  <!-- 본게임과 같은 세로 스냅 스크롤 — 홈/가이드 패널을 display 토글이 아니라
       네이티브 스크롤로 넘겨 화면 전환이 부드럽게 이어진다 -->
  <div id="waiting-scroll"
    style="position:absolute; inset:0; overflow-y:auto;
      scroll-snap-type:y mandatory; -webkit-overflow-scrolling:touch;">

  <!-- 홈 패널 -->
  <section style="height:100%; scroll-snap-align:start; scroll-snap-stop:always;
    overflow:hidden; display:flex; flex-direction:column;">
  <div id="wpanel-home" class="scroll-body"
    style="flex:1;
      padding:calc(var(--safe-top) + 16px) 18px 0;">

    <div style="margin-bottom:20px;">
      <p style="font-size:11px; letter-spacing:.18em; text-transform:uppercase; font-weight:700;
        color:#3f3f46; margin-bottom:6px;">GAME READY</p>
      <h2 id="waiting-headline" style="font-size:24px; font-weight:800; letter-spacing:-.02em; line-height:1.2;">
        게임 시작까지<br/>잠시 기다려주세요
      </h2>
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px;">
      <div class="bezel" style="padding:16px; border-radius:20px; text-align:center;">
        <p id="waiting-timer-label" style="font-size:10px; color:#52525b; font-weight:600; letter-spacing:.06em; margin-bottom:8px;">시작까지</p>
        <p class="num" id="waiting-timer"
          style="font-size:26px; font-weight:800; color:var(--accent); line-height:1; letter-spacing:-.02em;">00:00</p>
        <p id="waiting-timer-sub" style="font-size:10px; color:#52525b; margin-top:6px;">남음</p>
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

    <!-- 팀 비공개 단계 — 팀 컬러(--accent) 대신 이름 화면 입장 버튼과 같은
         두 팀 혼합 그라디언트로 "아직 팀 미정"을 표현 -->
    <button id="waiting-start-btn" class="btn"
      style="width:100%; height:50px; font-size:15px; display:none; margin-bottom:10px;
        background:linear-gradient(135deg, #0ea5e9, #7c3aed); color:#fff;
        box-shadow:0 6px 20px -6px rgba(100,100,240,.5);">
      🚀 게임 시작!
    </button>

    <button id="waiting-view-guide" class="btn btn-secondary"
      style="width:100%; height:46px; font-size:13px;">
      📖 게임 가이드 보기
    </button>

    <button id="waiting-change-name"
      style="display:block; margin:14px auto 0; background:none; border:none; cursor:pointer;
        font-size:12px; color:#52525b; text-decoration:underline; text-underline-offset:3px;">
      다른 이름으로 입장
    </button>
  </div>
  </section>

  <!-- 가이드 패널 -->
  <section style="height:100%; scroll-snap-align:start; scroll-snap-stop:always;
    overflow:hidden; display:flex; flex-direction:column;">
  <div id="wpanel-guide" class="scroll-body"
    style="flex:1;
      padding:calc(var(--safe-top) + 16px) 18px 0;">

    <div style="margin-bottom:16px;">
      <h2 style="font-size:22px; font-weight:700; letter-spacing:-.02em;">가이드</h2>
      <p style="font-size:12px; color:#52525b; margin-top:2px;">정체를 숨기고 아군을 찾아라! 3주간의 줄다리기 레이스</p>
    </div>

    ${guideBody()}
  </div>
  </section>

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

  // 잘못된 이름으로 저장된 경우 탈출구 — 저장 기록을 지우고 이름 입력 화면으로
  document.getElementById('waiting-change-name').addEventListener('click', () => {
    clearSavedIdentity();
    state.name = '';
    goToScreen('s-name');
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

  // 내부 탭 전환 — 패널은 스냅 스크롤 컨테이너의 섹션이므로 스크롤로 이동
  const tabs = ['wtab-home', 'wtab-guide'];
  const outer = document.getElementById('waiting-scroll');

  function paintTabs(index) {
    tabs.forEach((id, i) =>
      document.getElementById(id).classList.toggle('on', i === index));
  }

  // 프로그램 전환은 rAF 트윈으로 직접 굴린다 — mandatory 스냅 컨테이너에서
  // 네이티브 smooth 스크롤(scrollTo/scrollIntoView)은 스냅 엔진이 애니메이션을
  // 시작 즉시 끊고 제자리로 되돌려 동작하지 않는다.
  let panelAnim = null;
  function showPanel(index) {
    const startTop = outer.scrollTop;
    const endTop = index * outer.clientHeight;
    paintTabs(index);
    close();
    if (Math.abs(endTop - startTop) < 2) return;

    // 주의: 스냅이 인라인으로 선언돼 있어 ''로 지우면 복원이 아니라 삭제가 된다 — 명시 값으로 되돌릴 것
    const SNAP = 'y mandatory';
    outer.style.scrollSnapType = 'none';   // 트윈 중간 프레임을 스냅이 가로채지 않게
    cancelAnimationFrame(panelAnim);
    const t0 = performance.now();
    const DUR = 420;
    const ease = t => 1 - Math.pow(1 - t, 3);   // easeOutCubic — 스냅 감속과 유사한 느낌
    const step = now => {
      const p = Math.min(1, (now - t0) / DUR);
      outer.scrollTop = startTop + (endTop - startTop) * ease(p);
      if (p < 1) panelAnim = requestAnimationFrame(step);
      else { panelAnim = null; outer.style.scrollSnapType = SNAP; }
    };
    panelAnim = requestAnimationFrame(step);
  }

  // 트윈 도중 손가락이 닿으면 즉시 제어권을 사용자에게 — 스냅도 복원
  outer.addEventListener('touchstart', () => {
    if (panelAnim === null) return;
    cancelAnimationFrame(panelAnim);
    panelAnim = null;
    outer.style.scrollSnapType = 'y mandatory';
  }, { passive: true });

  tabs.forEach((id, index) => {
    document.getElementById(id).addEventListener('click', e => {
      e.stopPropagation();
      showPanel(index);
    });
  });

  // 손가락 스크롤로 패널이 넘어가면 탭 표시 동기화
  outer.addEventListener('scroll', () => {
    paintTabs(Math.round(outer.scrollTop / outer.clientHeight));
  }, { passive: true });

  // iOS WebKit에서 내부 scroll-body가 경계에 닿았을 때 바깥 스냅 스크롤로
  // 이어지지 않는 문제를 JS로 보완 — 본게임(main.js)과 같은 패턴
  outer.querySelectorAll('.scroll-body').forEach((body, idx) => {
    let startY = 0;
    let chaining = false;

    body.addEventListener('touchstart', e => {
      startY = e.touches[0].clientY;
      chaining = false;
    }, { passive: true });

    body.addEventListener('touchmove', e => {
      if (chaining) return;
      // 내용이 화면에 다 들어오면 네이티브 스냅이 처리 — 실제 내부 스크롤이 있을 때만 보완
      if (body.scrollHeight <= body.clientHeight + 2) return;

      const dy = e.touches[0].clientY - startY;
      const atTop    = body.scrollTop <= 0;
      const atBottom = body.scrollHeight - body.scrollTop <= body.clientHeight + 2;

      if (atTop && dy > 8 && idx > 0) {
        chaining = true;
        showPanel(idx - 1);
      } else if (atBottom && dy < -8 && idx < tabs.length - 1) {
        chaining = true;
        showPanel(idx + 1);
      }
    }, { passive: true });
  });
}

let countdownInterval = null;
let unsubscribeStore = null;
let assigning = false;   // 배정 요청 중복 호출 방지
let entered = false;     // 게임 화면 진입 중복 방지
let pendingMe = null;    // 배정은 완료됐지만 아직 "게임 시작!" 버튼을 누르기 전인 내 정보
let wasInRoster = false; // 명단에서 내 이름을 한 번이라도 확인했는지 — 등록 반영 전 오탐 방지

export function prepareWaiting() {
  entered = false;
  pendingMe = null;
  wasInRoster = false;
  resetTeamTheme();   // 이전에 확인했던 팀 컬러가 대기실(팀 비공개 단계)에 새지 않게
  document.getElementById('waiting-start-btn').style.display = 'none';
  // 대기(카운트다운) 상태 문구로 초기화 — 배정 완료 문구가 남아있을 수 있음
  document.getElementById('waiting-headline').innerHTML = '게임 시작까지<br/>잠시 기다려주세요';
  document.getElementById('waiting-timer-label').textContent = '시작까지';
  document.getElementById('waiting-timer-sub').textContent = '남음';
  refreshRegCount();

  // 홈 패널로 초기화 — 스냅 스크롤을 맨 위(홈)로 즉시 되돌림
  document.getElementById('waiting-scroll').scrollTo({ top: 0, behavior: 'instant' });
  document.getElementById('wtab-home').classList.add('on');
  document.getElementById('wtab-guide').classList.remove('on');

  startCountdown();

  if (unsubscribeStore) unsubscribeStore();
  unsubscribeStore = subscribe(() => {
    refreshRegCount();
    checkKicked();
    checkAssignment();
  });
  checkKicked();     // 진입 시점에 이미 명단이 로드돼 있으면 여기서 wasInRoster를 세워둬야
                     // 이후 변화 없이 삭제만 일어나도 강퇴를 감지할 수 있다
  checkAssignment(); // 이미 배정된 상태로 대기실에 들어온 경우 대비
}

// 관리자가 명단에서 내 이름을 지우면 — 대기 중인 기기도 즉시 저장 기록을 지우고
// 이름 입력 화면으로 돌려보낸다. 방금 등록해서 아직 명단 반영 전인 경우와 구분하기 위해
// "명단에서 한 번이라도 확인된 뒤 사라진" 때만 강퇴로 판정한다.
function checkKicked() {
  if (!isRosterLoaded() || !state.name || getAssignment().assigned) return;
  if (isNameRegistered(state.name)) { wasInRoster = true; return; }
  if (!wasInRoster) return;

  if (unsubscribeStore) { unsubscribeStore(); unsubscribeStore = null; }
  if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
  clearSavedIdentity();
  state.name = '';
  goToScreen('s-name');
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

  // 배정 완료 상태로 화면 문구 전환 — "기다려주세요 + 00:00 남음"이 남아있으면
  // 시작 버튼과 상태가 안 맞아 어색하다
  document.getElementById('waiting-headline').innerHTML = '팀 배정이 끝났어요!<br/>지금 입장하세요';
  document.getElementById('waiting-timer-label').textContent = '배정 상태';
  document.getElementById('waiting-timer').textContent = '완료';
  document.getElementById('waiting-timer-sub').textContent = '입장 가능';
  document.getElementById('waiting-start-btn').style.display = 'block';
}

function enterGame() {
  if (entered || !pendingMe) return;
  entered = true;
  enterAssignedPlayer(pendingMe);
}

// 배정된 내 정보(team/role)를 받아 카드/게임 화면으로 라우팅 —
// 대기실을 거치지 않고 바로 입장하는 name.js에서도 재사용
export function enterAssignedPlayer(me) {
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
