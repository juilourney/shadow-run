// Cloudflare Pages Function — 관리자 비밀번호를 서버(env.ADMIN_PASSWORD)에서만 비교하고,
// 맞으면 서명된 만료시간 포함 토큰을 발급한다. 비밀번호가 클라이언트 JS에 노출되지 않는다.
import { signAdminToken } from '../_lib/admin-auth.js';

export async function onRequestPost(context) {
  try {
    if (!context.env.ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: '관리자 비밀번호가 설정되지 않았습니다' }), {
        status: 500, headers: { 'content-type': 'application/json' }
      });
    }
    const { password } = await context.request.json().catch(() => ({}));
    if (password !== context.env.ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: '비밀번호가 올바르지 않습니다' }), {
        status: 401, headers: { 'content-type': 'application/json' }
      });
    }
    const token = await signAdminToken(context.env);
    return new Response(JSON.stringify({ token }), { headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { 'content-type': 'application/json' }
    });
  }
}
