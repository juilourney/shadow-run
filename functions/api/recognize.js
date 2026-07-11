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
            { type: 'text', text: '이건 러닝/운동 앱 스크린샷이야. JSON 한 줄로만 답해. 형식: {"km": 숫자|null, "at": "YYYY-MM-DDTHH:mm"|null}\n- km: 화면에 표시된 "총 달린 거리"(킬로미터). 마일이면 km로 환산. 못 찾으면 null.\n- at: 이 운동 기록의 날짜와 시각. 연도가 안 보이면 올해로 간주. "오늘"/"어제"/"2시간 전" 같은 상대 표기이거나 날짜·시각이 확실하지 않으면 null. 추측 금지.\nJSON 외 다른 텍스트는 절대 쓰지 마.' }
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
