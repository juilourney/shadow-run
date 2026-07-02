import { goToScreen, setScrollLock } from '../utils/nav.js';
import { subscribe, getPlayers, getAbility, useAbility } from '../store.js';

const TEAM_META = {
  pacer: { label: '페이서', color: '#38bdf8', bg: 'rgba(56,189,248,.12)', border: 'rgba(56,189,248,.3)' },
  ghost: { label: '고스트', color: '#a78bfa', bg: 'rgba(167,139,250,.12)', border: 'rgba(167,139,250,.3)' },
};

const ROLE_META = {
  runner:    { label: '러너',   icon: '🏃', color: '#71717a' },
  double:    { label: '더블',   icon: '×2', color: '#fb7185' },
  elite:     { label: '엘리트', icon: '👑', color: '#fbbf24' },
  anchor:    { label: '앵커',   icon: '⚓', color: '#34d399' },
  detective: { label: '탐정',   icon: '🔍', color: '#60a5fa' },
  spy:       { label: '밀정',   icon: '🕵️', color: '#c084fc' },
};

// waiting.js 등 다른 화면 호환용 — store에서 파생 (단일 출처 유지)
export const MEMBERS = getPlayers();

let sortMode  = 'name';
let pendingId = null;

export function render() {
  const ab = getAbility();
  const isSpecial = ab.isSpecial;
  const abilityLabel = ab.kind === 'team'
    ? `🔍 팀 확인 남은 횟수: ${ab.left} / ${ab.limit}회`
    : `🕵️ 역할 확인 남은 횟수: ${ab.left} / ${ab.limit}회`;

  return `
<div class="game-section" id="gs-members">


  <div class="scroll-body" style="padding:calc(var(--safe-top) + 12px) 18px 40px">

    <!-- 헤더 -->
    <div class="anim-up" style="margin-bottom:14px; display:flex; align-items:center; justify-content:space-between">
      <div>
        <h2 style="font-size:22px; font-weight:700; letter-spacing:-.02em">참가자</h2>
        <p style="font-size:12px; color:#52525b; margin-top:2px">${getPlayers({ excludeSelf: true }).length}명 참가 중</p>
      </div>
      <!-- 정렬 토글 -->
      <button id="sort-toggle"
        style="background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.08);
          color:#a1a1aa; border-radius:12px; padding:0 14px; height:34px;
          font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap;">
        거리순
      </button>
    </div>

    <!-- 특수 역할 능력 상태창 -->
    ${isSpecial ? `
    <div id="ability-bar" class="anim-up-1" style="padding:12px 16px; border-radius:16px; margin-bottom:14px;
      background:rgba(96,165,250,.08); border:1px solid rgba(96,165,250,.2); display:flex; align-items:center; gap:10px;">
      <p style="font-size:13px; color:#93c5fd; font-weight:600;" id="ability-label">${abilityLabel}</p>
    </div>` : ''}

    <!-- 참가자 리스트 -->
    <div id="member-list" style="display:flex; flex-direction:column; gap:8px;"></div>

  </div>

  <!-- 능력 사용 확인 팝업 -->
  <div id="ability-confirm-overlay"
    style="position:absolute; inset:0; z-index:50; display:none; align-items:flex-end;">
    <div style="position:absolute; inset:0; background:rgba(0,0,0,.65); backdrop-filter:blur(4px);" id="ability-confirm-backdrop"></div>
    <div id="ability-confirm-sheet"
      style="position:relative; z-index:1; background:#111113; border-radius:28px 28px 0 0;
        width:100%; transform:translateY(100%); transition:transform .4s var(--spring);
        border-top:1px solid rgba(255,255,255,.08);
        padding:24px 20px; padding-bottom:24px;">
      <div style="display:flex; justify-content:center; margin-bottom:18px;">
        <div style="width:36px; height:4px; border-radius:99px; background:rgba(255,255,255,.15);"></div>
      </div>
      <p style="font-size:11px; color:#52525b; letter-spacing:.08em; text-transform:uppercase; font-weight:600; margin-bottom:8px;">
        ${getAbility().kind === 'team' ? '탐정 능력' : '밀정 능력'}
      </p>
      <h3 id="ability-confirm-title" style="font-size:19px; font-weight:700; margin-bottom:6px;"></h3>
      <p id="ability-confirm-sub" style="font-size:13px; color:#52525b; margin-bottom:22px;"></p>
      <div style="display:flex; gap:10px;">
        <button id="ability-cancel-btn" class="btn btn-secondary" style="flex:1; height:52px;">취소</button>
        <button id="ability-ok-btn" class="btn" style="flex:2; height:52px;
          background:linear-gradient(135deg,#60a5fa,#3b82f6); color:#fff;
          box-shadow:0 8px 24px -6px rgba(96,165,250,.35);">확인</button>
      </div>
    </div>
  </div>

  <!-- 결과 팝업 -->
  <div id="ability-result-overlay"
    style="position:absolute; inset:0; z-index:60; display:none; align-items:flex-end;">
    <div style="position:absolute; inset:0; background:rgba(0,0,0,.7); backdrop-filter:blur(6px);"></div>
    <div id="ability-result-sheet"
      style="position:relative; z-index:1; background:#111113; border-radius:28px 28px 0 0;
        width:100%; transform:translateY(100%); transition:transform .4s var(--spring);
        border-top:1px solid rgba(255,255,255,.08);
        padding:28px 24px; padding-bottom:28px; text-align:center;">
      <div style="display:flex; justify-content:center; margin-bottom:20px;">
        <div style="width:36px; height:4px; border-radius:99px; background:rgba(255,255,255,.15);"></div>
      </div>
      <p style="font-size:11px; color:#52525b; letter-spacing:.12em; text-transform:uppercase; font-weight:700; margin-bottom:16px;">확인 결과</p>
      <div id="result-badge" style="display:inline-flex; align-items:center; gap:8px;
        border-radius:16px; padding:10px 20px; margin-bottom:14px;"></div>
      <p id="result-text" style="font-size:20px; font-weight:700; line-height:1.4; margin-bottom:6px;"></p>
      <p id="result-sub" style="font-size:13px; color:#52525b; margin-bottom:24px;"></p>
      <button id="result-ok-btn" class="btn btn-primary" style="width:100%; height:52px;">확인</button>
    </div>
  </div>

</div>`;
}

