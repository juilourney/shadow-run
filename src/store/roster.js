// 참가자 명단(roster)과 팀·역할 배정 — 둘 다 쓰기는 서버 전용(/api/roster, /api/assign-teams).

import { doc, collection, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { db } from '../firebase-config.js';
import { state, notify, adminAuthHeaders, nameEq } from './core.js';

// 참가자 명단 — 쓰기는 서버(/api/roster)만.
// 명단은 강퇴 판정(관리자가 내 이름을 지웠는지)의 근거이기도 하므로 서버 확정 스냅샷만 신뢰.
onSnapshot(collection(db, 'roster'), snap => {
  if (snap.metadata.fromCache) return;
  state.roster = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  state.rosterLoaded = true;
  notify();
}, err => console.warn('명단 실시간 동기화 실패:', err.message));

export function isRosterLoaded() {
  return state.rosterLoaded;
}

// 팀·역할 배정 결과 — 쓰기는 서버(/api/assign-teams)만.
// 배정은 부팅 라우팅(게임/대기실/이름 화면 판정)의 근거라 서버 확정 스냅샷만 신뢰한다 —
// 재연결(disableNetwork) 중엔 빈 캐시 기준 스냅샷이 와서 "배정 없음"으로 오판할 수 있다.
onSnapshot(doc(db, 'game', 'assignment'), snap => {
  if (snap.metadata.fromCache) return;
  state.assignment = snap.exists() ? snap.data() : { assigned: false, players: [] };
  state.assignmentLoaded = true;
  notify();
}, err => console.warn('배정 결과 실시간 동기화 실패:', err.message));

export async function triggerAssignment() {
  // 관리자 브라우저에서는 인증 헤더가 붙어 시작 전에도 수동 마감·배정 가능.
  // 참가자 기기는 빈 헤더 — 서버가 시작 시각 전 요청을 거절한다(경합 차단).
  const res = await fetch('/api/assign-teams', { method: 'POST', headers: { 'content-type': 'application/json', ...adminAuthHeaders() }, body: '{}' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '배정에 실패했습니다');
  return data;
}

export function resetAssignment() {
  return fetch('/api/assign-teams', {
    method: 'POST', headers: { 'content-type': 'application/json', ...adminAuthHeaders() },
    body: JSON.stringify({ reset: true }),
  }).catch(err => console.warn('배정 초기화 실패:', err.message));
}

export function getRoster() {
  return state.roster.map(r => ({ ...r })).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

export function isNameRegistered(name) {
  return state.roster.some(r => nameEq(r.name, name));
}

// 참가자가 이름 입력 화면에서 직접 자기 이름을 명단에 등록 — 이미 있으면 그대로 통과.
export async function joinRoster(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) throw new Error('이름을 입력하세요');
  const res = await fetch('/api/roster', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'selfJoin', name: trimmed }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '등록에 실패했습니다');
  return data;
}

export function getAssignment() {
  return { ...state.assignment, players: state.assignment.players.map(p => ({ ...p })) };
}

// game/assignment onSnapshot이 최초 1회라도 도착했는지 — 부팅 시 이름 화면으로 보낼지
// 판정하기 전에, Firestore가 실제로 응답했는지 확인하는 용도.
export function isAssignmentLoaded() {
  return state.assignmentLoaded;
}

// 관리자 — 참가자 명단(사전 등록) 추가
export async function addRosterMember(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) throw new Error('이름을 입력하세요');
  if (state.roster.some(r => r.name === trimmed)) throw new Error('이미 명단에 있는 이름입니다');
  const res = await fetch('/api/roster', {
    method: 'POST', headers: { 'content-type': 'application/json', ...adminAuthHeaders() },
    body: JSON.stringify({ action: 'add', name: trimmed }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '명단 추가에 실패했습니다');
  return data;
}

export async function updateRosterMember(id, name) {
  const trimmed = (name || '').trim();
  if (!trimmed) throw new Error('이름을 입력하세요');
  const res = await fetch('/api/roster', {
    method: 'POST', headers: { 'content-type': 'application/json', ...adminAuthHeaders() },
    body: JSON.stringify({ action: 'update', id, name: trimmed }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '명단 수정에 실패했습니다');
  return data;
}

export async function removeRosterMember(id) {
  const res = await fetch('/api/roster', {
    method: 'POST', headers: { 'content-type': 'application/json', ...adminAuthHeaders() },
    body: JSON.stringify({ action: 'remove', id }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '명단 삭제에 실패했습니다');
}
