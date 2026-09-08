// 내 팀·역할 조회 — 토큰 소유자 '자기 것만' 돌려준다.
// 예전엔 클라이언트가 game/assignment(공개 문서)에서 전원의 팀·역할을 통째로 받아
// 메모리에 들고 있었다. 이제 각자 자기 것만 이 엔드포인트로 받는다.
import { getAccessToken, firestoreUrl, fromFirestoreFields } from '../_lib/firebase-admin.js';
import { readSecretAssignment, findById } from '../_lib/secrets.js';
import { verifyPlayerToken, playerUnauthorized } from '../_lib/player-auth.js';
import { RULES, computeWeek } from '../_lib/game-rules.js';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export async function onRequestPost(context) {
  try {
    const env = context.env;
    const playerId = await verifyPlayerToken(context.request, env);
    if (!playerId) return playerUnauthorized();

    const accessToken = await getAccessToken(env);
    const authHeaders = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };

    const assignment = await readSecretAssignment(env, authHeaders);
    const me = findById(assignment, playerId);
    // 재배정·신규 시즌으로 이 id가 사라졌으면 토큰을 무효화하고 다시 입장시킨다
    if (!me) return playerUnauthorized('배정이 갱신되었습니다. 다시 입장해 주세요.');

    // 능력 사용 기록·조사 결과도 함께 — 예전엔 기기 localStorage에만 있어서 캐시를 지우면
    // 애써 알아낸 조사 결과가 사라지고 주간 한도도 초기화됐다. 이제 서버가 들고 있다.
    const sRes = await fetch(firestoreUrl(env, 'game/settings'), { headers: authHeaders });
    const settings = sRes.ok ? fromFirestoreFields((await sRes.json()).fields) : {};
    const week = computeWeek(settings.startDate, Number(settings.weeks) || 3);

    const idRes = await fetch(firestoreUrl(env, `identities/${playerId}`), { headers: authHeaders });
    const identity = idRes.ok ? fromFirestoreFields((await idRes.json()).fields) : {};
    const usage = identity?.abilityWeeks || {};

    return json({
      id: me.id, name: me.name,
      team: me.team ?? null, role: me.role ?? null,
      assignedAt: assignment.assignedAt ?? null,
      seasonId: assignment.seasonId ?? null,
      ability: {
        week,
        used: Number(usage[String(week)]) || 0,
        limit: RULES.abilityWeeklyLimit,
        revealed: identity?.investigated || {},   // { [targetId]: {team} | {role} }
      },
    });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
