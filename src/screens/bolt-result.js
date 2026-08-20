import { goToScreen } from '../utils/nav.js';
import { getLastBoltResult, setLastBoltResult, getBolts, getMe, getPlayers, subscribe, CONFIG } from '../store.js';
import { state as identity } from '../state.js';

// 이 기기에서 이미 확인한 번개 결과 — 완료된 번개의 결과 화면을 참가자마다
// 딱 한 번만 자동으로 띄우기 위한 기록(새로고침에도 유지되게 localStorage 저장)
const SEEN_KEY = 'sr_seen_bolt_results';

function loadSeenResults() {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); } catch { return []; }
}

export function markBoltResultSeen(boltId) {
  try {
    const seen = loadSeenResults();
    if (seen.includes(boltId)) return;
    seen.push(boltId);
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen.slice(-100)));
  } catch {}
}

export function render() {
  return `
<div class="screen" id="s-bolt-result" style="overflow:hidden;">

  <div style="position:absolute;inset:0;pointer-events:none;">
    <div id="result-orb" style="position:absolute;bottom:-10%;left:50%;transform:translateX(-50%);
      width:90%;aspect-ratio:1;border-radius:50%;filter:blur(70px);opacity:0;
      transition:opacity .8s;background:radial-gradient(circle,rgba(251,146,60,.2) 0%,transparent 70%);"></div>
  </div>

  <div class="scroll-body" style="position:relative;z-index:2;
    padding:calc(var(--safe-top) + 16px) 22px 88px;">

    <div id="result-header" class="anim-up" style="text-align:center;margin-bottom:14px;">
      <div style="width:48px;height:48px;border-radius:16px;background:rgba(251,146,60,.15);
        border:1px solid rgba(251,146,60,.3);display:flex;align-items:center;
        justify-content:center;font-size:22px;margin:0 auto 8px;">⚡</div>
      <h2 style="font-size:23px;font-weight:700;letter-spacing:-.02em;">번개 완료!</h2>
      <p id="result-subtitle" style="font-size:13px;color:#52525b;margin-top:3px;"></p>
    </div>

    <!-- 실제 거리 -->
    <div class="bezel anim-up-1" style="padding:16px;border-radius:22px;text-align:center;margin-bottom:8px;">
      <p style="font-size:11px;color:#52525b;margin-bottom:6px;letter-spacing:.06em;text-transform:uppercase;">실제 완주 거리</p>
      <p id="result-base-km" class="num" style="font-size:42px;font-weight:800;line-height:1;color:#fafafa;">
        —<span style="font-size:18px;font-weight:400;color:#52525b;"> km</span></p>
      <p id="result-participant-count" style="font-size:12px;color:#52525b;margin-top:5px;"></p>
    </div>

    <!-- 버프 / 스킬 -->
    <div id="result-buff-section" class="anim-up-2" style="margin-bottom:8px;"></div>

    <!-- 최종 합계 -->
    <div id="result-total-section" class="anim-up-3" style="margin-bottom:8px;
      background:linear-gradient(135deg,rgba(251,146,60,.15) 0%,rgba(56,189,248,.1) 100%);
      border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:16px;">
      <p style="font-size:11px;color:#71717a;margin-bottom:6px;letter-spacing:.06em;text-transform:uppercase;">이번 번개 총 적립</p>
      <p id="result-total-km" class="num" style="font-size:38px;font-weight:800;line-height:1;">
        —<span style="font-size:16px;font-weight:400;color:#52525b;"> km</span></p>
      <p id="result-total-desc" style="font-size:12px;color:#52525b;margin-top:5px;"></p>
    </div>

    <!-- 개인 페널티 안내 — 이 화면을 보는 당사자 본인이 적발된 상태일 때만 노출(남에겐 안 보임) -->
    <div id="result-penalty-note" class="anim-up-3" style="display:none;margin-bottom:8px;
      background:rgba(251,113,133,.08);border:1px solid rgba(251,113,133,.22);border-radius:16px;padding:12px 16px;">
      <p style="font-size:12px;font-weight:700;color:#fb7185;margin-bottom:4px;">🔓 정체가 공개된 상태</p>
      <p id="result-penalty-desc" style="font-size:12px;color:#a1a1aa;line-height:1.6;"></p>
    </div>

    <!-- 참가자 -->
    <div class="bezel anim-up-4" style="padding:14px 16px;border-radius:20px;">
      <p style="font-size:11px;color:#52525b;margin-bottom:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;">완주한 참가자</p>
      <div id="result-participants" style="display:flex;gap:12px;flex-wrap:wrap;"></div>
    </div>

  </div>

  <div style="position:absolute;left:18px;right:18px;bottom:16px;z-index:30;">
    <button class="btn btn-primary" style="width:100%;height:56px;" id="result-confirm-btn">확인</button>
  </div>
</div>`;
}

