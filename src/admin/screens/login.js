const AUTH_KEY = 'sr_admin_auth';
const PASSWORD = 'hnrc2026'; // 목업 비밀번호 — Firebase 연동 시 실제 인증으로 교체

export function render() {
  return `
<div class="admin-screen" id="admin-login">
  <div class="admin-shell" style="max-width:360px; padding-top:15vh;">
    <h2 style="font-size:22px; font-weight:700; margin-bottom:6px;">운영진 로그인</h2>
    <p style="font-size:13px; color:#71717a; margin-bottom:24px;">Shadow Run 관리자 화면</p>
    <div class="admin-field">
      <input class="input" type="password" id="admin-login-pw" placeholder="비밀번호" />
    </div>
    <p id="admin-login-error" style="font-size:12px; color:#fb7185; margin-bottom:12px; display:none;">비밀번호가 올바르지 않습니다.</p>
    <button class="btn btn-primary" id="admin-login-btn" style="width:100%; height:52px;">로그인</button>
  </div>
</div>`;
}

export function init(goTo) {
  const pwInput = document.getElementById('admin-login-pw');
  const errorEl = document.getElementById('admin-login-error');

  function tryLogin() {
    if (pwInput.value === PASSWORD) {
      sessionStorage.setItem(AUTH_KEY, '1');
      errorEl.style.display = 'none';
      goTo('dashboard');
    } else {
      errorEl.style.display = 'block';
    }
  }

  document.getElementById('admin-login-btn').addEventListener('click', tryLogin);
  pwInput.addEventListener('keydown', e => { if (e.key === 'Enter') tryLogin(); });
}
