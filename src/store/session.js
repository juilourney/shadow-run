// 이 기기에 저장된 신원 — 입장한 이름·시즌, 카드·역할 확인 기록(localStorage).

import { state as identity } from '../state.js';
import { clearPlayerAuth } from '../auth.js';
import { state } from './core.js';
import { ME_PERSIST_KEY } from './players.js';

// 이 기기에서 카드·역할 확인(뒤집기)을 이미 마쳤는지 — localStorage에 저장.
// 배정(assignedAt)이 바뀌면(재배정·새 게임) 자동으로 무효화되어 다시 확인 절차를 거친다.
export const CONFIRMED_KEY = 'sr_confirmed';

export function hasConfirmedRole() {
  try {
    const saved = JSON.parse(localStorage.getItem(CONFIRMED_KEY) || 'null');
    return !!saved && !!saved.team && !!saved.role
      && saved.name === identity.name && saved.assignedAt === state.assignment.assignedAt;
  } catch {
    return false;
  }
}

// 확인 기록 전체(name·assignedAt·team·role)를 반환 — 부팅 시 Firestore 배정을
// 기다리지 않고 저장된 팀·역할로 바로 게임 화면을 그리는 데 쓴다(PWA 재개 시
// Firestore 재연결이 느려도 확인한 기기는 즉시 게임 화면으로).
export function getConfirmedRecord() {
  try {
    return JSON.parse(localStorage.getItem(CONFIRMED_KEY) || 'null');
  } catch {
    return null;
  }
}

export function peekConfirmedName() {
  return getConfirmedRecord()?.name || null;
}

export function markRoleConfirmed() {
  try {
    localStorage.setItem(CONFIRMED_KEY, JSON.stringify({
      name: identity.name,
      assignedAt: state.assignment.assignedAt,
      team: identity.team,
      role: identity.role,
    }));
    // 시즌 스탬프 갱신 — 이름 저장(saveName) 시점엔 Firestore가 아직 로드 전이었을 수
    // 있으므로, 배정이 확실히 로드돼 있는 역할 확인 시점에 다시 찍어 일치를 보장한다.
    localStorage.setItem(SAVED_SEASON_KEY, String(state.assignment.seasonId ?? ''));
  } catch {}
}

// 이 기기에서 마지막으로 입장한 이름 — 매번 이름을 다시 입력하지 않도록 저장.
// (카드·역할 확인 전 대기실 단계에서도 자동 입장되게 하는 용도)
const SAVED_NAME_KEY = 'sr_name';
const SAVED_SEASON_KEY = 'sr_name_season';

export function getSavedName() {
  try { return localStorage.getItem(SAVED_NAME_KEY) || null; } catch { return null; }
}

// 이름을 저장할 당시의 시즌(game/assignment.seasonId)도 함께 남겨, 그 사이 관리자가
// "신규 게임 생성"으로 새 시즌을 열었는지 나중에(부팅 시) 구분할 수 있게 한다.
export function saveName(name) {
  try {
    localStorage.setItem(SAVED_NAME_KEY, name);
    localStorage.setItem(SAVED_SEASON_KEY, String(state.assignment.seasonId ?? ''));
  } catch {}
}

// 저장된 이름이 지금과 다른(이미 지난) 시즌의 것인지 — 참이면 자동 재입장시키지 않고
// 이름 입력부터 다시 받아야 한다(그래야 관리자가 새 시즌을 열었을 때 옛 이름으로
// 조용히 재등록되어버리는 걸 막을 수 있다). 서버에 시즌 정보가 있을 때만 판정하고,
// 기기에 시즌 기록이 없는 것도(=이번 시즌에 입장한 적 없음) 지난 시즌으로 취급한다.
export function isSavedNameStale() {
  try {
    const server = state.assignment.seasonId;
    if (server == null) return false;   // 시즌 추적 도입 전 서버 문서 — 판정 불가, 통과
    return localStorage.getItem(SAVED_SEASON_KEY) !== String(server);
  } catch {
    return false;
  }
}

// "다른 이름으로 입장" — 저장된 이름과 확인 기록을 모두 지워 이름 입력 화면으로
export function clearSavedIdentity() {
  try {
    localStorage.removeItem(SAVED_NAME_KEY);
    localStorage.removeItem(SAVED_SEASON_KEY);
    localStorage.removeItem(CONFIRMED_KEY);
    localStorage.removeItem(ME_PERSIST_KEY);   // 능력 기록·조사 결과 — 신원이 바뀌면 함께 폐기
  } catch {}
  // 발급받은 토큰도 폐기 — 안 지우면 /api/me가 예전 신원을 그대로 복원해버린다.
  // (기기 식별자는 남긴다 — 지우면 이 기기가 '새 기기'가 돼 참가 코드를 요구받는다)
  clearPlayerAuth();
  identity.team = null;
  identity.role = null;
  state.me.abilityUsed = undefined;
}

// 확인(카드·역할 뒤집기) 기록만 삭제 — 저장된 이름은 유지.
// 재배정으로 확인 기록이 무효화됐을 때, 이름은 그대로 두고 다시 카드/대기실로 보낼 때 쓴다.
export function clearConfirmedRecord() {
  try { localStorage.removeItem(CONFIRMED_KEY); } catch {}
}
