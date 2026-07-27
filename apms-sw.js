// Service Worker — APMS COMMAND360
// Cache-first untuk file inti app supaya tetap bisa dipakai walau sinyal putus-putus
// (penting untuk titik patroli / gerbang yang sinyalnya kadang lemah)

const CACHE_NAME = 'apms-cache-v3';
const CORE_FILES = [
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
  // Hanya tangani request GET dari origin sendiri
  if (event.request.method !== 'GET') return;

  // PENTING: untuk permintaan navigasi/dokumen HTML (buka halaman/masuk iframe),
  // biarkan Safari tangani langsung TANPA campur tangan Service Worker sama sekali.
  // Ini yang jadi sumber bug "Response served by service worker has redirections" di Safari —
  // menyerahkan ke browser langsung untuk jenis request ini menghindari bug itu di akarnya.
  if (event.request.mode === 'navigate' || event.request.destination === 'document' || event.request.destination === 'iframe') {
    return; // tidak respondWith() sama sekali → Safari/browser tangani seperti biasa
  }

  // Untuk aset statis (ikon, manifest, dll) — tetap cache-first seperti biasa
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.redirected) {
            response = new Response(response.body, {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
            });
          }
          if (response && response.status === 200 && event.request.url.startsWith(self.location.origin)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
