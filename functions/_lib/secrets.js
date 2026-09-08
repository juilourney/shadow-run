// 팀·역할(게임의 핵심 비밀) 저장소 접근 — 서비스 계정 전용.
//
// 예전엔 game/assignment와 players 문서에 team·role이 그대로 들어 있었고 두 문서 모두
// 공개 읽기라, URL 한 줄이면 로그인 없이 전원의 정체를 볼 수 있었다. 비밀은 이제
// secrets/assignment 한 문서로 옮기고 Firestore 규칙에서 클라이언트 접근을 전면 차단한다.
//
// 마이그레이션 도중에도 서버가 멈추지 않도록 이중 읽기(secrets → 없으면 game/assignment)를
// 한다. 마이그레이션이 끝나면 game/assignment에는 team·role이 남아 있지 않다.
import { firestoreUrl, fromFirestoreFields } from './firebase-admin.js';

export function nameEq(a, b) {
  return (a || '').normalize('NFC').trim() === (b || '').normalize('NFC').trim();
}

// { players: [{id, name, team, role}], assignedAt, seasonId, fromSecrets }
export async function readSecretAssignment(env, authHeaders) {
  const secretRes = await fetch(firestoreUrl(env, 'secrets/assignment'), { headers: authHeaders });
  if (secretRes.ok) {
    const f = fromFirestoreFields((await secretRes.json()).fields);
    if (Array.isArray(f.players) && f.players.length) return { ...f, fromSecrets: true };
  }
  // 아직 마이그레이션 전 — 기존 위치에서 읽는다
  const asgRes = await fetch(firestoreUrl(env, 'game/assignment'), { headers: authHeaders });
  if (!asgRes.ok) return { players: [], fromSecrets: false };
  const f = fromFirestoreFields((await asgRes.json()).fields);
  return { ...f, players: f.players || [], fromSecrets: false };
}

export function findByName(assignment, name) {
  return (assignment.players || []).find(p => nameEq(p.name, name)) || null;
}

export function findById(assignment, id) {
  return (assignment.players || []).find(p => p.id === id) || null;
}

// identities/{playerId} — 참가 코드와 기기 바인딩. 서버 전용(규칙에서 클라 접근 차단).
export async function readIdentity(env, authHeaders, playerId) {
  const res = await fetch(firestoreUrl(env, `identities/${playerId}`), { headers: authHeaders });
  if (!res.ok) return null;
  return fromFirestoreFields((await res.json()).fields);
}
