/**
 * API Data Senjata & Munisi (Staf Logistik)
 * GET    /api/log-senjata?tenant_id=X
 * POST   /api/log-senjata   (body wajib punya tenant_id)
 * DELETE /api/log-senjata?id=X&tenant_id=Y
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
  const { request, env } = context;
  try {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenant_id') || 'sat-897';
    const items = await env.DB.prepare('SELECT * FROM log_senjata_munisi WHERE tenant_id = ? ORDER BY kategori, urutan').bind(tenantId).all();
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
    const tenantId = body.tenant_id || 'sat-897';
    if (!body.id || !body.nama || !body.kategori) {
      return json({ error: 'Data tidak lengkap (perlu: id, kategori, nama).' }, 400);
    }
    await env.DB.prepare(`
      INSERT INTO log_senjata_munisi (id, kategori, nama, top, nyata, urutan, tenant_id, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        kategori = excluded.kategori, nama = excluded.nama, top = excluded.top,
        nyata = excluded.nyata, urutan = excluded.urutan, updated_at = excluded.updated_at
    `).bind(body.id, body.kategori, body.nama, body.top ?? '', body.nyata ?? '', body.urutan ?? 0, tenantId, Date.now()).run();
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
    const tenantId = url.searchParams.get('tenant_id') || 'sat-897';
    if (!id) return json({ error: 'Perlu parameter id.' }, 400);
    await env.DB.prepare('DELETE FROM log_senjata_munisi WHERE id = ? AND tenant_id = ?').bind(id, tenantId).run();
    return json({ ok: true });
  } catch (err) {
    return json({ error: 'Server error: ' + err.message }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}
