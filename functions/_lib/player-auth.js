// 참가자 인증 — 팀·역할은 게임의 핵심 비밀이므로, 이름만 대면 누구나 남의 것을
// 받아가던 구조를 토큰 기반으로 바꾼다.
//
// 서명 키는 admin-auth와 같은 env.ADMIN_PASSWORD를 재사용한다(새 환경변수를 추가하면
// 운영자가 Cloudflare에 또 설정해야 하고, 빠뜨리면 전원이 로그인 불가가 된다).
// 메시지에 'player:' 접두사를 붙여 관리자 토큰과 서명 공간을 분리한다.
//
// 토큰 형식: {playerId}.{expiry}.{hmac}   (관리자 토큰은 {expiry}.{hmac} — 형식이 달라 교차 사용 불가)

const TOKEN_TTL_MS = 60 * 24 * 60 * 60 * 1000;   // 60일 — 한 시즌(3주)을 여유 있게 덮는다

async function hmacHex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function signPlayerToken(env, playerId) {
  const expiry = Date.now() + TOKEN_TTL_MS;
  const mac = await hmacHex(env.ADMIN_PASSWORD, `player:${playerId}:${expiry}`);
  return `${playerId}.${expiry}.${mac}`;
}

// 유효하면 playerId, 아니면 null
export async function verifyPlayerToken(request, env) {
  if (!env.ADMIN_PASSWORD) return null;
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const [playerId, expiryStr, mac] = token.split('.');
  const expiry = Number(expiryStr);
  if (!playerId || !expiry || !mac || Date.now() > expiry) return null;
  const expected = await hmacHex(env.ADMIN_PASSWORD, `player:${playerId}:${expiry}`);
  return expected === mac ? playerId : null;
}

export function playerUnauthorized(message = '다시 입장해 주세요') {
  return new Response(JSON.stringify({ error: message, reauth: true }), {
    status: 401, headers: { 'content-type': 'application/json' },
  });
}

// 참가 코드 — 사람이 카톡으로 받아 손으로 입력하므로 혼동 글자(0/O, 1/I/L)를 뺀다.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateCode(len = 6) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return [...bytes].map(b => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

export function codeEq(a, b) {
  return String(a || '').toUpperCase().replace(/\s/g, '') === String(b || '').toUpperCase().replace(/\s/g, '');
}
