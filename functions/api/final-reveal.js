// 최종 결과 공개 — 게임이 끝난 뒤에만 전원의 팀·역할을 돌려준다.
//
// 결과 화면은 원래 전원 정체를 공개하는 화면이지만, 그 데이터를 평소에도 클라이언트가
// 들고 있으면 은닉이 무의미해진다. 종료 여부는 서버가 settings에서 직접 계산한다
// (클라이언트가 "끝났어요"라고 주장하는 걸 믿으면 아무 때나 열 수 있다).
import { getAccessToken, firestoreUrl, fromFirestoreFields } from '../_lib/firebase-admin.js';
import { readSecretAssignment } from '../_lib/secrets.js';
import { verifyPlayerToken, playerUnauthorized } from '../_lib/player-auth.js';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

// 종료 시각 = 시작일 + weeks*7일 (KST 벽시계 기준, store.js getCalendar와 동일)
function hasEnded(startDate, weeks, nowMs = Date.now()) {
  if (!startDate) return false;
  const kst = new Date(nowMs + 9 * 3600 * 1000);
  const today0 = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate());
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const start0 = Date.UTC(sy, sm - 1, sd);
  return Math.round((today0 - start0) / 86400000) >= weeks * 7;
}

export async function onRequestPost(context) {
  try {
    const env = context.env;
    if (!(await verifyPlayerToken(context.request, env))) return playerUnauthorized();

    const accessToken = await getAccessToken(env);
    const authHeaders = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };

    const sRes = await fetch(firestoreUrl(env, 'game/settings'), { headers: authHeaders });
    const settings = sRes.ok ? fromFirestoreFields((await sRes.json()).fields) : {};
    if (!hasEnded(settings.startDate, Number(settings.weeks) || 3)) {
      return json({ error: '게임이 끝난 뒤에 공개됩니다', ended: false }, 403);
    }

    const assignment = await readSecretAssignment(env, authHeaders);
    return json({
      ended: true,
      players: (assignment.players || []).map(p => ({ id: p.id, name: p.name, team: p.team ?? null, role: p.role ?? null })),
    });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
