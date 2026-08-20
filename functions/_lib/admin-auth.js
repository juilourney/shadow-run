// 관리자 화면 최소 보호 — 비밀번호는 서버(env.ADMIN_PASSWORD)에만 존재하고,
// 클라이언트는 로그인 성공 시 받은 만료시간 포함 서명 토큰만 들고 다닌다.
// 완전한 사용자 인증 시스템은 아니지만, "URL만 알면 로그인 없이 데이터 조작 가능"한
// 문제는 막는다. set-gauge처럼 참가자 기기가 정상 플레이 중 호출해야 하는
// 엔드포인트는 이 검증을 걸지 않는다(걸면 게임이 멈춤) — roster/설정 변경/배정
// 초기화처럼 관리자만 눌러야 하는 액션에만 적용.

// 게임은 3주가량 이어지고 관리자는 시작 전 배정부터 종료 후 리셋까지 관리하므로,
// 토큰이 게임 도중 만료돼 조용히 실패하지 않도록 게임 한 사이클을 덮는 길이로 둔다.
// (크루 내부용 최소 보호 — 만료 시엔 클라가 재로그인을 유도한다)
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30일

async function hmacHex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function signAdminToken(env) {
  const expiry = Date.now() + TOKEN_TTL_MS;
  const mac = await hmacHex(env.ADMIN_PASSWORD, String(expiry));
  return `${expiry}.${mac}`;
}

// true/false만 반환 — 실패 사유는 호출부에서 401로 통일 응답
export async function verifyAdminAuth(request, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const [expiryStr, mac] = token.split('.');
  const expiry = Number(expiryStr);
  if (!expiry || !mac || Date.now() > expiry) return false;
  const expected = await hmacHex(env.ADMIN_PASSWORD, expiryStr);
  return expected === mac;
}

export function unauthorized() {
  return new Response(JSON.stringify({ error: '관리자 인증이 필요합니다' }), {
    status: 401, headers: { 'content-type': 'application/json' },
  });
}
