// Cloudflare Pages Function — 게이지(game/gauge 문서)를 서버 권한으로만 Firestore에 기록.
// 클라이언트 직접 쓰기는 Firestore 규칙에서 막혀있음(allow write: if false) — 이 엔드포인트가
// 서비스 계정으로 대신 써준다. 환경변수 필요: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
//
// 두 가지 모드:
//  - { pacer, ghost }            : 절대값 기록 (초기화·신규 게임 리셋용)
//  - { pacerDelta, ghostDelta }  : 원자 증감(increment) — 관리자 인증 심사 불인정 원복 등.
//    증감 후 음수가 되면 0으로 클램프한다(게이지는 0 밑으로 안 내려가는 게임 규칙).
//
// ⚠️ 게이지는 승부 조건이라, 이 엔드포인트는 **관리자 인증**을 요구한다. 예전에 무인증이라
//    콘솔 fetch 한 줄로 누구나 게이지를 조작할 수 있었음. 번개 완료·만료의 정상 게이지 변경은
//    이제 /api/complete-bolt · /api/expire-bolt 가 서버 내부에서 처리한다(이 엔드포인트 안 씀).
import { getAccessToken, firestoreUrl } from '../_lib/firebase-admin.js';
import { verifyAdminAuth, unauthorized } from '../_lib/admin-auth.js';

export async function onRequestPost(context) {
  try {
    if (!(await verifyAdminAuth(context.request, context.env))) return unauthorized();
    const { pacer, ghost, pacerDelta, ghostDelta } = await context.request.json();
    const isDelta = typeof pacerDelta === 'number' || typeof ghostDelta === 'number';

    const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = context.env;
    if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
      return new Response(JSON.stringify({ error: 'Firebase 서비스 계정 환경변수가 설정되지 않았습니다' }), {
        status: 500, headers: { 'content-type': 'application/json' }
      });
    }
    const accessToken = await getAccessToken(context.env);
    const authHeaders = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };
    const docPath = `projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/game/gauge`;

    if (isDelta) {
      // 원자 증감 — documents:commit + fieldTransforms(increment)
      const commitUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`;
      const res = await fetch(commitUrl, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({
          writes: [{
            transform: {
              document: docPath,
              fieldTransforms: [
                { fieldPath: 'pacer', increment: { doubleValue: pacerDelta || 0 } },
                { fieldPath: 'ghost', increment: { doubleValue: ghostDelta || 0 } },
              ],
            },
          }],
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        return new Response(JSON.stringify(err), { status: res.status, headers: { 'content-type': 'application/json' } });
      }

      // 음수 클램프 — increment는 0 밑으로도 내려가므로 커밋 후 확인해서 0으로 보정
      const readRes = await fetch(firestoreUrl(context.env, 'game/gauge'), { headers: authHeaders });
      const docData = await readRes.json();
      const cur = {
        pacer: docData.fields?.pacer?.doubleValue ?? docData.fields?.pacer?.integerValue ?? 0,
        ghost: docData.fields?.ghost?.doubleValue ?? docData.fields?.ghost?.integerValue ?? 0,
      };
      cur.pacer = Number(cur.pacer); cur.ghost = Number(cur.ghost);
      if (cur.pacer < 0 || cur.ghost < 0) {
        const clamped = { pacer: Math.max(0, cur.pacer), ghost: Math.max(0, cur.ghost) };
        await fetch(`${firestoreUrl(context.env, 'game/gauge')}?updateMask.fieldPaths=pacer&updateMask.fieldPaths=ghost`, {
          method: 'PATCH', headers: authHeaders,
          body: JSON.stringify({ fields: { pacer: { doubleValue: clamped.pacer }, ghost: { doubleValue: clamped.ghost } } }),
        });
        return new Response(JSON.stringify(clamped), { headers: { 'content-type': 'application/json' } });
      }
      return new Response(JSON.stringify(cur), { headers: { 'content-type': 'application/json' } });
    }

    // 절대값 모드 (초기화·리셋)
    if (typeof pacer !== 'number' || typeof ghost !== 'number') {
      return new Response(JSON.stringify({ error: 'pacer/ghost(절대값) 또는 pacerDelta/ghostDelta(증감)가 필요합니다' }), {
        status: 400, headers: { 'content-type': 'application/json' }
      });
    }
    const url = `${firestoreUrl(context.env, 'game/gauge')}?updateMask.fieldPaths=pacer&updateMask.fieldPaths=ghost`;
    const res = await fetch(url, {
      method: 'PATCH', headers: authHeaders,
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
