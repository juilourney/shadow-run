import { goToScreen } from '../utils/nav.js';

export function render() {
  return `
<div class="screen" id="s-bolt-detail">
  <div class="statusbar">
    <button class="btn btn-secondary" style="height:34px; padding:0 14px; font-size:14px; border-radius:10px" id="bolt-detail-back">← 번개</button>
    <span style="font-size:13px; font-weight:600; color:#52525b;">방장 뷰</span>
    <span style="width:60px;"></span>
  </div>

  <!-- 상세/대기 뷰 -->
  <div id="bolt-detail-waiting" class="scroll-body" style="padding:0 18px 140px">
    <div class="anim-up" style="padding-top:8px">
      <span class="chip" style="background:var(--accent-tint); color:var(--accent); margin-bottom:10px; display:inline-flex;">D-DAY · 05:30</span>
      <h2 style="font-size:26px; font-weight:700; letter-spacing:-.02em; margin-top:10px;">한강 새벽 LSD</h2>
      <p style="font-size:13px; color:#52525b; margin-top:4px;">호스트 · 나 (방장)</p>
    </div>

    <div class="bezel anim-up-1" style="margin-top:16px; padding:2px; border-radius:24px">
      <div class="bezel-in" style="padding:18px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:0; text-align:center">
        <div><p class="num" style="font-size:22px; font-weight:700; color:var(--accent)">8.0</p><p style="font-size:11px; color:#52525b">km</p></div>
        <div style="border-left:1px solid rgba(255,255,255,.06); border-right:1px solid rgba(255,255,255,.06)">
          <p class="num" style="font-size:22px; font-weight:700">5:30</p><p style="font-size:11px; color:#52525b">/km</p></div>
        <div><p class="num" style="font-size:22px; font-weight:700">3/4</p><p style="font-size:11px; color:#52525b">참여</p></div>
      </div>
    </div>

    <div class="bezel anim-up-2" style="margin-top:10px; padding:14px 16px; border-radius:18px; display:flex; align-items:center; gap:10px; font-size:14px; color:#71717a">
      📍 반포 잠수교 남단 광장
    </div>

    <!-- 단일팀 조건 충족 알림 (방장에게만 노출) -->
    <div class="anim-up-2" style="margin-top:10px; background:rgba(251,146,60,.12); border:1px solid rgba(251,146,60,.35); border-radius:18px; padding:14px 18px; display:flex; align-items:flex-start; gap:10px;">
      <span style="font-size:18px; flex-shrink:0;">🔥</span>
      <div>
        <p style="font-size:13px; font-weight:700; color:#fb923c;">단일팀 번개 조건 충족!</p>
        <p style="font-size:12px; color:rgba(251,146,60,.7); margin-top:3px; line-height:1.5;">현재 3명이 같은 팀입니다. 잠금을 걸면 단일팀 번개로 전환되어 팀 고유 스킬이 발동됩니다.</p>
      </div>
    </div>

    <!-- 잠금 토글 -->
    <div class="bezel anim-up-3" style="margin-top:10px; padding:16px; border-radius:18px; display:flex; align-items:center; justify-content:space-between">
      <div>
        <p style="font-size:14px; font-weight:600">단일팀 번개로 잠금</p>
        <p style="font-size:12px; color:#52525b; margin-top:3px">외부인 입장을 차단합니다</p>
      </div>
      <div id="host-lock-toggle" style="width:44px; height:26px; border-radius:99px; background:var(--accent-deep); position:relative; cursor:pointer; transition:.4s var(--spring)">
        <span style="position:absolute; right:3px; top:3px; width:20px; height:20px; border-radius:50%; background:#fff; transition:.4s var(--spring)"></span>
      </div>
    </div>

    <p class="eyebrow anim-up-3" style="color:#3f3f46; margin:20px 0 10px">참가자 확인</p>
    <div style="display:flex; flex-direction:column; gap:8px" class="anim-up-4">
      <div class="bezel" style="padding:14px 16px; border-radius:18px; display:flex; align-items:center; gap:12px">
        <span style="width:36px;height:36px;border-radius:50%;background:var(--accent-tint);border:1.5px solid var(--accent);display:flex;align-items:center;justify-content:center;font-size:13px">나</span>
        <span style="font-size:14px; font-weight:600; color:var(--accent)">나 <span style="font-size:12px; color:#3f3f46; font-weight:400">· 방장</span></span>
      </div>
      <div class="bezel" style="padding:14px 16px; border-radius:18px; display:flex; align-items:center; gap:12px">
        <span style="width:36px;height:36px;border-radius:50%;background:#3f3f46;display:flex;align-items:center;justify-content:center;font-size:13px">민</span>
        <span style="font-size:14px; font-weight:500">김민수</span>
      </div>
      <div class="bezel" style="padding:14px 16px; border-radius:18px; display:flex; align-items:center; gap:12px">
        <span style="width:36px;height:36px;border-radius:50%;background:#3f3f46;display:flex;align-items:center;justify-content:center;font-size:13px">현</span>
        <span style="font-size:14px; font-weight:500">박현우</span>
      </div>
    </div>
  </div>

  <!-- 체크리스트 뷰 (번개 시작 후) -->
  <div id="bolt-detail-checklist" style="display:none;" class="scroll-body" style="padding:0 18px 140px">
    <div style="padding:18px 18px 0;">

      <!-- 단일팀 번개 시작 알림 -->
      <div style="background:rgba(251,146,60,.12); border:1px solid rgba(251,146,60,.3); border-radius:18px; padding:16px 18px; text-align:center; margin-bottom:16px;">
        <p style="font-size:15px; font-weight:700; color:#fb923c;">🔥 단일팀 번개 진행 중!</p>
        <p style="font-size:12px; color:rgba(251,146,60,.7); margin-top:4px;">완료 후 팀 고유 스킬이 발동됩니다</p>
      </div>

      <p style="font-size:16px; font-weight:700; margin-bottom:6px;">참여 체크인</p>
      <p style="font-size:12px; color:#52525b; margin-bottom:20px;">실제로 완주한 참가자를 체크하세요</p>

      <div style="display:flex; flex-direction:column; gap:10px;">
        <label style="display:flex; align-items:center; gap:14px; padding:16px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.07); border-radius:18px; cursor:pointer;">
          <input type="checkbox" id="check-me" checked style="width:20px; height:20px; accent-color:var(--accent); cursor:pointer;" />
          <span style="font-size:15px; font-weight:500">나 (방장)</span>
        </label>
        <label style="display:flex; align-items:center; gap:14px; padding:16px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.07); border-radius:18px; cursor:pointer;">
          <input type="checkbox" id="check-minsu" checked style="width:20px; height:20px; accent-color:var(--accent); cursor:pointer;" />
          <span style="font-size:15px; font-weight:500">김민수</span>
        </label>
        <label style="display:flex; align-items:center; gap:14px; padding:16px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.07); border-radius:18px; cursor:pointer;">
          <input type="checkbox" id="check-hyunwoo" style="width:20px; height:20px; accent-color:var(--accent); cursor:pointer;" />
          <span style="font-size:15px; font-weight:500">박현우</span>
        </label>
      </div>

      <div style="margin-top:16px; padding:14px 16px; background:rgba(255,255,255,.03); border-radius:14px;">
        <label style="display:flex; align-items:center; gap:10px; cursor:pointer; font-size:13px; color:#71717a;">
          <input type="number" id="total-km-input" value="8.2" step="0.1" min="0"
            style="width:60px; padding:6px 10px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.1); border-radius:10px; color:#fafafa; font-family:'Space Grotesk'; font-size:15px; font-weight:700; text-align:center;" />
          <span>km 완주 (실제 거리 입력)</span>
        </label>
      </div>
    </div>
  </div>

  <!-- 하단 버튼 -->
  <div id="bolt-detail-btn-area" style="position:absolute; left:18px; right:18px; bottom:calc(var(--safe-bottom) + 16px); display:flex; gap:10px; z-index:30">
    <button class="btn btn-secondary" style="width:80px; height:56px; font-size:14px" id="bolt-detail-cancel">취소</button>
    <button class="btn btn-primary" style="flex:1; height:56px" id="bolt-detail-action">번개 시작하기</button>
  </div>
</div>`;
}

