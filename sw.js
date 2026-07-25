/* Service worker for "Rushika's Business".
   Caches the app so it opens instantly and works with NO internet after the
   first visit. It only ever caches the app's own files — it never touches or
   transmits the business data, which lives in the browser's local storage on
   this device. Bump CACHE_NAME whenever you deploy a new index.html. */
const CACHE_NAME = 'rushika-app-v10';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          // Cache same-origin responses as we see them, so updates stick.
          if (res && res.ok && new URL(req.url).origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          // Offline and not cached: fall back to the app shell for page loads.
          req.mode === 'navigate' ? caches.match('./index.html') : undefined
        );
    })
  );
});
