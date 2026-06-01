const CACHE = 'discipline-diary-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(cache => {
          if (e.request.url.startsWith(self.location.origin)) {
            cache.put(e.request, clone);
          }
        });
        return res;
      }).catch(() => cached);
    })
  );
});
