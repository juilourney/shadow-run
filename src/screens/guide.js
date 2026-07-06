
function section(emoji, title, content) {
  return `
  <div class="bezel" style="padding:20px; border-radius:22px; margin-bottom:12px;">
    <div style="display:flex; align-items:center; gap:10px; margin-bottom:14px;">
      <span style="font-size:18px; line-height:1;">${emoji}</span>
      <h3 style="font-size:15px; font-weight:700; letter-spacing:-.01em;">${title}</h3>
    </div>
    ${content}
  </div>`;
}

function row(label, value, color = '#a1a1aa') {
  return `
  <div style="display:flex; gap:12px; padding:10px 0; border-bottom:1px solid rgba(255,255,255,.05);">
    <p style="font-size:13px; font-weight:600; color:#e4e4e7; width:80px; flex-shrink:0; line-height:1.5;">${label}</p>
    <p style="font-size:13px; color:${color}; line-height:1.6; flex:1;">${value}</p>
  </div>`;
}

function roleRow(role, ability, value) {
  return `
  <div style="padding:10px 0; border-bottom:1px solid rgba(255,255,255,.05);">
    <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
      <p style="font-size:13px; font-weight:700; color:#e4e4e7;">${role}</p>
    </div>
    <p style="font-size:12px; color:#60a5fa; margin-bottom:3px;">${ability}</p>
    <p style="font-size:12px; color:#71717a; line-height:1.5;">${value}</p>
  </div>`;
}

function para(text) {
  return `<p style="font-size:13px; color:#a1a1aa; line-height:1.75; margin-bottom:10px;">${text}</p>`;
}

