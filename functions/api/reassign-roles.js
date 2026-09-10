// 2주차 엘리트·앵커 재배정 — 정해진 시각(일요일 자정) 이후 첫 호출 때 한 번만 자동 실행.
//
// 안 뛰는 엘리트·앵커의 역할이 낭비되는 걸 막기 위해, 각 팀에서 엘리트·앵커를 가중
// 랜덤으로 다시 뽑는다. 참가자에게 공지된 이벤트라 새 역할자에겐 앱에서 재배정 카드가 뜬다.
//
// 조건(관리자 확정):
//  - 마일리지 0인 사람은 후보 제외
//  - 밀정·탐정·더블은 건드리지 않음(후보 아님)
//  - 러닝메이트도 후보 제외(엘리트·앵커엔 러닝메이트가 안 붙는 규칙 유지)
//  - 현재 엘리트·앵커도 다시 뽑힐 수 있으나 확률 낮게(러너의 FORMER_WEIGHT배)
//  - 팀별로 새 엘리트 1명 + 새 앵커 1명(서로 다른 사람)
//
// 시각·중복 방지: now >= 2주차 시작(일요일 00:00 KST) 이고 아직 안 했을 때만.
// secrets/assignment.rolesReassignedAt 플래그 + updateTime 선점으로 정확히 1회.
//
// 이 엔드포인트는 인증 없이(참가자 앱이 부팅 때 자동 호출) 열려 있지만, 결과는 전적으로
// 서버가 랜덤으로 정하고 시각·1회 게이트가 있어 클라이언트가 결과를 조작할 수 없다.
import { getAccessToken, firestoreUrl, toFirestoreFields, fromFirestoreFields } from '../_lib/firebase-admin.js';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const docName = (env, path) => `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`;

const FORMER_WEIGHT = 0.5;   // 현재 엘리트·앵커가 다시 뽑힐 상대 확률(러너=1)

// 2주차 시작 = startDate + 7일, 00:00 KST(= 그 전날 15:00 UTC)
function week2StartMs(startDate) {
  if (!startDate) return Infinity;
  const [y, m, d] = startDate.split('-').map(Number);
  return Date.UTC(y, m - 1, d + 7) - 9 * 3600 * 1000;
}

function weightedPick(pool) {
  const total = pool.reduce((s, p) => s + p.w, 0);
  let r = Math.random() * total;
  for (const p of pool) { r -= p.w; if (r <= 0) return p; }
  return pool[pool.length - 1];
}

export async function onRequestPost(context) {
  try {
    const env = context.env;
    const accessToken = await getAccessToken(env);
    const authHeaders = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };

    // 시각 게이트
    const sRes = await fetch(firestoreUrl(env, 'game/settings'), { headers: authHeaders });
    const settings = sRes.ok ? fromFirestoreFields((await sRes.json()).fields) : {};
    if (Date.now() < week2StartMs(settings.startDate)) {
      return json({ done: false, reason: 'not_yet' });
    }

    // 배정 + 1회 게이트(선점용 updateTime)
    const asgRes = await fetch(firestoreUrl(env, 'secrets/assignment'), { headers: authHeaders });
    if (!asgRes.ok) return json({ done: false, reason: 'no_assignment' });
    const asgDoc = await asgRes.json();
    const assignment = fromFirestoreFields(asgDoc.fields);
    if (assignment.rolesReassignedAt) return json({ done: false, reason: 'already' });
    const updateTime = asgDoc.updateTime;

    // km(마일리지) — players 컬렉션
    const pRes = await fetch(firestoreUrl(env, 'players'), { headers: authHeaders });
    const pData = await pRes.json();
    const kmById = {};
    for (const d of pData.documents || []) {
      const pf = fromFirestoreFields(d.fields);
      kmById[d.name.split('/').pop()] = Number(pf.km) || 0;
    }

    const players = (assignment.players || []).map(p => ({ ...p }));
    const changes = [];   // { id, from, to } — 로그용(응답엔 안 실음)

    for (const team of ['pacer', 'ghost']) {
      const members = players.filter(p => p.team === team);
      // 후보 풀: km>0, 역할이 러너·엘리트·앵커(밀정·탐정·더블 제외), 러닝메이트 아님
      const pool = members
        .filter(p => (kmById[p.id] || 0) > 0
          && (p.role === 'runner' || p.role === 'elite' || p.role === 'anchor')
          && !p.runningMate)
        .map(p => ({ p, w: (p.role === 'elite' || p.role === 'anchor') ? FORMER_WEIGHT : 1 }));

      if (pool.length < 2) continue;   // 뽑을 사람이 부족하면 이 팀은 그대로 둔다

      const eliteWin = weightedPick(pool);
      const anchorWin = weightedPick(pool.filter(x => x.p.id !== eliteWin.p.id));

      // 현재 엘리트·앵커를 러너로 되돌린 뒤 새로 지정 (새 사람이 옛 사람과 같아도 안전)
      for (const p of members) {
        if (p.role === 'elite' || p.role === 'anchor') {
          if (p.role !== 'runner') changes.push({ id: p.id, from: p.role, to: 'runner' });
          p.role = 'runner';
        }
      }
      const setRole = (winId, role) => {
        const t = players.find(p => p.id === winId);
        if (t && t.role !== role) { changes.push({ id: t.id, from: t.role, to: role }); t.role = role; }
      };
      setRole(eliteWin.p.id, 'elite');
      setRole(anchorWin.p.id, 'anchor');
    }

    // 원자 커밋: 새 배정 + 1회 플래그 (updateTime 선점 — 동시 호출 시 하나만 성공)
    const commitUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`;
    const res = await fetch(commitUrl, {
      method: 'POST', headers: authHeaders,
      body: JSON.stringify({
        writes: [{
          update: {
            name: docName(env, 'secrets/assignment'),
            fields: toFirestoreFields({ ...assignment, players, rolesReassignedAt: Date.now() }),
          },
          currentDocument: { updateTime },
        }],
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 409 || /FAILED_PRECONDITION/.test(JSON.stringify(err))) {
        return json({ done: false, reason: 'already' });   // 다른 요청이 먼저 처리함
      }
      return json({ error: err.error?.message || '재배정 실패' }, 502);
    }

    return json({ done: true, changedCount: changes.length });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
