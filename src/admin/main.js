import * as login     from './screens/login.js';
import * as dashboard from './screens/dashboard.js';
import * as settings  from './screens/settings.js';
import * as roster    from './screens/roster.js';

const SCREENS = { login, dashboard, settings, roster };
const app = document.getElementById('admin-app');

app.innerHTML = Object.values(SCREENS).map(s => s.render()).join('');
Object.values(SCREENS).forEach(s => s.init(goTo));

const AUTH_KEY = 'sr_admin_auth';

export function goTo(name) {
  for (const key of Object.keys(SCREENS)) {
    document.getElementById(`admin-${key}`).classList.toggle('active', key === name);
  }
  SCREENS[name].onShow?.();
}

goTo(sessionStorage.getItem(AUTH_KEY) === '1' ? 'dashboard' : 'login');
