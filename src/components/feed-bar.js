const TIMELINE_ITEMS = `
  <div style="position:sticky;top:66px;z-index:5;background:#111113;padding:14px 0 8px;">
    <p style="font-size:11px;font-weight:700;color:#52525b;letter-spacing:.06em;">오늘 · 6월 27일 (금)</p>
  </div>
  <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.05);">
    <div style="width:38px;height:38px;border-radius:12px;background:rgba(251,146,60,.18);display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0;">⚡</div>
    <div style="flex:1;min-width:0;">
      <p style="font-size:13px;font-weight:700;line-height:1.45;">단일팀 번개 완료 · <span style="color:#fb923c;">팀 스킬 발동!</span></p>
      <p style="font-size:12px;color:#52525b;margin-top:3px;">한강 LSD · 10km · 4명</p>
    </div>
    <p class="num" style="font-size:11px;color:#3f3f46;flex-shrink:0;padding-top:2px;">07:42</p>
  </div>
  <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.05);">
    <div style="width:38px;height:38px;border-radius:12px;background:rgba(255,255,255,.05);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
      <span style="font-size:14px;color:#71717a;font-weight:700;">↔</span>
    </div>
    <div style="flex:1;min-width:0;">
      <p style="font-size:13px;font-weight:600;line-height:1.45;">게이지 변동</p>
      <p style="font-size:12px;color:#52525b;margin-top:3px;"><span style="color:#38bdf8;">페이서 +8km</span> &nbsp;·&nbsp; <span style="color:#a78bfa;">고스트 −3km</span></p>
    </div>
    <p class="num" style="font-size:11px;color:#3f3f46;flex-shrink:0;padding-top:2px;">07:43</p>
  </div>
  <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.05);">
    <div style="width:38px;height:38px;border-radius:12px;background:rgba(255,255,255,.05);display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0;">🏃</div>
    <div style="flex:1;min-width:0;">
      <p style="font-size:13px;font-weight:600;line-height:1.45;">번개 완료</p>
      <p style="font-size:12px;color:#52525b;margin-top:3px;">석촌호수 5km · 혼합 · 특수 버프 카드 적용</p>
    </div>
    <p class="num" style="font-size:11px;color:#3f3f46;flex-shrink:0;padding-top:2px;">06:20</p>
  </div>

  <div style="position:sticky;top:66px;z-index:5;background:#111113;padding:14px 0 8px;">
    <p style="font-size:11px;font-weight:700;color:#52525b;letter-spacing:.06em;">어제 · 6월 26일 (목)</p>
  </div>
  <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.05);">
    <div style="width:38px;height:38px;border-radius:12px;background:rgba(251,113,133,.12);display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0;">🗳️</div>
    <div style="flex:1;min-width:0;">
      <p style="font-size:13px;font-weight:600;line-height:1.45;"><span style="color:#a78bfa;">박현우</span> 정체 공개 · 페널티 적용</p>
      <p style="font-size:12px;color:#52525b;margin-top:3px;">제 1차 투표 마감 · <span style="color:#a78bfa;">고스트팀</span> 확인</p>
    </div>
    <p class="num" style="font-size:11px;color:#3f3f46;flex-shrink:0;padding-top:2px;">00:00</p>
  </div>
  <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.05);">
    <div style="width:38px;height:38px;border-radius:12px;background:rgba(250,204,21,.12);display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0;">🔍</div>
    <div style="flex:1;min-width:0;">
      <p style="font-size:13px;font-weight:600;color:#facc15;line-height:1.45;">탐정·밀정 활동 시간 시작</p>
      <p style="font-size:12px;color:#52525b;margin-top:3px;">팀 및 역할 조사가 가능합니다</p>
    </div>
    <p class="num" style="font-size:11px;color:#3f3f46;flex-shrink:0;padding-top:2px;">18:00</p>
  </div>
  <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.05);">
    <div style="width:38px;height:38px;border-radius:12px;background:rgba(251,146,60,.18);display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0;">⚡</div>
    <div style="flex:1;min-width:0;">
      <p style="font-size:13px;font-weight:700;line-height:1.45;">단일팀 번개 완료 · <span style="color:#fb923c;">팀 스킬 발동!</span></p>
      <p style="font-size:12px;color:#52525b;margin-top:3px;">탄천 10km · 3명</p>
    </div>
    <p class="num" style="font-size:11px;color:#3f3f46;flex-shrink:0;padding-top:2px;">07:30</p>
  </div>
  <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.05);">
    <div style="width:38px;height:38px;border-radius:12px;background:rgba(255,255,255,.05);display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0;">🗳️</div>
    <div style="flex:1;min-width:0;">
      <p style="font-size:13px;font-weight:700;line-height:1.45;">제 1차 투표 시작</p>
      <p style="font-size:12px;color:#52525b;margin-top:3px;">투표권을 행사해 주세요 · 마감 00:00</p>
    </div>
    <p class="num" style="font-size:11px;color:#3f3f46;flex-shrink:0;padding-top:2px;">18:00</p>
  </div>

  <div style="position:sticky;top:66px;z-index:5;background:#111113;padding:14px 0 8px;">
    <p style="font-size:11px;font-weight:700;color:#52525b;letter-spacing:.06em;">06월 30일 (월)</p>
  </div>
  <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.05);">
    <div style="width:38px;height:38px;border-radius:12px;background:rgba(251,146,60,.18);display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0;">⚡</div>
    <div style="flex:1;min-width:0;">
      <p style="font-size:13px;font-weight:700;line-height:1.45;">단일팀 번개 완료 · <span style="color:#fb923c;">팀 스킬 발동!</span></p>
      <p style="font-size:12px;color:#52525b;margin-top:3px;">12km · 4명</p>
    </div>
    <p class="num" style="font-size:11px;color:#3f3f46;flex-shrink:0;padding-top:2px;">19:30</p>
  </div>
  <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;">
    <div style="width:38px;height:38px;border-radius:12px;background:rgba(255,255,255,.05);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
      <span style="font-size:14px;color:#71717a;font-weight:700;letter-spacing:-.04em;">SYS</span>
    </div>
    <div style="flex:1;min-width:0;">
      <p style="font-size:13px;font-weight:700;line-height:1.45;">탐색전 시작</p>
      <p style="font-size:12px;color:#52525b;margin-top:3px;">마일리지 1:1 적립 구간이 시작되었습니다</p>
    </div>
    <p class="num" style="font-size:11px;color:#3f3f46;flex-shrink:0;padding-top:2px;">00:00</p>
  </div>
`;