export function init() {
  // 정렬 토글
  document.getElementById('sort-toggle').addEventListener('click', () => {
    sortMode = sortMode === 'name' ? 'km' : 'name';
    document.getElementById('sort-toggle').textContent = sortMode === 'name' ? '거리순' : '가나다순';
    renderList();
  });

  // 팝업 닫기
  document.getElementById('ability-confirm-backdrop').addEventListener('click', () => { closeConfirm(); setScrollLock(false); });
  document.getElementById('ability-cancel-btn').addEventListener('click', () => { closeConfirm(); setScrollLock(false); });

  document.getElementById('ability-ok-btn').addEventListener('click', () => {
    closeConfirm();
    setTimeout(() => showResult(pendingId), 350);
  });

  document.getElementById('result-ok-btn').addEventListener('click', () => {
    closeResult();
    renderList();
  });

  renderList();
  subscribe(renderList);
}

function getSortedMembers() {
  const list = getPlayers({ excludeSelf: true });
  if (sortMode === 'name') {
    list.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  } else {
    list.sort((a, b) => b.km - a.km);
  }
  return list;
}

function renderList() {
  const sorted = getSortedMembers();
  const ab = getAbility();
  const isSpecial = ab.isSpecial;
  const canUse = isSpecial && ab.left > 0;
  const revealed = ab.revealed;
  updateAbilityBar();

  const html = sorted.map(m => {
    // 공개 팀 배지 (투표로 밝혀진 것 — 전체 공개)
    let publicBadge = '';
    if (m.publicTeam) {
      const t = TEAM_META[m.publicTeam];
      publicBadge = `<span style="font-size:11px; font-weight:700; color:${t.color};
        background:${t.bg}; border:1px solid ${t.border};
        border-radius:8px; padding:2px 8px; margin-left:6px; flex-shrink:0;">🗳️ ${t.label}</span>`;
    }

    // 개인 능력으로 확인한 정보 (본인만 보임)
    let privateBadge = '';
    if (revealed[m.id]) {
      const r = revealed[m.id];
      if (r.team) {
        const t = TEAM_META[r.team];
        privateBadge = `<span style="font-size:11px; font-weight:700; color:${t.color};
          background:${t.bg}; border:1px solid ${t.border};
          border-radius:8px; padding:2px 8px; margin-left:4px; flex-shrink:0;">🔍 ${t.label}</span>`;
      } else if (r.role) {
        const ro = ROLE_META[r.role];
        privateBadge = `<span style="font-size:11px; font-weight:700; color:${ro.color};
          background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1);
          border-radius:8px; padding:2px 8px; margin-left:4px; flex-shrink:0;">🔍 ${ro.icon} ${ro.label}</span>`;
      }
    }

    // 이 능력으로 이미 알 수 있는 정보 (탐정=팀: 개인확인 or 투표공개팀 / 밀정=역할)
    const knownForAbility = ab.kind === 'team'
      ? (revealed[m.id]?.team || m.publicTeam)
      : revealed[m.id]?.role;

    const tappable = isSpecial && !m.isSelf && (canUse || knownForAbility);
    const selfStyle = m.isSelf
      ? 'background:var(--accent-tint); border-color:var(--accent-border);' : '';

    return `
    <div class="bezel" id="member-card-${m.id}"
      style="padding:14px 16px; border-radius:20px; display:flex; align-items:center; gap:12px;
        ${selfStyle} ${tappable ? 'cursor:pointer;' : ''}"
      ${tappable ? `data-member-id="${m.id}" data-member-name="${m.name}" data-revealed="${!!knownForAbility}"` : ''}>
      <span style="width:38px; height:38px; border-radius:50%;
        background:${m.isSelf ? 'var(--accent-tint)' : '#3f3f46'};
        ${m.isSelf ? 'border:1.5px solid var(--accent);' : ''}
        display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0;">
        ${m.name[0]}
      </span>
      <div style="flex:1; min-width:0; display:flex; align-items:center; flex-wrap:wrap; gap:4px 0;">
        <span style="font-size:15px; font-weight:${m.isSelf ? '700' : '500'};
          color:${m.isSelf ? 'var(--accent)' : '#e4e4e7'};">${m.name}${m.isSelf ? ' (나)' : ''}</span>
        ${publicBadge}${privateBadge}
      </div>
      <p class="num" style="font-size:13px; font-weight:600; color:#52525b; flex-shrink:0;">${m.km.toFixed(1)} km</p>
    </div>`;
  }).join('');

  document.getElementById('member-list').innerHTML = html;

  // 탭 이벤트 (탐정/밀정에게만)
  if (isSpecial) {
    document.querySelectorAll('[data-member-id]').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.memberId;
        if (el.dataset.revealed === 'true') {
          showAlreadyRevealedPopup(id);
        } else if (canUse) {
          pendingId = id;
          openConfirm(id, el.dataset.memberName);
        }
      });
    });
  }
}

