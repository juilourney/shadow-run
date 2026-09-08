// 이 번개가 단일팀 번개인지 — 그 번개의 참가자만 물어볼 수 있다.
//
// 예전엔 클라이언트가 전원의 팀을 알고 있어서 직접 계산했는데, 그러면 참가자가 아닌
// 사람도 "저 번개는 단일팀"이라는 사실에서 4명이 같은 팀임을 알아낼 수 있었다.
// 이제 서버가 판정하고, 요청자가 그 번개의 참가자일 때만 답한다.
//
// 요청: { boltId }  (Authorization: Bearer <player token>)
// 응답: { isSingleTeam, team }   team은 단일팀일 때만 채워진다
import { getAccessToken, firestoreUrl, fromFirestoreFields } from '../_lib/firebase-admin.js';
import { readSecretAssignment, findById } from '../_lib/secrets.js';
import { verifyPlayerToken, playerUnauthorized } from '../_lib/player-auth.js';
import { RULES } from '../_lib/game-rules.js';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export async function onRequestPost(context) {
  try {
    const env = context.env;
    const playerId = await verifyPlayerToken(context.request, env);
    if (!playerId) return playerUnauthorized();

    const { boltId } = await context.request.json().catch(() => ({}));
    if (!boltId) return json({ error: 'boltId가 필요합니다' }, 400);

    const accessToken = await getAccessToken(env);
    const authHeaders = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };

    const bRes = await fetch(firestoreUrl(env, `bolts/${boltId}`), { headers: authHeaders });
    if (!bRes.ok) return json({ error: '번개를 찾을 수 없습니다' }, 404);
    const bolt = fromFirestoreFields((await bRes.json()).fields);
    const participants = bolt.participants || [];

    // 참가자가 아니면 알려주지 않는다 — 여기가 정보 유출을 막는 지점
    if (!participants.includes(playerId)) return json({ isSingleTeam: false, team: null });

    if (participants.length < RULES.singleTeamMin) return json({ isSingleTeam: false, team: null });

    const assignment = await readSecretAssignment(env, authHeaders);
    const teams = participants.map(id => findById(assignment, id)?.team);
    const isSingleTeam = teams.every(t => t && t === teams[0]);

    return json({ isSingleTeam, team: isSingleTeam ? teams[0] : null });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
