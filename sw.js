/* 공생관 서비스 워커
   - PWA 설치(홈 화면 추가)를 위한 최소 요건 충족
   - 우리 도메인의 정적 파일만 캐시하고, 외부 API(JSONBin·카카오맵·날씨·폰트 등)는 그대로 네트워크로 보냄
   - 알림을 눌렀을 때 앱 창을 포커스하거나 새로 여는 역할
*/
const CACHE_NAME = 'gongsaengwan-v2';
const CORE_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './manifest.json',
  './assets/club-emblem.png',
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

  // 네트워크 우선(network-first) 방식: 온라인이면 항상 최신 파일을 먼저 받아오고,
  // 그 결과로 캐시를 갱신합니다. 오프라인이거나 요청이 실패했을 때만 캐시를 사용합니다.
  // (예전의 "캐시 우선" 방식은 앱을 자주 업데이트하는 지금 같은 경우, 수정한 내용을 반영해도
  //  브라우저가 옛날 캐시를 계속 보여주는 문제가 있어서 방식을 바꿨습니다.)
  event.respondWith(
    fetch(req)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return networkResponse;
      })
      .catch(() => caches.match(req))
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
