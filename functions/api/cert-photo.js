// Cloudflare Pages Function — 번개 인증 사진 저장/조회.
// 사진은 관리자만 보므로 bolts 문서(전 참가자가 구독)에 넣지 않고 별도 컬렉션에
// 서버 권한으로 저장한다. Firestore 규칙은 컬렉션 화이트리스트라 클라이언트가
// certPhotos에 직접 쓸 수 없음 — 서비스 계정으로 대신 쓴다.
//  - { boltId, photo }  : 저장 (인증 제출하는 방장 기기 — bolts 쓰기와 같은 신뢰 수준)
//  - { boltId, get: true } : 조회 (관리자 인증 관리 화면)
import { getAccessToken, firestoreUrl, toFirestoreFields, fromFirestoreFields } from '../_lib/firebase-admin.js';

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

export async function onRequestPost(context) {
  try {
    const { boltId, photo, get } = await context.request.json();
    if (!boltId || typeof boltId !== 'string') return json({ error: 'boltId가 필요합니다' }, 400);

    const accessToken = await getAccessToken(context.env);
    const authHeaders = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };
    const url = firestoreUrl(context.env, `certPhotos/${boltId}`);

    if (get) {
      const res = await fetch(url, { headers: authHeaders });
      if (res.status === 404) return json({ photo: null });
      if (!res.ok) return json({ error: '조회에 실패했습니다' }, res.status);
      const data = await res.json();
      return json({ photo: fromFirestoreFields(data.fields).photo ?? null });
    }

    if (typeof photo !== 'string' || !photo.startsWith('data:image/') || photo.length > 800000) {
      return json({ error: '올바른 사진 데이터가 아닙니다' }, 400);
    }
    const res = await fetch(url, {
      method: 'PATCH', headers: authHeaders,
      body: JSON.stringify({ fields: toFirestoreFields({ photo, at: Date.now() }) }),
    });
    if (!res.ok) return json({ error: '저장에 실패했습니다' }, res.status);
    return json({ ok: true });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
