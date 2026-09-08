// 참가자 인증 — 기기 식별자와 서버 발급 토큰을 보관한다.
//
// 팀·역할은 더 이상 Firestore 공개 문서에 없다. 입장할 때 서버가 이 기기를 이름에
// 묶고(첫 기기 우선), 발급한 토큰으로만 자기 팀·역할을 받아올 수 있다.
// 다른 기기에서 같은 이름으로 들어오려면 참가 코드가 필요하다.

const DEVICE_KEY = 'sr_device';
const TOKEN_KEY  = 'sr_token';

// 기기 식별자 — 이 브라우저 저장소가 살아있는 동안 유지된다.
// (캐시를 지우면 새 기기로 취급돼 참가 코드를 요구받는다 — 의도된 동작)
export function getDeviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = (crypto.randomUUID?.() || `d${Date.now()}${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    // 저장소를 못 쓰는 환경(사파리 프라이빗 등) — 세션 한정 임시 ID
    return `tmp${Math.random().toString(36).slice(2)}`;
  }
}

export function getPlayerToken() {
  try { return localStorage.getItem(TOKEN_KEY) || null; } catch { return null; }
}

function setPlayerToken(token) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch {}
}

export function clearPlayerAuth() {
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
}

export function playerAuthHeaders() {
  const t = getPlayerToken();
  return t ? { authorization: `Bearer ${t}` } : {};
}

// 입장 — 성공하면 토큰을 저장하고 { id, name, team, role } 반환.
// 실패는 throw하며, err.needCode / err.needAdmin / err.notAssigned 로 사유를 구분한다.
export async function playerLogin(name, code) {
  const res = await fetch('/api/player-login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, deviceId: getDeviceId(), code: code || null }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || '입장에 실패했습니다');
    err.needCode    = !!data.needCode;
    err.needAdmin   = !!data.needAdmin;
    err.notAssigned = !!data.notAssigned;
    throw err;
  }
  setPlayerToken(data.token);
  return data;
}

// 저장된 토큰으로 내 팀·역할 재조회. 토큰이 없거나 만료면 null(→ 이름 화면으로).
export async function fetchMe() {
  if (!getPlayerToken()) return null;
  try {
    const res = await fetch('/api/me', { method: 'POST', headers: { 'content-type': 'application/json', ...playerAuthHeaders() } });
    if (res.status === 401) { clearPlayerAuth(); return null; }
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;   // 오프라인 — 호출부가 캐시된 확인 기록으로 진행한다
  }
}
