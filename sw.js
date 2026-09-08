/* Service worker for "Rushika's Business".
   The app opens instantly and works with NO internet after the first visit.
   It only ever caches the app's own files — it never touches or transmits the
   business data, which lives in the browser's local storage on this device.

   Strategy:
   - The app page (index.html) is NETWORK-FIRST: when online, she always gets
     the newest version; when offline, it falls back to the cached copy. This is
     what makes edits actually show up instead of getting stuck on an old cache.
   - Icons/manifest are cache-first (they rarely change and load instantly).

   Bump CACHE_NAME whenever you deploy a new index.html. */
const CACHE_NAME = 'rushika-app-v19';
const ASSETS = [
  './',
  './index.html',
  './vendor-zxing.js',
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

function cachePut(req, res) {
  if (res && res.ok && new URL(req.url).origin === self.location.origin) {
    const copy = res.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
  }
  return res;
}

// Network-first with a short timeout so a flaky connection can't hang the app.
function networkFirst(req) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (r) => { if (!settled) { settled = true; resolve(r); } };
    const timer = setTimeout(() => {
      caches.match(req).then((c) => done(c || caches.match('./index.html')));
    }, 3500);
    fetch(req)
      .then((res) => { clearTimeout(timer); done(cachePut(req, res)); })
      .catch(() => {
        clearTimeout(timer);
        caches.match(req).then((c) => done(c || caches.match('./index.html')));
      });
  });
}

function cacheFirst(req) {
  return caches.match(req).then((cached) =>
    cached || fetch(req).then((res) => cachePut(req, res)).catch(() => undefined)
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isDoc = req.mode === 'navigate'
    || (url.origin === self.location.origin
        && (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')));
  event.respondWith(isDoc ? networkFirst(req) : cacheFirst(req));
});
