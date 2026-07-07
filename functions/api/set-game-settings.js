// Cloudflare Pages Function — 게임 설정(game/settings 문서)을 서버 권한으로만 Firestore에 기록.
// 관리자 화면(A-03)의 updateGameSettings/createNewGame이 호출.
import { getAccessToken, firestoreUrl, toFirestoreValue } from '../_lib/firebase-admin.js';
import { verifyAdminAuth, unauthorized } from '../_lib/admin-auth.js';

export async function onRequestPost(context) {
  try {
    if (!(await verifyAdminAuth(context.request, context.env))) return unauthorized();
    const { name, startDate, weeks } = await context.request.json();
    if (typeof name !== 'string' || typeof startDate !== 'string' || typeof weeks !== 'number') {
      return new Response(JSON.stringify({ error: 'name(문자열)·startDate(문자열)·weeks(숫자)가 필요합니다' }), {
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
    const url = `${firestoreUrl(context.env, 'game/settings')}` +
      `?updateMask.fieldPaths=name&updateMask.fieldPaths=startDate&updateMask.fieldPaths=weeks`;

    const res = await fetch(url, {
      method: 'PATCH',
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ fields: { name: toFirestoreValue(name), startDate: toFirestoreValue(startDate), weeks: toFirestoreValue(weeks) } }),
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
