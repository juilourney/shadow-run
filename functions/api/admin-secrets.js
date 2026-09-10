// 관리자 전용 — 비밀 분리 마이그레이션과 참가 코드 관리.
//
// action:
//  'status'         현재 상태(마이그레이션 여부·코드 발급 수·바인딩 수·requireCode)
//  'migrate'        team·role을 secrets/assignment로 옮기고 공개 문서에서 제거 + 코드 일괄 발급
//  'list'           전체 배정 + 참가 코드 + 기기 바인딩 상태 (관리자 명단 화면용)
//  'resetBinding'   { playerId } 기기 바인딩 해제 — 폰을 바꾼 참가자 재입장용
//  'regenerateCode' { playerId } 코드 재발급
//  'setRequireCode' { value } 코드 필수 모드 on/off (2단계 전환 스위치)
import { getAccessToken, firestoreUrl, toFirestoreFields, fromFirestoreFields } from '../_lib/firebase-admin.js';
import { verifyAdminAuth, unauthorized } from '../_lib/admin-auth.js';
import { generateCode } from '../_lib/player-auth.js';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const docName = (env, path) => `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`;

async function readDoc(env, authHeaders, path) {
  const res = await fetch(firestoreUrl(env, path), { headers: authHeaders });
  if (!res.ok) return null;
  return fromFirestoreFields((await res.json()).fields);
}

async function readIdentities(env, authHeaders) {
  const res = await fetch(firestoreUrl(env, 'identities?pageSize=300'), { headers: authHeaders });
  if (!res.ok) return {};
  const data = await res.json();
  const out = {};
  for (const d of data.documents || []) out[d.name.split('/').pop()] = fromFirestoreFields(d.fields);
  return out;
}

