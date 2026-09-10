import { createTabbar }   from './components/tabbar.js';
import { createEdgeBlur } from './components/edge-blur.js';
import { createFaq }      from './components/faq.js';
import { goToScreen, syncTabbarOnScroll, reengageScrollSnap } from './utils/nav.js';
import { state } from './state.js';
import { getConfirmedRecord, getSavedName, clearConfirmedRecord, clearSavedIdentity, isSavedNameStale, isNameRegistered, getAssignment, isAssignmentLoaded, isRosterLoaded, isSettingsLoaded, subscribe, reconnectFirestore, getCalendar, joinRoster, nameEq, applyServerMe, takeReassignNotice, ROLES } from './store.js';
import { applyTeamTheme } from './utils/theme.js';
import { initPhase } from './utils/phase.js';

import * as name       from './screens/name.js';
import * as card       from './screens/card.js';
import * as role       from './screens/role.js';
import * as dash       from './screens/dash.js';
import * as bolt       from './screens/bolt.js';
import * as boltJoin     from './screens/bolt-join.js';
import * as boltDetail   from './screens/bolt-detail.js';
import * as boltProgress from './screens/bolt-progress.js';
import * as boltBuff     from './screens/bolt-buff.js';
import * as boltResult   from './screens/bolt-result.js';
import * as vote       from './screens/vote.js';
import * as members    from './screens/members.js';
import * as guide      from './screens/guide.js';
import * as waiting    from './screens/waiting.js';
import { enterAssignedPlayer, prepareWaiting } from './screens/waiting.js';
import { fetchMe, playerLogin } from './auth.js';
import * as end        from './screens/end.js';

const INTRO    = [name, card, role, waiting];
const GAME     = [dash, bolt, vote, members, guide];
const OVERLAYS = [boltJoin, boltDetail, boltProgress, boltBuff, boltResult, end];

const app = document.getElementById('app');

// 인트로 화면 (innerHTML으로 한번에)
app.innerHTML = INTRO.map(s => s.render()).join('');

// 고정 배경 orb
const gameBg = document.createElement('div');
gameBg.id = 'game-bg';
gameBg.innerHTML = '<div class="game-orb-a"></div><div class="game-orb-b"></div>';
app.appendChild(gameBg);

// 게임 컨테이너
const gameWrap = document.createElement('div');
gameWrap.id = 's-game';
gameWrap.className = 'game-wrap';
gameWrap.innerHTML = GAME.map(s => s.render()).join('');
app.appendChild(gameWrap);

// 오버레이 화면
OVERLAYS.forEach(s => {
  const tmp = document.createElement('div');
  tmp.innerHTML = s.render();
  app.appendChild(tmp.firstElementChild);
});

[...INTRO, ...GAME, ...OVERLAYS].forEach(s => s.init());

createTabbar(app);
createEdgeBlur(app);
createFaq(app);

// 손가락 스와이프로 섹션이 바뀌면 탭바 동기화 + 알약을 진행도만큼 이동.
// 예전엔 IntersectionObserver로 '어느 섹션이 화면의 절반을 넘었나'를 봤는데,
// 가로 스냅에서는 스크롤 위치 하나로 정확히 알 수 있어 더 단순하다.
const SECTION_IDS = ['gs-dash', 'gs-bolt', 'gs-vote', 'gs-members', 'gs-guide'];
const pill = document.getElementById('tabbar-pill');
const tabEls = [...document.querySelectorAll('#global-tabbar .tab')];

// 첫/마지막 섹션에서 더 밀면 고무줄 바운스로 scrollLeft가 범위를 벗어난다 —
// 그 값을 그대로 쓰면 알약이 바 바깥으로 빠져나가므로 가둔다.
function sectionPos() {
  const raw = gameWrap.scrollLeft / gameWrap.clientWidth;
  return Math.max(0, Math.min(SECTION_IDS.length - 1, raw || 0));
}

let _tabRaf = null;
gameWrap.addEventListener('scroll', () => {
  if (_tabRaf) return;
  _tabRaf = requestAnimationFrame(() => {
    _tabRaf = null;
    const pos = sectionPos();
    syncTabbarOnScroll(SECTION_IDS[Math.round(pos)]);
    const w = tabEls[0]?.offsetWidth;
    if (pill && w) {
      pill.style.width = `${w}px`;
      pill.style.transform = `translateX(${w * pos}px)`;
    }
  });
}, { passive: true });

