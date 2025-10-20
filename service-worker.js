// service-worker.js - cache simples
const CACHE_NAME = 'limber-pos-cache-v1';
const OFFLINE_URL = '/';

self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll([
      '/',
      '/index.html',
      '/app.js',
      '/manifest.json'
    ]))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (evt) => {
  const req = evt.request;
  // Rede first for API calls, cache-first for shell
  if (req.method === 'GET' && req.destination !== 'document' && req.url.startsWith(self.location.origin)) {
    evt.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(req, res.clone());
          return res;
        });
      }).catch(() => cached))
    );
  } else {
    evt.respondWith(fetch(req).catch(() => caches.match('/')));
  }
});