async function commit(env, authHeaders, writes) {
  if (writes.length === 0) return true;
  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`;
  const res = await fetch(url, { method: 'POST', headers: authHeaders, body: JSON.stringify({ writes }) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error?.message || '쓰기 실패');
  return true;
}

export async function onRequestPost(context) {
  try {
    if (!(await verifyAdminAuth(context.request, context.env))) return unauthorized();
    const env = context.env;
    const { action, playerId, value } = await context.request.json().catch(() => ({}));

    const accessToken = await getAccessToken(env);
    const authHeaders = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };

    const secrets = await readDoc(env, authHeaders, 'secrets/assignment');
    const publicAsg = await readDoc(env, authHeaders, 'game/assignment');
    const migrated = Array.isArray(secrets?.players) && secrets.players.some(p => p.team);

    if (action === 'status') {
      const identities = await readIdentities(env, authHeaders);
      const cfg = await readDoc(env, authHeaders, 'secrets/config');
      const publicHasSecrets = (publicAsg?.players || []).some(p => p.team || p.role);
      return json({
        migrated,
        publicHasSecrets,                        // true면 아직 공개 문서에 비밀이 남아 있음
        playerCount: (secrets?.players || publicAsg?.players || []).length,
        codeCount: Object.values(identities).filter(i => i.code).length,
        boundCount: Object.values(identities).filter(i => i.deviceId).length,
        requireCode: !!cfg?.requireCode,
      });
    }

    if (action === 'migrate') {
      // 비밀의 출처를 정한다. 이미 옮겼으면 secrets가 원본이고, 아니면 공개 문서가 원본.
      // 둘 다 team이 없으면 옮길 게 없다는 뜻이므로 아무것도 쓰지 않고 중단한다
      // (두 번째 실행이 secrets를 빈 값으로 덮어써 게임을 날리는 사고 방지).
      const source = migrated ? secrets.players : (publicAsg?.players || []);
      if (!source.length || !source.some(p => p.team)) {
        return json({ error: '옮길 배정 데이터가 없습니다. 이미 마이그레이션됐거나 배정 전입니다.', migrated }, 409);
      }

      const players = source.map(p => ({ id: p.id, name: p.name, team: p.team ?? null, role: p.role ?? null }));
      const identities = await readIdentities(env, authHeaders);

      const writes = [
        {
          update: {
            name: docName(env, 'secrets/assignment'),
            fields: toFirestoreFields({
              players,
              assignedAt: publicAsg?.assignedAt ?? secrets?.assignedAt ?? null,
              seasonId: publicAsg?.seasonId ?? secrets?.seasonId ?? null,
              migratedAt: Date.now(),
            }),
          },
        },
        // 공개 배정 문서에서 team·role 제거 (id·name만 남김)
        {
          update: {
            name: docName(env, 'game/assignment'),
            fields: toFirestoreFields({ players: players.map(p => ({ id: p.id, name: p.name })) }),
          },
          updateMask: { fieldPaths: ['players'] },
        },
      ];

      // players 문서에서 team·role 필드 삭제 (updateMask에만 있고 fields에 없으면 삭제된다)
      for (const p of players) {
        writes.push({
          update: { name: docName(env, `players/${p.id}`), fields: {} },
          updateMask: { fieldPaths: ['team', 'role'] },
        });
      }

      // 참가 코드 발급 — 이미 있으면 유지
      const issued = [];
      for (const p of players) {
        const existing = identities[p.id];
        const code = existing?.code || generateCode();
        issued.push({ id: p.id, name: p.name, code, isNew: !existing?.code });
        if (!existing?.code) {
          writes.push({
            update: { name: docName(env, `identities/${p.id}`), fields: toFirestoreFields({ code, name: p.name }) },
            updateMask: { fieldPaths: ['code', 'name'] },
          });
        }
      }

      // 커밋은 500건 제한 — 40명 규모라 한 번에 들어가지만 안전하게 쪼갠다
      for (let i = 0; i < writes.length; i += 400) {
        await commit(env, authHeaders, writes.slice(i, i + 400));
      }
      return json({ ok: true, playerCount: players.length, issued });
    }

    if (action === 'list') {
      const identities = await readIdentities(env, authHeaders);
      const players = (migrated ? secrets.players : (publicAsg?.players || [])).map(p => ({
        id: p.id, name: p.name, team: p.team ?? null, role: p.role ?? null,
        runningMate: !!p.runningMate,
        code: identities[p.id]?.code ?? null,
        bound: !!identities[p.id]?.deviceId,
        boundAt: identities[p.id]?.boundAt ?? null,
      }));
      const cfg = await readDoc(env, authHeaders, 'secrets/config');
      return json({ players, requireCode: !!cfg?.requireCode, migrated });
    }

    // 러닝메이트 지정/해제 — secrets/assignment.players[].runningMate 토글.
    // 규칙: 팀당 최대 2명, 엘리트·앵커에는 지정 불가(마일리지 영향 역할과 중복 금지).
    if (action === 'setRunningMate') {
      if (!playerId) return json({ error: 'playerId가 필요합니다' }, 400);
      if (!migrated) return json({ error: '먼저 팀·역할 숨기기(마이그레이션)를 실행하세요' }, 409);
      const players = secrets.players.map(p => ({ ...p }));
      const target = players.find(p => p.id === playerId);
      if (!target) return json({ error: '참가자를 찾을 수 없습니다' }, 404);
      const on = value !== false;   // 기본 지정, value:false면 해제
      if (on) {
        if (target.role === 'elite' || target.role === 'anchor') {
          return json({ error: '엘리트·앵커에게는 러닝메이트를 지정할 수 없습니다' }, 409);
        }
        const teamCount = players.filter(p => p.runningMate && p.team === target.team && p.id !== playerId).length;
        if (teamCount >= 2) {
          return json({ error: `${target.team === 'pacer' ? '페이서' : '고스트'}팀 러닝메이트는 이미 2명입니다` }, 409);
        }
      }
      target.runningMate = on;
      await commit(env, authHeaders, [{
        update: { name: docName(env, 'secrets/assignment'), fields: toFirestoreFields({ players }) },
        updateMask: { fieldPaths: ['players'] },
      }]);
      return json({ ok: true, runningMate: on });
    }

    if (action === 'resetBinding') {
      if (!playerId) return json({ error: 'playerId가 필요합니다' }, 400);
      await commit(env, authHeaders, [{
        update: { name: docName(env, `identities/${playerId}`), fields: {} },
        updateMask: { fieldPaths: ['deviceId', 'boundAt'] },
      }]);
      return json({ ok: true });
    }

    if (action === 'regenerateCode') {
      if (!playerId) return json({ error: 'playerId가 필요합니다' }, 400);
      const code = generateCode();
      await commit(env, authHeaders, [{
        update: { name: docName(env, `identities/${playerId}`), fields: toFirestoreFields({ code }) },
        updateMask: { fieldPaths: ['code'] },
      }]);
      return json({ ok: true, code });
    }

    if (action === 'setRequireCode') {
      await commit(env, authHeaders, [{
        update: { name: docName(env, 'secrets/config'), fields: toFirestoreFields({ requireCode: !!value }) },
        updateMask: { fieldPaths: ['requireCode'] },
      }]);
      return json({ ok: true, requireCode: !!value });
    }

    return json({ error: '알 수 없는 action' }, 400);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