export function init() {
  document.getElementById('bolt-detail-back').addEventListener('click', () => goToScreen('s-bolt'));
  document.getElementById('bolt-detail-cancel').addEventListener('click', () => goToScreen('s-bolt'));

  let started = false;
  document.getElementById('bolt-detail-action').addEventListener('click', () => {
    if (!started) {
      // 번개 시작 → 체크리스트 뷰로 전환
      started = true;
      document.getElementById('bolt-detail-waiting').style.display = 'none';
      document.getElementById('bolt-detail-checklist').style.display = 'block';
      document.getElementById('bolt-detail-action').textContent = '번개 완료 · 제출';
      document.getElementById('bolt-detail-cancel').style.display = 'none';
    } else {
      // 제출 → 버프 카드 화면
      goToScreen('s-bolt-buff');
    }
  });

  document.getElementById('host-lock-toggle').addEventListener('click', function() {
    this.classList.toggle('unlocked');
    const dot = this.querySelector('span');
    if (this.classList.contains('unlocked')) {
      this.style.background = 'rgba(255,255,255,.10)';
      dot.style.right = ''; dot.style.left = '3px';
      dot.style.background = '#52525b';
    } else {
      this.style.background = 'var(--accent-deep)';
      dot.style.left = ''; dot.style.right = '3px';
      dot.style.background = '#fff';
    }
  });
}