// 화면 회전이나 주소창 접힘으로 뷰포트 폭이 바뀌면 scrollLeft가 새 폭과 어긋나
// 섹션이 어중간하게 걸린다 — 리사이즈가 잦아들면 가장 가까운 섹션으로 다시 맞춘다.
let _resnapTimer = null;
function resnapNearestSection() {
  if (!gameWrap.classList.contains('active')) return;
  if (document.documentElement.classList.contains('lock-scroll')) return;
  const i = Math.round(sectionPos());
  gameWrap.scrollLeft = gameWrap.clientWidth * i;
}
function onViewportResize() {
  clearTimeout(_resnapTimer);
  _resnapTimer = setTimeout(resnapNearestSection, 250);
}
window.addEventListener('resize', onViewportResize);
window.visualViewport?.addEventListener('resize', onViewportResize);

// "홈 화면에 추가"한 PWA(standalone)는 백그라운드→포그라운드 전환이 일반 브라우저
// 탭처럼 새로고침되지 않고 그대로 이어지므로, 복귀 시점에 몇 가지를 직접
// 재점검해야 한다:
//  - scroll-snap 재인식(게임 화면일 때만 의미 있음)
//  - Firestore 실시간 연결 재확인(오래 백그라운드에 있으면 iOS가 소켓까지
//    끊어버려, 그 사이 다른 사람이 만든 변경(번개 시작 등)이 반영 안 된 채로
//    남는 문제가 있어 화면 종류와 무관하게 항상 재연결을 시도한다)
// 배포된 새 버전 자동 감지 — PWA(홈 화면 앱)는 새 배포가 나가도 실행 중인 옛 코드를
// 계속 쓴다(예: 결과 저장 기능이 배포됐어도 옛 코드로 인증하면 결과가 저장되지 않음).
// 복귀 시점마다(5분 스로틀) 서버의 index.html 버전(?v=)을 확인해 다르면 새로고침한다.
let _lastVersionCheck = 0;
async function checkForUpdate() {
  const now = Date.now();
  if (now - _lastVersionCheck < 5 * 60 * 1000) return;
  _lastVersionCheck = now;
  try {
    const html = await (await fetch('/', { cache: 'no-store' })).text();
    const server = html.match(/main\.js\?v=(\d+)/)?.[1];
    const mine = document.querySelector('script[src*="main.js"]')?.src.match(/v=(\d+)/)?.[1];
    if (server && mine && server !== mine) window.location.reload();
  } catch {}
}

function onAppResume(e) {
  if (document.hidden) return;
  // 최초 페이지 로드의 pageshow는 제외 — 연결이 새것이라 재연결이 불필요할 뿐 아니라,
  // disableNetwork 순간 Firestore가 "빈 캐시" 스냅샷을 쏴서 부팅 라우팅(배정 로드 판정)이
  // 배정 없음으로 오판하는 원인이 된다. bfcache 복원(persisted)일 때만 재연결.
  if (e.type === 'pageshow' && !e.persisted) return;
  checkForUpdate();
  reconnectFirestore();
  if (document.getElementById('s-game')?.classList.contains('active')) reengageScrollSnap();
}
document.addEventListener('visibilitychange', onAppResume);
window.addEventListener('pageshow', onAppResume);


// iOS는 키보드가 올라와 있는 동안 html의 overflow:hidden(lock-scroll)을 무시하고
// 배경 문서를 손가락으로 스크롤할 수 있게 풀어버린다 — 번개 만들기 등 입력 화면
// 밑에서 게임 섹션이 위아래로 흘러다니는 문제. 잠금 중에는 오버레이 내부의 실제
// 스크롤 영역(overflow auto/scroll + 넘치는 내용)이 아닌 곳의 touchmove를 직접 차단한다.
document.addEventListener('touchmove', e => {
  if (!document.documentElement.classList.contains('lock-scroll')) return;
  if (!e.cancelable) return;
  let el = e.target;
  while (el && el !== document.documentElement) {
    if (el.scrollHeight > el.clientHeight + 2) {
      const oy = getComputedStyle(el).overflowY;
      if (oy === 'auto' || oy === 'scroll') return;   // 오버레이 내부 스크롤은 허용
    }
    el = el.parentElement;
  }
  e.preventDefault();
}, { passive: false });

// 이름은 알지만 이 배정에서의 확인은 안 된 상태 — 로드된 배정 기준으로 화면을 정한다.
//   - 배정에 내 이름이 있으면 → 카드/게임 화면(확인 여부는 enterAssignedPlayer가 판단)
//   - 게임 진행 중(배정 완료)인데 내 이름이 없으면 → 중간 난입 불가, 이름 화면으로
//   - 배정 전(모집 기간)이고 명단에 있으면 → 대기실 / 명단에 없으면(관리자 삭제) → 이름 화면
// 신원 복원 — 팀·역할은 이제 Firestore 공개 문서에 없고 서버만 안다.
// 토큰이 있으면 /api/me로 받아오고, 없으면(기존 참가자의 첫 접속) 저장된 이름으로
// 자동 입장해 이 기기를 이름에 묶는다. 참가자 입장에선 아무 조작도 필요 없다.
async function restoreIdentity(name) {
  let me = await fetchMe();
  if (!me && name) {
    try { me = await playerLogin(name); } catch { me = null; }   // 오프라인·미배정 — 캐시된 확인 기록으로 진행
  }
  if (me) applyServerMe(me);
  return me;
}

