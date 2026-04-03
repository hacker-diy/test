const CACHE_VERSION = 'image-randomizer-v20-force-start1-20260331d';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;


  if (url.pathname.includes('/remote-presets/')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_VERSION);
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        if (fresh && fresh.ok) {
          await cache.put(req, fresh.clone());
        }
        return fresh;
      } catch (err) {
        return (await caches.match(req)) || new Response('', { status: 504, statusText: 'Gateway Timeout' });
      }
    })());
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) {
          const cache = await caches.open(CACHE_VERSION);
          await cache.put('./index.html', fresh.clone());
        }
        return fresh;
      } catch (err) {
        return (await caches.match('./index.html')) || (await caches.match('./'));
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: true });
    const networkPromise = fetch(req).then(async (response) => {
      if (response && response.ok) {
        const cache = await caches.open(CACHE_VERSION);
        cache.put(req, response.clone());
      }
      return response;
    }).catch(() => cached);

    return cached || networkPromise;
  })());
});
