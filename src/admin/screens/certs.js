import { subscribe, getCertReviews, approveBoltCert, rejectBoltCert } from '../../store.js';

const STATUS_META = {
  pending:  { label: '심사 대기', color: '#fbbf24', bg: 'rgba(251,191,36,.12)' },
  approved: { label: '인정됨',   color: '#34d399', bg: 'rgba(52,211,153,.12)' },
  rejected: { label: '불인정',   color: '#fb7185', bg: 'rgba(251,113,133,.12)' },
};

export function render() {
  return `
<div class="admin-screen" id="admin-certs">
  <div class="admin-shell">
    <div class="admin-header">
      <h2 style="font-size:22px; font-weight:700;">번개 인증 관리</h2>
      <button class="btn btn-secondary" id="certs-back-btn" style="height:40px; padding:0 16px;">← 대시보드</button>
    </div>

    <p style="font-size:12px; color:#71717a; margin-bottom:14px;">
      완료된 번개의 인증 사진을 확인하고 인정/불인정을 결정합니다.
      불인정하면 그 번개가 반영한 게이지·마일리지가 그대로 원복되고 타임라인에 공지됩니다.</p>

    <div id="certs-list"></div>
  </div>
</div>`;
}

function fmtAt(ms) {
  if (!ms) return null;
  return new Date(ms).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function certCard(c) {
  const status = STATUS_META[c.reviewStatus] ?? { label: '심사 도입 전', color: '#71717a', bg: 'rgba(113,113,122,.12)' };
  const r = c.result;

  // 사진 속 기록 시각이 번개 일정(시작 30분 전 ~ 인증 마감)을 벗어나면 어긋남 표시
  const stale = r?.certAt && c.startAt
    && (r.certAt < c.startAt - 30 * 60 * 1000 || (c.deadline !== Infinity && r.certAt > c.deadline));

  const infoRows = [
    ['참가자', c.participantNames.join(', ') || '—'],
    ['인증 거리', r ? `${r.distanceKm.toFixed(1)} km` : '—'],
    ['버프/스킬', r ? (r.singleTeam ? '단일팀 스킬 발동' : `버프 ×${r.buffMultiplier}`) : '—'],
    ['번개 시작', fmtAt(c.startAt) ?? '—'],
    ['사진 기록 시각', r?.certAt
      ? `${fmtAt(r.certAt)}${stale ? ' <span style="color:#fbbf24; font-weight:700;">⚠️ 일정과 어긋남</span>' : ''}`
      : '<span style="color:#52525b;">인식 안 됨</span>'],
  ].map(([k, v]) => `
    <div style="display:flex; gap:12px; padding:6px 0; border-bottom:1px solid rgba(255,255,255,.05);">
      <p style="font-size:12px; color:#71717a; width:96px; flex-shrink:0;">${k}</p>
      <p style="font-size:12px; color:#e4e4e7; flex:1;">${v}</p>
    </div>`).join('');

  const actions = c.reviewStatus === 'pending'
    ? `<div style="display:flex; gap:8px; margin-top:14px;">
        <button class="btn btn-secondary cert-approve-btn" data-id="${c.id}"
          style="flex:1; height:44px; font-size:13px; color:#34d399;">✓ 인정</button>
        <button class="btn btn-secondary cert-reject-btn" data-id="${c.id}"
          style="flex:1; height:44px; font-size:13px; color:#fb7185;">✕ 불인정</button>
      </div>`
    : '';

  return `
  <div class="bezel" style="padding:18px; border-radius:20px; margin-bottom:12px; ${stale && c.reviewStatus === 'pending' ? 'border:1px solid rgba(251,191,36,.35);' : ''}">
    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:10px;">
      <p style="font-size:15px; font-weight:700;">⚡ ${c.title} <span style="font-size:12px; color:#52525b; font-weight:400;">· ${c.place ?? ''}</span></p>
      <span style="font-size:11px; font-weight:700; color:${status.color}; background:${status.bg};
        border-radius:8px; padding:3px 10px; flex-shrink:0;">${status.label}</span>
    </div>
    ${c.certPhoto
      ? `<img src="${c.certPhoto}" alt="인증 사진" style="width:100%; max-height:340px; object-fit:contain;
          background:rgba(0,0,0,.3); border-radius:14px; margin-bottom:10px;" />`
      : `<p style="font-size:12px; color:#52525b; padding:14px; text-align:center; background:rgba(255,255,255,.03);
          border-radius:14px; margin-bottom:10px;">저장된 인증 사진이 없습니다 (수동 입력 또는 구버전 완료분)</p>`}
    ${infoRows}
    ${actions}
  </div>`;
}

function refresh() {
  const list = getCertReviews();
  const pending = list.filter(c => c.reviewStatus === 'pending').length;
  document.getElementById('certs-list').innerHTML = list.length === 0
    ? `<div class="bezel" style="padding:24px; border-radius:20px; text-align:center;">
        <p style="font-size:13px; color:#52525b;">완료된 번개가 아직 없습니다.</p></div>`
    : `<p class="eyebrow" style="color:#3f3f46; margin-bottom:10px;">완료 ${list.length}건 · 심사 대기 ${pending}건</p>`
      + list.map(certCard).join('');
}

export function init(goTo) {
  document.getElementById('certs-back-btn').addEventListener('click', () => goTo('dashboard'));

  document.getElementById('certs-list').addEventListener('click', async e => {
    const approve = e.target.closest('.cert-approve-btn');
    const reject  = e.target.closest('.cert-reject-btn');
    try {
      if (approve) {
        await approveBoltCert(approve.dataset.id);
      } else if (reject) {
        if (!confirm('이 번개를 불인정할까요?\n반영됐던 게이지·마일리지가 원복되고 타임라인에 공지됩니다.')) return;
        await rejectBoltCert(reject.dataset.id);
      }
    } catch (err) {
      alert(err.message);
    }
  });

  subscribe(refresh);
  refresh();
}

export function onShow() {
  refresh();
}
