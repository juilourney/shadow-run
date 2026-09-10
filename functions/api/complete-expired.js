// 만료된 번개를 관리자가 수동으로 완료 처리한다. (관리자 인증 필요)
//
// 아침 런처럼 인증 마감(시작+완주+2시간)을 놓쳐 자동 만료된 번개를, 실제로 뛴 게
// 확인되면 뒤늦게 인정해 주기 위한 통로. 게이지는 서버 전용 쓰기라 참가자·관리자
// 어느 기기도 직접 못 넣으므로 여기서 서비스 계정으로 반영한다.
//
// complete-bolt와 계산은 동일하되: ① 상태가 expired인 번개만 대상 ② 관리자 인증
// ③ reviewStatus를 곧바로 approved로(관리자가 직접 확인해 넣는 것이므로).
//
// 요청: { boltId, distanceKm, participantIds }
import { getAccessToken, firestoreUrl, toFirestoreValue, toFirestoreFields, fromFirestoreFields } from '../_lib/firebase-admin.js';
import { verifyAdminAuth, unauthorized } from '../_lib/admin-auth.js';
import { readSecretAssignment } from '../_lib/secrets.js';
import { RULES, BUFF_CARDS, PACER_SKILL, GHOST_SKILL, SOLO_CARD, RUNNING_MATE_CARD, isRunningMateBolt, computeIsTug, computeCompletion } from '../_lib/game-rules.js';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const docName = (env, path) => `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`;

export async function onRequestPost(context) {
  try {
    if (!(await verifyAdminAuth(context.request, context.env))) return unauthorized();
    const { boltId, distanceKm, participantIds } = await context.request.json().catch(() => ({}));
    if (!boltId || typeof distanceKm !== 'number' || !Array.isArray(participantIds) || participantIds.length === 0) {
      return json({ error: 'boltId·distanceKm·participantIds가 필요합니다' }, 400);
    }
    if (distanceKm <= 0 || distanceKm > 200) return json({ error: '거리 값이 올바르지 않습니다' }, 400);

    const env = context.env;
    const accessToken = await getAccessToken(env);
    const authHeaders = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };

    const boltRes = await fetch(firestoreUrl(env, `bolts/${boltId}`), { headers: authHeaders });
    if (boltRes.status === 404) return json({ error: '번개를 찾을 수 없습니다' }, 404);
    if (!boltRes.ok) return json({ error: '번개 조회 실패' }, 502);
    const boltDoc = await boltRes.json();
    const bolt = fromFirestoreFields(boltDoc.fields);
    const updateTime = boltDoc.updateTime;   // 선점(이 버전일 때만 반영)
    if (bolt.status !== 'expired') {
      return json({ error: '만료된 번개만 이 방법으로 처리할 수 있습니다', status: bolt.status }, 409);
    }

    const boltParticipants = bolt.participants || [];
    const checkedIds = participantIds.filter(id => boltParticipants.includes(id));
    if (checkedIds.length === 0) return json({ error: '유효한 참가자가 없습니다' }, 400);

    // 팀·역할(서버 전용) + 동적 상태(페널티·능력박탈) — complete-bolt와 동일
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
      playerMap[p.id] = { team: p.team, role: p.role, runningMate: !!p.runningMate, ...(penMap[p.id] || {}) };
    }

    const settingsRes = await fetch(firestoreUrl(env, 'game/settings'), { headers: authHeaders });
    const settings = settingsRes.ok ? fromFirestoreFields((await settingsRes.json()).fields) : {};
    // 줄다리기 여부는 '완료 시점'이 아니라 번개가 열린 시각 기준으로 판정
    const isTug = computeIsTug(settings.startDate, bolt.startAt || Date.now());

    // 카드 결정 — 실제 인증자(checkedIds) 기준. complete-bolt와 동일.
    const teams = checkedIds.map(id => playerMap[id]?.team);
    const singleTeam = checkedIds.length >= RULES.singleTeamMin && teams.every(t => t && t === teams[0]);
    let card;
    if (checkedIds.length <= 1)   card = SOLO_CARD;
    else if (singleTeam)          card = teams[0] === 'pacer' ? PACER_SKILL : GHOST_SKILL;
    else if (isRunningMateBolt(checkedIds, playerMap, singleTeam)) card = { ...RUNNING_MATE_CARD, multiplier: checkedIds.length };
    else                          card = BUFF_CARDS[Math.floor(Math.random() * BUFF_CARDS.length)];
    const buffMultiplier = card.multiplier;

    const { gaugeDelta, perPlayerKmInc, boltTeam } =
      computeCompletion({ bolt, playerMap, distanceKm, participantIds: checkedIds, buffMultiplier, isTug });

    const result = {
      singleTeam, isTug, distanceKm, buffMultiplier,
      participantIds: checkedIds, participantCount: checkedIds.length,
      boltTeam, card, boltTitle: bolt.title ?? '번개',
      gaugeDelta: { ...gaugeDelta },
      certAt: null,
      manualByAdmin: true,   // 관리자가 만료 후 수동 인정한 건임을 표시
    };

    const writes = [
      {
        update: {
          name: docName(env, `bolts/${boltId}`),
          fields: toFirestoreFields({ status: 'done', result, reviewStatus: 'approved' }),
        },
        updateMask: { fieldPaths: ['status', 'result', 'reviewStatus'] },
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
      ...checkedIds.filter(id => playerMap[id]).map(id => ({
        transform: {
          document: docName(env, `players/${id}`),
          fieldTransforms: [
            { fieldPath: 'km', increment: { doubleValue: perPlayerKmInc || 0 } },
            { fieldPath: 'boltsCompleted', increment: { integerValue: '1' } },
          ],
        },
      })),
    ];

    const commitUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`;
    const commitRes = await fetch(commitUrl, { method: 'POST', headers: authHeaders, body: JSON.stringify({ writes }) });
    if (!commitRes.ok) {
      const err = await commitRes.json().catch(() => ({}));
      if (commitRes.status === 409 || /FAILED_PRECONDITION/.test(JSON.stringify(err))) {
        return json({ error: '상태가 바뀌었습니다. 새로고침 후 다시 시도해 주세요.' }, 409);
      }
      return json({ error: err.error?.message || '완료 처리 실패' }, 502);
    }

    // 게이지 음수 클램프 (complete-bolt와 동일)
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

    return json({ ok: true, boltTitle: bolt.title ?? '번개', card: card.name, gaugeDelta });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
