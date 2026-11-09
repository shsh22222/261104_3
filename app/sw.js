// オフラインでも開けるように、アプリ本体をキャッシュする。
// ファイルを追加・変更したら VERSION を上げる（tests/unit/sw.test.mjs が一覧の漏れを検出する）。
const VERSION = 'ma-v3';
const FONT_CACHE = 'ma-fonts';

const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/maskable-512.png',
  './js/main.js',
  './js/nav.js',
  './js/store.js',
  './js/audio.js',
  './js/ui.js',
  './js/theme.js',
  './js/content.js',
  './js/lib/day.js',
  './js/lib/ics.js',
  './js/lib/perception.js',
  './js/lib/rhythm.js',
  './js/lib/seasons.js',
  './js/lib/sky.js',
  './js/views/bells.js',
  './js/views/body.js',
  './js/views/breath.js',
  './js/views/breathewith.js',
  './js/views/clouds.js',
  './js/views/daily.js',
  './js/views/evening.js',
  './js/views/gate.js',
  './js/views/haiku.js',
  './js/views/home.js',
  './js/views/player.js',
  './js/views/practice.js',
  './js/views/presence.js',
  './js/views/prefs.js',
  './js/views/samu.js',
  './js/views/sky.js',
  './js/views/sos.js',
  './js/views/welcome.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== FONT_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Fonts: 一度読んだら手元に置く
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        const net = fetch(req)
          .then((res) => {
            if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || net;
      }),
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // 画面遷移は index.html を返す（オフラインでも開ける）
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('./index.html')));
    return;
  }

  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
