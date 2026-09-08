// 이미 완료된 번개의 결과를 현재 규칙으로 다시 계산해 게이지 차이만큼 보정한다. (관리자 전용)
//
// 만든 이유: 카드 종류(혼자 달림 / 팀 스킬 / 랜덤 버프)를 '등록 인원' 기준으로 판정하던
// 버그가 있어, 등록만 2명이고 실제로는 한 명만 뛴 번개에 랜덤 버프가 붙었다.
// 규칙을 고쳐도 이미 반영된 게이지는 그대로라 여기서 되돌린다.
//
// ⚠️ 운(랜덤 버프)은 다시 뽑지 않는다 — 카드 '종류'만 바로잡는다.
//    혼합 번개로 판정이 유지되면 기존에 뽑힌 카드를 그대로 쓴다.
//    (재계산할 때마다 ×3이 나올 때까지 돌리는 걸 막기 위함)
//
// 요청: { boltId }   응답: { before, after, gaugeCorrection }
import { getAccessToken, firestoreUrl, toFirestoreFields, fromFirestoreFields } from '../_lib/firebase-admin.js';
import { verifyAdminAuth, unauthorized } from '../_lib/admin-auth.js';
import { readSecretAssignment } from '../_lib/secrets.js';
import { RULES, PACER_SKILL, GHOST_SKILL, SOLO_CARD, computeIsTug, computeCompletion } from '../_lib/game-rules.js';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const docName = (env, path) => `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`;

export async function onRequestPost(context) {
  try {
    if (!(await verifyAdminAuth(context.request, context.env))) return unauthorized();
    const { boltId } = await context.request.json().catch(() => ({}));
    if (!boltId) return json({ error: 'boltId가 필요합니다' }, 400);

    const env = context.env;
    const accessToken = await getAccessToken(env);
    const authHeaders = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };

    const boltRes = await fetch(firestoreUrl(env, `bolts/${boltId}`), { headers: authHeaders });
    if (!boltRes.ok) return json({ error: '번개를 찾을 수 없습니다' }, 404);
    const bolt = fromFirestoreFields((await boltRes.json()).fields);
    const old = bolt.result;
    if (!old) return json({ error: '완료 결과가 없는 번개입니다' }, 400);

    const checkedIds = old.participantIds || [];
    if (checkedIds.length === 0) return json({ error: '인증 참가자가 없습니다' }, 400);

    // 팀·역할(서버 전용) + 동적 상태(페널티·능력박탈)
    const assignment = await readSecretAssignment(env, authHeaders);
    const playersRes = await fetch(firestoreUrl(env, 'players'), { headers: authHeaders });
    const playersData = await playersRes.json();
    const penMap = {};
    for (const d of playersData.documents || []) {
      const pf = fromFirestoreFields(d.fields);
      const since = (Number(pf.boltsCompleted) || 0) - (Number(pf.penalizedAtBolts) || 0);
      penMap[d.name.split('/').pop()] = {
        penalized: !!pf.penalized && since < RULES.penaltyClearBolts,
        abilityStripped: !!pf.abilityStripped,
      };
    }
    const playerMap = {};
    for (const p of assignment.players || []) {
      playerMap[p.id] = { team: p.team, role: p.role, ...(penMap[p.id] || {}) };
    }

    const settingsRes = await fetch(firestoreUrl(env, 'game/settings'), { headers: authHeaders });
    const settings = settingsRes.ok ? fromFirestoreFields((await settingsRes.json()).fields) : {};
    // 완료 당시 기준으로 판정 — 지금 요일로 다시 보면 줄다리기 여부가 뒤바뀐다
    const isTug = computeIsTug(settings.startDate, bolt.startAt || Date.now());

    // 카드 종류만 바로잡는다(운은 그대로)
    const teams = checkedIds.map(id => playerMap[id]?.team);
    const singleTeam = checkedIds.length >= RULES.singleTeamMin && teams.every(t => t && t === teams[0]);
    let card;
    if (checkedIds.length <= 1)   card = SOLO_CARD;
    else if (singleTeam)          card = teams[0] === 'pacer' ? PACER_SKILL : GHOST_SKILL;
    else                          card = old.card;   // 혼합 유지 — 기존에 뽑힌 카드 보존
    const buffMultiplier = card.multiplier;

    const { gaugeDelta, boltTeam } = computeCompletion({
      bolt, playerMap, distanceKm: old.distanceKm, participantIds: checkedIds, buffMultiplier, isTug,
    });

    const oldDelta = old.gaugeDelta || { pacer: 0, ghost: 0 };
    const corr = {
      pacer: (gaugeDelta.pacer || 0) - (Number(oldDelta.pacer) || 0),
      ghost: (gaugeDelta.ghost || 0) - (Number(oldDelta.ghost) || 0),
    };

    const newResult = { ...old, singleTeam, boltTeam, card, buffMultiplier, gaugeDelta: { ...gaugeDelta } };

    const writes = [
      { update: { name: docName(env, `bolts/${boltId}`), fields: toFirestoreFields({ result: newResult }) },
        updateMask: { fieldPaths: ['result'] } },
    ];
    if (corr.pacer || corr.ghost) {
      writes.push({
        transform: {
          document: docName(env, 'game/gauge'),
          fieldTransforms: [
            { fieldPath: 'pacer', increment: { doubleValue: corr.pacer } },
            { fieldPath: 'ghost', increment: { doubleValue: corr.ghost } },
          ],
        },
      });
    }

    const commitUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`;
    const res = await fetch(commitUrl, { method: 'POST', headers: authHeaders, body: JSON.stringify({ writes }) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return json({ error: err.error?.message || '보정 실패' }, 502);
    }

    return json({
      ok: true,
      boltTitle: bolt.title ?? '번개',
      before: { card: old.card?.name, multiplier: old.buffMultiplier, gaugeDelta: oldDelta },
      after:  { card: card.name, multiplier: buffMultiplier, gaugeDelta },
      gaugeCorrection: corr,
      changed: !!(corr.pacer || corr.ghost) || old.card?.name !== card.name,
    });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
