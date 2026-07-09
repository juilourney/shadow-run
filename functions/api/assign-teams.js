// Cloudflare Pages Function — 참가자 명단(roster)을 기준으로 팀·역할을 랜덤 배정하고
// game/assignment 문서에 기록. 여러 참가자 기기가 거의 동시에 마감 시각을 감지해도
// 전부 이 엔드포인트를 호출할 수 있으므로, 이미 배정됐으면 그대로 재사용(멱등)한다.
// 서버가 유일한 계산 주체 — 클라이언트마다 각자 랜덤을 돌리면 기기별로 결과가 달라지는 문제를 막는다.
import { getAccessToken, firestoreUrl, toFirestoreValue, toFirestoreFields, fromFirestoreFields } from '../_lib/firebase-admin.js';
import { verifyAdminAuth, unauthorized } from '../_lib/admin-auth.js';

const SPECIAL_ROLES = ['elite', 'anchor', 'double', 'detective', 'spy'];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 명단 → 두 팀 균등분할(홀수면 1명 랜덤팀) → 각 팀 앞 5명 특수역할, 나머지 러너
function assignTeamsAndRoles(roster) {
  const shuffled = shuffle(roster);
  const half = Math.floor(shuffled.length / 2);
  const pacer = shuffled.slice(0, half);
  const ghost = shuffled.slice(half, half * 2);
  const rest = shuffled.slice(half * 2); // 홀수면 1명 남음
  rest.forEach(p => (Math.random() < 0.5 ? pacer : ghost).push(p));

  const withRoles = team => team.map((p, i) => ({
    id: p.id, name: p.name,
    role: i < SPECIAL_ROLES.length ? SPECIAL_ROLES[i] : 'runner',
  }));

  return [
    ...withRoles(pacer).map(p => ({ ...p, team: 'pacer' })),
    ...withRoles(ghost).map(p => ({ ...p, team: 'ghost' })),
  ];
}

export async function onRequestPost(context) {
  try {
    const { reset } = await context.request.json().catch(() => ({}));

    const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = context.env;
    if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
      return new Response(JSON.stringify({ error: 'Firebase 서비스 계정 환경변수가 설정되지 않았습니다' }), {
        status: 500, headers: { 'content-type': 'application/json' }
      });
    }
    const accessToken = await getAccessToken(context.env);
    const authHeaders = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };

    // 신규 게임 생성 시 호출 — 배정 결과 초기화 + players 컬렉션 삭제(다음 시즌 모집을 위해)
    // 참가자 기기가 부를 일이 없는 관리자 전용 액션이라 인증을 요구한다.
    if (reset) {
      if (!(await verifyAdminAuth(context.request, context.env))) return unauthorized();
      const playersRes = await fetch(firestoreUrl(context.env, 'players'), { headers: authHeaders });
      const playersData = await playersRes.json();
      await Promise.all((playersData.documents || []).map(d =>
        fetch(firestoreUrl(context.env, `players/${d.name.split('/').pop()}`), { method: 'DELETE', headers: authHeaders })
      ));

      // seasonId — 새 시즌마다 값이 바뀌어, 참가자 기기가 로컬에 남겨둔 "이름 기억하기"가
      // 이전 시즌 것인지 구분하는 용도(store.js의 getSavedName 참고).
      const resetRes = await fetch(firestoreUrl(context.env, 'game/assignment'), {
        method: 'PATCH', headers: authHeaders,
        body: JSON.stringify({ fields: {
          assigned: toFirestoreValue(false), players: toFirestoreValue([]), assignedAt: toFirestoreValue(0),
          seasonId: toFirestoreValue(Date.now()),
        } }),
      });
      const resetData = await resetRes.json();
      return new Response(JSON.stringify(resetData), { status: resetRes.status, headers: { 'content-type': 'application/json' } });
    }

    // 이미 배정됐으면 그대로 반환 (멱등 — 중복 호출 대비)
    const existingRes = await fetch(firestoreUrl(context.env, 'game/assignment'), { headers: authHeaders });
    if (existingRes.ok) {
      const existing = await existingRes.json();
      const existingFields = fromFirestoreFields(existing.fields);
      if (existingFields.assigned) {
        return new Response(JSON.stringify(existingFields), { status: 200, headers: { 'content-type': 'application/json' } });
      }
    }

    // 명단 조회
    const rosterRes = await fetch(firestoreUrl(context.env, 'roster'), { headers: authHeaders });
    const rosterData = await rosterRes.json();
    const roster = (rosterData.documents || []).map(doc => ({
      id: doc.name.split('/').pop(),
      ...fromFirestoreFields(doc.fields),
    }));

    if (roster.length < 2) {
      return new Response(JSON.stringify({ error: `배정하려면 최소 2명이 필요합니다 (현재 ${roster.length}명)` }), {
        status: 400, headers: { 'content-type': 'application/json' }
      });
    }

    const players = assignTeamsAndRoles(roster);
    const result = { assigned: true, players, assignedAt: Date.now() };

    // players 컬렉션 시드 — 게임 진행 중 마일리지·역할공개 상태가 쌓일 단일 출처
    await Promise.all(players.map(p => fetch(firestoreUrl(context.env, `players/${p.id}`), {
      method: 'PATCH', headers: authHeaders,
      body: JSON.stringify({ fields: toFirestoreFields({
        name: p.name, team: p.team, role: p.role, km: 0, boltsCompleted: 0,
        publicTeam: null, publicRole: null, penalized: false, abilityStripped: false,
      }) }),
    })));

    const writeRes = await fetch(firestoreUrl(context.env, 'game/assignment'), {
      method: 'PATCH', headers: authHeaders,
      body: JSON.stringify({ fields: { assigned: toFirestoreValue(true), players: toFirestoreValue(players), assignedAt: toFirestoreValue(result.assignedAt) } }),
    });
    if (!writeRes.ok) {
      const err = await writeRes.json();
      return new Response(JSON.stringify(err), { status: writeRes.status, headers: { 'content-type': 'application/json' } });
    }

    return new Response(JSON.stringify(result), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { 'content-type': 'application/json' }
    });
  }
}
