import { goToScreen } from '../utils/nav.js';
import { getLastBoltResult, getPlayers, CONFIG } from '../store.js';

export function render() {
  return `
<div class="screen" id="s-bolt-result" style="overflow:hidden;">

  <div style="position:absolute;inset:0;pointer-events:none;">
    <div id="result-orb" style="position:absolute;bottom:-10%;left:50%;transform:translateX(-50%);
      width:90%;aspect-ratio:1;border-radius:50%;filter:blur(70px);opacity:0;
      transition:opacity .8s;background:radial-gradient(circle,rgba(251,146,60,.2) 0%,transparent 70%);"></div>
  </div>

  <div class="scroll-body" style="position:relative;z-index:2;
    padding:calc(var(--safe-top)+20px) 22px calc(env(safe-area-inset-bottom,0px)+88px);">

    <div id="result-header" class="anim-up" style="padding-top:8px;text-align:center;margin-bottom:20px;">
      <div style="width:56px;height:56px;border-radius:18px;background:rgba(251,146,60,.15);
        border:1px solid rgba(251,146,60,.3);display:flex;align-items:center;
        justify-content:center;font-size:24px;margin:0 auto 12px;">⚡</div>
      <h2 style="font-size:24px;font-weight:700;letter-spacing:-.02em;">번개 완료!</h2>
      <p id="result-subtitle" style="font-size:13px;color:#52525b;margin-top:4px;"></p>
    </div>

    <!-- 실제 거리 -->
    <div class="bezel anim-up-1" style="padding:20px;border-radius:22px;text-align:center;margin-bottom:10px;">
      <p style="font-size:11px;color:#52525b;margin-bottom:8px;letter-spacing:.06em;text-transform:uppercase;">실제 완주 거리</p>
      <p id="result-base-km" class="num" style="font-size:48px;font-weight:800;line-height:1;color:#fafafa;">
        —<span style="font-size:20px;font-weight:400;color:#52525b;"> km</span></p>
      <p id="result-participant-count" style="font-size:12px;color:#52525b;margin-top:6px;"></p>
    </div>

    <!-- 버프 / 스킬 -->
    <div id="result-buff-section" class="anim-up-2" style="margin-bottom:10px;"></div>

    <!-- 최종 합계 -->
    <div id="result-total-section" class="anim-up-3" style="margin-bottom:10px;
      background:linear-gradient(135deg,rgba(251,146,60,.15) 0%,rgba(56,189,248,.1) 100%);
      border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:20px;">
      <p style="font-size:11px;color:#71717a;margin-bottom:8px;letter-spacing:.06em;text-transform:uppercase;">이번 번개 총 적립</p>
      <p id="result-total-km" class="num" style="font-size:44px;font-weight:800;line-height:1;">
        —<span style="font-size:18px;font-weight:400;color:#52525b;"> km</span></p>
      <p id="result-total-desc" style="font-size:12px;color:#52525b;margin-top:6px;"></p>
    </div>

    <!-- 참가자 -->
    <div class="bezel anim-up-4" style="padding:16px 18px;border-radius:20px;">
      <p style="font-size:11px;color:#52525b;margin-bottom:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;">완주한 참가자</p>
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
  const typeLabel = singleTeam ? '단일팀 번개' : '혼합팀 번개';
  document.getElementById('result-subtitle').textContent = `${boltTitle ?? '번개'} · ${typeLabel}`;

  // 거리
  document.getElementById('result-base-km').innerHTML =
    `${distanceKm.toFixed(1)}<span style="font-size:20px;font-weight:400;color:#52525b;"> km</span>`;
  document.getElementById('result-participant-count').textContent = `참가자 ${participantCount}명 완주`;

  // 버프/스킬 섹션
  const buffEl = document.getElementById('result-buff-section');
  if (singleTeam && card) {
    const skillDesc = buildSkillEffect(boltTeam, participantCount);
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
}

function buffCardBlock(card, distanceKm) {
  const buffedKm = distanceKm * (card.multiplier ?? 1);
  return `
  <div style="background:${card.bg};border:1px solid ${card.border};border-radius:20px;padding:18px 20px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <p style="font-size:12px;color:#52525b;font-weight:600;letter-spacing:.06em;text-transform:uppercase;">적용된 버프</p>
      <span class="chip" style="background:${card.bg};color:${card.color};font-size:10px;">랜덤 카드</span>
    </div>
    <p style="font-size:16px;font-weight:700;color:${card.color};">${card.icon} ${card.name}</p>
    <p style="font-size:12px;color:${card.color};opacity:.65;margin-top:3px;">${card.desc}</p>
    <div style="height:1px;background:rgba(255,255,255,.06);margin:12px 0;"></div>
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <p style="font-size:12px;color:#52525b;">버프 적용 마일리지</p>
      <p class="num" style="font-size:18px;font-weight:700;color:${card.color};">+${buffedKm.toFixed(1)} km</p>
    </div>
  </div>`;
}

function singleTeamBlock(card, skillDesc) {
  return `
  <div style="background:${card.bg};border:1px solid ${card.border};border-radius:20px;padding:18px 20px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <p style="font-size:12px;color:#52525b;font-weight:600;letter-spacing:.06em;text-transform:uppercase;">팀 고유 스킬</p>
      <span class="chip" style="background:${card.bg};color:${card.color};font-size:10px;">단일팀 발동</span>
    </div>
    <p style="font-size:16px;font-weight:700;color:${card.color};">${card.icon} ${card.name}</p>
    <p style="font-size:12px;color:${card.color};opacity:.65;margin-top:3px;">${card.desc}</p>
    <div style="height:1px;background:rgba(255,255,255,.06);margin:12px 0;"></div>
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <p style="font-size:12px;color:#52525b;">스킬 효과</p>
      <p style="font-size:13px;font-weight:700;color:${card.color};text-align:right;">${skillDesc}</p>
    </div>
  </div>`;
}

function buildSkillEffect(team, count) {
  if (team === 'pacer') {
    const bonus = count * CONFIG.pacerSynergyPerHead;
    return `팀 게이지 +${bonus}km 추가`;
  }
  return `상대 −${CONFIG.ghostGaugeShift}km 이동`;
}

function calcTotal(singleTeam, team, distanceKm, buffMultiplier, count) {
  if (singleTeam) {
    if (team === 'pacer') {
      const skill = count * CONFIG.pacerSynergyPerHead;
      return { km: distanceKm + skill, desc: `기본 ${distanceKm.toFixed(1)} + 스킬 ${skill}` };
    }
    return { km: distanceKm, desc: `기본 ${distanceKm.toFixed(1)} + 게이지 스킬 발동` };
  }
  const multiplier = buffMultiplier ?? 1;
  const buffed = distanceKm * multiplier;
  return {
    km: buffed,
    desc: multiplier !== 1 ? `기본 ${distanceKm.toFixed(1)} × ${multiplier}배` : `기본 ${distanceKm.toFixed(1)}`
  };
}

export function init() {
  document.getElementById('result-confirm-btn').addEventListener('click', () => {
    goToScreen('gs-bolt');
  });
}