export function openResultView() {
  const result = getLastBoltResult();
  if (!result) return;

  const { singleTeam, boltTeam, distanceKm, participantIds, participantCount, card, boltTitle, buffMultiplier } = result;
  const players = getPlayers();

  // 오브
  document.getElementById('result-orb').style.opacity = '.5';

  // 서브타이틀
  const solo = participantCount === 1;
  const typeLabel = solo ? '혼자 번개' : singleTeam ? '단일팀 번개' : '혼합팀 번개';
  document.getElementById('result-subtitle').textContent = `${boltTitle ?? '번개'} · ${typeLabel}`;

  // 거리
  document.getElementById('result-base-km').innerHTML =
    `${distanceKm.toFixed(1)}<span style="font-size:20px;font-weight:400;color:#52525b;"> km</span>`;
  document.getElementById('result-participant-count').textContent = `참가자 ${participantCount}명 완주`;

  // 버프/스킬 섹션
  const buffEl = document.getElementById('result-buff-section');
  if (solo) {
    buffEl.innerHTML = soloBlock(distanceKm);          // 혼자 달림 — 버프 없음(×1)
  } else if (singleTeam && card) {
    const skillDesc = buildSkillEffect(boltTeam, participantCount, distanceKm);
    buffEl.innerHTML = singleTeamBlock(card, skillDesc);
  } else if (!singleTeam && card) {
    buffEl.innerHTML = buffCardBlock(card, distanceKm);
  } else {
    buffEl.innerHTML = '';
  }

  // 합계
  const total = calcTotal(singleTeam, boltTeam, distanceKm, buffMultiplier, participantCount);
  document.getElementById('result-total-km').innerHTML =
    `${total.km.toFixed(1)}<span style="font-size:18px;font-weight:400;color:#52525b;"> km</span>`;
  document.getElementById('result-total-desc').textContent = total.desc;

  // 참가자
  document.getElementById('result-participants').innerHTML = participantIds.map(pid => {
    const p = players.find(pl => pl.id === pid);
    const name = p?.name ?? '?';
    return `<div style="text-align:center;">
      <span style="width:36px;height:36px;border-radius:50%;background:#3f3f46;
        display:flex;align-items:center;justify-content:center;font-size:13px;margin:0 auto;">${name[0]}</span>
      <p style="font-size:10px;color:#71717a;margin-top:4px;">${name}</p>
    </div>`;
  }).join('');

  // 개인 페널티 안내 — 이 기기의 참가자 본인이 적발됐고 이번 번개에 참여했을 때만.
  // (게이지에만 적용되는 효과라, 위 '총 적립'·대시보드 거리와 별개로 개인에게만 알린다)
  const me = getMe();
  const noteEl = document.getElementById('result-penalty-note');
  const iJoined = participantIds.includes(me.id);
  if (iJoined && (me.penalized || me.abilityStripped)) {
    let desc = '';
    if (me.penalized) desc += '정체가 공개돼 <b style="color:#e4e4e7;">내 기여는 게이지에 절반(−50%)만</b> 반영됐어요.';
    if (me.abilityStripped && me.role === 'elite')  desc += ' 역할까지 밝혀져 2배 효과도 빠진 상태예요.';
    if (me.abilityStripped && me.role === 'anchor') desc += ' 역할까지 밝혀져 양방향 효과도 빠진 상태예요.';
    desc += '<br/><span style="color:#52525b;">달린 거리(순수 기여)는 그대로 기록돼요.</span>';
    document.getElementById('result-penalty-desc').innerHTML = desc;
    noteEl.style.display = 'block';
  } else {
    noteEl.style.display = 'none';
  }
}

// 혼자 달린 번개 — 버프/스킬 없이 실제 거리만(×1). 버프 카드 UI 대신 담백하게 표시.
function soloBlock(distanceKm) {
  return `
  <div style="background:rgba(113,113,122,.1); border:1px solid rgba(255,255,255,.08); border-radius:20px; padding:14px 18px;">
    <p style="font-size:12px; color:#52525b; font-weight:600; letter-spacing:.06em; text-transform:uppercase; margin-bottom:10px;">혼자 달림 · 버프 없음</p>
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <p style="font-size:12px; color:#71717a;">실제 거리 그대로 적립</p>
      <p class="num" style="font-size:18px; font-weight:700; color:#e4e4e7;">+${distanceKm.toFixed(1)} km</p>
    </div>
  </div>`;
}

