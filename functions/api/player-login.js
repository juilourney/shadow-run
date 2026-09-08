// 참가자 입장 — 이름(+참가 코드)을 확인하고 서명 토큰을 발급한다.
// 발급된 토큰이 있어야 /api/me·/api/investigate로 자기 팀·역할을 받을 수 있다.
//
// 요청: { name, deviceId, code? }
// 응답: { token, id, name, team, role }
//
// 기기 바인딩 규칙
//  - 아직 아무 기기도 이 이름을 쓰지 않음 → 이 기기로 바인딩하고 통과
//    (단 secrets/config.requireCode가 true면 참가 코드를 먼저 확인)
//  - 이미 바인딩된 기기와 같음 → 통과
//  - 다른 기기가 이미 쓰고 있음 → 참가 코드가 있어야 재바인딩(기기 변경·캐시 삭제 대응)
//    코드가 없으면 거부 — 이름만 알면 남의 정체를 열람하던 사칭 경로가 여기서 막힌다.
import { getAccessToken, firestoreUrl, toFirestoreFields, fromFirestoreFields } from '../_lib/firebase-admin.js';
import { readSecretAssignment, findByName } from '../_lib/secrets.js';
import { signPlayerToken, codeEq } from '../_lib/player-auth.js';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export async function onRequestPost(context) {
  try {
    const { name, deviceId, code } = await context.request.json().catch(() => ({}));
    if (!name || !deviceId) return json({ error: '이름과 기기 정보가 필요합니다' }, 400);

    const env = context.env;
    if (!env.ADMIN_PASSWORD) return json({ error: '서버 설정이 완료되지 않았습니다' }, 500);
    const accessToken = await getAccessToken(env);
    const authHeaders = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };

    const assignment = await readSecretAssignment(env, authHeaders);
    const me = findByName(assignment, name);
    // 배정 전(모집 기간)에는 지킬 비밀이 없다 — 대기실 흐름은 기존대로 두고 여기서는 다루지 않는다.
    if (!me) return json({ error: '배정된 참가자가 아닙니다', notAssigned: true }, 404);

    const cfgRes = await fetch(firestoreUrl(env, 'secrets/config'), { headers: authHeaders });
    const cfg = cfgRes.ok ? fromFirestoreFields((await cfgRes.json()).fields) : {};
    const requireCode = !!cfg.requireCode;

    const idRes = await fetch(firestoreUrl(env, `identities/${me.id}`), { headers: authHeaders });
    const identity = idRes.ok ? fromFirestoreFields((await idRes.json()).fields) : null;
    const boundTo = identity?.deviceId || null;

    if (boundTo && boundTo !== deviceId) {
      // 다른 기기가 이미 이 이름을 쓰고 있다 — 코드로만 넘어올 수 있다
      if (!identity?.code) {
        return json({ error: '이미 다른 기기에서 사용 중인 이름입니다. 운영자에게 문의해 주세요.', needAdmin: true }, 403);
      }
      if (!codeEq(code, identity.code)) {
        return json({ error: '참가 코드가 필요합니다', needCode: true }, 403);
      }
    } else if (!boundTo && requireCode) {
      if (!identity?.code || !codeEq(code, identity.code)) {
        return json({ error: '참가 코드가 필요합니다', needCode: true }, 403);
      }
    }

    // 바인딩 갱신 (같은 기기면 boundAt만 새로 찍힘)
    await fetch(`${firestoreUrl(env, `identities/${me.id}`)}?updateMask.fieldPaths=deviceId&updateMask.fieldPaths=boundAt&updateMask.fieldPaths=name`, {
      method: 'PATCH', headers: authHeaders,
      body: JSON.stringify({ fields: toFirestoreFields({ deviceId, boundAt: Date.now(), name: me.name }) }),
    });

    const token = await signPlayerToken(env, me.id);
    return json({ token, id: me.id, name: me.name, team: me.team ?? null, role: me.role ?? null });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
