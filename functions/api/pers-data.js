/**
 * APMS COMMAND360 — API Data Staf Personel (Prestasi)
 * GET    /api/pers-data       — ambil semua data prestasi
 * POST   /api/pers-data       — tambah/edit 1 prestasi
 * DELETE /api/pers-data?id=X  — hapus 1 prestasi
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
    const prestasi = await env.DB.prepare('SELECT * FROM pers_prestasi ORDER BY updated_at DESC').all();
    return json({ ok: true, prestasi: prestasi.results });
  } catch (err) {
    return json({ error: 'Server error: ' + err.message }, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!checkAuth(request, env)) return json({ error: 'Unauthorized' }, 401);
  try {
    const body = await request.json();
    if (!body.id || !body.nama || !body.prestasi) {
      return json({ error: 'Data tidak lengkap (perlu: id, nama, prestasi).' }, 400);
    }
    await env.DB.prepare(`
      INSERT INTO pers_prestasi (id, nama, prestasi, keterangan, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        nama = excluded.nama, prestasi = excluded.prestasi, keterangan = excluded.keterangan, updated_at = excluded.updated_at
    `).bind(body.id, body.nama, body.prestasi, body.keterangan || '', Date.now()).run();
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
    await env.DB.prepare('DELETE FROM pers_prestasi WHERE id = ?').bind(id).run();
    return json({ ok: true });
  } catch (err) {
    return json({ error: 'Server error: ' + err.message }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}