async function routeByAssignment(name) {
  // 관리자가 그 사이 "신규 게임 생성"으로 새 시즌을 열었으면, 이 기기가 기억하고 있던
  // 이전 시즌 이름으로 조용히 재등록되지 않도록 기록을 지우고 이름 입력부터 다시 받는다.
  // (확인 완료 기기의 stale 복구 경로와 단순 "이름 기억하기" 경로 양쪽에서 공유하는 최종 관문)
  if (isSavedNameStale()) {
    clearSavedIdentity();
    goToScreen('s-name');
    return;
  }
  const { assigned, players } = getAssignment();
  const me = assigned ? players.find(p => p.name === name) : null;
  if (me) {
    // 배정 문서에는 이름만 남아 있다 — 팀·역할은 서버에서 받아온다.
    // 네트워크가 안 되면 이 기기에 남은 확인 기록으로 진행(예전과 같은 오프라인 동작).
    const srv = await restoreIdentity(name);
    enterAssignedPlayer(srv || getConfirmedRecord() || me);
  } else if (assigned) {
    goToScreen('s-name');
  } else if (isNameRegistered(name)) {
    joinRoster(name).catch(() => {});   // 재접속(자동로그인)에도 '입장' 도장(enteredAt) 갱신 — 수정 전 입장자도 다음 접속 때 자동 반영
    goToScreen('s-waiting');
    prepareWaiting();
  } else {
    // 같은 시즌에 명단에서 이름이 사라지는 경로는 관리자 삭제뿐 — 자동 재등록으로
    // 이름을 되살리지 않고, 저장된 기록을 지우고 처음(이름 입력)부터 다시 받는다.
    clearSavedIdentity();
    goToScreen('s-name');
  }
}

// 이 기기에 저장된 이름(마지막 입장 이름 또는 카드·역할 확인 기록)이 있으면
// 이름 입력 화면을 건너뛰고 자동 입장시킨다. 잘못 저장된 경우를 위한 탈출구는
// 대기실의 "다른 이름으로 입장" 버튼(clearSavedIdentity).
// URL에 ?reset 이 있으면 저장된 신원(이름·확인 기록)을 지우고 이름 입력부터 다시 시작한다 —
// 이름이 잘못 저장돼 본인(역할·투표권)을 못 찾는 기기의 탈출구(게임 중엔 대기실 버튼을 못 보므로).
const wantsReset = new URLSearchParams(location.search).has('reset');
if (wantsReset) clearSavedIdentity();
const confirmed = wantsReset ? null : getConfirmedRecord();
const rememberedName = wantsReset ? null : (confirmed?.name || getSavedName());

