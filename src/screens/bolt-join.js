import { goToScreen } from '../utils/nav.js';
import { cancelJoin } from './bolt.js';

export function render() {
  return `
<div class="screen" id="s-bolt-join">
  <!-- 대기 뷰 -->
  <div id="bolt-join-waiting" class="scroll-body" style="padding:calc(var(--safe-top) + 10px) 18px 120px">
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
      <button class="btn btn-secondary" style="height:34px; padding:0 14px; font-size:14px; border-radius:10px" id="bolt-join-back">← 번개</button>
      <span></span>
    </div>
    <div class="anim-up" style="padding-top:8px">
      <span class="chip" style="background:var(--accent-tint); color:var(--accent); margin-bottom:10px; display:inline-flex;">참여 완료</span>
      <h2 style="font-size:24px; font-weight:700; letter-spacing:-.02em; margin-top:10px;">한강 새벽 LSD</h2>
      <p style="font-size:13px; color:#52525b; margin-top:4px;">오늘 05:30 시작</p>
    </div>

    <div class="bezel anim-up-1" style="margin-top:16px; padding:2px; border-radius:24px">
      <div class="bezel-in" style="padding:18px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:0; text-align:center">
        <div>
          <p class="num" style="font-size:22px; font-weight:700; color:var(--accent)">8.0</p>
          <p style="font-size:11px; color:#52525b">km</p>
        </div>
        <div style="border-left:1px solid rgba(255,255,255,.06); border-right:1px solid rgba(255,255,255,.06)">
          <p class="num" style="font-size:22px; font-weight:700">5:30</p>
          <p style="font-size:11px; color:#52525b">/km</p>
        </div>
        <div>
          <p class="num" style="font-size:22px; font-weight:700">3/4</p>
          <p style="font-size:11px; color:#52525b">참여</p>
        </div>
      </div>
    </div>

    <div class="bezel anim-up-2" style="margin-top:10px; padding:14px 16px; border-radius:18px; display:flex; align-items:center; gap:10px; font-size:14px; color:#71717a">
      📍 반포 잠수교 남단 광장
    </div>

    <p class="eyebrow anim-up-2" style="color:#3f3f46; margin:20px 0 10px">참가자</p>
    <p style="font-size:11px; color:#52525b; margin-bottom:12px; margin-top:-6px;">팀과 역할은 공개되지 않습니다</p>
    <div style="display:flex; flex-direction:column; gap:8px" class="anim-up-3">
      <div class="bezel" style="padding:14px 16px; border-radius:18px; display:flex; align-items:center; gap:12px">
        <span style="width:36px;height:36px;border-radius:50%;background:#3f3f46;display:flex;align-items:center;justify-content:center;font-size:13px">민</span>
        <span style="font-size:14px; font-weight:500">김민수 <span style="font-size:12px; color:#3f3f46">· 방장</span></span>
      </div>
      <div class="bezel" style="padding:14px 16px; border-radius:18px; display:flex; align-items:center; gap:12px">
        <span style="width:36px;height:36px;border-radius:50%;background:#3f3f46;display:flex;align-items:center;justify-content:center;font-size:13px">현</span>
        <span style="font-size:14px; font-weight:500">박현우</span>
      </div>
      <div class="bezel" style="padding:14px 16px; border-radius:18px; display:flex; align-items:center; gap:12px; background:var(--accent-tint); border-color:var(--accent-border);">
        <span style="width:36px;height:36px;border-radius:50%;background:var(--accent-tint);border:1.5px solid var(--accent);display:flex;align-items:center;justify-content:center;font-size:13px;">나</span>
        <span style="font-size:14px; font-weight:600; color:var(--accent)">나 (참여 완료)</span>
      </div>
    </div>

    <!-- 시작까지 카운트다운 -->
    <div class="bezel anim-up-4" style="margin-top:16px; padding:16px 20px; border-radius:20px; text-align:center;">
      <p style="font-size:11px; color:#52525b; margin-bottom:6px;">번개 시작까지</p>
      <p class="num" style="font-size:36px; font-weight:700; color:var(--accent);">02:14:30</p>
      <p style="font-size:11px; color:#3f3f46; margin-top:4px;">방장이 시작하면 알림이 발송됩니다</p>
    </div>

    <!-- 참여 취소 -->
    <button id="bolt-join-cancel-btn"
      style="width:100%; margin-top:12px; height:48px; border-radius:16px;
        background:rgba(251,113,133,.08); border:1px solid rgba(251,113,133,.2);
        color:#f87171; font-size:14px; font-weight:600; cursor:pointer;">
      참여 취소하기
    </button>
  </div>

  <!-- 진행 중 뷰 (시작 후 교체) -->
  <div id="bolt-join-running" style="display:none; flex:1; flex-direction:column; align-items:center; justify-content:center; gap:16px; padding:0 32px; text-align:center;">
    <div style="width:72px; height:72px; border-radius:22px; background:rgba(251,146,60,.15); border:1px solid rgba(251,146,60,.3); display:flex; align-items:center; justify-content:center; font-size:32px;">⚡</div>

    <!-- 단일팀 시작 알림 (단일팀일 때만 노출) -->
    <div id="single-team-start-notice" style="display:none; background:rgba(251,146,60,.12); border:1px solid rgba(251,146,60,.3); border-radius:16px; padding:14px 18px; width:100%;">
      <p style="font-size:13px; font-weight:700; color:#fb923c; text-align:center;">🔥 같은 팀원이 모였습니다!</p>
      <p style="font-size:12px; color:rgba(251,146,60,.7); text-align:center; margin-top:4px;">단일팀 번개 — 팀 고유 스킬이 발동됩니다</p>
    </div>

    <p style="font-size:19px; font-weight:700;">번개 진행 중</p>
    <p style="font-size:13px; color:#52525b; line-height:1.7;">한강 새벽 LSD · 반포 잠수교<br/>방장이 완료 처리하면 결과가 공개됩니다</p>

    <div class="bezel" style="padding:14px 18px; border-radius:16px; width:100%;">
      <p style="font-size:12px; color:#52525b; margin-bottom:10px; text-align:center;">함께 달리는 중</p>
      <div style="display:flex; gap:10px; justify-content:center;">
        <div style="text-align:center">
          <span style="width:36px;height:36px;border-radius:50%;background:#3f3f46;display:flex;align-items:center;justify-content:center;font-size:13px;margin:0 auto">민</span>
          <p style="font-size:10px;color:#71717a;margin-top:4px">김민수</p>
        </div>
        <div style="text-align:center">
          <span style="width:36px;height:36px;border-radius:50%;background:#3f3f46;display:flex;align-items:center;justify-content:center;font-size:13px;margin:0 auto">현</span>
          <p style="font-size:10px;color:#71717a;margin-top:4px">박현우</p>
        </div>
        <div style="text-align:center">
          <span style="width:36px;height:36px;border-radius:50%;background:var(--accent-tint);border:1.5px solid var(--accent);display:flex;align-items:center;justify-content:center;font-size:13px;margin:0 auto">나</span>
          <p style="font-size:10px;color:var(--accent);margin-top:4px">나</p>
        </div>
      </div>
    </div>

    <!-- 결과 확인 버튼 (실제 앱에서는 서버 알림으로 자동 전환) -->
    <button class="btn btn-secondary" style="width:100%; height:48px; font-size:14px; margin-top:8px;" id="join-result-btn">결과 확인 (시뮬레이션)</button>
  </div>

  <!-- 시작 시뮬레이션 버튼 (대기 중에만 표시) -->
  <div id="bolt-join-start-area" style="position:absolute; left:18px; right:18px; bottom:calc(var(--safe-bottom) + 16px); z-index:30">
    <button class="btn btn-primary" style="width:100%; height:52px; font-size:14px;" id="bolt-join-simulate-start">번개 시작됨 (시뮬레이션)</button>
  </div>
</div>`;
}

export function init() {
  document.getElementById('bolt-join-back').addEventListener('click', () => goToScreen('s-bolt'));

  document.getElementById('bolt-join-cancel-btn').addEventListener('click', () => {
    cancelJoin();
    goToScreen('s-bolt');
  });

  document.getElementById('bolt-join-simulate-start').addEventListener('click', () => {
    document.getElementById('bolt-join-waiting').style.display = 'none';
    document.getElementById('bolt-join-running').style.display = 'flex';
    document.getElementById('bolt-join-start-area').style.display = 'none';
  });

  document.getElementById('join-result-btn').addEventListener('click', () => {
    goToScreen('s-bolt-result');
  });
}
