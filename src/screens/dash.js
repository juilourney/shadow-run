import { goToScreen } from '../utils/nav.js';

export function render() {
  return `
<div class="screen" id="s-dash">
  <div class="statusbar">
    <span class="num">9:41</span>
    <span id="dash-name-badge" style="display:none"></span>
  </div>

  <div class="scroll-body pb-tab" style="padding:0 18px">

    <!-- ① 실시간 줄다리기 (게이지 카드 — 최상단) -->
    <div class="bezel anim-up" style="margin-top:10px; padding:18px 20px; border-radius:24px;">
      <div style="display:flex; align-items:baseline; justify-content:space-between; margin-bottom:14px;">
        <h2 style="font-size:16px; font-weight:700; letter-spacing:-.01em;">실시간 줄다리기</h2>
        <p style="font-size:11px; color:#52525b; letter-spacing:.04em;">2026 July · D-14</p>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:14px;">
        <div>
          <p style="font-size:10px; color:#a78bfa; font-weight:700; letter-spacing:.06em;">GHOST</p>
          <p class="num" style="font-size:24px; font-weight:800; color:#a78bfa; margin-top:3px; line-height:1;">
            956<span style="font-size:13px; font-weight:400; opacity:.6;"> km</span>
          </p>
        </div>
        <div style="text-align:center; padding-bottom:2px;">
          <p style="font-size:10px; color:#3f3f46; letter-spacing:.04em;">격차</p>
          <p class="num" style="font-size:13px; font-weight:700; color:#38bdf8; margin-top:2px;">+292 km</p>
        </div>
        <div style="text-align:right;">
          <p style="font-size:10px; color:#38bdf8; font-weight:700; letter-spacing:.06em;">PACER</p>
          <p class="num" style="font-size:24px; font-weight:800; color:#38bdf8; margin-top:3px; line-height:1;">
            1,248<span style="font-size:13px; font-weight:400; opacity:.6;"> km</span>
          </p>
        </div>
      </div>

      <div class="gauge-wrap">
        <div class="gauge-center"></div>
        <div style="position:absolute; left:50%; top:0; bottom:0; border-radius:0 99px 99px 0; width:22%;
          background:linear-gradient(90deg,#0ea5e9,#38bdf8); box-shadow:0 0 14px rgba(56,189,248,.5);"></div>
        <div style="position:absolute; right:50%; top:0; bottom:0; border-radius:99px 0 0 99px; width:12%;
          background:linear-gradient(270deg,#a855f7,#7c3aed); box-shadow:0 0 12px rgba(168,85,247,.45);"></div>
      </div>
    </div>

    <!-- ② 탐색전 / 줄다리기 단계 표시 -->
    <div id="phase-card" class="anim-up-1"
      style="margin-top:8px; border-radius:18px; padding:14px 18px; display:flex; align-items:center; gap:12px;">
      <div id="phase-pulse" style="width:10px; height:10px; border-radius:50%; flex-shrink:0;"></div>
      <div style="flex:1; min-width:0;">
        <p id="phase-label" style="font-size:14px; font-weight:700; line-height:1;"></p>
        <p id="phase-message" style="font-size:12px; margin-top:4px; line-height:1.5; opacity:.75;"></p>
      </div>
      <p id="phase-days" style="font-size:10px; opacity:.5; flex-shrink:0; text-align:right; line-height:1.5;"></p>
    </div>

    <p class="eyebrow anim-up-3" style="color:#3f3f46; margin:16px 0 10px;">나의 활동</p>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;" class="anim-up-3">
      <div class="bezel" style="padding:16px; border-radius:20px;">
        <p style="font-size:11px; color:#52525b; line-height:1.4;">순수 기여<br/>
          <span style="font-size:10px; color:#3f3f46;">보너스 제외 실제 달린 거리</span></p>
        <p class="num" style="font-size:26px; font-weight:700; color:var(--accent); margin-top:8px;">
          64<span style="font-size:13px; color:#52525b; font-weight:400;"> km</span>
        </p>
      </div>
      <div class="bezel" style="padding:16px; border-radius:20px;">
        <p style="font-size:11px; color:#52525b; line-height:1.4;">번개 참여<br/>
          <span style="font-size:10px; color:#3f3f46;">완료한 번개 수</span></p>
        <p class="num" style="font-size:26px; font-weight:700; margin-top:8px;">
          7<span style="font-size:13px; color:#52525b; font-weight:400;"> 회</span>
        </p>
      </div>
    </div>

    <p class="eyebrow anim-up-4" style="color:#3f3f46; margin:16px 0 10px;">나의 번개 일정</p>
    <div style="display:flex; flex-direction:column; gap:8px;" class="anim-up-4">
      <div class="bezel" style="padding:14px 16px; border-radius:20px; display:flex; align-items:center; justify-content:space-between;">
        <div>
          <p style="font-size:14px; font-weight:600;">한강 새벽 LSD</p>
          <p style="font-size:12px; color:#52525b; margin-top:2px;">반포 · 8km · 2/4</p>
        </div>
        <div style="text-align:right;">
          <p class="num" style="font-size:13px; font-weight:700; color:var(--accent);">02:14:30</p>
          <p style="font-size:10px; color:#3f3f46; margin-top:2px;">오늘 05:30</p>
        </div>
      </div>
      <div class="bezel" style="padding:14px 16px; border-radius:20px; display:flex; align-items:center; justify-content:space-between;">
        <div>
          <p style="font-size:14px; font-weight:600;">석촌호수 회복런</p>
          <p style="font-size:12px; color:#52525b; margin-top:2px;">송파 · 5km · 1/4</p>
        </div>
        <div style="text-align:right;">
          <p class="num" style="font-size:13px; font-weight:600; color:#71717a;">내일</p>
          <p style="font-size:10px; color:#3f3f46; margin-top:2px;">07.02 07:00</p>
        </div>
      </div>
    </div>

    <div class="anim-up-4" style="margin-top:16px; margin-bottom:24px;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
        <p class="eyebrow" style="color:#3f3f46;">최신 소식</p>
        <span style="font-size:11px; color:var(--accent); font-weight:600; letter-spacing:.04em; cursor:pointer;"
          id="timeline-open-btn">전체 보기</span>
      </div>
      <div style="display:flex; flex-direction:column; gap:1px; border-radius:20px; overflow:hidden;">
        <div class="bezel" style="border-radius:20px 20px 0 0; padding:14px 16px; display:flex; align-items:flex-start; gap:12px;">
          <div style="width:7px; height:7px; border-radius:50%; background:#38bdf8; margin-top:4px; flex-shrink:0;"></div>
          <div>
            <p style="font-size:13px; font-weight:600;">김민수의 번개 완료</p>
            <p style="font-size:12px; color:#52525b; margin-top:2px; line-height:1.5;">한강 새벽 LSD · 8km · 참여 3명</p>
            <p class="num" style="font-size:11px; color:#3f3f46; margin-top:4px;">오늘 07:42</p>
          </div>
        </div>
        <div class="bezel" style="border-radius:0 0 20px 20px; padding:14px 16px; display:flex; align-items:flex-start; gap:12px; cursor:pointer;" id="timeline-open-btn2">
          <div style="width:7px; height:7px; border-radius:50%; background:#3f3f46; margin-top:4px; flex-shrink:0;"></div>
          <div style="flex:1;">
            <p style="font-size:12px; color:#52525b;">+ 게이지 변동 · 이서연의 번개 개설 · 투표 결과 외 4건</p>
          </div>
          <span style="font-size:11px; color:var(--accent); font-weight:600; align-self:center;">보기</span>
        </div>
      </div>
    </div>

  </div>

  <!-- 타임라인 바텀시트 모달 -->
  <div id="timeline-modal"
    style="position:absolute; inset:0; z-index:50; display:none; align-items:flex-end;">
    <div style="position:absolute; inset:0; background:rgba(0,0,0,.65); backdrop-filter:blur(4px);"
      id="timeline-backdrop"></div>
    <div id="timeline-sheet"
      style="position:relative; z-index:1; background:#111113; border-radius:28px 28px 0 0;
        width:100%; max-height:82vh; overflow-y:auto;
        transform:translateY(100%); transition:transform .45s var(--spring);
        border-top:1px solid rgba(255,255,255,.08);">

      <div style="position:sticky; top:0; z-index:10; background:#111113;
        padding:14px 20px 12px; border-bottom:1px solid rgba(255,255,255,.06);">
        <div style="display:flex; justify-content:center; margin-bottom:12px;">
          <div style="width:36px; height:4px; border-radius:99px; background:rgba(255,255,255,.15);"></div>
        </div>
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <h3 style="font-size:17px; font-weight:700;">전체 소식</h3>
          <button id="timeline-close-btn"
            style="background:rgba(255,255,255,.08); border:none; color:#fff; border-radius:50%;
              width:30px; height:30px; font-size:18px; cursor:pointer; line-height:1;">×</button>
        </div>
      </div>

      <div style="padding:0 18px calc(var(--safe-bottom) + 32px);">

        <div style="position:sticky; top:66px; z-index:5; background:#111113; padding:14px 0 8px;">
          <p style="font-size:11px; font-weight:700; color:#52525b; letter-spacing:.06em;">오늘 · 6월 27일 (금)</p>
        </div>

        <div style="display:flex; align-items:flex-start; gap:12px; padding:12px 0; border-bottom:1px solid rgba(255,255,255,.05);">
          <div style="width:38px; height:38px; border-radius:12px; background:rgba(251,146,60,.18);
            display:flex; align-items:center; justify-content:center; font-size:19px; flex-shrink:0;">⚡</div>
          <div style="flex:1; min-width:0;">
            <p style="font-size:13px; font-weight:700; line-height:1.45;">
              단일팀 번개 완료 · <span style="color:#fb923c;">팀 스킬 발동!</span>
            </p>
            <p style="font-size:12px; color:#52525b; margin-top:3px;">한강 LSD · 10km · 4명</p>
          </div>
          <p class="num" style="font-size:11px; color:#3f3f46; flex-shrink:0; padding-top:2px;">07:42</p>
        </div>

        <div style="display:flex; align-items:flex-start; gap:12px; padding:12px 0; border-bottom:1px solid rgba(255,255,255,.05);">
          <div style="width:38px; height:38px; border-radius:12px; background:rgba(255,255,255,.05);
            display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            <span style="font-size:14px; color:#71717a; font-weight:700;">↔</span>
          </div>
          <div style="flex:1; min-width:0;">
            <p style="font-size:13px; font-weight:600; line-height:1.45;">게이지 변동</p>
            <p style="font-size:12px; color:#52525b; margin-top:3px;">
              <span style="color:#38bdf8;">페이서 +8km</span> &nbsp;·&nbsp; <span style="color:#a78bfa;">고스트 −3km</span>
            </p>
          </div>
          <p class="num" style="font-size:11px; color:#3f3f46; flex-shrink:0; padding-top:2px;">07:43</p>
        </div>

        <div style="display:flex; align-items:flex-start; gap:12px; padding:12px 0; border-bottom:1px solid rgba(255,255,255,.05);">
          <div style="width:38px; height:38px; border-radius:12px; background:rgba(255,255,255,.05);
            display:flex; align-items:center; justify-content:center; font-size:19px; flex-shrink:0;">🏃</div>
          <div style="flex:1; min-width:0;">
            <p style="font-size:13px; font-weight:600; line-height:1.45;">번개 완료</p>
            <p style="font-size:12px; color:#52525b; margin-top:3px;">석촌호수 5km · 혼합 · 특수 버프 카드 적용</p>
          </div>
          <p class="num" style="font-size:11px; color:#3f3f46; flex-shrink:0; padding-top:2px;">06:20</p>
        </div>

        <div style="position:sticky; top:66px; z-index:5; background:#111113; padding:14px 0 8px;">
          <p style="font-size:11px; font-weight:700; color:#52525b; letter-spacing:.06em;">어제 · 6월 26일 (목)</p>
        </div>

        <div style="display:flex; align-items:flex-start; gap:12px; padding:12px 0; border-bottom:1px solid rgba(255,255,255,.05);">
          <div style="width:38px; height:38px; border-radius:12px; background:rgba(251,113,133,.12);
            display:flex; align-items:center; justify-content:center; font-size:19px; flex-shrink:0;">🗳️</div>
          <div style="flex:1; min-width:0;">
            <p style="font-size:13px; font-weight:600; line-height:1.45;">
              <span style="color:#a78bfa;">박현우</span> 정체 공개 · 페널티 적용
            </p>
            <p style="font-size:12px; color:#52525b; margin-top:3px;">제 1차 투표 마감 · <span style="color:#a78bfa;">고스트팀</span> 확인</p>
          </div>
          <p class="num" style="font-size:11px; color:#3f3f46; flex-shrink:0; padding-top:2px;">00:00</p>
        </div>

        <div style="display:flex; align-items:flex-start; gap:12px; padding:12px 0; border-bottom:1px solid rgba(255,255,255,.05);">
          <div style="width:38px; height:38px; border-radius:12px; background:rgba(250,204,21,.12);
            display:flex; align-items:center; justify-content:center; font-size:19px; flex-shrink:0;">🔍</div>
          <div style="flex:1; min-width:0;">
            <p style="font-size:13px; font-weight:600; color:#facc15; line-height:1.45;">탐정·밀정 활동 시간 시작</p>
            <p style="font-size:12px; color:#52525b; margin-top:3px;">팀 및 역할 조사가 가능합니다</p>
          </div>
          <p class="num" style="font-size:11px; color:#3f3f46; flex-shrink:0; padding-top:2px;">18:00</p>
        </div>

        <div style="display:flex; align-items:flex-start; gap:12px; padding:12px 0; border-bottom:1px solid rgba(255,255,255,.05);">
          <div style="width:38px; height:38px; border-radius:12px; background:rgba(251,146,60,.18);
            display:flex; align-items:center; justify-content:center; font-size:19px; flex-shrink:0;">⚡</div>
          <div style="flex:1; min-width:0;">
            <p style="font-size:13px; font-weight:700; line-height:1.45;">
              단일팀 번개 완료 · <span style="color:#fb923c;">팀 스킬 발동!</span>
            </p>
            <p style="font-size:12px; color:#52525b; margin-top:3px;">탄천 10km · 3명</p>
          </div>
          <p class="num" style="font-size:11px; color:#3f3f46; flex-shrink:0; padding-top:2px;">07:30</p>
        </div>

        <div style="display:flex; align-items:flex-start; gap:12px; padding:12px 0; border-bottom:1px solid rgba(255,255,255,.05);">
          <div style="width:38px; height:38px; border-radius:12px; background:rgba(255,255,255,.05);
            display:flex; align-items:center; justify-content:center; font-size:19px; flex-shrink:0;">🗳️</div>
          <div style="flex:1; min-width:0;">
            <p style="font-size:13px; font-weight:700; line-height:1.45;">제 1차 투표 시작</p>
            <p style="font-size:12px; color:#52525b; margin-top:3px;">투표권을 행사해 주세요 · 마감 00:00</p>
          </div>
          <p class="num" style="font-size:11px; color:#3f3f46; flex-shrink:0; padding-top:2px;">18:00</p>
        </div>

        <div style="position:sticky; top:66px; z-index:5; background:#111113; padding:14px 0 8px;">
          <p style="font-size:11px; font-weight:700; color:#52525b; letter-spacing:.06em;">06월 30일 (월)</p>
        </div>

        <div style="display:flex; align-items:flex-start; gap:12px; padding:12px 0; border-bottom:1px solid rgba(255,255,255,.05);">
          <div style="width:38px; height:38px; border-radius:12px; background:rgba(251,146,60,.18);
            display:flex; align-items:center; justify-content:center; font-size:19px; flex-shrink:0;">⚡</div>
          <div style="flex:1; min-width:0;">
            <p style="font-size:13px; font-weight:700; line-height:1.45;">
              단일팀 번개 완료 · <span style="color:#fb923c;">팀 스킬 발동!</span>
            </p>
            <p style="font-size:12px; color:#52525b; margin-top:3px;">12km · 4명</p>
          </div>
          <p class="num" style="font-size:11px; color:#3f3f46; flex-shrink:0; padding-top:2px;">19:30</p>
        </div>

        <div style="display:flex; align-items:flex-start; gap:12px; padding:12px 0;">
          <div style="width:38px; height:38px; border-radius:12px; background:rgba(255,255,255,.05);
            display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            <span style="font-size:14px; color:#71717a; font-weight:700; letter-spacing:-.04em;">SYS</span>
          </div>
          <div style="flex:1; min-width:0;">
            <p style="font-size:13px; font-weight:700; line-height:1.45;">탐색전 시작</p>
            <p style="font-size:12px; color:#52525b; margin-top:3px;">마일리지 1:1 적립 구간이 시작되었습니다</p>
          </div>
          <p class="num" style="font-size:11px; color:#3f3f46; flex-shrink:0; padding-top:2px;">00:00</p>
        </div>

      </div>
    </div>
  </div>

  <!-- 탭바 -->
  <div class="tabbar" style="padding:6px 2px;">
    <div class="tab on" id="tab-home"><div class="tab-icon"><span class="ti-home-dot"></span></div><span>홈</span></div>
    <div class="tab" id="tab-bolt-d"><div class="tab-icon"><span class="ti-bolt"></span></div><span>번개</span></div>
    <div class="tab" id="tab-vote-d"><div class="tab-icon"><span class="ti-vote"></span></div><span>투표</span></div>
    <div class="tab" id="tab-members-d"><div class="tab-icon"><span class="ti-users"></span></div><span>참가자</span></div>
    <div class="tab" id="tab-guide-d"><div class="tab-icon"><span class="ti-book"></span></div><span>가이드</span></div>
  </div>
</div>`;
}

