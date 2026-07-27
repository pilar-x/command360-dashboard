/**
 * APMS COMMAND360 — API Kelola Checkpoint
 * GET    /api/checkpoints        — ambil semua checkpoint
 * POST   /api/checkpoints        — tambah/edit checkpoint (upsert berdasarkan id)
 * DELETE /api/checkpoints?id=CP1 — hapus checkpoint
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
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

export async function onRequestGet(context) {
  const { env } = context;
  try {
    const { results } = await env.DB.prepare('SELECT * FROM apms_checkpoints ORDER BY id').all();
    return json({ ok: true, checkpoints: results });
  } catch (err) {
    return json({ error: 'Server error: ' + err.message }, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!checkAuth(request, env)) {
    return json({ error: 'Unauthorized' }, 401);
  }
  try {
    const cp = await request.json();
    if (!cp.id || !cp.nama || cp.lat === undefined || cp.lng === undefined) {
      return json({ error: 'Data tidak lengkap (perlu: id, nama, lat, lng).' }, 400);
    }
    await env.DB.prepare(`
      INSERT INTO apms_checkpoints (id, nama, lat, lng, radius, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        nama = excluded.nama, lat = excluded.lat, lng = excluded.lng,
        radius = excluded.radius, updated_at = excluded.updated_at
    `).bind(cp.id, cp.nama, cp.lat, cp.lng, cp.radius || 100, Date.now()).run();
    return json({ ok: true });
  } catch (err) {
    return json({ error: 'Server error: ' + err.message }, 500);
  }
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  if (!checkAuth(request, env)) {
    return json({ error: 'Unauthorized' }, 401);
  }
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return json({ error: 'Perlu parameter id.' }, 400);
    await env.DB.prepare('DELETE FROM apms_checkpoints WHERE id = ?').bind(id).run();
    return json({ ok: true });
  } catch (err) {
    return json({ error: 'Server error: ' + err.message }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}
