// Cloudflare Pages Function — 러닝 앱 스크린샷에서 '총 달린 거리(km)'를 Claude 비전으로 인식
// runluck 프로젝트의 동일 방식 이식. ANTHROPIC_API_KEY 환경변수 필요.
export async function onRequestPost(context) {
  try {
    const { imageData, mediaType } = await context.request.json();
    if (!imageData || !mediaType) {
      return new Response(JSON.stringify({ error: 'missing imageData or mediaType' }), {
        status: 400, headers: { 'content-type': 'application/json' }
      });
    }

    const apiKey = context.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500, headers: { 'content-type': 'application/json' }
      });
    }

    // 러닝 앱은 날짜를 "오늘 오전 8:57"처럼 상대 표기하는 경우가 많다 —
    // 오늘 날짜(KST)를 알려줘 "오늘/어제"를 절대 날짜로 해석할 수 있게 한다.
    const todayKst = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageData } },
            { type: 'text', text: `이건 러닝/운동 앱 스크린샷이야. JSON 한 줄로만 답해. 형식: {"km": 숫자|null, "at": "YYYY-MM-DDTHH:mm"|null}\n- km: 화면에 표시된 "총 달린 거리"(킬로미터). 마일이면 km로 환산. 못 찾으면 null.\n- at: 이 운동 기록의 날짜와 시각. 오늘 날짜는 ${todayKst}(한국). 화면에 "오늘"이라고 적혀 있으면 확실한 정보로 간주하고 ${todayKst}를 사용해. "어제"라고 적혀 있으면 역시 확실한 정보로 간주하고 ${todayKst}의 하루 전 날짜를 사용해. 연도가 안 보이면 올해로 간주. 그 외에 날짜나 시각이 화면에 아예 없으면 null.\nJSON 외 다른 텍스트는 절대 쓰지 마.` }
          ]
        }]
      })
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { 'content-type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { 'content-type': 'application/json' }
    });
  }
}
