/**
 * API Data Profil Satuan
 * GET    /api/satuan-data       — ambil semua catatan
 * POST   /api/satuan-data       — tambah/edit (body: {id, section, judul, isi, urutan})
 * DELETE /api/satuan-data?id=X  — hapus
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
    const notes = await env.DB.prepare('SELECT * FROM satuan_notes ORDER BY section, urutan').all();
    return json({ ok: true, notes: notes.results });
  } catch (err) {
    return json({ error: 'Server error: ' + err.message }, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!checkAuth(request, env)) return json({ error: 'Unauthorized' }, 401);
  try {
    const body = await request.json();
    if (!body.id || !body.section || !body.judul) return json({ error: 'Data tidak lengkap.' }, 400);
    await env.DB.prepare(`
      INSERT INTO satuan_notes (id, section, judul, isi, urutan, updated_at) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET section=excluded.section, judul=excluded.judul, isi=excluded.isi, urutan=excluded.urutan, updated_at=excluded.updated_at
    `).bind(body.id, body.section, body.judul, body.isi || '', body.urutan ?? 0, Date.now()).run();
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
    await env.DB.prepare('DELETE FROM satuan_notes WHERE id = ?').bind(id).run();
    return json({ ok: true });
  } catch (err) {
    return json({ error: 'Server error: ' + err.message }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}