function buffCardBlock(card, distanceKm) {
  const buffedKm = distanceKm * (card.multiplier ?? 1);
  return `
  <div style="background:${card.bg};border:1px solid ${card.border};border-radius:20px;padding:14px 18px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <p style="font-size:12px;color:#52525b;font-weight:600;letter-spacing:.06em;text-transform:uppercase;">적용된 버프</p>
      <span class="chip" style="background:${card.bg};color:${card.color};font-size:10px;">랜덤 카드</span>
    </div>
    <p style="font-size:16px;font-weight:700;color:${card.color};">${card.icon} ${card.name}</p>
    <p style="font-size:12px;color:${card.color};opacity:.65;margin-top:3px;">${card.desc}</p>
    <div style="height:1px;background:rgba(255,255,255,.06);margin:10px 0;"></div>
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <p style="font-size:12px;color:#52525b;">버프 적용 마일리지</p>
      <p class="num" style="font-size:18px;font-weight:700;color:${card.color};">+${buffedKm.toFixed(1)} km</p>
    </div>
  </div>`;
}

function singleTeamBlock(card, skillDesc) {
  return `
  <div style="background:${card.bg};border:1px solid ${card.border};border-radius:20px;padding:14px 18px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <p style="font-size:12px;color:#52525b;font-weight:600;letter-spacing:.06em;text-transform:uppercase;">팀 고유 스킬</p>
      <span class="chip" style="background:${card.bg};color:${card.color};font-size:10px;">단일팀 발동</span>
    </div>
    <p style="font-size:16px;font-weight:700;color:${card.color};">${card.icon} ${card.name}</p>
    <p style="font-size:12px;color:${card.color};opacity:.65;margin-top:3px;">${card.desc}</p>
    <div style="height:1px;background:rgba(255,255,255,.06);margin:10px 0;"></div>
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <p style="font-size:12px;color:#52525b;">스킬 효과</p>
      <p style="font-size:13px;font-weight:700;color:${card.color};text-align:right;">${skillDesc}</p>
    </div>
  </div>`;
}

// 팀 스킬 총 효과 = 인원 × 거리 × 5km (양 팀 동일). 고스트는 그 절반씩 상대에서 당겨온다.
function skillTotal(distanceKm, count) {
  return count * distanceKm * CONFIG.skillPerHeadKm;
}

function buildSkillEffect(team, count, distanceKm) {
  const total = skillTotal(distanceKm, count);
  if (team === 'pacer') return `팀 게이지 +${total.toFixed(0)}km 추가`;
  return `상대 −${(total / 2).toFixed(0)} / 우리 +${(total / 2).toFixed(0)}km`;
}

function calcTotal(singleTeam, team, distanceKm, buffMultiplier, count) {
  if (singleTeam) {
    const skill = skillTotal(distanceKm, count);
    if (team === 'pacer') {
      return { km: distanceKm + skill, desc: `기본 ${distanceKm.toFixed(1)} + 시너지 ${skill.toFixed(0)}` };
    }
    return { km: distanceKm + skill, desc: `기본 ${distanceKm.toFixed(1)} + 당겨오기 ${skill.toFixed(0)}` };
  }
  const multiplier = buffMultiplier ?? 1;
  const buffed = distanceKm * multiplier;
  return {
    km: buffed,
    desc: multiplier !== 1 ? `기본 ${distanceKm.toFixed(1)} ×${multiplier}` : `기본 ${distanceKm.toFixed(1)}`
  };
}

export function init() {
  document.getElementById('result-confirm-btn').addEventListener('click', () => {
    goToScreen('gs-bolt');
  });

  // 참가자 결과 공유 — 내가 참여한 번개가 완료되면(방장이 인증) 이 기기에서도
  // 같은 결과 화면을 자동으로 띄운다. 게임 화면 진입 전(카드·역할 확인 중)에는
  // 미뤄뒀다가 진입 후 첫 갱신 때 표시되고, 한 번 본 결과는 다시 뜨지 않는다.
  subscribe(() => {
    if (!identity.roleConfirmed) return;
    const myId = getMe().id;
    if (!myId) return;
    const seen = loadSeenResults();
    const done = getBolts().find(b =>
      b.status === 'done' && b.result && b.reviewStatus !== 'rejected' &&
      b.resultPublished === true &&   // 방장이 '결과 확인하기'를 눌러 공개한 뒤에만 다 같이 이동
      b.result.participantIds?.includes(myId) && !seen.includes(b.id));
    if (!done) return;

    markBoltResultSeen(done.id);
    setLastBoltResult(done.result);
    openResultView();
    goToScreen('s-bolt-result');
  });
}
