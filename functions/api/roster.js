// Cloudflare Pages Function — 참가자 명단(roster 컬렉션)을 서버 권한으로만 Firestore에 기록.
// add/update/remove는 관리자 화면 전용(인증 필요). selfJoin은 참가자가 이름 입력
// 화면에서 직접 자기 이름을 등록하는 용도라 인증을 요구하지 않는다.
import { getAccessToken, firestoreUrl, toFirestoreValue, fromFirestoreFields } from '../_lib/firebase-admin.js';
import { verifyAdminAuth, unauthorized } from '../_lib/admin-auth.js';

function jsonError(message, status = 400) {
  return new Response(JSON.stringify({ error: message }), { status, headers: { 'content-type': 'application/json' } });
}

export async function onRequestPost(context) {
  try {
    const { action, id, name } = await context.request.json();

    if (action !== 'selfJoin' && !(await verifyAdminAuth(context.request, context.env))) return unauthorized();

    const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = context.env;
    if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
      return jsonError('Firebase 서비스 계정 환경변수가 설정되지 않았습니다', 500);
    }
    const accessToken = await getAccessToken(context.env);
    const authHeaders = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };

    // 참가자가 이름 입력 화면에서 직접 등록 — 이미 있으면 그대로 통과(멱등), 없으면 새로 추가
    if (action === 'selfJoin') {
      if (!name || !name.trim()) return jsonError('이름을 입력하세요');
      const trimmed = name.trim();
      const listRes = await fetch(firestoreUrl(context.env, 'roster'), { headers: authHeaders });
      const listData = await listRes.json();
      const exists = (listData.documents || []).some(d => fromFirestoreFields(d.fields).name === trimmed);
      if (exists) return new Response(JSON.stringify({ ok: true, alreadyRegistered: true }), { headers: { 'content-type': 'application/json' } });

      const res = await fetch(firestoreUrl(context.env, 'roster'), {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ fields: { name: toFirestoreValue(trimmed) } }),
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), { status: res.status, headers: { 'content-type': 'application/json' } });
    }

    if (action === 'add') {
      if (!name || !name.trim()) return jsonError('이름을 입력하세요');
      const res = await fetch(firestoreUrl(context.env, 'roster'), {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ fields: { name: toFirestoreValue(name.trim()) } }),
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), { status: res.status, headers: { 'content-type': 'application/json' } });
    }

    if (action === 'update') {
      if (!id) return jsonError('id가 필요합니다');
      if (!name || !name.trim()) return jsonError('이름을 입력하세요');
      const url = `${firestoreUrl(context.env, `roster/${id}`)}?updateMask.fieldPaths=name`;
      const res = await fetch(url, {
        method: 'PATCH', headers: authHeaders,
        body: JSON.stringify({ fields: { name: toFirestoreValue(name.trim()) } }),
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), { status: res.status, headers: { 'content-type': 'application/json' } });
    }

    if (action === 'remove') {
      if (!id) return jsonError('id가 필요합니다');
      const res = await fetch(firestoreUrl(context.env, `roster/${id}`), {
        method: 'DELETE', headers: authHeaders,
      });
      return new Response(JSON.stringify({ ok: res.ok }), { status: res.status, headers: { 'content-type': 'application/json' } });
    }

    return jsonError("action은 'selfJoin' | 'add' | 'update' | 'remove' 중 하나여야 합니다");
  } catch (e) {
    return jsonError(e.message, 500);
  }
}
