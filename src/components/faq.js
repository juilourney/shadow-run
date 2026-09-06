// FAQ — 플로팅 ? 버튼 + 바텀시트. 게임/대기실 어디서든 규칙 Q&A를 연다.
// 노출(FAB 표시/숨김)은 nav.js goToScreen이 화면(s-game·s-waiting)에 따라 제어한다.
// 카테고리 칩(균등 분할) + 아코디언(한 번에 하나만 열림), 시트 높이 고정.

const FAQ_DATA = [
  { id: 'basic', label: '기본', qs: [
    { q: '언제 이기나요?', a: '게이지 막대는 좌우로 나뉘어(<span class="gc">왼쪽 고스트</span> · <span class="pc">오른쪽 페이서</span>) 각 팀이 달린 마일리지만큼 자기 쪽이 채워집니다. 3주 뒤 <b>막대를 더 많이 차지한 팀</b>이 우승, 동점이면 무승부예요.' },
    { q: '내 팀·역할을 다른 사람이 알 수 있나요?', a: '아니요. 같은 팀원에게도 비공개입니다. 투표로 적발되기 전까진 아무도 몰라요.' },
    { q: '게임은 무슨 요일에 시작하나요?', a: '일요일(1일차)부터 시작해 3주간 진행됩니다.' },
  ]},
  { id: 'bolt', label: '번개', qs: [
    { q: '혼자 달리면 버프를 받나요?', a: '아니요. 혼자(1명) 달린 번개는 버프 없이 실제 거리만 <b>×1</b> 적립됩니다.' },
    { q: '번개는 몇 명까지? 팀 스킬은 언제 터지나요?', a: '최대 <b>4명</b>. 같은 팀 3~4명이 모이면 팀 고유 스킬(페이서 시너지 / 고스트 게이지)이 자동 발동합니다. 팀이 섞이거나 2명이면 랜덤 버프카드(최대 ×3)가 적용돼요.' },
    { q: '번개를 동시에 여러 개 올릴 수 있나요?', a: '아니요, 한 번에 하나만. 지금 참여 중인 번개가 끝나야 새로 만들거나 다른 번개에 참여할 수 있어요.' },
    { q: '인증(사진)을 안 하면 어떻게 되나요?', a: '마감(시작 + 예상 완주 + 2시간)까지 인증이 없으면 자동 만료돼 <b>적립이 전혀 없습니다(0)</b>. 반드시 인증(사진)을 올려야 마일리지·게이지에 반영돼요.' },
  ]},
  { id: 'gauge', label: '게이지', qs: [
    { q: '탐색 기간과 줄다리기 기간이 뭐가 다른가요?', a: '탐색(일~수)에는 달린 만큼 <b>우리 팀만</b> 올라갑니다. 줄다리기(목~토)에는 <b>우리 +, 상대 −</b>로 전원 양방향이 돼요.' },
    { q: '게이지 정확한 숫자(km)는 언제 보나요?', a: '막대(비율)는 번개 3개가 완료되면 열려요(초반엔 개별 번개로 팀이 드러나지 않도록 잠금). 정확한 수치(km)는 ① 투표 시간(월·목 18~22시) ② 종료 3일 전부터 ③ 종료 후에 공개됩니다.' },
  ]},
  { id: 'vote', label: '투표', qs: [
    { q: '투표는 언제 하나요?', a: '매주 <b>월·목 18:00~22:00</b>, 주 2회예요. 전체 참가자 중 상대 팀일 것 같은 1명을 필수로 지목합니다.' },
    { q: '"30% 이상"이 무슨 뜻인가요?', a: '최다 득표자가 <b>전체 표의 30% 이상 + 단독 1위</b>여야(동점이면 무효) 팀이 공개되고 마일리지가 영구 50% 감소합니다. 이때 특수 능력은 아직 유지돼요.' },
    { q: '역할까지 공개되려면요?', a: '그 사람을 지목한 사람들 중 <b>60% 이상</b>이 같은(정확한) 역할로 맞히면 역할이 공개되고 특수 능력이 영구 박탈됩니다.' },
    { q: '엘리트가 걸리면 배수가 어떻게 되나요?', a: '팀만 적발되면 ×2가 유지된 채 −50%라 실질 <b>×1.0</b>, 역할까지 밝혀지면 ×2가 사라져 <b>×0.5</b>가 됩니다.' },
    { q: '우리 팀 사람을 지목해도 되나요?', a: '시스템상 가능하지만, 최다 득표자는 어느 팀이 지목했든 페널티를 받습니다. 우리 팀을 지목하면 자책골이 되니, 목적은 "상대 팀 색출"이에요.' },
    { q: '더블이 뭔가요?', a: '투표에서 2표를 행사하는 특수 역할입니다.' },
  ]},
  { id: 'ability', label: '능력', qs: [
    { q: '탐정·밀정은 몇 번 쓰나요?', a: '각각 <b>주 3회</b>, 매주 초기화됩니다. 탐정은 팀, 밀정은 역할을 확인해요. 확인한 정보는 내 기기에만 표시됩니다.' },
    { q: '앵커는 뭐가 특별한가요?', a: '앵커는 탐색 기간에도 항상 양방향(우리 +, 상대 −)으로 게이지를 움직입니다. 줄다리기 땐 모두 양방향이라, 앵커의 강점은 탐색 기간에 두드러져요.' },
    { q: '기기를 바꿔도 다시 들어갈 수 있나요?', a: '네. 같은 이름으로 재입장하면 기존 팀·역할 그대로 이어집니다(이미 확인한 카드는 다시 안 열려요).' },
    { q: '입장할 때 "이미 있는 이름"이라고 떠요.', a: '본인 재입장이면 [확인]. 다른 사람인데 이름이 같다면 [취소] 후 구분되게 바꿔주세요(예: 홍길동2). 같은 이름은 같은 신원으로 취급돼요.' },
  ]},
];

