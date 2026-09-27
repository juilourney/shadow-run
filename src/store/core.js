// 스토어 공통 기반 — 모든 도메인 모듈(store/*.js)이 공유하는 상태·구독·헬퍼.
// 화면은 여기를 직접 import하지 않고 src/store.js(공개 창구)만 쓴다.

import { state as identity } from '../state.js';
import { RULES } from '../../shared/rules.js';
import { addDoc, collection, disableNetwork, enableNetwork } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { db } from '../firebase-config.js';

// ── 게임 설정 (룰) ────────────────────────────────────────
// 수치 규칙(배수·한도·임계값)은 서버와 공용 — shared/rules.js. 여기엔 시즌 기본값만 둔다.
export const CONFIG = {
  name: '섀도우 런',             // 게임명 기본값 — 관리자 화면에서 변경 가능
  startDate: '2026-06-28',      // 게임 1일차 (일요일) — 관리자 화면에서 변경 가능
  weeks: 3,                     // 관리자 화면에서 변경 가능
  ...RULES,
};

// 인증 사진 기록 시각과 번개 일정의 허용 오차 — 시작 전·마감 후 양쪽에 같은 값으로 적용한다.
// 이 범위를 벗어나야 '⚠️ 일정과 어긋남'으로 표시한다.
// 화면(bolt-detail)·관리자 심사(certs) 공통 기준 — 한 곳에서 관리한다.
export const CERT_GRACE_MS = 20 * 60 * 1000;

// ── 상태 (스냅샷) — Firestore와 실시간 동기화되는 로컬 캐시 ────
// 마지막으로 받은 게임 설정(시작일·기간)을 기기에 캐시 — 부팅 시 settings onSnapshot이
// 아직 안 왔어도 종료 여부(getCalendar().ended)를 올바로 판정해, 종료 상태면 대시보드를
// 거치지 않고 결과화면으로 바로 라우팅하기 위함(대시보드 플래시 방지).
export const CAL_CACHE_KEY = 'sr_cal';
function loadCachedCal() {
  try {
    const c = JSON.parse(localStorage.getItem(CAL_CACHE_KEY) || 'null');
    if (c && c.startDate && c.weeks) return c;
  } catch {}
  return null;
}
const _cachedCal = loadCachedCal();

// 도메인 모듈들이 공유하는 유일한 가변 상태. 화면에는 절대 노출하지 않는다(store.js가 재노출 안 함).
export const state = {
  game: {
    gauge: { pacer: 0, ghost: 0 },
    name: CONFIG.name,
    startDate: _cachedCal?.startDate ?? CONFIG.startDate,
    weeks: _cachedCal?.weeks ?? CONFIG.weeks,
  },

  voteHistory: [],   // 투표 히스토리 — voteHistory 컬렉션과 동기화
  roster: [],        // 참가자 명단(사전 등록) — roster 컬렉션과 동기화
  rosterLoaded: false,   // roster onSnapshot이 최초 1회라도 도착했는지 (강퇴 판정용)
  assignment: { assigned: false, players: [] },  // 팀·역할 배정 결과 — game/assignment와 동기화
  assignmentLoaded: false,   // game/assignment onSnapshot이 최초 1회라도 도착했는지 (부팅 라우팅 판정용)
  settingsLoaded: false,     // game/settings onSnapshot이 최초 1회라도 도착했는지 (종료 여부 확정용)

  // 나 — 신원은 players[내 이름과 일치하는 항목]이 단일 출처. 여기엔 사적 정보만.
  // abilityLog/revealed는 의도적으로 로컬 전용(동기화 안 함) — 탐정/밀정 조사 결과가
  // 다른 사람에게 노출되면 안 되는데, 로그인이 없어 서버 규칙으로 개인별 보호가 불가능하기 때문.
  me: {
    abilityLog: [],   // [{ week }] — 주간 능력 사용 한도 판정용
    revealed: {},      // { [playerId]: {team} | {role} }
  },

  players: [],   // 배정 완료된 참가자 — players 컬렉션과 동기화
  bolts: [],     // 번개 — bolts 컬렉션과 동기화
  vote: { ballots: [] },  // 투표 지목 — votes 컬렉션과 동기화 (myVotesUsed는 파생값)
  timeline: [],  // 전체 공개 이벤트 — timeline 컬렉션과 동기화
};

