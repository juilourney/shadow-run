// ═══════════════════════════════════════════════════════════
//  STORE — 게임 상태의 유일한 창구 (Single Source of Truth)
//
//  설계 원칙:
//   1. 모든 액션은 async  → 내부에서 Firestore 호출
//   2. subscribe/notify   → 값이 바뀌면 구독한 화면이 자동 갱신 (실시간)
//   3. 게임 규칙은 store 안에만 → 화면은 결과값만 읽고, 규칙을 모른다
//
//  Firestore 구성:
//   - game/gauge · game/settings · game/assignment · roster: 서버 전용 쓰기
//     (allow write: if false + Cloudflare Function이 서비스 계정으로 대신 씀)
//   - players · bolts · votes · voteHistory · timeline: 클라이언트 직접 쓰기
//     (allow write: if true — 크루 내부용 게임이라 신뢰 기반으로 열어둠)
//
//  구현은 도메인별로 store/ 아래에 나뉘어 있고, 이 파일은 화면에 공개할 API만 모아 내보낸다.
//  화면은 항상 이 파일만 import한다 — 내부 state·헬퍼는 여기서 재노출하지 않는다.
//   store/core.js     공통 상태·구독·설정(CONFIG)·관리자 토큰·공용 헬퍼
//   store/game.js     게이지·게임 설정(캘린더·단계)·타임라인·신규 게임
//   store/roster.js   참가자 명단·팀/역할 배정
//   store/players.js  참가자·나(getMe)·능력·서버 신원 반영
//   store/session.js  이 기기에 저장된 이름·확인 기록
//   store/bolts.js    번개
//   store/votes.js    투표
//   store/admin.js    관리자 배정표·인증 심사
// ═══════════════════════════════════════════════════════════

export {
  CONFIG, CERT_GRACE_MS, subscribe, reconnectFirestore, nameEq,
  isAdminTokenValid, clearAdminToken,
} from './store/core.js';

export {
  getGauge, getCalendar, isVoteWindowNow, isGaugeNumbersPublic, getPhase,
  getTimeline, recordTugResult, getGameSettings, isSettingsLoaded, createNewGame,
} from './store/game.js';

export {
  isRosterLoaded, triggerAssignment, getRoster, isNameRegistered, joinRoster,
  getAssignment, isAssignmentLoaded, addRosterMember, updateRosterMember, removeRosterMember,
} from './store/roster.js';

export {
  getMe, getPlayers, applyServerMe, takeReassignNotice, getAbility, useAbility,
} from './store/players.js';

export {
  hasConfirmedRole, getConfirmedRecord, peekConfirmedName, markRoleConfirmed,
  getSavedName, saveName, isSavedNameStale, clearSavedIdentity, clearConfirmedRecord,
} from './store/session.js';

export {
  setPendingBolt, getPendingBolt, setLastBoltResult, getLastBoltResult,
  boltEstimatedFinish, boltDeadline, getBolts, getJoinedBoltId, startBolt,
  ensureBoltTeamInfo, getBoltTeamInfo,
  createBolt, joinBolt, leaveBolt, cancelBolt, toggleBoltLock, completeBolt, publishBoltResult,
} from './store/bolts.js';

export {
  getVote, getVoteHistory, castVote, tallyVote,
} from './store/votes.js';

export {
  loadAdminSecrets, getAdminSecrets, adminSecretOf, adminSecretsAction,
  getCertReviews, fetchCertPhoto, approveBoltCert, rejectBoltCert, completeExpiredBolt, reapproveBoltCert,
} from './store/admin.js';

// 상수 재노출 (화면이 store 하나만 import하면 되도록)
export { ROLES, SPECIAL_ROLES } from './state.js';
