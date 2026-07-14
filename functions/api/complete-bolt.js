// Cloudflare Pages Function — 번개 완료를 서버 권한으로 처리.
// 게이지·마일리지 증감량을 클라가 계산해 보내면 조작 가능(승부 조작)하므로, 서버가 실제
// bolt·players·settings에서 직접 계산한다. 역할/팀은 서버가 읽은 players 기준, 버프 배수도
// 서버가 draw(항상 ×3 우회 차단). updateTime 선점으로 정확히 1회만 반영(중복 완료 방지).
//
// 요청: { boltId, distanceKm, participantIds, certPhoto, certAt }   (buffMultiplier·역할은 받지 않음)
// 응답: { result, card }
//  certPhoto: 관리자 심사용, certPhotos 컬렉션에 별도 저장(참가자 기기는 안 받음)
//  certAt: 사진 속 기록 시각(ms) — result에 저장, 관리자 심사에서 일정 대조에 사용
import { getAccessToken, firestoreUrl, toFirestoreValue, toFirestoreFields, fromFirestoreFields } from '../_lib/firebase-admin.js';
import { RULES, BUFF_CARDS, PACER_SKILL, GHOST_SKILL, computeIsTug, computeCompletion } from '../_lib/game-rules.js';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const docName = (env, path) => `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`;

export async function onRequestPost(context) {
  try {
    const { boltId, distanceKm, participantIds, certPhoto, certAt } = await context.request.json();
    if (!boltId || typeof distanceKm !== 'number' || !Array.isArray(participantIds) || participantIds.length === 0) {
      return json({ error: 'boltId·distanceKm·participantIds가 필요합니다' }, 400);
    }
    if (distanceKm <= 0 || distanceKm > 200) return json({ error: '거리 값이 올바르지 않습니다' }, 400);

    const env = context.env;
    const accessToken = await getAccessToken(env);
    const authHeaders = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };

    // bolt 읽기 + 상태 검증
    const boltRes = await fetch(firestoreUrl(env, `bolts/${boltId}`), { headers: authHeaders });
    if (boltRes.status === 404) return json({ error: '번개를 찾을 수 없습니다' }, 404);
    if (!boltRes.ok) return json({ error: '번개 조회 실패' }, 502);
    const boltDoc = await boltRes.json();
    const bolt = fromFirestoreFields(boltDoc.fields);
    const updateTime = boltDoc.updateTime;   // 선점용(이 버전일 때만 완료 반영)
    if (!['open', 'running'].includes(bolt.status)) {
      return json({ error: '이미 완료됐거나 종료된 번개입니다' }, 409);
    }

    // 참가자 검증 — 체크인 목록은 실제 참여자의 부분집합이어야 함
    const boltParticipants = bolt.participants || [];
    const checkedIds = participantIds.filter(id => boltParticipants.includes(id));
    if (checkedIds.length === 0) return json({ error: '유효한 참가자가 없습니다' }, 400);

    // players 읽어 역할/팀 맵 구성(서버 신뢰 기준)
    const playersRes = await fetch(firestoreUrl(env, 'players'), { headers: authHeaders });
    const playersData = await playersRes.json();
    const playerMap = {};
    for (const d of playersData.documents || []) {
      const id = d.name.split('/').pop();
      playerMap[id] = fromFirestoreFields(d.fields);
    }

    // settings에서 줄다리기 단계 판정
    const settingsRes = await fetch(firestoreUrl(env, 'game/settings'), { headers: authHeaders });
    const settings = settingsRes.ok ? fromFirestoreFields((await settingsRes.json()).fields) : {};
    const isTug = computeIsTug(settings.startDate);

    // 단일팀 여부 → 버프/스킬 카드. 혼합팀은 서버가 버프 draw(조작 차단), 단일팀은 팀 스킬.
    const teams = boltParticipants.map(id => playerMap[id]?.team);
    const singleTeam = boltParticipants.length >= RULES.singleTeamMin && teams.every(t => t && t === teams[0]);
    let card;
    if (singleTeam) {
      card = teams[0] === 'pacer' ? PACER_SKILL : GHOST_SKILL;
    } else {
      card = BUFF_CARDS[Math.floor(Math.random() * BUFF_CARDS.length)];
    }
    const buffMultiplier = card.multiplier;

    const { gaugeDelta, perPlayerKmInc, boltTeam } =
      computeCompletion({ bolt, playerMap, distanceKm, participantIds: checkedIds, buffMultiplier, isTug });

    const result = {
      singleTeam, isTug, distanceKm, buffMultiplier,
      participantIds: checkedIds, participantCount: checkedIds.length,
      boltTeam, card, boltTitle: bolt.title ?? '번개',
      gaugeDelta: { ...gaugeDelta },   // 불인정 원복용
      certAt: typeof certAt === 'number' ? certAt : null,   // 관리자 심사 일정 대조용
    };

    // 원자 커밋: bolt 완료(선점 precondition) + 게이지 증감 + 참가자 km/완료수 증감
    const writes = [
      {
        update: {
          name: docName(env, `bolts/${boltId}`),
          fields: toFirestoreFields({ status: 'done', result, reviewStatus: 'pending' }),
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
      // FAILED_PRECONDITION = 다른 요청이 이미 완료 처리함 → 중복, 조용히 성공 처리
      if (commitRes.status === 409 || /FAILED_PRECONDITION/.test(JSON.stringify(err))) {
        return json({ error: '이미 완료 처리된 번개입니다', duplicate: true }, 409);
      }
      return json({ error: err.error?.message || '완료 처리 실패' }, 502);
    }

    // 음수 클램프(게이지는 0 미만 불가) — set-gauge와 동일 패턴, 커밋 후 보정
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

    // 인증 사진은 별도 컬렉션에 저장(관리자만 조회 — 참가자 기기 부담 방지). 실패해도 완료는 유효.
    if (typeof certPhoto === 'string' && certPhoto.startsWith('data:image/') && certPhoto.length <= 800000) {
      await fetch(`${firestoreUrl(env, `certPhotos/${boltId}`)}`, {
        method: 'PATCH', headers: authHeaders,
        body: JSON.stringify({ fields: toFirestoreFields({ photo: certPhoto, at: Date.now() }) }),
      }).catch(() => {});
    }

    return json({ result, card });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
