// Cloudflare Pages Function — 인증 마감이 지난 번개를 서버 권한으로 만료 처리.
// 만료 페널티(게이지·마일리지)도 게이지 조작 통로가 되면 안 되므로 서버가 계산한다.
// 무인증이지만 결과가 bolt 데이터로 완전히 결정되고(공격자가 값 못 넣음), 마감 경과·활성
// 상태를 서버가 검증하며, updateTime 선점으로 정확히 1회만 반영한다.
//
// 요청: { boltId }
import { getAccessToken, firestoreUrl, toFirestoreValue, toFirestoreFields, fromFirestoreFields } from '../_lib/firebase-admin.js';
import { computeIsTug, computeExpiry, boltDeadline } from '../_lib/game-rules.js';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const docName = (env, path) => `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`;

export async function onRequestPost(context) {
  try {
    const { boltId } = await context.request.json();
    if (!boltId) return json({ error: 'boltId가 필요합니다' }, 400);

    const env = context.env;
    const accessToken = await getAccessToken(env);
    const authHeaders = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };

    const boltRes = await fetch(firestoreUrl(env, `bolts/${boltId}`), { headers: authHeaders });
    if (boltRes.status === 404) return json({ error: '번개를 찾을 수 없습니다' }, 404);
    if (!boltRes.ok) return json({ error: '번개 조회 실패' }, 502);
    const boltDoc = await boltRes.json();
    const bolt = fromFirestoreFields(boltDoc.fields);
    const updateTime = boltDoc.updateTime;

    if (!['open', 'running'].includes(bolt.status)) return json({ error: '이미 처리된 번개입니다', duplicate: true }, 409);
    if (Date.now() <= boltDeadline(bolt)) return json({ error: '아직 인증 마감 전입니다' }, 400);

    const playersRes = await fetch(firestoreUrl(env, 'players'), { headers: authHeaders });
    const playersData = await playersRes.json();
    const playerMap = {};
    for (const d of playersData.documents || []) playerMap[d.name.split('/').pop()] = fromFirestoreFields(d.fields);

    const settingsRes = await fetch(firestoreUrl(env, 'game/settings'), { headers: authHeaders });
    const settings = settingsRes.ok ? fromFirestoreFields((await settingsRes.json()).fields) : {};
    const isTug = computeIsTug(settings.startDate);

    const { gaugeDelta, perPlayerKmInc } = computeExpiry({ bolt, playerMap, isTug });

    const writes = [
      {
        update: { name: docName(env, `bolts/${boltId}`), fields: toFirestoreFields({ status: 'expired' }) },
        updateMask: { fieldPaths: ['status'] },
        currentDocument: { updateTime },
      },
      {
        transform: {
          document: docName(env, 'game/gauge'),
          fieldTransforms: [
            { fieldPath: 'pacer', increment: { doubleValue: gaugeDelta.pacer || 0 } },
            { fieldPath: 'ghost', increment: { doubleValue: gaugeDelta.ghost || 0 } },
          ],
        },
      },
      ...(bolt.participants || []).filter(id => playerMap[id]).map(id => ({
        transform: {
          document: docName(env, `players/${id}`),
          fieldTransforms: [{ fieldPath: 'km', increment: { doubleValue: perPlayerKmInc || 0 } }],
        },
      })),
    ];

    const commitUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`;
    const commitRes = await fetch(commitUrl, { method: 'POST', headers: authHeaders, body: JSON.stringify({ writes }) });
    if (!commitRes.ok) {
      const err = await commitRes.json().catch(() => ({}));
      if (commitRes.status === 409 || /FAILED_PRECONDITION/.test(JSON.stringify(err))) {
        return json({ error: '이미 처리된 번개입니다', duplicate: true }, 409);
      }
      return json({ error: err.error?.message || '만료 처리 실패' }, 502);
    }

    // 음수 클램프
    const gRes = await fetch(firestoreUrl(env, 'game/gauge'), { headers: authHeaders });
    if (gRes.ok) {
      const gf = fromFirestoreFields((await gRes.json()).fields);
      const p = Number(gf.pacer ?? 0), g = Number(gf.ghost ?? 0);
      if (p < 0 || g < 0) {
        await fetch(`${firestoreUrl(env, 'game/gauge')}?updateMask.fieldPaths=pacer&updateMask.fieldPaths=ghost`, {
          method: 'PATCH', headers: authHeaders,
          body: JSON.stringify({ fields: { pacer: toFirestoreValue(Math.max(0, p)), ghost: toFirestoreValue(Math.max(0, g)) } }),
        });
      }
    }

    return json({ ok: true });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
