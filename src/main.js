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
  '<div id="screens">' +
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
  renderWaiting() +
  '</div>';

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
