const VERSION = 'v1';
const cacheName = `gammaray${VERSION}`;

var filesToCache = [
  '/sw.js',
  '/uv/uv.bundle.js',
  '/uv/uv.client.js',
  '/uv/uv.handler.js',
  '/uv/uv.sw.js',
  '/scripts',
  '/cloak.js',
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(cacheName).then(function (cache) {
      return cache.addAll(filesToCache);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keyList) {
      return Promise.all(
        keyList.map(function (key) {
          if (key.startsWith('UBX') && key !== cacheName) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  e.respondWith(
    caches.match(e.request).then(function (response) {
      return response || fetch(e.request);
    })
  );
});
