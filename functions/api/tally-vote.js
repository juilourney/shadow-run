// 투표 집계 — 서버 권한으로 처리.
//
// 두 가지 이유로 서버로 옮겼다.
//  1) 집계에 대상의 team·role이 필요한데, 그걸 클라이언트가 알고 있으면 비밀 은닉이 무너진다.
//  2) 예전 클라이언트 집계는 여러 기기가 동시에 돌면서 히스토리를 48개까지 중복 기록했다.
//     여기서는 표 삭제(exists 선행조건)까지 포함한 단일 원자 커밋이라, 동시에 여러 번
//     호출돼도 정확히 한 번만 성공한다(나머지는 FAILED_PRECONDITION으로 떨어짐).
//
// 요청: 없음 (Authorization: Bearer <player token>)
// 응답: { tallied: true, result } | { tallied: false, reason }
import { getAccessToken, firestoreUrl, toFirestoreFields, fromFirestoreFields } from '../_lib/firebase-admin.js';
import { readSecretAssignment, findById } from '../_lib/secrets.js';
import { verifyPlayerToken, playerUnauthorized } from '../_lib/player-auth.js';
import { RULES } from '../_lib/game-rules.js';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const docName = (env, path) => `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`;

// Firestore 자동 ID와 같은 형태의 임의 문서 ID
const ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
function randomId() {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return [...bytes].map(b => ID_CHARS[b % ID_CHARS.length]).join('');
}

export async function onRequestPost(context) {
  try {
    const env = context.env;
    if (!(await verifyPlayerToken(context.request, env))) return playerUnauthorized();

    const accessToken = await getAccessToken(env);
    const authHeaders = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };

    const votesRes = await fetch(firestoreUrl(env, 'votes'), { headers: authHeaders });
    if (!votesRes.ok) return json({ error: '투표 조회 실패' }, 502);
    const votesData = await votesRes.json();
    const ballots = (votesData.documents || []).map(d => ({
      id: d.name.split('/').pop(),
      ...fromFirestoreFields(d.fields),
    }));
    if (ballots.length === 0) return json({ tallied: false, reason: 'empty' });

    const assignment = await readSecretAssignment(env, authHeaders);

    const count = {};
    for (const b of ballots) count[b.targetId] = (count[b.targetId] || 0) + 1;
    const maxCount = Math.max(...Object.values(count));
    const topIds = Object.keys(count).filter(id => count[id] === maxCount);
    const threshold = Math.ceil(ballots.length * RULES.voteMinRatio);
    const tie = topIds.length > 1;
    const belowThreshold = maxCount < threshold;

    const writes = [];
    const at = Date.now();
    const caught = [];

    if (tie || belowThreshold) {
      writes.push({
        update: { name: docName(env, `timeline/${randomId()}`), fields: toFirestoreFields({ kind: 'fail', at }) },
      });
      writes.push({
        update: {
          name: docName(env, `voteHistory/${randomId()}`),
          fields: toFirestoreFields({ at, ballotCount: ballots.length, caught: [], tie, maxCount, threshold }),
        },
      });
    } else {
      for (const topId of topIds) {
        const target = findById(assignment, topId);
        if (!target) continue;
        const targetBallots = ballots.filter(b => b.targetId === topId);

        // players의 동적 상태(적발 기준점) — 완주 수는 여기서 읽어 기록한다
        const pRes = await fetch(firestoreUrl(env, `players/${topId}`), { headers: authHeaders });
        const pf = pRes.ok ? fromFirestoreFields((await pRes.json()).fields) : {};

        const update = {
          publicTeam: target.team,
          penalized: true,
          penalizedAtBolts: Number(pf.boltsCompleted) || 0,
        };
        const maskPaths = ['publicTeam', 'penalized', 'penalizedAtBolts'];

        let roleRevealed = false, guessFailed = false, guessedRole = null;
        const roleCount = {};
        for (const b of targetBallots) if (b.roleGuess) roleCount[b.roleGuess] = (roleCount[b.roleGuess] || 0) + 1;
        let consensusRole = null, consensusN = 0;
        for (const [role, n] of Object.entries(roleCount)) if (n > consensusN) { consensusN = n; consensusRole = role; }
        const ratio = consensusRole ? consensusN / targetBallots.length : 0;

        if (consensusRole && ratio >= RULES.roleRevealThreshold) {
          if (consensusRole === target.role) {
            roleRevealed = true;
            update.publicRole = target.role;
            update.abilityStripped = true;
            maskPaths.push('publicRole', 'abilityStripped');
          } else {
            guessFailed = true;
            guessedRole = consensusRole;
          }
        }

        writes.push({
          update: { name: docName(env, `players/${topId}`), fields: toFirestoreFields(update) },
          updateMask: { fieldPaths: maskPaths },
        });
        writes.push({
          update: {
            name: docName(env, `timeline/${randomId()}`),
            fields: toFirestoreFields({ kind: 'team', name: target.name, team: target.team, at }),
          },
        });
        if (roleRevealed) {
          writes.push({
            update: {
              name: docName(env, `timeline/${randomId()}`),
              fields: toFirestoreFields({ kind: 'role', name: target.name, role: target.role, at }),
            },
          });
        }

        caught.push({
          id: target.id, name: target.name, teamCaught: true, team: target.team,
          roleRevealed, revealedRole: roleRevealed ? target.role : null, guessFailed, guessedRole,
        });
      }

      if (caught.length === 0) {
        // 최다 득표자가 배정에서 사라진 경우 — 표만 정리하고 끝낸다
        writes.length = 0;
      } else {
        writes.push({
          update: {
            name: docName(env, `voteHistory/${randomId()}`),
            fields: toFirestoreFields({
              at, ballotCount: ballots.length,
              caught: caught.map(c => ({
                name: c.name, teamCaught: c.teamCaught, team: c.team,
                roleRevealed: c.roleRevealed, revealedRole: c.revealedRole, guessFailed: c.guessFailed,
              })),
            }),
          },
        });
      }
    }

    // 표 삭제를 같은 커밋에 넣는다 — 이미 집계된 라운드면 여기서 실패해 전체가 취소된다(중복 방지)
    for (const b of ballots) {
      writes.push({ delete: docName(env, `votes/${b.id}`), currentDocument: { exists: true } });
    }

    const commitUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`;
    const commitRes = await fetch(commitUrl, { method: 'POST', headers: authHeaders, body: JSON.stringify({ writes }) });
    if (!commitRes.ok) {
      const err = await commitRes.json().catch(() => ({}));
      if (commitRes.status === 409 || /FAILED_PRECONDITION|NOT_FOUND/.test(JSON.stringify(err))) {
        return json({ tallied: false, reason: 'already' });   // 다른 요청이 이미 집계함
      }
      return json({ error: err.error?.message || '집계 실패' }, 502);
    }

    return json({ tallied: true, result: { tie: caught.length > 1, belowThreshold, threshold, maxCount, caught } });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