const SHEET_MARKUP = `
  <div class="faq-grip" role="button" aria-label="닫기" tabindex="0"></div>
  <div class="faq-head">
    <h3>자주 묻는 질문</h3>
    <button class="faq-close" aria-label="닫기">✕</button>
  </div>
  <div class="faq-chips"></div>
  <div class="faq-list"></div>
`;

export function createFaq(mount) {
  const overlay = document.createElement('div');
  overlay.id = 'faq-overlay';
  overlay.className = 'faq-overlay';
  const sheet = document.createElement('section');
  sheet.className = 'faq-sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-label', '자주 묻는 질문');
  sheet.innerHTML = SHEET_MARKUP;
  overlay.appendChild(sheet);
  mount.appendChild(overlay);

  const chipsEl = sheet.querySelector('.faq-chips');
  const listEl  = sheet.querySelector('.faq-list');
  let active = FAQ_DATA[0].id;

  const renderChips = () => {
    chipsEl.innerHTML = FAQ_DATA.map(c =>
      `<button class="faq-chip${c.id === active ? ' on' : ''}" data-cat="${c.id}">${c.label}</button>`).join('');
  };
  const renderList = () => {
    const cat = FAQ_DATA.find(c => c.id === active);
    listEl.scrollTop = 0;
    listEl.innerHTML = cat.qs.map(item =>
      `<div class="faq-item">
         <button class="faq-q" type="button"><span class="qm">Q.</span><span>${item.q}</span><span class="cv">▾</span></button>
         <div class="faq-a"><p>${item.a}</p></div>
       </div>`).join('');
  };

  const open  = () => overlay.classList.add('show');
  const close = () => overlay.classList.remove('show');

  // 가이드('룰북') 상단의 진입 버튼([data-faq-open])을 누르면 시트가 열린다.
  document.addEventListener('click', e => { if (e.target.closest('[data-faq-open]')) open(); });
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  sheet.querySelector('.faq-close').addEventListener('click', close);
  const grip = sheet.querySelector('.faq-grip');
  grip.addEventListener('click', close);
  grip.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } });

  chipsEl.addEventListener('click', e => {
    const b = e.target.closest('.faq-chip'); if (!b) return;
    active = b.dataset.cat; renderChips(); renderList();
  });

  // 다른 질문을 누르면 이미 열린 질문은 자동으로 접힘(한 번에 하나만) — 시트 높이는 고정.
  listEl.addEventListener('click', e => {
    const btn = e.target.closest('.faq-q'); if (!btn) return;
    const item = btn.parentElement;
    const isOpen = item.classList.contains('open');
    listEl.querySelectorAll('.faq-item.open').forEach(o => {
      if (o !== item) { o.classList.remove('open'); o.querySelector('.faq-a').style.maxHeight = '0'; }
    });
    item.classList.toggle('open');
    const ans = item.querySelector('.faq-a');
    ans.style.maxHeight = isOpen ? '0' : ans.scrollHeight + 24 + 'px';
  });

  renderChips();
  renderList();
}
