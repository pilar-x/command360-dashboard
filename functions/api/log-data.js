const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
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
    const stats = await env.DB.prepare('SELECT * FROM log_stats WHERE tenant_id = ?').bind(tenantId).all();
    return json({ ok: true, stats: stats.results });
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
    if (!body.key || !body.label || body.value === undefined) {
      return json({ error: 'Data tidak lengkap (perlu: key, label, value).' }, 400);
    }
    await env.DB.prepare(`
      INSERT INTO log_stats (stat_key, label, value, keterangan, tenant_id, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(stat_key) DO UPDATE SET
        label = excluded.label, value = excluded.value, keterangan = excluded.keterangan, updated_at = excluded.updated_at
    `).bind(body.key, body.label, body.value, body.keterangan || '', tenantId, Date.now()).run();
    return json({ ok: true });
  } catch (err) {
    return json({ error: 'Server error: ' + err.message }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}
