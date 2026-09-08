// 탐정/밀정 능력 사용 — 대상의 팀(탐정) 또는 역할(밀정)을 서버가 확인해 돌려준다.
//
// 예전엔 클라이언트가 이미 갖고 있던 전원 데이터에서 그냥 꺼내 썼기 때문에, 능력이
// 없어도·한도를 넘겨도 콘솔에서 얼마든지 볼 수 있었다. 이제 서버만 비밀을 알고,
// 호출자의 역할·능력박탈·주간 한도를 전부 서버가 검증한다.
//
// 요청: { targetId }  (Authorization: Bearer <player token>)
// 응답: { team } | { role }, used, limit
import { getAccessToken, firestoreUrl, toFirestoreFields, fromFirestoreFields } from '../_lib/firebase-admin.js';
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

    const { targetId } = await context.request.json().catch(() => ({}));
    if (!targetId) return json({ error: '대상이 필요합니다' }, 400);
    if (targetId === playerId) return json({ error: '자기 자신은 조사할 수 없습니다' }, 400);

    const accessToken = await getAccessToken(env);
    const authHeaders = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };

    const assignment = await readSecretAssignment(env, authHeaders);
    const me = findById(assignment, playerId);
    const target = findById(assignment, targetId);
    if (!me) return playerUnauthorized('배정이 갱신되었습니다. 다시 입장해 주세요.');
    if (!target) return json({ error: '대상을 찾을 수 없습니다' }, 404);
    if (me.role !== 'detective' && me.role !== 'spy') return json({ error: '능력이 없습니다' }, 403);

    // 능력 박탈은 투표로 역할이 공개됐을 때 players에 기록된다(동적 상태)
    const pRes = await fetch(firestoreUrl(env, `players/${playerId}`), { headers: authHeaders });
    const pf = pRes.ok ? fromFirestoreFields((await pRes.json()).fields) : {};
    if (pf.abilityStripped) return json({ error: '적발되어 능력이 박탈되었습니다' }, 403);

    // 주간 한도 — identities에 주차별 사용 기록을 남긴다(기기 localStorage는 지우면 초기화됐음)
    const sRes = await fetch(firestoreUrl(env, 'game/settings'), { headers: authHeaders });
    const settings = sRes.ok ? fromFirestoreFields((await sRes.json()).fields) : {};
    const week = computeWeek(settings.startDate, Number(settings.weeks) || 3);

    const idRes = await fetch(firestoreUrl(env, `identities/${playerId}`), { headers: authHeaders });
    const identity = idRes.ok ? fromFirestoreFields((await idRes.json()).fields) : {};
    const investigated = identity?.investigated || {};      // { [targetId]: {team} | {role} }
    const usage = identity?.abilityWeeks || {};             // { [week]: count }
    const usedThisWeek = Number(usage[String(week)]) || 0;

    // 같은 대상 재조회는 한도를 다시 쓰지 않는다(기존 클라이언트 동작과 동일)
    const already = investigated[targetId];
    if (!already && usedThisWeek >= RULES.abilityWeeklyLimit) {
      return json({ error: '이번 주 사용 횟수를 모두 소진했습니다' }, 403);
    }

    const result = already || (me.role === 'detective' ? { team: target.team } : { role: target.role });

    if (!already) {
      await fetch(`${firestoreUrl(env, `identities/${playerId}`)}?updateMask.fieldPaths=abilityWeeks&updateMask.fieldPaths=investigated`, {
        method: 'PATCH', headers: authHeaders,
        body: JSON.stringify({
          fields: toFirestoreFields({
            abilityWeeks: { ...usage, [String(week)]: usedThisWeek + 1 },
            investigated: { ...investigated, [targetId]: result },
          }),
        }),
      });
    }

    return json({
      ...result,
      used: already ? usedThisWeek : usedThisWeek + 1,
      limit: RULES.abilityWeeklyLimit,
      week,
    });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