// ── 구독 (subscribe/notify) ──────────────────────────────
const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);   // unsubscribe
}

export function notify() {
  listeners.forEach(fn => fn(getSnapshot()));
}

// 읽기 전용 스냅샷 (외부에서 직접 state 변조 방지)
function getSnapshot() {
  return structuredClone(state);
}

// 관리자 전용 서버 액션(명단·게임 설정·배정 초기화) 호출 시 붙이는 인증 헤더.
// 로그인 시 발급받은 토큰을 admin/screens/login.js가 여기에 저장해둔다.
// 참가자 기기는 이 키를 저장한 적이 없으니 항상 빈 헤더 — set-gauge처럼
// 참가자도 호출해야 하는 엔드포인트에는 애초에 붙이지 않는다.
const ADMIN_TOKEN_KEY = 'sr_admin_auth';
export function adminAuthHeaders() {
  const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  return token ? { authorization: `Bearer ${token}` } : {};
}

// 토큰은 "${만료시각ms}.${서명}" 형식이라, 비밀키 없이도 만료 여부를 클라에서 읽을 수 있다.
// 관리자 액션(리셋 등) 전에 검사해, 만료된 토큰으로 서버 호출이 조용히 401 나는 것을 막고
// 재로그인을 유도한다.
export function isAdminTokenValid() {
  try {
    const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) return false;
    const expiry = Number(token.split('.')[0]);
    return !!expiry && Date.now() < expiry;
  } catch { return false; }
}
export function clearAdminToken() {
  try { sessionStorage.removeItem(ADMIN_TOKEN_KEY); } catch {}
}
export const ADMIN_EXPIRED_MSG = '관리자 인증이 만료됐어요. 다시 로그인해 주세요.';

// "홈 화면에 추가"한 PWA(standalone)는 오래 백그라운드에 있다가 돌아오면 iOS가
// 실제 네트워크 소켓까지 완전히 정지시켜, Firestore의 실시간 연결(WebChannel)이
// 끊긴 채로 남아있는 경우가 있다 — SDK의 자체 재연결 로직이 뒤늦게 돌거나 아예
// 멈춰서, 다른 사람이 그 사이 만든 변경사항(번개 시작 등)이 화면에 실시간으로
// 반영되지 않고 새로고침을 해야만 보이는 문제로 이어진다. 앱이 다시 포그라운드로
// 올 때 연결을 강제로 끊었다 다시 붙여 확실하게 재동기화시킨다.
export async function reconnectFirestore() {
  try {
    await disableNetwork(db);
    await enableNetwork(db);
  } catch (err) {
    console.warn('Firestore 재연결 실패:', err.message);
  }
}

export function pushTimelineEvent(entry) {
  addDoc(collection(db, 'timeline'), { ...entry, at: Date.now() })
    .catch(err => console.warn('타임라인 기록 실패:', err.message));
}

// 이름 비교 — 앞뒤 공백·한글 유니코드 정규화(NFC/NFD) 차이를 흡수해 본인 매칭이 어긋나지 않게.
// (카톡 붙여넣기 NFC ↔ 키보드 입력 NFD가 섞이면 ===로는 못 찾아 역할·투표권을 잃는다)
export function nameEq(a, b) {
  return (a || '').normalize('NFC').trim() === (b || '').normalize('NFC').trim();
}

// 나 — players에서 내 이름과 일치하는 항목을 찾음. 배정 전(또는 매칭 실패)에는
// 안전한 기본값을 반환해 초기 렌더링에서 크래시가 나지 않게 한다.
// 팀·역할은 players 문서에서 제거됐다(비밀 분리) — 내 것만 /api/me로 받아 identity에 담긴다.
// 마이그레이션 전 문서에는 아직 남아 있을 수 있어 identity가 비면 문서 값으로 폴백한다.
export function myPlayer() {
  const p = state.players.find(x => nameEq(x.name, identity.name));
  const team = identity.team ?? p?.team ?? null;
  const role = identity.role ?? p?.role ?? null;
  if (p) return { ...p, team, role };
  return {
    id: null, name: identity.name || '', team, role, km: 0,
    publicTeam: null, publicRole: null, penalized: false, abilityStripped: false, boltsCompleted: 0,
  };
}

export function playerById(id) {
  return state.players.find(p => p.id === id);
}
