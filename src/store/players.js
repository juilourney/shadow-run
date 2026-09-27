// 참가자와 나 — players 동기화, 내 정보(getMe)·능력(탐정/밀정)·서버 신원(/api/me) 반영.

import { state as identity } from '../state.js';
import { playerAuthHeaders } from '../auth.js';
import { collection, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { db } from '../firebase-config.js';
import { CONFIG, state, notify, nameEq, myPlayer, pushTimelineEvent } from './core.js';
import { getPhase } from './game.js';
import { getConfirmedRecord, CONFIRMED_KEY } from './session.js';

// 참가자(배정 완료 후 팀·역할·마일리지) — 클라이언트 직접 쓰기
onSnapshot(collection(db, 'players'), snap => {
  state.players = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  notify();
}, err => console.warn('참가자 실시간 동기화 실패:', err.message));

// 팀 적발 −50% 페널티는 '적발 후 CONFIG.penaltyClearBolts번 완주'까지만 유효 — 남은 횟수와 함께 계산.
// (기준점이 없는 구버전 적발자는 0으로 봐 총 완주 수로 판정)
function penaltyState(p) {
  if (!p?.penalized) return { penalized: false, penaltyBoltsLeft: 0 };
  const since = (Number(p.boltsCompleted) || 0) - (Number(p.penalizedAtBolts) || 0);
  const left = CONFIG.penaltyClearBolts - since;
  return { penalized: left > 0, penaltyBoltsLeft: Math.max(0, left) };
}

export function getMe() {
  const p = myPlayer();
  return {
    ...p,
    ...penaltyState(p),
    pureKm: p.km,
    abilityUsed: abilityUsedThisWeek(),
    revealed: { ...state.me.revealed },
    abilityStripped: !!p.abilityStripped,
  };
}

// 남의 team·role은 클라이언트가 알 이유가 없다 — 마이그레이션 전 문서에 남아 있는
// 잔여 필드도 여기서 제거해, 화면·콘솔 어느 쪽으로도 새지 않게 한다.
// (공개된 정체는 publicTeam/publicRole로 따로 내려오므로 영향 없음)
export function getPlayers({ excludeSelf = false } = {}) {
  const list = state.players.map(p => {
    const isSelf = nameEq(p.name, identity.name);
    if (isSelf) return { ...p, ...myPlayer(), isSelf: true };
    const { team, role, ...rest } = p;
    return { ...rest, isSelf: false };
  });
  return excludeSelf ? list.filter(p => !p.isSelf) : list;
}

// 능력 사용 기록·조사 결과 영속화 — 메모리에만 두면 새로고침으로 주간 한도가
// 초기화되고(사실상 무제한 사용) 애써 알아낸 조사 결과도 사라진다.
// 이름·배정(assignedAt)이 함께 저장돼, 재배정·새 시즌·다른 이름 입장 시엔 자동 폐기.
export const ME_PERSIST_KEY = 'sr_me';
const REVEALS_RESET_KEY = 'sr_reveals_reset';   // 서버가 마지막으로 알린 역할 조사 초기화 시각(기기별 반영 기록)
let _meLoadedFor = null;

function ensureMeLoaded() {
  const key = `${identity.name}|${state.assignment.assignedAt}`;
  if (_meLoadedFor === key) return;
  _meLoadedFor = key;
  state.me.abilityLog = [];
  state.me.revealed = {};
  try {
    const saved = JSON.parse(localStorage.getItem(ME_PERSIST_KEY) || 'null');
    if (saved && saved.name === identity.name && saved.assignedAt === state.assignment.assignedAt) {
      state.me.abilityLog = saved.abilityLog || [];
      state.me.revealed = saved.revealed || {};
      if (typeof saved.abilityUsed === 'number') state.me.abilityUsed = saved.abilityUsed;
    }
  } catch {}
}

function persistMe() {
  try {
    localStorage.setItem(ME_PERSIST_KEY, JSON.stringify({
      name: identity.name,
      assignedAt: state.assignment.assignedAt,
      abilityLog: state.me.abilityLog,
      abilityUsed: state.me.abilityUsed,
      revealed: state.me.revealed,
    }));
  } catch {}
}

// /api/me 응답을 반영 — 팀·역할은 identity에, 능력 사용량·조사 결과는 state.me에.
// 조사 결과가 서버에 남으니 캐시를 지워도 애써 알아낸 정보가 사라지지 않는다.
export function applyServerMe(data) {
  if (!data) return;
  identity.name = data.name || identity.name;
  identity.team = data.team ?? null;
  identity.role = data.role ?? null;

  // 재배정 감지 — 이 기기에서 확인했던 역할과 서버 역할이 달라졌으면(같은 배정 안에서),
  // 앱에서 "역할이 재배정됐다"는 알림을 띄우고 확인 기록을 새 역할로 갱신한다.
  // 확인 기록은 assignedAt·team을 그대로 보존하고 role만 갱신한다 — 부팅 초기엔 배정
  // 스냅샷이 아직 안 왔을 수 있어 markRoleConfirmed(state.assignment.assignedAt 사용)를
  // 쓰면 assignedAt이 깨질 수 있기 때문(카드 재노출 유발).
  try {
    const confirmed = getConfirmedRecord();
    if (confirmed && confirmed.role && data.role
        && confirmed.role !== data.role
        && confirmed.assignedAt === (data.assignedAt ?? confirmed.assignedAt)) {
      _reassignNotice = { from: confirmed.role, to: data.role };
      localStorage.setItem(CONFIRMED_KEY, JSON.stringify({
        name: confirmed.name, assignedAt: confirmed.assignedAt, team: confirmed.team, role: data.role,
      }));
    }
  } catch {}

  ensureMeLoaded();
  if (data.ability) {
    state.me.abilityUsed = Number(data.ability.used) || 0;
    if (data.ability.revealed && Object.keys(data.ability.revealed).length) {
      state.me.revealed = { ...state.me.revealed, ...data.ability.revealed };
    }
    persistMe();
  }

  // 역할 재배정 시 서버가 낡은 '역할' 조사 결과를 지우고 revealsResetAt를 올린다. 클라이언트도
  // 이 신호가 오르면(기기별 1회) 로컬 revealed에서 역할 조사만 지워(팀 조사는 유지) 재조사 가능하게 한다.
  // 서버는 머지(merge)라 서버가 비워도 로컬에 남으므로, 이 prune이 실제로 로컬 캐시를 지운다.
  try {
    const serverReset = data.revealsResetAt ?? null;
    if (serverReset && String(serverReset) !== localStorage.getItem(REVEALS_RESET_KEY)) {
      const kept = {};
      for (const [tid, v] of Object.entries(state.me.revealed || {})) {
        if (!(v && v.role !== undefined)) kept[tid] = v;   // 팀 조사만 유지, 역할 조사는 제거
      }
      state.me.revealed = kept;
      localStorage.setItem(REVEALS_RESET_KEY, String(serverReset));
      persistMe();
    }
  } catch {}

  notify();
}

// 역할 재배정 알림 — applyServerMe가 감지하면 담아두고, 화면이 한 번 꺼내 표시한다.
let _reassignNotice = null;
export function takeReassignNotice() {
  const n = _reassignNotice;
  _reassignNotice = null;
  return n;
}

// 서버가 준 사용량이 정답. 아직 한 번도 못 받은 기기는 예전 로컬 기록으로 표시만 채운다.
function abilityUsedThisWeek() {
  ensureMeLoaded();
  if (typeof state.me.abilityUsed === 'number') return state.me.abilityUsed;
  const { week } = getPhase();
  return state.me.abilityLog.filter(e => e.week === week).length;
}

export function getAbility() {
  ensureMeLoaded();
  const meP = myPlayer();
  const stripped = !!meP.abilityStripped;
  const isSpecial = (meP.role === 'detective' || meP.role === 'spy') && !stripped;
  const used = abilityUsedThisWeek();
  return {
    isSpecial,
    stripped,
    kind: meP.role === 'detective' ? 'team' : meP.role === 'spy' ? 'role' : null,
    limit: CONFIG.abilityWeeklyLimit,
    used,
    left: stripped ? 0 : CONFIG.abilityWeeklyLimit - used,
    revealed: { ...state.me.revealed },
  };
}

// 탐정/밀정 능력 사용 — 결과 판정은 서버(/api/investigate)만 한다.
// 예전엔 클라이언트가 이미 갖고 있던 전원 데이터에서 꺼내 썼기 때문에, 능력이 없어도
// 한도를 넘겨도 콘솔에서 얼마든지 볼 수 있었다.
export async function useAbility(targetId) {
  ensureMeLoaded();
  if (state.me.revealed[targetId]) return state.me.revealed[targetId];

  const res = await fetch('/api/investigate', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...playerAuthHeaders() },
    body: JSON.stringify({ targetId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '조사에 실패했습니다');

  const result = data.team !== undefined ? { team: data.team } : { role: data.role };
  state.me.revealed[targetId] = result;
  state.me.abilityUsed = data.used;
  persistMe();

  pushTimelineEvent({ kind: 'ability', abilityRole: myPlayer().role });

  notify();
  return result;
}
