import { goToScreen } from '../utils/nav.js';

export function render() {
  return `
<div class="screen" id="s-settings">
  <div class="statusbar"><span class="num">9:41</span><span style="letter-spacing:.05em">●●●</span></div>
  <div class="scroll-body pb-tab" style="padding:0 18px">
    <div class="anim-up" style="padding-top:4px; margin-bottom:16px">
      <h2 style="font-size:22px; font-weight:700; letter-spacing:-.02em">설정</h2>
    </div>

    <div class="bezel-accent anim-up-1" style="padding:18px; border-radius:24px; display:flex; align-items:center; gap:14px">
      <div id="settings-icon" style="width:52px; height:52px; border-radius:18px; background:var(--accent-tint); display:flex; align-items:center; justify-content:center;">
        <span id="settings-initial" style="font-family:'Space Grotesk'; font-size:20px; font-weight:700; color:var(--accent);">?</span>
      </div>
      <div>
        <p id="settings-name" style="font-size:16px; font-weight:700">김민수</p>
        <div style="display:flex; align-items:center; gap:6px; margin-top:4px">
          <span id="settings-team-chip" class="chip" style="font-size:10px"></span>
          <span id="settings-role-chip" style="font-size:12px; color:#71717a"></span>
        </div>
      </div>
    </div>

    <p class="eyebrow anim-up-2" style="color:#3f3f46; margin:24px 0 10px">알림</p>
    <div class="bezel anim-up-2" style="border-radius:20px; overflow:hidden">
      <div style="padding:15px 16px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,.05)">
        <span style="font-size:15px">번개 시작 알림</span>
        <div style="width:44px;height:26px;border-radius:99px;background:var(--accent-deep);position:relative"><span style="position:absolute;right:3px;top:3px;width:20px;height:20px;border-radius:50%;background:#fff"></span></div>
      </div>
      <div style="padding:15px 16px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,.05)">
        <span style="font-size:15px">투표 오픈 알림</span>
        <div style="width:44px;height:26px;border-radius:99px;background:var(--accent-deep);position:relative"><span style="position:absolute;right:3px;top:3px;width:20px;height:20px;border-radius:50%;background:#fff"></span></div>
      </div>
      <div style="padding:15px 16px; display:flex; align-items:center; justify-content:space-between">
        <span style="font-size:15px">게이지 변동 알림</span>
        <div style="width:44px;height:26px;border-radius:99px;background:rgba(255,255,255,.10);position:relative"><span style="position:absolute;left:3px;top:3px;width:20px;height:20px;border-radius:50%;background:#52525b"></span></div>
      </div>
    </div>

    <p class="eyebrow anim-up-3" style="color:#3f3f46; margin:24px 0 10px">기타</p>
    <div class="bezel anim-up-3" style="border-radius:20px; overflow:hidden">
      <div style="padding:15px 16px; display:flex; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,.05); font-size:15px"><span>게임 규칙</span><span style="color:#3f3f46">›</span></div>
      <div style="padding:15px 16px; display:flex; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,.05); font-size:15px"><span>운영진 문의</span><span style="color:#3f3f46">›</span></div>
      <div style="padding:15px 16px; display:flex; justify-content:space-between; font-size:15px; color:#fb7185"><span>이름 재설정 요청</span><span>›</span></div>
    </div>
  </div>

  <div class="tabbar" style="padding:6px 2px;">
    <div class="tab" id="tab-home-s"><div class="tab-icon"><span class="ti-home-dot"></span></div><span>홈</span></div>
    <div class="tab" id="tab-bolt-s"><div class="tab-icon"><span class="ti-bolt"></span></div><span>번개</span></div>
    <div class="tab" id="tab-vote-s"><div class="tab-icon"><span class="ti-vote"></span></div><span>투표</span></div>
    <div class="tab" id="tab-members-s"><div class="tab-icon"><span class="ti-users"></span></div><span>참가자</span></div>
    <div class="tab on" id="tab-guide-s"><div class="tab-icon"><span class="ti-book"></span></div><span>가이드</span></div>
  </div>
</div>`;
}

export function init() {
  document.getElementById('tab-home-s').addEventListener('click', () => goToScreen('s-dash'));
  document.getElementById('tab-bolt-s').addEventListener('click', () => goToScreen('s-bolt'));
  document.getElementById('tab-vote-s').addEventListener('click', () => goToScreen('s-vote'));
  document.getElementById('tab-members-s').addEventListener('click', () => goToScreen('s-members'));
}
