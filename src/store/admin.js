// 관리자 전용 — 팀·역할 배정표(서버 secrets) 조회·조작, 번개 인증 심사.
// 참가자 기기는 이 모듈의 함수를 호출하지 않는다(관리자 인증 헤더 필요).

import { doc, updateDoc, deleteDoc, increment } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { db } from '../firebase-config.js';
import { state, notify, adminAuthHeaders, ADMIN_EXPIRED_MSG, playerById, pushTimelineEvent } from './core.js';
import { applyGaugeDelta } from './game.js';
import { boltDeadline } from './bolts.js';

// ── 관리자 전용 배정표 ────────────────────────────────────
// 팀·역할은 이제 서버(secrets/assignment)에만 있어 참가자 앱은 남의 것을 볼 수 없다.
// 관리 화면은 관리자 인증으로 따로 받아와 캐시한다(참가자 기기는 이 함수를 호출하지 않는다).
let _adminSecrets = { byId: {}, players: [], loadedAt: 0, requireCode: false, migrated: false };

export async function loadAdminSecrets({ force = false } = {}) {
  if (!force && Date.now() - _adminSecrets.loadedAt < 30_000) return _adminSecrets;
  try {
    const res = await fetch('/api/admin-secrets', {
      method: 'POST', headers: { 'content-type': 'application/json', ...adminAuthHeaders() },
      body: JSON.stringify({ action: 'list' }),
    });
    if (!res.ok) return _adminSecrets;
    const data = await res.json();
    const byId = {};
    for (const p of data.players || []) byId[p.id] = p;
    _adminSecrets = {
      byId, players: data.players || [], loadedAt: Date.now(),
      requireCode: !!data.requireCode, migrated: !!data.migrated,
    };
    notify();
  } catch {}
  return _adminSecrets;
}

export function getAdminSecrets() {
  return _adminSecrets;
}

// 관리 화면에서 한 명의 팀·역할 — 캐시에 없으면(로드 전·마이그레이션 전) players 문서로 폴백
export function adminSecretOf(playerId) {
  const s = _adminSecrets.byId[playerId];
  if (s) return s;
  const p = state.players.find(x => x.id === playerId);
  return p ? { id: p.id, name: p.name, team: p.team ?? null, role: p.role ?? null } : null;
}

