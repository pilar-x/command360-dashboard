// ===== apms-sync.js =====
// Menyambungkan APMS ke server Cloudflare (Pages Functions + D1).
// localStorage tetap jadi sumber utama/langsung (offline-safe) — file ini
// menambahkan lapisan sinkronisasi ke server di belakang layar, tanpa
// mengubah cara kerja halaman scan yang sudah ada.

const APMS_API_BASE = 'https://command360-dashboard.pages.dev';
const APMS_API_KEY = '4UtsVLCtBUQnFnJgYNnjNne165k0Gmgj';

// ---- Kirim 1 event ke server. Kalau gagal (offline/error), simpan ke antrian ----
async function apmsPushEvent(event) {
  try {
    const res = await fetch(`${APMS_API_BASE}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': APMS_API_KEY },
      body: JSON.stringify(event),
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

function apmsQueuePending(event) {
  try {
    const queue = JSON.parse(localStorage.getItem('apms_pending_sync') || '[]');
    queue.push(event);
    localStorage.setItem('apms_pending_sync', JSON.stringify(queue.slice(-200)));
  } catch (e) { /* localStorage penuh/gagal — tidak fatal, event tetap ada di apms_events */ }
}

// ---- Coba kirim event; kalau gagal, masuk antrian utk dicoba lagi nanti ----
async function apmsSyncEvent(event) {
  const ok = await apmsPushEvent(event);
  if (!ok) apmsQueuePending(event);
  return ok;
}

// ---- Kirim ulang semua event yang tertunda di antrian (dipanggil saat online/buka halaman) ----
async function apmsFlushPending() {
  let queue = [];
  try { queue = JSON.parse(localStorage.getItem('apms_pending_sync') || '[]'); } catch (e) { return; }
  if (queue.length === 0) return;
  try {
    const res = await fetch(`${APMS_API_BASE}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': APMS_API_KEY },
      body: JSON.stringify(queue),
    });
    if (res.ok) localStorage.setItem('apms_pending_sync', '[]');
  } catch (e) { /* masih offline, coba lagi nanti */ }
}
window.addEventListener('online', apmsFlushPending);
document.addEventListener('DOMContentLoaded', apmsFlushPending);

// ---- Ambil event terbaru dari server ----
async function apmsFetchServerEvents(sinceTs) {
  try {
    const url = new URL(`${APMS_API_BASE}/api/events`);
    if (sinceTs) url.searchParams.set('since', String(sinceTs));
    url.searchParams.set('limit', '300');
    const res = await fetch(url, { headers: { 'X-API-Key': APMS_API_KEY } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.events || [];
  } catch (e) {
    return [];
  }
}

// ---- Gabungkan event dari server ke localStorage lokal (hindari duplikat) ----
async function apmsMergeServerEvents() {
  let local = [];
  try { local = JSON.parse(localStorage.getItem('apms_events') || '[]'); } catch (e) { local = []; }

  const server = await apmsFetchServerEvents();
  if (server.length === 0) return 0;

  const localKeys = new Set(local.map(e => `${e.ts}|${e.type}|${e.nama}`));
  const newFromServer = server
    .filter(e => !localKeys.has(`${e.ts}|${e.type}|${e.nama}`))
    .map(e => ({ ...e, fromServer: true })); // tandai asal server (opsional, utk debug)

  if (newFromServer.length > 0) {
    const merged = [...newFromServer, ...local]
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 500);
    localStorage.setItem('apms_events', JSON.stringify(merged));
  }
  return newFromServer.length;
}