function showAlreadyRevealedPopup(id) {
  const member = getPlayers().find(m => m.id === id);
  if (!member) return;
  const ab = getAbility();
  const r = ab.revealed[id];
  let msg = '이미 확인된 참가자입니다';
  if (ab.kind === 'team') {
    const team = r?.team || member.publicTeam;
    if (team) {
      const t = TEAM_META[team];
      msg = `${member.name}님의 팀은 이미 확인되었습니다 (${t.label})`;
    }
  } else if (r?.role) {
    const ro = ROLE_META[r.role];
    msg = `${member.name}님의 역할은 이미 확인되었습니다 (${ro.label})`;
  }
  showInfoToast(msg);
}

function showInfoToast(msg) {
  const el = document.createElement('div');
  el.textContent = msg;
  // 중앙 정렬은 margin:auto로 (transform은 fadeUp 애니메이션이 덮어써서 쏠림 발생)
  el.style.cssText = `
    position:fixed; bottom:24px; left:0; right:0; margin:0 auto;
    width:fit-content; max-width:90vw;
    background:#1c1c1e; border:1px solid rgba(255,255,255,.12); color:#e4e4e7;
    font-size:13px; padding:10px 18px; border-radius:14px; z-index:9999;
    text-align:center;
    animation:fadeUp .25s var(--spring) both;
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

function updateAbilityBar() {
  const bar = document.getElementById('ability-label');
  if (!bar) return;
  const ab = getAbility();
  const type = ab.kind === 'team' ? '🔍 팀 확인' : '🕵️ 역할 확인';
  bar.textContent = `${type} 남은 횟수: ${ab.left} / ${ab.limit}회`;
  if (ab.left === 0) {
    document.getElementById('ability-bar').style.background = 'rgba(255,255,255,.03)';
    document.getElementById('ability-bar').style.borderColor = 'rgba(255,255,255,.06)';
    bar.style.color = '#52525b';
  }
}

function openConfirm(id, name) {
  const ab = getAbility();
  const remaining = ab.left;
  const isDetective = ab.kind === 'team';
  document.getElementById('ability-confirm-title').textContent =
    isDetective ? `${name}님의 팀을 확인하시겠습니까?` : `${name}님의 역할을 확인하시겠습니까?`;
  document.getElementById('ability-confirm-sub').textContent =
    `남은 횟수 ${remaining}회`;

  const overlay = document.getElementById('ability-confirm-overlay');
  const sheet   = document.getElementById('ability-confirm-sheet');
  overlay.style.display = 'flex';
  setScrollLock(true);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    sheet.style.transform = 'translateY(0)';
  }));
}

function closeConfirm() {
  const sheet = document.getElementById('ability-confirm-sheet');
  sheet.style.transform = 'translateY(100%)';
  setTimeout(() => { document.getElementById('ability-confirm-overlay').style.display = 'none'; }, 380);
}

async function showResult(id) {
  const member = getPlayers().find(m => m.id === id);
  if (!member) return;

  const result = await useAbility(id); // { team } 또는 { role }

  if (result.team) {
    const t = TEAM_META[result.team];
    document.getElementById('result-badge').innerHTML =
      `<span style="font-size:18px">🔍</span>
       <span style="font-size:14px; font-weight:700; color:${t.color};">${t.label}</span>`;
    document.getElementById('result-badge').style.background = t.bg;
    document.getElementById('result-badge').style.border = `1px solid ${t.border}`;
    document.getElementById('result-text').innerHTML =
      `<span style="color:${t.color}">${member.name}</span>님은 <span style="color:${t.color}; font-weight:800;">${t.label}</span>입니다!`;
    document.getElementById('result-sub').textContent = '이 정보는 나의 화면에서만 확인됩니다';
  } else {
    const ro = ROLE_META[result.role];
    document.getElementById('result-badge').innerHTML =
      `<span style="font-size:18px">${ro.icon}</span>
       <span style="font-size:14px; font-weight:700; color:${ro.color};">${ro.label}</span>`;
    document.getElementById('result-badge').style.background = 'rgba(255,255,255,.05)';
    document.getElementById('result-badge').style.border = '1px solid rgba(255,255,255,.1)';
    document.getElementById('result-text').innerHTML =
      `<span style="color:#e4e4e7">${member.name}</span>님의 역할은 <span style="color:${ro.color}; font-weight:800;">${ro.label}</span>입니다!`;
    document.getElementById('result-sub').textContent = '이 정보는 나의 화면에서만 확인됩니다';
  }

  const overlay = document.getElementById('ability-result-overlay');
  const sheet   = document.getElementById('ability-result-sheet');
  overlay.style.display = 'flex';
  setScrollLock(true);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    sheet.style.transform = 'translateY(0)';
  }));
}

function closeResult() {
  const sheet = document.getElementById('ability-result-sheet');
  sheet.style.transform = 'translateY(100%)';
  setScrollLock(false);
  setTimeout(() => { document.getElementById('ability-result-overlay').style.display = 'none'; }, 380);
}