export function render() {
  return `
<div class="game-section" id="gs-guide">
  <div class="scroll-body" style="padding:calc(var(--safe-top) + 12px) 18px 40px">

    <div class="anim-up" style="padding-top:4px; margin-bottom:20px;">
      <h2 style="font-size:22px; font-weight:700; letter-spacing:-.02em;">가이드</h2>
      <p style="font-size:12px; color:#52525b; margin-top:2px;">정체를 숨기고 아군을 찾아라! 3주간의 줄다리기 레이스</p>
    </div>

    ${section('🎯', '게임 개요 및 승리 조건', `
      ${para('페이서팀과 고스트팀이 3주 동안 번개(달리기)를 통해 마일리지를 쌓으며 중앙의 게이지를 자기 쪽으로 당기는 줄다리기 게임입니다.')}
      <div style="padding:10px 0; border-bottom:1px solid rgba(255,255,255,.05);">
        <p style="font-size:13px; font-weight:600; color:#e4e4e7; margin-bottom:4px;">승리</p>
        <p style="font-size:13px; color:#34d399; line-height:1.6;">3주 후 게이지가 더 기운 팀이 우승합니다</p>
      </div>
    `)}

    ${section('🎭', '팀 및 특수 역할 배정', `
      ${para('전체 참가자는 페이서팀과 고스트팀, 두 팀으로 나뉘어 함께 달리며 대결합니다.<br/>게임 시작 시 팀과 5가지 특수 역할이 모두 랜덤으로 배정되며, 각 팀에는 엘리트, 앵커, 더블, 탐정, 밀정이 하나씩 존재합니다.<br/>본인의 정체와 역할은 팀원들에게도 비공개입니다.')}
      ${roleRow('👑 엘리트', '번개 마일리지 2배 적립', '팀의 핵심 마일리지 기여자입니다.')}
      ${roleRow('⚓ 앵커', '게이지를 통째로 끌어온다', '번개에서 얻은 마일리지(버프 포함)만큼 상대팀 게이지에서 깎는 동시에 내 팀 게이지에 더합니다.<br/>한 번에 양쪽을 움직여 강력한 역전 기회를 만듭니다.')}
      ${roleRow('×2 더블', '투표 시 2표 행사', '투표 결과를 좌우하여 상대 팀의 핵심 멤버를 색출하는 도구입니다.')}
      ${roleRow('🔍 탐정', '누군가의 팀 확인 (주 2회)', '[참가자 탭]에서 아군인지 적군인지 은밀히 판별합니다.')}
      ${roleRow('🕵️ 밀정', '누군가의 역할 확인 (주 2회)', '[참가자 탭]에서 상대의 구체적인 역할(엘리트/앵커 등)을 파악합니다.')}
    `)}

    ${section('📅', '주간 운영 체계', `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <div style="background:rgba(255,255,255,.04); border-radius:14px; padding:14px 16px;">
          <p style="font-size:12px; font-weight:700; color:#a1a1aa; letter-spacing:.04em; margin-bottom:6px;">탐색 기간 · 일 ~ 수</p>
          <p style="font-size:13px; color:#e4e4e7; line-height:1.65;">달린 마일리지가 1:1로 게이지에 반영됩니다. 아군을 탐색하고 상대팀 정보를 수집하는 시기입니다.</p>
        </div>
        <div style="background:rgba(255,255,255,.04); border-radius:14px; padding:14px 16px;">
          <p style="font-size:12px; font-weight:700; color:#a1a1aa; letter-spacing:.04em; margin-bottom:6px;">줄다리기 기간 · 목 ~ 토</p>
          <p style="font-size:13px; color:#e4e4e7; line-height:1.65;">달린 마일리지만큼 상대팀 게이지에서 직접 삭감합니다. 본격적인 승부를 벌이는 시기입니다.</p>
        </div>
      </div>
    `)}

    ${section('⚡', '번개와 팀 고유 스킬', `
      ${para('번개는 최대 4명까지 모일 수 있으며, 팀 구성에 따라 스킬이 발동됩니다.')}
      ${row('단일팀 번개', '3~4명이 같은 팀일 때 팀 고유 스킬이 자동 발동됩니다.')}
      ${row("'페이서 시너지'", '참여 인원 × 50km의 마일리지를 추가 적립합니다.', '#38bdf8')}
      ${row("'고스트 게이지'", '상대팀 마일리지 삭감에 더해 게이지 바를 고스트 쪽으로 100km 즉시 이동시킵니다.', '#a78bfa')}
      ${row('일반 번개', '팀 혼합 시 스킬 없음. 대신 버프카드가 랜덤으로 적용되어 마일리지가 최대 3배까지 오를 수 있습니다.')}
      ${row('잠금 기능', '방장이 아군끼리만 달리기 위해 방을 잠금 처리하여 상대팀의 난입을 막을 수 있습니다.')}
      ${row('인증 마감 시한', '시작 시각 + 예상 완주 시간(거리×페이스) + 2시간이 지나면 번개가 자동 만료됩니다.')}
      ${row('인증 실패 페널티', '마감까지 인증 없이 자동 만료되면 참가자 전원에게 -50%의 마일리지만 적립됩니다.')}
    `)}

    ${section('🗳️', '투표 및 정체 공개', `
      ${row('일시', '주 2회 — 월요일, 목요일 18:00 ~ 22:00')}
      ${row('진행', '전체 참가자 가운데 의심스러운 1명을 지목(필수)하고, 확신이 있으면 그 사람의 역할까지 추가로 지목합니다(선택 · 애매하면 기권).<br/>더블 역할은 2표를 행사합니다.')}
      ${row('팀 공개', '최다 득표자는 팀 소속이 타임라인에 공개되고, 마일리지가 영구적으로 50% 감소합니다.')}
      ${row('역할 공개', '그 사람을 지목한 인원의 60% 이상이 같은 역할로 지목했고 실제 역할과 일치하면, 역할이 공개됩니다.<br/>어떤 역할이든 예외 없이 공개되는 즉시 해당 특수 능력이 박탈됩니다.')}
      ${row('추리 실패', '60%가 모여도 실제 역할과 다르면 역할은 비공개로 남고 능력도 그대로 유지됩니다.')}
    `)}

    ${section('📱', '주요 화면 활용', `
      ${row('홈 탭', "개인의 순수 달리기 거리와 실시간 게이지, 타임라인으로 전체 흐름을 확인합니다.")}
      ${row('참가자 탭', '탐정과 밀정이 능력을 사용하는 공간입니다. 확인된 정보는 본인의 기기에만 표시되어 개인 전략 자산으로 활용됩니다.')}
      ${row('투표 탭', '투표 기간에만 활성화되며, 전체 참가자 중 의심 인물을 지목해 정체를 폭로합니다.')}
    `)}

    <!-- 마지막 팁 -->
    <div style="background:rgba(56,189,248,.06); border:1px solid rgba(56,189,248,.15);
      border-radius:20px; padding:18px 20px; margin-bottom:12px;">
      <p style="font-size:12px; font-weight:700; color:var(--accent); margin-bottom:8px; letter-spacing:.06em; text-transform:uppercase;">전략 팁</p>
      <p style="font-size:13px; color:#a1a1aa; line-height:1.75;">탐색 기간에는 정체를 드러내지 말고 아군을 찾아 세력을 넓히는 데 집중하세요.<br/>줄다리기 기간이 시작되면 그동안 모은 정보와 팀 고유 스킬을 총동원해 게이지를 끌어오세요.<br/>투표는 상대 팀의 판도를 흔들 수 있는 결정적 변수이니, 지목과 침묵 모두 전략이 될 수 있습니다.</p>
    </div>

  </div>

</div>`;
}

export function init() {}
