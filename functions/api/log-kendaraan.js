/**
 * API Data Materiil Logistik: Kendaraan/Alkapsat/Alkom, Ketahanan Pangan, Alkapsus, Materiil
 * Semua data terisolasi per satuan (tenant_id).
 * GET    /api/log-kendaraan?tenant_id=X
 * POST   /api/log-kendaraan   (body.type: 'kendaraan-alkapsat-alkom' default, 'pangan', 'alkapsus', 'materiil'; wajib tenant_id)
 * DELETE /api/log-kendaraan?type=X&id=Y&tenant_id=Z
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

    const items = await env.DB.prepare('SELECT * FROM log_kendaraan WHERE tenant_id = ? ORDER BY kategori, urutan').bind(tenantId).all();
    const pangan = await env.DB.prepare('SELECT * FROM log_pangan WHERE tenant_id = ? ORDER BY kategori, urutan').bind(tenantId).all();
    const alkapsus = await env.DB.prepare('SELECT * FROM log_alkapsus WHERE tenant_id = ? ORDER BY urutan').bind(tenantId).all();
    const materiil = await env.DB.prepare('SELECT * FROM log_materiil WHERE tenant_id = ? ORDER BY updated_at DESC').bind(tenantId).all();
    return json({ ok: true, items: items.results, pangan: pangan.results, alkapsus: alkapsus.results, materiil: materiil.results });
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

    if (body.type === 'pangan') {
      if (!body.id || !body.nama || !body.kategori) return json({ error: 'Data tidak lengkap.' }, 400);
      await env.DB.prepare(`
        INSERT INTO log_pangan (id, kategori, nama, jumlah, persen, progres, urutan, tenant_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET kategori=excluded.kategori, nama=excluded.nama, jumlah=excluded.jumlah, persen=excluded.persen, progres=excluded.progres, urutan=excluded.urutan, updated_at=excluded.updated_at
      `).bind(body.id, body.kategori, body.nama, body.jumlah || '', body.persen || '', body.progres || '', body.urutan ?? 0, tenantId, Date.now()).run();
      return json({ ok: true });
    }

    if (body.type === 'alkapsus') {
      if (!body.id || !body.nama) return json({ error: 'Data tidak lengkap.' }, 400);
      await env.DB.prepare(`
        INSERT INTO log_alkapsus (id, nama, sat, jumlah, urutan, tenant_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET nama=excluded.nama, sat=excluded.sat, jumlah=excluded.jumlah, urutan=excluded.urutan, updated_at=excluded.updated_at
      `).bind(body.id, body.nama, body.sat || '', body.jumlah || '', body.urutan ?? 0, tenantId, Date.now()).run();
      return json({ ok: true });
    }

    if (body.type === 'materiil') {
      if (!body.id || !body.nama) return json({ error: 'Data tidak lengkap.' }, 400);
      await env.DB.prepare(`
        INSERT INTO log_materiil (id, nama, kategori, kondisi, tenant_id, updated_at) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET nama=excluded.nama, kategori=excluded.kategori, kondisi=excluded.kondisi, updated_at=excluded.updated_at
      `).bind(body.id, body.nama, body.kategori || '', body.kondisi || '', tenantId, Date.now()).run();
      return json({ ok: true });
    }

    // default: kendaraan/alkapsat/alkom
    if (!body.id || !body.nama || !body.kategori) return json({ error: 'Data tidak lengkap.' }, 400);
    await env.DB.prepare(`
      INSERT INTO log_kendaraan (id, kategori, nama, sat, top, jumlah, urutan, tenant_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET kategori=excluded.kategori, nama=excluded.nama, sat=excluded.sat, top=excluded.top, jumlah=excluded.jumlah, urutan=excluded.urutan, updated_at=excluded.updated_at
    `).bind(body.id, body.kategori, body.nama, body.sat ?? '', body.top ?? '', body.jumlah ?? '', body.urutan ?? 0, tenantId, Date.now()).run();
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
    const type = url.searchParams.get('type');
    const tenantId = url.searchParams.get('tenant_id') || 'sat-897';
    if (!id) return json({ error: 'Perlu parameter id.' }, 400);

    const tableMap = { pangan: 'log_pangan', alkapsus: 'log_alkapsus', materiil: 'log_materiil' };
    const table = tableMap[type] || 'log_kendaraan';
    await env.DB.prepare(`DELETE FROM ${table} WHERE id = ? AND tenant_id = ?`).bind(id, tenantId).run();
    return json({ ok: true });
  } catch (err) {
    return json({ error: 'Server error: ' + err.message }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}
