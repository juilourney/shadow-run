import { goToScreen } from '../utils/nav.js';

export function render() {
  return `
<div class="screen" id="s-bolt-result" style="overflow:hidden;">

  <div style="position:absolute; inset:0; pointer-events:none;">
    <div style="position:absolute; bottom:-10%; left:50%; transform:translateX(-50%); width:90%; aspect-ratio:1;
      border-radius:50%; filter:blur(70px); opacity:.5;
      background:radial-gradient(circle, rgba(251,146,60,.2) 0%, transparent 70%);"></div>
  </div>

  <div class="scroll-body" style="position:relative; z-index:2; padding:calc(var(--safe-top) + 20px) 22px calc(var(--safe-bottom) + 100px);">

    <!-- 헤더 -->
    <div class="anim-up" style="padding-top:8px; text-align:center; margin-bottom:20px;">
      <div style="width:56px; height:56px; border-radius:18px; background:rgba(251,146,60,.15); border:1px solid rgba(251,146,60,.3); display:flex; align-items:center; justify-content:center; font-size:24px; margin:0 auto 12px;">⚡</div>
      <h2 style="font-size:24px; font-weight:700; letter-spacing:-.02em;">번개 완료!</h2>
      <p style="font-size:13px; color:#52525b; margin-top:4px;">한강 새벽 LSD · 단일팀 번개</p>
    </div>

    <!-- 기본 달린 거리 -->
    <div class="bezel anim-up-1" style="padding:20px; border-radius:22px; text-align:center; margin-bottom:10px;">
      <p style="font-size:11px; color:#52525b; margin-bottom:8px; letter-spacing:.06em; text-transform:uppercase;">실제 완주 거리</p>
      <p class="num" style="font-size:48px; font-weight:800; line-height:1; color:#fafafa;">8.2<span style="font-size:20px; font-weight:400; color:#52525b;"> km</span></p>
      <p style="font-size:12px; color:#52525b; margin-top:6px;">참가자 3명 완주</p>
    </div>

    <!-- 버프 적용 -->
    <div style="background:rgba(56,189,248,.1); border:1px solid rgba(56,189,248,.25); border-radius:20px; padding:18px 20px; margin-bottom:10px;" class="anim-up-2">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
        <p style="font-size:12px; color:#52525b; font-weight:600; letter-spacing:.06em; text-transform:uppercase;">적용된 버프</p>
        <span class="chip" style="background:rgba(56,189,248,.15); color:#38bdf8; font-size:10px;">랜덤 카드</span>
      </div>
      <p style="font-size:16px; font-weight:700; color:#38bdf8;">더블 적립</p>
      <p style="font-size:12px; color:rgba(56,189,248,.6); margin-top:3px;">마일리지 ×2 적립</p>
      <div style="height:1px; background:rgba(255,255,255,.06); margin:12px 0;"></div>
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <p style="font-size:12px; color:#52525b;">버프 적용 마일리지</p>
        <p class="num" style="font-size:18px; font-weight:700; color:#38bdf8;">+8.2 km</p>
      </div>
    </div>

    <!-- 단일팀 스킬 보너스 -->
    <div style="background:rgba(251,146,60,.12); border:1px solid rgba(251,146,60,.35); border-radius:20px; padding:18px 20px; margin-bottom:10px;" class="anim-up-3">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
        <p style="font-size:12px; color:#52525b; font-weight:600; letter-spacing:.06em; text-transform:uppercase;">팀 고유 스킬</p>
        <span class="chip" style="background:rgba(251,146,60,.2); color:#fb923c; font-size:10px;">단일팀 발동</span>
      </div>
      <p style="font-size:16px; font-weight:700; color:#fb923c;">🔥 시너지 스킬</p>
      <p style="font-size:12px; color:rgba(251,146,60,.6); margin-top:3px;">팀 마일리지 ×1.5 추가 적립</p>
      <div style="height:1px; background:rgba(255,255,255,.06); margin:12px 0;"></div>
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <p style="font-size:12px; color:#52525b;">스킬 적립 마일리지</p>
        <p class="num" style="font-size:18px; font-weight:700; color:#fb923c;">+4.1 km</p>
      </div>
    </div>

    <!-- 최종 합계 -->
    <div style="background:linear-gradient(135deg, rgba(251,146,60,.15) 0%, rgba(56,189,248,.1) 100%); border:1px solid rgba(255,255,255,.1); border-radius:20px; padding:20px; margin-bottom:10px;" class="anim-up-4">
      <p style="font-size:11px; color:#71717a; margin-bottom:8px; letter-spacing:.06em; text-transform:uppercase;">이번 번개 총 적립</p>
      <p class="num" style="font-size:44px; font-weight:800; line-height:1;">20.5<span style="font-size:18px; font-weight:400; color:#52525b;"> km</span></p>
      <p style="font-size:12px; color:#52525b; margin-top:6px;">기본 8.2 + 버프 8.2 + 스킬 4.1</p>
    </div>

    <!-- 참가자 목록 -->
    <div class="bezel anim-up-4" style="padding:16px 18px; border-radius:20px;">
      <p style="font-size:11px; color:#52525b; margin-bottom:12px; font-weight:600; letter-spacing:.06em; text-transform:uppercase;">완주한 참가자</p>
      <div style="display:flex; gap:12px; justify-content:flex-start;">
        <div style="text-align:center">
          <span style="width:36px;height:36px;border-radius:50%;background:#3f3f46;display:flex;align-items:center;justify-content:center;font-size:13px;margin:0 auto">나</span>
          <p style="font-size:10px;color:#71717a;margin-top:4px">나</p>
        </div>
        <div style="text-align:center">
          <span style="width:36px;height:36px;border-radius:50%;background:#3f3f46;display:flex;align-items:center;justify-content:center;font-size:13px;margin:0 auto">민</span>
          <p style="font-size:10px;color:#71717a;margin-top:4px">김민수</p>
        </div>
      </div>
    </div>

  </div>

  <div style="position:absolute; left:18px; right:18px; bottom:calc(var(--safe-bottom) + 16px); z-index:30">
    <button class="btn btn-primary" style="width:100%; height:56px;" id="result-confirm-btn">확인</button>
  </div>
</div>`;
}

export function init() {
  document.getElementById('result-confirm-btn').addEventListener('click', () => {
    goToScreen('s-bolt');
  });
}
