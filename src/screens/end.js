import { goToScreen } from '../utils/nav.js';
import { getGauge, getPlayers, getMe, ROLES } from '../store.js';

const TEAM = {
  pacer: { label: '페이서', color: '#38bdf8', tint: 'rgba(56,189,248,.12)' },
  ghost: { label: '고스트', color: '#a78bfa', tint: 'rgba(167,139,250,.12)' },
};

const fmt = n => n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function render() {
  return `
<div class="screen" id="s-end" style="overflow:hidden;">

  <div style="position:absolute;inset:0;pointer-events:none;">
    <div id="end-orb" style="position:absolute;top:-10%;left:50%;transform:translateX(-50%);
      width:90%;aspect-ratio:1;border-radius:50%;filter:blur(70px);opacity:0;
      transition:opacity .8s;"></div>
  </div>

  <div class="scroll-body" style="position:relative;z-index:2;
    padding:calc(var(--safe-top) + 20px) 22px 96px;">

    <!-- ① 우승 발표 -->
    <div class="anim-up" style="text-align:center;margin-bottom:18px;">
      <p style="font-size:12px;color:#52525b;letter-spacing:.08em;margin-bottom:8px;">3주간의 줄다리기 종료</p>
      <h2 id="end-winner" style="font-size:28px;font-weight:800;letter-spacing:-.02em;">—</h2>
      <p id="end-diff" style="font-size:13px;color:#52525b;margin-top:6px;"></p>
    </div>

    <!-- ② 최종 게이지 -->
    <div class="bezel anim-up-1" style="padding:16px 18px;border-radius:20px;margin-bottom:16px;">
      <p style="font-size:11px;color:#52525b;margin-bottom:8px;letter-spacing:.04em;">최종 게이지</p>
      <div style="display:flex;height:14px;border-radius:7px;overflow:hidden;">
        <div id="end-bar-pacer" style="background:#38bdf8;"></div>
        <div id="end-bar-ghost" style="background:#a78bfa;"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-top:6px;white-space:nowrap;">
        <span style="color:#38bdf8;">페이서 <span id="end-km-pacer" class="num">—</span> km</span>
        <span style="color:#a78bfa;">고스트 <span id="end-km-ghost" class="num">—</span> km</span>
      </div>
    </div>

    <!-- ③ 최종 순위 (전원 정체 공개) -->
    <p class="eyebrow" style="color:#3f3f46;margin:0 2px 10px;">최종 순위 · 전원 정체 공개</p>
    <div id="end-ranking" class="anim-up-2" style="display:flex;flex-direction:column;gap:6px;margin-bottom:18px;"></div>

    <!-- ④ 내 성적 -->
    <div class="anim-up-3" style="display:flex;gap:8px;">
      <div class="bezel" style="flex:1;padding:12px;border-radius:16px;text-align:center;">
        <p style="font-size:11px;color:#52525b;">순수 기여</p>
        <p id="end-my-km" class="num" style="font-size:19px;font-weight:800;margin-top:3px;">—<span style="font-size:11px;font-weight:400;color:#52525b;"> km</span></p>
      </div>
      <div class="bezel" style="flex:1;padding:12px;border-radius:16px;text-align:center;">
        <p style="font-size:11px;color:#52525b;">완료 번개</p>
        <p id="end-my-bolts" class="num" style="font-size:19px;font-weight:800;margin-top:3px;">—<span style="font-size:11px;font-weight:400;color:#52525b;"> 회</span></p>
      </div>
      <div class="bezel" style="flex:1;padding:12px;border-radius:16px;text-align:center;">
        <p style="font-size:11px;color:#52525b;">전체 순위</p>
        <p id="end-my-rank" class="num" style="font-size:19px;font-weight:800;margin-top:3px;">—<span style="font-size:11px;font-weight:400;color:#52525b;"> 위</span></p>
      </div>
    </div>

  </div>

  <div style="position:absolute;left:18px;right:18px;bottom:16px;z-index:30;">
    <button class="btn btn-primary" style="width:100%;height:56px;" id="end-close-btn">홈으로</button>
  </div>
</div>`;
}

export function openEndView() {
  const g = getGauge();
  const me = getMe();
  const players = getPlayers();

  // ① 우승팀
  const winnerEl = document.getElementById('end-winner');
  const diffEl = document.getElementById('end-diff');
  if (g.leader) {
    const w = TEAM[g.leader];
    winnerEl.textContent = `${w.label} 승리`;
    winnerEl.style.color = w.color;
    diffEl.textContent = `최종 격차 +${fmt(Math.abs(g.diff))} km`;
    document.getElementById('end-orb').style.cssText +=
      `;opacity:.45;background:radial-gradient(circle, ${w.color}33 0%, transparent 70%);`;
  } else {
    winnerEl.textContent = '무승부';
    winnerEl.style.color = '#fafafa';
    diffEl.textContent = '양 팀 게이지 동점';
  }

  // ② 최종 게이지
  const total = g.pacer + g.ghost || 1;
  document.getElementById('end-bar-pacer').style.width = `${(g.pacer / total * 100).toFixed(1)}%`;
  document.getElementById('end-bar-ghost').style.width = `${(g.ghost / total * 100).toFixed(1)}%`;
  document.getElementById('end-km-pacer').textContent = fmt(g.pacer);
  document.getElementById('end-km-ghost').textContent = fmt(g.ghost);

  // ③ 최종 순위 — 전원, km 내림차순
  const ranked = [...players].sort((a, b) => b.km - a.km);
  document.getElementById('end-ranking').innerHTML = ranked.map((p, i) => rankRow(p, i)).join('');

  // ④ 내 성적
  const myRank = ranked.findIndex(p => p.isSelf) + 1;
  document.getElementById('end-my-km').innerHTML =
    `${fmt(me.pureKm)}<span style="font-size:11px;font-weight:400;color:#52525b;"> km</span>`;
  document.getElementById('end-my-bolts').innerHTML =
    `${me.boltsCompleted}<span style="font-size:11px;font-weight:400;color:#52525b;"> 회</span>`;
  document.getElementById('end-my-rank').innerHTML =
    `${myRank}<span style="font-size:11px;font-weight:400;color:#52525b;"> 위</span>`;
}

function rankRow(p, i) {
  const t = TEAM[p.team];
  const roleName = ROLES[p.role]?.name ?? p.role;
  const isFirst = i === 0;
  const selfStyle = p.isSelf ? 'border:1px solid rgba(255,255,255,.22);' : '';
  const rankMark = isFirst
    ? `<span style="width:22px;text-align:center;font-size:16px;">👑</span>`
    : `<span style="width:22px;text-align:center;font-size:12px;color:#52525b;">${i + 1}</span>`;
  const bg = isFirst ? 'background:rgba(250,204,21,.1);' : '';
  return `
  <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;${bg}${selfStyle}">
    ${rankMark}
    <div style="flex:1;min-width:0;">
      <p style="font-size:14px;font-weight:${p.isSelf ? '700' : '500'};line-height:1.2;">${p.name}</p>
      <p style="font-size:11px;color:${t.color};margin-top:2px;line-height:1.2;">${t.label} · ${roleName}</p>
    </div>
    <span class="num" style="font-size:15px;font-weight:700;white-space:nowrap;">${fmt(p.km)}<span style="font-size:10px;font-weight:400;color:#52525b;"> km</span></span>
  </div>`;
}

export function init() {
  document.getElementById('end-close-btn').addEventListener('click', () => {
    goToScreen('gs-dash');
  });
}