export async function adminSecretsAction(action, payload = {}) {
  const res = await fetch('/api/admin-secrets', {
    method: 'POST', headers: { 'content-type': 'application/json', ...adminAuthHeaders() },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '요청에 실패했습니다');
  _adminSecrets.loadedAt = 0;   // 다음 조회 때 새로 받도록
  return data;
}

// ── 관리자 — 번개 인증 심사 ─────────────────────────────
// 완료된 번개 목록(최신순) + 심사에 필요한 정보. 자동 만료(expired)는 사진이 없어 제외.
export function getCertReviews() {
  return state.bolts
    .filter(b => b.status === 'done')
    .map(b => ({
      id: b.id,
      title: b.title,
      place: b.place,
      time: b.time,
      startAt: b.startAt ?? null,
      deadline: boltDeadline(b),
      reviewStatus: b.reviewStatus ?? null,   // null = 심사 기능 도입 전 완료분
      result: b.result ?? null,
      participants: (b.result?.participantIds ?? b.participants ?? [])
        .map(pid => { const p = playerById(pid); const s = adminSecretOf(pid); return { name: p?.name ?? '?', team: s?.team ?? null, runningMate: !!s?.runningMate }; }),
    }))
    .sort((a, b) => (b.startAt ?? 0) - (a.startAt ?? 0));
}

// 인증 사진 조회 — 관리자 인증 관리 화면에서만 개별 로드(구독하지 않음).
// 참가자 앱도 이 store를 공유하므로, 컬렉션 구독을 걸면 분리한 의미가 없어진다.
export async function fetchCertPhoto(boltId) {
  try {
    const res = await fetch('/api/cert-photo', {
      method: 'POST', headers: { 'content-type': 'application/json', ...adminAuthHeaders() },
      body: JSON.stringify({ boltId, get: true }),
    });
    if (!res.ok) return null;
    return (await res.json()).photo ?? null;
  } catch {
    return null;
  }
}

export async function approveBoltCert(boltId) {
  await updateDoc(doc(db, 'bolts', boltId), { reviewStatus: 'approved' });
}

// 불인정 — 완료 시 저장해둔 gaugeDelta를 그대로 되돌리고(이후 역할 변화와 무관하게 정확),
// 참가자들의 개인 마일리지·완료 횟수도 원복한다. 전체 공개 타임라인에 취소 소식을 남긴다.
export async function rejectBoltCert(boltId) {
  const bolt = state.bolts.find(b => b.id === boltId);
  if (!bolt || bolt.status !== 'done') throw new Error('완료된 번개가 아닙니다');
  if (bolt.reviewStatus === 'rejected') return;
  const r = bolt.result;
  if (!r) throw new Error('결과 기록이 없어 원복할 수 없습니다(구버전 완료분)');

  const writes = [updateDoc(doc(db, 'bolts', boltId), { reviewStatus: 'rejected' })];
  for (const pid of r.participantIds ?? []) {
    if (!playerById(pid)) continue;
    writes.push(updateDoc(doc(db, 'players', pid), {
      km: increment(-r.distanceKm), boltsCompleted: increment(-1),
    }));
  }
  // 이 번개의 "완료됐습니다"·"러닝메이트 축포" 소식 삭제 — 남겨두면 취소 소식과 나란히 보여
  // 다시 완료된 것처럼 오해를 부른다
  for (const e of state.timeline) {
    if ((e.kind === 'bolt' || e.kind === 'runmate') && e.boltId === boltId) {
      writes.push(deleteDoc(doc(db, 'timeline', e.id)));
    }
  }
  await Promise.all(writes);

  const d = r.gaugeDelta ?? { pacer: 0, ghost: 0 };
  applyGaugeDelta({ pacer: -d.pacer, ghost: -d.ghost });

  pushTimelineEvent({ kind: 'reject', title: bolt.title, boltId });
}

// 만료된 번개를 관리자가 수동으로 완료 처리 — 실제로 뛴 게 확인됐을 때(아침 런 등
// 인증 마감을 놓친 경우) 뒤늦게 인정한다. 게이지·마일리지 반영은 서버가 계산한다.
export async function completeExpiredBolt(boltId, distanceKm, participantIds) {
  const res = await fetch('/api/complete-expired', {
    method: 'POST', headers: { 'content-type': 'application/json', ...adminAuthHeaders() },
    body: JSON.stringify({ boltId, distanceKm, participantIds }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || (res.status === 401 ? ADMIN_EXPIRED_MSG : '완료 처리에 실패했습니다'));
  return data;
}

// 재인정 — 불인정으로 되돌린 걸 다시 반영(확인 결과 맞는 인증일 때). reject의 정확한 역연산.
export async function reapproveBoltCert(boltId) {
  const bolt = state.bolts.find(b => b.id === boltId);
  if (!bolt || bolt.status !== 'done') throw new Error('완료된 번개가 아닙니다');
  if (bolt.reviewStatus !== 'rejected') return;   // 불인정 상태만 되돌린다
  const r = bolt.result;
  if (!r) throw new Error('결과 기록이 없어 되돌릴 수 없습니다(구버전 완료분)');

  const writes = [updateDoc(doc(db, 'bolts', boltId), { reviewStatus: 'approved' })];
  for (const pid of r.participantIds ?? []) {
    if (!playerById(pid)) continue;
    writes.push(updateDoc(doc(db, 'players', pid), {
      km: increment(r.distanceKm), boltsCompleted: increment(1),
    }));
  }
  // 불인정 때 남긴 '취소' 소식 삭제 (boltId 없는 구버전 취소 소식은 제목으로 보조 매칭)
  for (const e of state.timeline) {
    if (e.kind === 'reject' && (e.boltId === boltId || (!e.boltId && e.title === bolt.title))) {
      writes.push(deleteDoc(doc(db, 'timeline', e.id)));
    }
  }
  await Promise.all(writes);

  const d = r.gaugeDelta ?? { pacer: 0, ghost: 0 };
  applyGaugeDelta({ pacer: d.pacer, ghost: d.ghost });

  pushTimelineEvent({ kind: 'bolt', title: bolt.title, count: r.participantCount, boltId });
  if (r.singleTeam && r.card?.name === '러닝메이트') {
    pushTimelineEvent({ kind: 'runmate', title: bolt.title, boltId });
  }
}
