const CACHE = 'discipline-diary-v2';
const STATIC_CACHE = 'discipline-diary-static-v2';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    Promise.all([
      clients.claim(),
      // Delete old caches
      caches.keys().then(keys =>
        Promise.all(keys.map(k => {
          if (k !== CACHE && k !== STATIC_CACHE) return caches.delete(k);
        }))
      ),
    ])
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  const isAsset = /\.(js|css|png|svg|ico|woff2?)$/.test(url.pathname);
  const isHTML = e.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/discipline-diary/' || url.pathname === '/discipline-diary';

  if (isAsset) {
    // Cache-first for versioned assets (hashed filenames)
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetchAndCache(e.request, STATIC_CACHE))
    );
  } else if (isHTML) {
    // Network-first for HTML (always try latest, fall back to cache offline)
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // Network-first for everything else (version.json, etc.)
    e.respondWith(
      fetch(e.request)
        .catch(() => caches.match(e.request))
    );
  }
});

function fetchAndCache(request, cacheName) {
  return fetch(request).then(res => {
    const clone = res.clone();
    caches.open(cacheName).then(cache => cache.put(request, clone));
    return res;
  });
}
