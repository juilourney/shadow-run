// Cloudflare Pages Function — 게이지(game/gauge 문서)를 서버 권한으로만 Firestore에 기록.
// 클라이언트 직접 쓰기는 Firestore 규칙에서 막혀있음(allow write: if false) — 이 엔드포인트가
// 서비스 계정으로 대신 써준다. 환경변수 필요: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY

function base64url(bytes) {
  let str = typeof bytes === 'string' ? btoa(bytes) : btoa(String.fromCharCode(...new Uint8Array(bytes)));
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToDer(pem) {
  const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s+/g, '');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

// 서비스 계정으로 서명한 JWT를 만들어 구글 OAuth2 access token으로 교환
async function getAccessToken(env) {
  const clientEmail = env.FIREBASE_CLIENT_EMAIL;
  const privateKeyPem = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;

  const key = await crypto.subtle.importKey(
    'pkcs8', pemToDer(privateKeyPem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${base64url(signature)}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'OAuth2 토큰 발급 실패');
  return data.access_token;
}

export async function onRequestPost(context) {
  try {
    const { pacer, ghost } = await context.request.json();
    if (typeof pacer !== 'number' || typeof ghost !== 'number') {
      return new Response(JSON.stringify({ error: 'pacer/ghost는 숫자여야 합니다' }), {
        status: 400, headers: { 'content-type': 'application/json' }
      });
    }

    const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = context.env;
    if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
      return new Response(JSON.stringify({ error: 'Firebase 서비스 계정 환경변수가 설정되지 않았습니다' }), {
        status: 500, headers: { 'content-type': 'application/json' }
      });
    }

    const accessToken = await getAccessToken(context.env);
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/game/gauge` +
      `?updateMask.fieldPaths=pacer&updateMask.fieldPaths=ghost`;

    const res = await fetch(url, {
      method: 'PATCH',
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ fields: { pacer: { doubleValue: pacer }, ghost: { doubleValue: ghost } } }),
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status, headers: { 'content-type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { 'content-type': 'application/json' }
    });
  }
}