export function createFeedBar(mount) {
  // 인디케이터 영역 위 그라데이션 페이드 (이질감 없는 경계)
  const fade = document.createElement('div');
  fade.style.cssText = [
    'position:fixed',
    'bottom:env(safe-area-inset-bottom, 28px)',
    'left:0', 'right:0',
    'max-width:768px', 'margin:0 auto',
    'height:36px',
    'background:linear-gradient(to bottom, transparent, rgba(5,5,7,.82))',
    'pointer-events:none',
    'z-index:29',
  ].join(';');

  // 인디케이터 영역 바
  const bar = document.createElement('div');
  bar.id = 'feed-bar';
  bar.style.cssText = [
    'position:fixed',
    'bottom:0', 'left:0', 'right:0',
    'max-width:768px', 'margin:0 auto',
    'height:env(safe-area-inset-bottom, 28px)',
    'min-height:28px',
    'background:rgba(5,5,7,.92)',
    'backdrop-filter:blur(24px) saturate(1.5)',
    '-webkit-backdrop-filter:blur(24px) saturate(1.5)',
    'border-top:1px solid rgba(255,255,255,.07)',
    'display:flex', 'align-items:center', 'padding:0 18px', 'gap:8px',
    'z-index:30', 'cursor:pointer',
  ].join(';');
  bar.innerHTML = `
    <div style="width:6px;height:6px;border-radius:50%;background:#38bdf8;flex-shrink:0;animation:pulse-dot 2.4s ease-in-out infinite;"></div>
    <p style="font-size:12px;color:#71717a;font-weight:500;
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0;">
      김민수의 번개 완료 · 한강 LSD · 8km
    </p>
    <span style="font-size:10px;color:#3f3f46;flex-shrink:0;letter-spacing:.04em;">07:42</span>
  `;

  // 피드 시트 오버레이
  const overlay = document.createElement('div');
  overlay.id = 'feed-overlay';
  overlay.style.cssText = [
    'position:fixed', 'inset:0',
    'z-index:400',
    'display:none', 'align-items:flex-end',
  ].join(';');
  overlay.innerHTML = `
    <div id="feed-backdrop"
      style="position:absolute;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(4px);"></div>
    <div id="feed-sheet"
      style="position:relative;z-index:1;
        width:100%;max-width:768px;margin:0 auto;
        background:#111113;border-radius:28px 28px 0 0;
        max-height:82vh;overflow-y:auto;
        transform:translateY(100%);transition:transform .45s var(--spring);
        border-top:1px solid rgba(255,255,255,.08);">

      <div style="position:sticky;top:0;z-index:10;background:#111113;
        padding:14px 20px 12px;border-bottom:1px solid rgba(255,255,255,.06);">
        <div style="display:flex;justify-content:center;margin-bottom:12px;">
          <div style="width:36px;height:4px;border-radius:99px;background:rgba(255,255,255,.15);"></div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h3 style="font-size:17px;font-weight:700;">전체 소식</h3>
          <button id="feed-close-btn"
            style="background:rgba(255,255,255,.08);border:none;color:#fff;border-radius:50%;
              width:30px;height:30px;font-size:18px;cursor:pointer;line-height:1;">×</button>
        </div>
      </div>

      <div style="padding:0 18px calc(env(safe-area-inset-bottom, 0px) + 24px);">
        ${TIMELINE_ITEMS}
      </div>
    </div>
  `;

  mount.appendChild(fade);
  mount.appendChild(bar);
  mount.appendChild(overlay);

  bar.addEventListener('click', openFeed);
  document.getElementById('feed-close-btn').addEventListener('click', closeFeed);
  document.getElementById('feed-backdrop').addEventListener('click', closeFeed);
}

function openFeed() {
  const overlay = document.getElementById('feed-overlay');
  const sheet   = document.getElementById('feed-sheet');
  overlay.style.display = 'flex';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { sheet.style.transform = 'translateY(0)'; });
  });
}

function closeFeed() {
  const sheet = document.getElementById('feed-sheet');
  sheet.style.transform = 'translateY(100%)';
  setTimeout(() => { document.getElementById('feed-overlay').style.display = 'none'; }, 450);
}
