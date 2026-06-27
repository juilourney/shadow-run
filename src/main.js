import { render as renderName, init as initName }               from './screens/name.js';
import { render as renderCard, init as initCard }               from './screens/card.js';
import { render as renderRole, init as initRole }               from './screens/role.js';
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
  renderSettings();

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
