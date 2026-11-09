import { get } from './store.js';
import { unlockAudio, stopSpeech } from './audio.js';
import { applyTheme } from './theme.js';
import { TABS, currentRoute, rememberTab, setRenderHook } from './nav.js';
import { homeView } from './views/home.js';
import { breathView } from './views/breath.js';
import { practiceView, learnView } from './views/practice.js';
import { playerView } from './views/player.js';
import { dailyView, anchorsView } from './views/daily.js';
import { gateView } from './views/gate.js';
import { bellsView, bellView, bellSessionView } from './views/bells.js';
import { sosView, crisisView } from './views/sos.js';
import { haikuView } from './views/haiku.js';
import { samuView } from './views/samu.js';
import { eveningView } from './views/evening.js';
import { skyView } from './views/sky.js';
import { prefsView } from './views/prefs.js';
import { welcomeView } from './views/welcome.js';

// immersive: タブバーを隠し、画面いっぱいに使う
const ROUTES = {
  home: { view: homeView },
  practice: { view: practiceView },
  daily: { view: dailyView },
  sky: { view: skyView },
  learn: { view: learnView, tab: 'practice' },
  prefs: { view: prefsView, tab: 'home' },
  anchors: { view: anchorsView, tab: 'daily' },
  bells: { view: bellsView, tab: 'daily' },
  haiku: { view: haikuView, tab: 'daily' },
  samu: { view: samuView, tab: 'daily' },
  breath: { view: breathView, immersive: true },
  gate: { view: gateView, immersive: true },
  bell: { view: bellView, immersive: true },
  'bell-session': { view: bellSessionView, immersive: true },
  sos: { view: sosView, immersive: true },
  crisis: { view: crisisView, immersive: true },
  evening: { view: eveningView, immersive: true },
  welcome: { view: welcomeView, immersive: true },
  inquiry: { view: (root) => playerView(root, 'inquiry'), immersive: true },
};

const view = document.getElementById('view');
let cleanup = null;

function resolve(name) {
  if (ROUTES[name]) return ROUTES[name];
  const m = /^play-([a-z0-9-]+)$/.exec(name);
  if (m) return { view: (root) => playerView(root, m[1]), immersive: true };
  return null;
}

function render() {
  let name = currentRoute();
  // はじめての人には案内を。ただし #gate や #bell など、外から直接開かれた画面はそのまま。
  if (!get().onboarded && name === 'home') name = 'welcome';
  let route = resolve(name);
  if (!route) {
    name = 'home';
    route = ROUTES.home;
  }

  try {
    cleanup?.();
  } catch {
    /* noop */
  }
  cleanup = null;
  stopSpeech();
  document.body.classList.remove('is-void');
  view.replaceChildren();
  document.body.classList.toggle('immersive', !!route.immersive);
  document.body.dataset.route = name;

  rememberTab(name);
  const activeTab = TABS.includes(name) ? name : route.tab;
  document.querySelectorAll('.tabbar a').forEach((a) => {
    const on = a.dataset.tab === activeTab;
    a.classList.toggle('is-on', on);
    if (on) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });

  const result = route.view(view);
  cleanup = typeof result === 'function' ? result : null;
  window.scrollTo(0, 0);
  const heading = view.querySelector('h1');
  if (heading) heading.focus({ preventScroll: true });
}

setRenderHook(render);
window.addEventListener('hashchange', render);
// iOS は、利用者の最初の操作の中で音を解放する必要がある
window.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });

applyTheme();
render();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
