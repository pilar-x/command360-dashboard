/**
 * APMS COMMAND360 — Cloudflare Pages Function
 * File ini otomatis jadi endpoint API di: https://NAMA-SITE.pages.dev/api/events
 * (tidak perlu Wrangler/Node.js — cukup taruh file ini di folder functions/api/ di GitHub repo,
 *  lalu sambungkan repo ke Cloudflare Pages lewat Dashboard)
 *
 * Rute:
 *   GET  /api/events   — ambil daftar event (filter: since, type, nama, limit)
 *   POST /api/events   — kirim 1 atau banyak event (dari antrian offline)
 *
 * Autentikasi: header "X-API-Key" harus cocok dengan Environment Variable API_KEY
 * (diatur di Cloudflare Dashboard → Pages project → Settings → Environment variables).
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function checkAuth(request, env) {
  const key = request.headers.get('X-API-Key');
  return key && env.API_KEY && key === env.API_KEY;
}

// ===== GET /api/events =====
export async function onRequestGet(context) {
  const { request, env } = context;
  if (!checkAuth(request, env)) {
    return json({ error: 'Unauthorized — X-API-Key tidak cocok atau tidak ada.' }, 401);
  }

  const url = new URL(request.url);
  const since = url.searchParams.get('since');
  const type = url.searchParams.get('type');
  const nama = url.searchParams.get('nama');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '200', 10), 500);

  let query = 'SELECT * FROM apms_events WHERE 1=1';
  const params = [];
  if (since) { query += ' AND ts > ?'; params.push(parseInt(since, 10)); }
  if (type) { query += ' AND type = ?'; params.push(type); }
  if (nama) { query += ' AND nama LIKE ?'; params.push(`%${nama}%`); }
  query += ' ORDER BY ts DESC LIMIT ?';
  params.push(limit);

  try {
    const stmt = env.DB.prepare(query).bind(...params);
    const { results } = await stmt.all();
    return json({ ok: true, count: results.length, events: results });
  } catch (err) {
    return json({ error: 'Server error: ' + err.message }, 500);
  }
}

// ===== POST /api/events =====
export async function onRequestPost(context) {
  const { request, env } = context;
  if (!checkAuth(request, env)) {
    return json({ error: 'Unauthorized — X-API-Key tidak cocok atau tidak ada.' }, 401);
  }

  try {
    const body = await request.json();
    const events = Array.isArray(body) ? body : [body];
    if (events.length === 0) return json({ error: 'Tidak ada data event.' }, 400);
    if (events.length > 200) return json({ error: 'Maksimal 200 event per pengiriman.' }, 400);

    const stmt = env.DB.prepare(`
      INSERT INTO apms_events (type, nama, gate, arah, lokasi, alat, senjata, status, lat, lng, device_id, ts)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const batch = events.map((e) =>
      stmt.bind(
        e.type || null, e.nama || null, e.gate || null, e.arah || null,
        e.lokasi || null, e.alat || null, e.senjata || null, e.status || null,
        e.lat ?? null, e.lng ?? null, e.device_id || null, e.ts || Date.now()
      )
    );
    const results = await env.DB.batch(batch);
    return json({ ok: true, inserted: results.length });
  } catch (err) {
    return json({ error: 'Server error: ' + err.message }, 500);
  }
}

// ===== OPTIONS (CORS preflight) =====
export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}
