// Service Worker — APMS COMMAND360
// Cache-first untuk file inti app supaya tetap bisa dipakai walau sinyal putus-putus
// (penting untuk titik patroli / gerbang yang sinyalnya kadang lemah)

const CACHE_NAME = 'apms-cache-v1';
const CORE_FILES = [
  './apms-app.html',
  './apms-scan-gate.html',
  './apms-scan-checkpoint.html',
  './apms-scan-alat.html',
  './apms-scan-senjata.html',
  './manifest-apms.json',
  './icon-apms-192.png',
  './icon-apms-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_FILES)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Hanya tangani request GET dari origin sendiri (font Google tetap lewat jaringan seperti biasa)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && event.request.url.startsWith(self.location.origin)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached); // offline → pakai versi cache kalau ada

      // Cache-first untuk file inti, network-first untuk sisanya
      return cached || networkFetch;
    })
  );
});
