const CACHE_NAME = 'jorat-v1';

// Assets to pre-cache on install (app shell)
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
];

// Install: pre-cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

// Activate: remove old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - API calls (/api/*) → network only (never cache)
// - Static assets (JS, CSS, images) → cache first, then network
// - Navigation requests → network first, fallback to cached index.html
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== 'GET' || url.origin !== location.origin) return;

  // API calls: network only
  if (url.pathname.startsWith('/api/')) return;

  // Static assets: cache first
  if (/\.(js|css|png|jpg|jpeg|svg|ico|woff2?|ttf)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) => cached || fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
      )
    );
    return;
  }

  // Navigation (HTML): network first, fallback to cached index.html for offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
  }
});
