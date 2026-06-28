import { goToScreen } from './utils/nav.js';
import { render as renderName, init as initName }               from './screens/name.js';
import { render as renderCard, init as initCard }              from './screens/card.js';
import { render as renderRole, init as initRole }              from './screens/role.js';
import { render as renderDash, init as initDash }               from './screens/dash.js';
import { render as renderBolt, init as initBolt }               from './screens/bolt.js';
import { render as renderBoltJoin, init as initBoltJoin }       from './screens/bolt-join.js';
import { render as renderBoltDetail, init as initBoltDetail }   from './screens/bolt-detail.js';
import { render as renderBoltBuff, init as initBoltBuff }       from './screens/bolt-buff.js';
import { render as renderBoltResult, init as initBoltResult }   from './screens/bolt-result.js';
import { render as renderVote, init as initVote }               from './screens/vote.js';
import { render as renderMembers, init as initMembers }         from './screens/members.js';
import { render as renderGuide, init as initGuide }             from './screens/guide.js';
import { render as renderSettings, init as initSettings }       from './screens/settings.js';
import { render as renderWaiting, init as initWaiting }         from './screens/waiting.js';

document.getElementById('app').innerHTML =
  renderName() +
  renderCard() +
  renderRole() +
  renderDash() +
  renderBolt() +
  renderBoltJoin() +
  renderBoltDetail() +
  renderBoltBuff() +
  renderBoltResult() +
  renderVote() +
  renderMembers() +
  renderGuide() +
  renderSettings() +
  renderWaiting();

initName();
initCard();
initRole();
initDash();
initBolt();
initBoltJoin();
initBoltDetail();
initBoltBuff();
initBoltResult();
initVote();
initMembers();
initGuide();
initSettings();
initWaiting();

// 전역 탭바 — 단일 요소, 화면 전환 시 고정
const tabbarEl = document.createElement('div');
tabbarEl.id = 'global-tabbar';
tabbarEl.className = 'tabbar';
tabbarEl.style.cssText = 'display:none;';
tabbarEl.innerHTML = `
  <div class="tab" data-tab="home"><div class="tab-icon"><span class="ti-home-dot"></span></div><span>홈</span></div>
  <div class="tab" data-tab="bolt"><div class="tab-icon"><span class="ti-bolt"></span></div><span>번개</span></div>
  <div class="tab" data-tab="vote"><div class="tab-icon"><span class="ti-vote"></span></div><span>투표</span></div>
  <div class="tab" data-tab="members"><div class="tab-icon"><span class="ti-users"></span></div><span>참가자</span></div>
  <div class="tab" data-tab="guide"><div class="tab-icon"><span class="ti-book"></span></div><span>가이드</span></div>
`;
const TAB_SCREEN_MAP = { home: 's-dash', bolt: 's-bolt', vote: 's-vote', members: 's-members', guide: 's-guide' };
tabbarEl.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => goToScreen(TAB_SCREEN_MAP[tab.dataset.tab]));
});
document.getElementById('app').appendChild(tabbarEl);

// ── 임시 진단 (어느 방식이 화면 바닥에 닿는지 측정) ──
(function debugProbe() {
  // fixed bottom:0 프로브 (파랑)
  const pf = document.createElement('div');
  pf.style.cssText = 'position:fixed; bottom:0; left:0; width:40px; height:4px; background:#0af; z-index:99998;';
  document.body.appendChild(pf);
  // absolute bottom:0 (body 기준) 프로브 (초록)
  const pa = document.createElement('div');
  pa.style.cssText = 'position:absolute; bottom:0; right:0; width:40px; height:4px; background:#0f0; z-index:99998;';
  document.body.appendChild(pa);

  function read() {
    const SH = window.screen.height;
    return [
      'screenH=' + SH,
      'innerH=' + window.innerHeight,
      'docClientH=' + document.documentElement.clientHeight,
      'bodyH=' + Math.round(document.body.getBoundingClientRect().height),
      'FIXEDbottom=' + Math.round(pf.getBoundingClientRect().bottom),
      'ABSbottom=' + Math.round(pa.getBoundingClientRect().bottom),
      'standalone=' + (navigator.standalone === true),
    ].join(' · ');
  }
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed; left:0; right:0; bottom:0; z-index:99999;' +
    'background:#ff2d55; color:#fff; font:600 10px/1.5 monospace; padding:6px 8px;' +
    'white-space:pre-wrap; text-align:center; pointer-events:none;';
  document.body.appendChild(d);
  const tick = () => { d.textContent = read(); };
  tick();
  setTimeout(tick, 300);
  window.addEventListener('resize', tick);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', tick);
})();
