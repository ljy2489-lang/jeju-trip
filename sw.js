// 오프라인 대비: 앱 파일·지도 타일 모두 네트워크 우선, 실패하면 캐시
const APP = 'jeju-app-v2';
const TILES = 'jeju-tiles-v1';
const FILES = ['./', 'index.html', 'styles.css', 'app.js', 'schedule.js', 'storage.js', 'data/places.js', 'data/itinerary.js',
  'data/routes.js', 'assets/stickers.js', 'assets/icon.svg', 'manifest.json'];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(APP).then((c) => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => ![APP, TILES].includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim())));

async function networkFirst(req, cacheName, limit, revalidate) {
  try {
    // 앱 파일은 HTTP 캐시를 거치지 않고 서버에 재확인해야 수정 배포가 바로 반영된다
    const res = revalidate ? await fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }) : await fetch(req);
    if (res && (res.ok || res.type === 'opaque')) {
      const c = await caches.open(cacheName);
      c.put(req, res.clone());
      if (limit) { const ks = await c.keys(); if (ks.length > limit) c.delete(ks[0]); }
    }
    return res;
  } catch (err) {
    const hit = await caches.match(req);
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.hostname === 'tile.openstreetmap.org') e.respondWith(networkFirst(e.request, TILES, 600));
  else if (u.origin === location.origin) e.respondWith(networkFirst(e.request, APP, 0, true));
  else if (u.hostname === 'cdnjs.cloudflare.com' || u.hostname.endsWith('gstatic.com') || u.hostname === 'fonts.googleapis.com')
    e.respondWith(networkFirst(e.request, APP));
});
