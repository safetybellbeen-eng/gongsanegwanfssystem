/* 공생관 서비스 워커
   - PWA 설치(홈 화면 추가)를 위한 최소 요건 충족
   - 우리 도메인의 정적 파일만 캐시하고, 외부 API(JSONBin·카카오맵·날씨·폰트 등)는 그대로 네트워크로 보냄
   - 알림을 눌렀을 때 앱 창을 포커스하거나 새로 여는 역할
*/
const CACHE_NAME = 'gongsaengwan-v59';
const CORE_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/01-core.js',
  './js/02-weather.js',
  './js/03-calendar.js',
  './js/04-ranking.js',
  './js/05-records.js',
  './js/06-venues.js',
  './js/07-admin.js',
  './js/08-map.js',
  './js/09-home.js',
  './js/10-attend-more.js',
  './js/11-notify.js',
  './js/12-matches.js',
  './js/13-tactics.js',
  './js/14-fit-diag-vote.js',
  './manifest.json',
  './assets/club-emblem.png',
  './assets/splash.jpg',
  './assets/home-hero.jpg',
  './assets/home-hero-v2.jpg',
  './assets/navermap.png',
  './assets/tmap.png',
  './assets/home-stadium.jpg',
  './assets/home-card-bg.jpg',
  './assets/home-team.jpg',
  './assets/login-logo.png',
  './assets/login-bg-mobile.jpg',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // GET 요청이 아니거나, 우리 도메인이 아닌 요청(외부 API 등)은 서비스 워커가 관여하지 않음
  if (req.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // 속도 최적화:
  //  - HTML(앱 화면)은 네트워크 우선(최대 2.5초 대기, 실패·지연 시 캐시)으로 항상 최신 버전을 감지합니다.
  //  - CSS/JS/이미지는 ?v= 버전이 붙어 있으므로 캐시 우선으로 즉시 불러오고, 뒤에서 조용히 갱신합니다.
  const isDoc = req.mode === 'navigate' || /\.html?$/.test(url.pathname) || url.pathname.endsWith('/');
  if (isDoc) {
    event.respondWith(
      new Promise((resolve) => {
        let done = false;
        const fromCache = () => caches.match(req).then((r) => r || caches.match('./index.html'));
        const timer = setTimeout(() => { if (!done) fromCache().then((r) => { if (r && !done) { done = true; resolve(r); } }); }, 2500);
        fetch(req).then((res) => {
          if (res && res.status === 200) { const c = res.clone(); caches.open(CACHE_NAME).then((cache) => cache.put(req, c)); }
          if (!done) { done = true; clearTimeout(timer); resolve(res); }
        }).catch(() => { if (!done) { clearTimeout(timer); fromCache().then((r) => { done = true; resolve(r || Response.error()); }); } });
      })
    );
    return;
  }
  event.respondWith(
    caches.match(req).then((cached) => {
      const net = fetch(req).then((res) => {
        if (res && res.status === 200) { const c = res.clone(); caches.open(CACHE_NAME).then((cache) => cache.put(req, c)); }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('./index.html');
    })
  );
});

// 서버에서 보내는 푸시(경기 알림)를 받아 표시합니다.
self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (_) { d = { body: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.registration.showNotification(d.title || '공생관 알림', {
    body: d.body || '',
    icon: './assets/icon-192.png',
    badge: './assets/icon-192.png',
    tag: 'match-alert',
    renotify: true
  }));
});
