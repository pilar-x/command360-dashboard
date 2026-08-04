/**
 * APMS COMMAND360 — API Data Staf Operasi
 * GET    /api/ops-data — ambil semua stats
 * POST   /api/ops-data — simpan 1 stat (body: {key, label, value, keterangan})
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
    const stats = await env.DB.prepare('SELECT * FROM ops_stats').all();
    const kegiatan = await env.DB.prepare('SELECT * FROM ops_kegiatan ORDER BY updated_at DESC').all();
    const notes = await env.DB.prepare('SELECT * FROM ops_notes ORDER BY section, updated_at').all();
    return json({ ok: true, stats: stats.results, kegiatan: kegiatan.results, notes: notes.results });
  } catch (err) {
    return json({ error: 'Server error: ' + err.message }, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!checkAuth(request, env)) return json({ error: 'Unauthorized' }, 401);
  try {
    const body = await request.json();

    if (body.type === 'kegiatan') {
      if (!body.id || !body.judul || !body.jenis) {
        return json({ error: 'Data kegiatan tidak lengkap (perlu: id, jenis, judul).' }, 400);
      }
      await env.DB.prepare(`
        INSERT INTO ops_kegiatan (id, jenis, judul, keterangan, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          jenis = excluded.jenis, judul = excluded.judul, keterangan = excluded.keterangan, updated_at = excluded.updated_at
      `).bind(body.id, body.jenis, body.judul, body.keterangan || '', Date.now()).run();
      return json({ ok: true });
    }

    if (body.type === 'note') {
      if (!body.id || !body.section || !body.judul) {
        return json({ error: 'Data catatan tidak lengkap (perlu: id, section, judul).' }, 400);
      }
      await env.DB.prepare(`
        INSERT INTO ops_notes (id, section, judul, isi, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          section = excluded.section, judul = excluded.judul, isi = excluded.isi, updated_at = excluded.updated_at
      `).bind(body.id, body.section, body.judul, body.isi || '', Date.now()).run();
      return json({ ok: true });
    }

    // default: stat
    if (!body.key || !body.label || body.value === undefined) {
      return json({ error: 'Data tidak lengkap (perlu: key, label, value).' }, 400);
    }
    await env.DB.prepare(`
      INSERT INTO ops_stats (stat_key, label, value, keterangan, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(stat_key) DO UPDATE SET
        label = excluded.label, value = excluded.value, keterangan = excluded.keterangan, updated_at = excluded.updated_at
    `).bind(body.key, body.label, body.value, body.keterangan || '', Date.now()).run();
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
    if (!id) return json({ error: 'Perlu parameter id.' }, 400);
    if (type === 'note') {
      await env.DB.prepare('DELETE FROM ops_notes WHERE id = ?').bind(id).run();
    } else {
      await env.DB.prepare('DELETE FROM ops_kegiatan WHERE id = ?').bind(id).run();
    }
    return json({ ok: true });
  } catch (err) {
    return json({ error: 'Server error: ' + err.message }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}