if (confirmed && confirmed.team && confirmed.role) {
  // 카드·역할까지 확인한 기기 — 저장된 팀·역할로 Firestore 응답을 기다리지 않고
  // 즉시 게임 화면으로. (PWA 재개 시 Firestore 재연결이 느려도 준비/카드 화면으로
  // 잘못 튕기지 않게 한다.) 배정이 실제로 로드된 뒤 재배정·명단 이탈이 확인되면
  // 확인 기록만 지우고(이름은 유지) 새 배정 기준으로 다시 라우팅한다.
  state.name = confirmed.name;
  state.team = confirmed.team;
  state.role = confirmed.role;
  state.cardFlipped = true;
  state.roleFlipped = true;
  state.roleConfirmed = true;
  applyTeamTheme(confirmed.team);
  initPhase();
  // 화면은 저장된 팀·역할로 즉시 띄우되, 능력·투표 집계 호출에 필요한 토큰은
  // 뒤에서 조용히 확보한다(기존 참가자의 첫 접속이면 여기서 기기가 바인딩된다).
  restoreIdentity(confirmed.name);
  // 대시보드 플래시 방지 — 종료 여부는 실제 settings(startDate·weeks)에 달렸는데 캐시는
  // 낡을 수 있어(끝났는데 '안 끝남'으로 오판 → 대시보드 보였다가 s-end로 튐), 실제 settings가
  // 로드된 뒤에 진입 화면을 정한다. 그 사이엔 부팅 게이트(검은 화면)가 덮고 있어 아무것도 안 비침.
  // settings가 안 오는 경우(오프라인 등)엔 폴백으로 캐시 기준 진입.
  let entered = false;
  const enterFromConfirmed = () => {
    if (entered) return;
    entered = true;
    if (getCalendar().ended) { end.openEndView(); goToScreen('s-end'); }
    else goToScreen('s-game');
  };
  if (isSettingsLoaded()) {
    enterFromConfirmed();
  } else {
    const unsubEnter = subscribe(() => { if (isSettingsLoaded()) { unsubEnter(); enterFromConfirmed(); } });
    setTimeout(enterFromConfirmed, 1500);   // 오프라인 폴백
  }

  const unsub = subscribe(() => {
    // routeByAssignment가 배정과 명단을 모두 판정 근거로 쓰므로 둘 다 로드된 뒤에만
    if (!isAssignmentLoaded() || !isRosterLoaded()) return;
    unsub();
    const { assigned, assignedAt, players } = getAssignment();
    const stillValid = assigned && assignedAt === confirmed.assignedAt
      && players.some(p => nameEq(p.name, confirmed.name));
    if (!stillValid) {
      clearConfirmedRecord();   // 이름은 유지, 확인 기록만 삭제
      routeByAssignment(confirmed.name);
    }
  });
} else if (!rememberedName) {
  goToScreen('s-name');
} else {
  state.name = rememberedName;
  let resolved = false;
  let unsub = null;
  const finish = () => {
    if (resolved) return;
    resolved = true;
    if (unsub) unsub();
  };
  // 배정·명단·설정 문서가 아직 로드되지 않았으면(=Firestore 연결/동기화 전) 화면 판정을
  // 하지 않고 계속 기다린다. 셋 다 로드된 뒤에만 라우팅한다(설정=종료 여부 확정 → s-end 직행 판정).
  const decide = () => {
    if (resolved || !isAssignmentLoaded() || !isRosterLoaded() || !isSettingsLoaded()) return;
    finish();
    routeByAssignment(rememberedName);
  };
  unsub = subscribe(decide);
  decide();
}

// ── 역할 재배정 알림 ───────────────────────────────────────
// 2주차 엘리트·앵커 재배정으로 내 역할이 바뀌면(applyServerMe가 감지), 앱에서 한 번 알린다.
const ROLE_ABILITY = {
  elite: '번개 마일리지가 2배로 적립됩니다.',
  anchor: '번개 마일리지만큼 상대 게이지를 깎아옵니다(양방향).',
  double: '투표에서 2표를 행사합니다.',
  detective: '주 3회, 누군가의 팀을 확인할 수 있습니다.',
  spy: '주 3회, 누군가의 역할을 확인할 수 있습니다.',
  runner: '이번 재배정으로 특수 능력이 없는 러너가 되었습니다.',
};
function showReassignModal({ to }) {
  if (document.getElementById('reassign-modal')) return;
  const roleName = ROLES[to]?.name ?? to;
  const gained = to !== 'runner';
  const wrap = document.createElement('div');
  wrap.id = 'reassign-modal';
  wrap.style.cssText = `position:fixed; inset:0; z-index:9999; display:flex; align-items:center;
    justify-content:center; padding:28px; background:rgba(0,0,0,.72); backdrop-filter:blur(6px);`;
  wrap.innerHTML = `
    <div style="max-width:340px; width:100%; background:#141416; border:1px solid ${gained ? 'rgba(250,204,21,.35)' : 'rgba(255,255,255,.1)'};
      border-radius:24px; padding:26px 24px; text-align:center; box-shadow:0 24px 60px rgba(0,0,0,.6);">
      <div style="font-size:40px; margin-bottom:10px;">${gained ? '✨' : '🔔'}</div>
      <p style="font-size:12px; color:#71717a; letter-spacing:.06em; margin-bottom:6px;">2주차 역할 재배정</p>
      <h2 style="font-size:22px; font-weight:800; margin-bottom:10px; color:${gained ? '#facc15' : '#fafafa'};">
        ${gained ? `당신은 이제 <span style="color:${gained ? '#facc15' : '#fafafa'};">${roleName}</span>!` : '역할이 바뀌었어요'}
      </h2>
      <p style="font-size:14px; color:#a1a1aa; line-height:1.6; margin-bottom:22px;">${ROLE_ABILITY[to] ?? ''}</p>
      <button id="reassign-ok" style="width:100%; height:50px; border:none; border-radius:15px; cursor:pointer;
        font-size:16px; font-weight:700; color:#fff;
        background:${gained ? 'linear-gradient(135deg,#eab308,#f59e0b)' : 'rgba(255,255,255,.1)'};">확인</button>
    </div>`;
  document.body.appendChild(wrap);
  wrap.querySelector('#reassign-ok').addEventListener('click', () => wrap.remove());
}
subscribe(() => {
  const notice = takeReassignNotice();
  if (notice) showReassignModal(notice);
});
