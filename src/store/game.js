// 게임 전체 — 게이지·게임 설정(캘린더·단계)·타임라인, 관리자 신규 게임 생성.

import { doc, collection, onSnapshot, setDoc, deleteDoc, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { db } from '../firebase-config.js';
import { CONFIG, CAL_CACHE_KEY, state, notify, adminAuthHeaders, isAdminTokenValid, clearAdminToken, ADMIN_EXPIRED_MSG } from './core.js';
import { removeRosterMember, resetAssignment } from './roster.js';

// ═══════════════════════════════════════════════════════════
//  Firestore 실시간 동기화
// ═══════════════════════════════════════════════════════════

// 게이지 — 쓰기는 서버만. 게이지는 승부 조건이라 set-gauge는 관리자 인증 필요.
// 정상 게임 중 게이지 변경(번개 완료·만료)은 /api/complete-bolt·/api/expire-bolt가
// 서버 내부에서 처리한다. 문서가 없으면 기본 0/0 유지(생성은 서버 리셋만).
const gaugeDocRef = doc(db, 'game', 'gauge');
onSnapshot(gaugeDocRef, snap => {
  if (snap.exists()) state.game.gauge = snap.data();
  notify();
}, err => console.warn('게이지 실시간 동기화 실패:', err.message));

// 절대값 기록 — 신규 게임 리셋 전용(관리자). set-gauge가 admin 인증을 요구하므로 헤더 포함.
function writeGauge() {
  fetch('/api/set-gauge', {
    method: 'POST', headers: { 'content-type': 'application/json', ...adminAuthHeaders() },
    body: JSON.stringify(state.game.gauge),
  }).catch(err => console.warn('게이지 저장 실패:', err.message));
}

// 증감 기록 — 관리자 인증 심사 불인정 원복 전용(관리자 화면에서만 호출). 로컬 즉시 반영 포함.
export function applyGaugeDelta(delta) {
  if (!delta.pacer && !delta.ghost) return;
  state.game.gauge.pacer = Math.max(0, state.game.gauge.pacer + delta.pacer);
  state.game.gauge.ghost = Math.max(0, state.game.gauge.ghost + delta.ghost);
  fetch('/api/set-gauge', {
    method: 'POST', headers: { 'content-type': 'application/json', ...adminAuthHeaders() },
    body: JSON.stringify({ pacerDelta: delta.pacer, ghostDelta: delta.ghost }),
  }).catch(err => console.warn('게이지 증감 저장 실패:', err.message));
}

// 게임 설정(이름·시작일·기간) — 쓰기는 서버(/api/set-game-settings)만
const settingsDocRef = doc(db, 'game', 'settings');
onSnapshot(settingsDocRef, snap => {
  if (snap.exists()) {
    const { name, startDate, weeks } = snap.data();
    Object.assign(state.game, { name, startDate, weeks });
    try { localStorage.setItem(CAL_CACHE_KEY, JSON.stringify({ startDate, weeks })); } catch {}
  } else {
    writeGameSettings();
  }
  state.settingsLoaded = true;
  maybeTriggerReassign();
  notify();
}, err => console.warn('게임 설정 실시간 동기화 실패:', err.message));

// 2주차 시작(일요일 00:00 KST) 이후 첫 접속 때 서버 재배정을 한 번 트리거한다.
// 서버가 시각·1회 게이트로 실제 실행 여부를 정하므로, 여기선 세션당 1회만 쏘면 된다.
// (재배정 자체는 서버가 랜덤으로 처리 — 클라는 결과에 관여하지 않는다)
let _reassignTried = false;
function maybeTriggerReassign() {
  if (_reassignTried) return;
  const { startDate } = state.game;
  if (!startDate) return;
  const [y, m, d] = startDate.split('-').map(Number);
  const week2Start = Date.UTC(y, m - 1, d + 7) - 9 * 3600 * 1000;   // 2주차 시작 00:00 KST
  if (Date.now() < week2Start) return;
  _reassignTried = true;
  fetch('/api/reassign-roles', { method: 'POST', headers: { 'content-type': 'application/json' } })
    .catch(() => {});
}

function writeGameSettings() {
  return fetch('/api/set-game-settings', {
    method: 'POST', headers: { 'content-type': 'application/json', ...adminAuthHeaders() },
    body: JSON.stringify({ name: state.game.name, startDate: state.game.startDate, weeks: state.game.weeks }),
  }).catch(err => console.warn('게임 설정 저장 실패:', err.message));
}

// 타임라인 — 클라이언트 직접 쓰기
onSnapshot(collection(db, 'timeline'), snap => {
  state.timeline = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  notify();
}, err => console.warn('타임라인 실시간 동기화 실패:', err.message));

// 줄다리기 기간 결과를 타임라인에 영구 기록한다. 팀 중립(주차만 저장)이라 보는 사람의
// 팀 기준으로 탭 시 계산한다. 고정 id로 setDoc하므로 여러 기기가 동시에 써도 같은 문서에
// 겹쳐 써 중복이 안 생기고, at=기간종료시각이라 값도 항상 같다.
// id는 startDate 기반 — seasonId는 부팅 시점에 따라 아직 안 실려(undefined) 기기마다 id가
// 갈려 중복 문서가 생긴 사고가 있었다. startDate는 줄다리기 window가 존재하는 한 항상 있다.
export function recordTugResult(week, endMs) {
  const id = `tug-${state.game.startDate ?? 's'}-w${week}`;
  setDoc(doc(db, 'timeline', id), { kind: 'tug', week, at: endMs })
    .catch(err => console.warn('줄다리기 기록 실패:', err.message));
}

// ═══════════════════════════════════════════════════════════
//  SELECTORS — 계산된 값 (화면은 규칙을 몰라도 됨)
// ═══════════════════════════════════════════════════════════

export function getGauge() {
  const { pacer, ghost } = state.game.gauge;
  const total = pacer + ghost || 1;
  return {
    pacer, ghost,
    diff: pacer - ghost,
    leader: pacer === ghost ? null : (pacer > ghost ? 'pacer' : 'ghost'),
    pacerRatio: pacer / total,
    ghostRatio: ghost / total,
  };
}

// 게임 캘린더 — state.game.startDate + weeks 를 단일 출처로 파생값 계산.
export function getCalendar(now = new Date()) {
  const { startDate, weeks } = state.game;
  const [y, m, d] = startDate.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const totalDays = weeks * 7;
  const end = new Date(start);
  end.setDate(start.getDate() + totalDays);

  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayIndex = Math.round((today0 - start) / 86400000);
  const started = dayIndex >= 0;
  const ended = dayIndex >= totalDays;
  const week = !started ? 0 : (ended ? weeks : Math.floor(dayIndex / 7) + 1);
  const dday = Math.ceil((end - today0) / 86400000);
  const monthLabel = `${now.getFullYear()} ${now.toLocaleDateString('en-US', { month: 'long' })}`;

  return { start, end, dayIndex, totalDays, week, weeks, started, ended, dday, monthLabel };
}

// 투표 시간(게임 기간 중 월·목 18~22시) 여부 — vote.js와 대시보드 공개 판정이 공유
export function isVoteWindowNow(now = new Date()) {
  const cal = getCalendar(now);
  if (!cal.started || cal.ended) return false;
  const day = now.getDay(), hour = now.getHours();
  return (day === 1 || day === 4) && hour >= 18 && hour < 22;
}

// 팀 마일리지 "숫자" 공개 여부 — 평소엔 게이지 바(비율)만 보여 개별 번개의
// 증가분으로 참가자 팀·역할을 역추적하는 것을 막는다. 정확한 수치는
// ① 투표 시간 동안(추리 재료) ② 종료 3일 전부터(마지막 줄다리기 스퍼트) 공개.
export function isGaugeNumbersPublic(now = new Date()) {
  const cal = getCalendar(now);
  if (cal.ended) return true;
  if (cal.started && cal.dday <= 3) return true;
  return isVoteWindowNow(now);
}

// 현재 단계: 탐색전(1~4일차) / 줄다리기(5~7일차) — startDate 기준 경과일로 판정.
// 게임 시작 전(dayIndex 음수)에는 나머지 연산이 6 등으로 감겨 줄다리기로 오판되므로
// (상대 게이지를 깎는 규칙이 잘못 발동) 시작 전에는 항상 탐색전으로 취급한다.
export function getPhase(now = new Date()) {
  const cal = getCalendar(now);
  const gameDay = ((cal.dayIndex % 7) + 7) % 7;
  const isTug = cal.started && gameDay >= 4 && gameDay <= 6;
  return {
    phase: isTug ? 'tug' : 'scout',
    isTug,
    label: isTug ? '줄다리기 진행 중' : '탐색전',
    days: isTug ? '목 · 금 · 토' : '일 · 월 · 화 · 수',
    week: cal.week,
    dday: cal.dday,
    started: cal.started,
    ended: cal.ended,
  };
}

export function getTimeline() {
  return [...state.timeline].sort((a, b) => b.at - a.at);
}

// ── 관리자 화면(A-02·A-03) 전용 셀렉터 ────────────────────
export function getGameSettings() {
  const cal = getCalendar();
  return {
    name: state.game.name,
    startDate: state.game.startDate,
    weeks: state.game.weeks,
    status: !cal.started ? 'scheduled' : (cal.ended ? 'ended' : 'ongoing'),
    ...cal,
  };
}

// game/settings onSnapshot이 최초 1회라도 도착했는지 — 종료 여부(getCalendar().ended)를
// 캐시가 아닌 실제 값으로 확정할 수 있는지 판정(부팅 라우팅에서 결과화면 직행 결정에 사용).
export function isSettingsLoaded() {
  return state.settingsLoaded;
}

// ═══════════════════════════════════════════════════════════
//  ACTIONS
// ═══════════════════════════════════════════════════════════

// 관리자 — 신규 게임 생성. 이전 게임의 게이지·배정·번개·투표·타임라인·참가자 명단을 전부 삭제하고 새로 시작.
export async function createNewGame({ name, startDate, weeks }) {
  // 토큰이 만료됐으면 아래 서버 쓰기들이 전부 401로 조용히 실패해 "리셋했는데 그대로"가 된다.
  // 먼저 막고 재로그인을 유도한다.
  if (!isAdminTokenValid()) { clearAdminToken(); throw new Error(ADMIN_EXPIRED_MSG); }
  // 게임명은 관리자 대시보드 제목에만 쓰이는 라벨 — 비우면 기본값으로.
  state.game.name = (name || '').trim() || CONFIG.name;
  state.game.startDate = startDate;
  state.game.weeks = Number(weeks);
  state.game.gauge = { pacer: 0, ghost: 0 };

  writeGauge();
  await writeGameSettings();

  // certPhotos는 클라이언트 쓰기가 막힌 컬렉션 — 서버 리셋(/api/assign-teams reset)이 함께 지운다
  await Promise.all(
    ['bolts', 'votes', 'voteHistory', 'timeline'].map(async coll => {
      const snap = await getDocs(collection(db, coll));
      return Promise.all(snap.docs.map(d => deleteDoc(doc(db, coll, d.id))));
    })
  );

  // 참가자 명단도 새 시즌마다 새로 모집 — roster는 서버 전용 쓰기라 관리자 인증이 붙은
  // removeRosterMember(각 항목 삭제 API 호출)로 지운다.
  await Promise.all(state.roster.map(r => removeRosterMember(r.id).catch(err => console.warn('명단 삭제 실패:', err.message))));

  // 배정 초기화는 맨 마지막에 확정 — 정리 도중 대기실을 띄워둔 다른 기기가 옛 시작일 기준으로
  // 자동 배정을 먼저 실행해버려도(구 명단으로), 이 마지막 호출이 최종 승자가 되어 assigned:false로 되돌린다.
  await resetAssignment();

  notify();
  return getGameSettings();
}
