/**
 * API Data Kendaraan, Alkapsat & Alkom (Staf Logistik)
 * GET    /api/log-kendaraan       — ambil semua data
 * POST   /api/log-kendaraan       — tambah/edit 1 item (body: {id, kategori:'kendaraan'|'alkapsat'|'alkom', nama, sat, top, jumlah, urutan})
 * DELETE /api/log-kendaraan?id=X  — hapus 1 item
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
  'Access-Control-Max-Age': '86400',
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

export async function onRequestGet(context) {
  const { env } = context;
  try {
    const items = await env.DB.prepare('SELECT * FROM log_kendaraan ORDER BY kategori, urutan').all();
    return json({ ok: true, items: items.results });
  } catch (err) {
    return json({ error: 'Server error: ' + err.message }, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!checkAuth(request, env)) return json({ error: 'Unauthorized' }, 401);
  try {
    const body = await request.json();
    if (!body.id || !body.nama || !body.kategori) {
      return json({ error: 'Data tidak lengkap (perlu: id, kategori, nama).' }, 400);
    }
    await env.DB.prepare(`
      INSERT INTO log_kendaraan (id, kategori, nama, sat, top, jumlah, urutan, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        kategori = excluded.kategori, nama = excluded.nama, sat = excluded.sat, top = excluded.top,
        jumlah = excluded.jumlah, urutan = excluded.urutan, updated_at = excluded.updated_at
    `).bind(body.id, body.kategori, body.nama, body.sat ?? '', body.top ?? '', body.jumlah ?? '', body.urutan ?? 0, Date.now()).run();
    return json({ ok: true });
  } catch (err) {
    return json({ error: 'Server error: ' + err.message }, 500);
  }
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  if (!checkAuth(request, env)) return json({ error: 'Unauthorized' }, 401);
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return json({ error: 'Perlu parameter id.' }, 400);
    await env.DB.prepare('DELETE FROM log_kendaraan WHERE id = ?').bind(id).run();
    return json({ ok: true });
  } catch (err) {
    return json({ error: 'Server error: ' + err.message }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}