export function init() {
  document.getElementById('timeline-open-btn').addEventListener('click', openTimeline);
  document.getElementById('timeline-open-btn2').addEventListener('click', openTimeline);
  document.getElementById('timeline-close-btn').addEventListener('click', closeTimeline);
  document.getElementById('timeline-backdrop').addEventListener('click', closeTimeline);
  document.getElementById('tab-home').addEventListener('click', () => goToScreen('s-dash'));
  document.getElementById('tab-bolt-d').addEventListener('click', () => goToScreen('s-bolt'));
  document.getElementById('tab-vote-d').addEventListener('click', () => goToScreen('s-vote'));
  document.getElementById('tab-members-d').addEventListener('click', () => goToScreen('s-members'));
  document.getElementById('tab-guide-d').addEventListener('click', () => goToScreen('s-guide'));
}

function openTimeline() {
  const modal = document.getElementById('timeline-modal');
  const sheet = document.getElementById('timeline-sheet');
  modal.style.display = 'flex';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { sheet.style.transform = 'translateY(0)'; });
  });
}

function closeTimeline() {
  const sheet = document.getElementById('timeline-sheet');
  sheet.style.transform = 'translateY(100%)';
  setTimeout(() => { document.getElementById('timeline-modal').style.display = 'none'; }, 450);
}
