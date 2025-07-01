
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open('absensi-cache').then(function(cache) {
      return cache.addAll([
        '/',
        '/index.html',
        '/css/style.css',
        '/js/script.js',
        '/manifest.json',
        '/assets/icon-192.png',
        '/assets/icon-512.png'
      ]);
    })
  );
});

self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request).then(function(response) {
      return response || fetch(e.request);
    })
  );
});
