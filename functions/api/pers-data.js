/**
 * APMS COMMAND360 — API Data Staf Personel
 * GET    /api/pers-data       — ambil semua data (prestasi, pendidikan, stats, notes, records)
 * POST   /api/pers-data       — tambah/edit (body.type menentukan tabel tujuan)
 * DELETE /api/pers-data?type=X&id=Y — hapus 1 data
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
    const pendidikan = await env.DB.prepare('SELECT * FROM pers_pendidikan ORDER BY urutan').all();
    const stats = await env.DB.prepare('SELECT * FROM pers_stats').all();
    const notes = await env.DB.prepare('SELECT * FROM pers_notes ORDER BY section, updated_at').all();
    const records = await env.DB.prepare('SELECT * FROM pers_records ORDER BY updated_at DESC').all();
    return json({
      ok: true, prestasi: prestasi.results, pendidikan: pendidikan.results,
      stats: stats.results, notes: notes.results, records: records.results,
    });
  } catch (err) {
    return json({ error: 'Server error: ' + err.message }, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!checkAuth(request, env)) return json({ error: 'Unauthorized' }, 401);
  try {
    const body = await request.json();

    if (body.type === 'pendidikan') {
      if (!body.id || !body.nama_program) return json({ error: 'Data tidak lengkap.' }, 400);
      await env.DB.prepare(`
        INSERT INTO pers_pendidikan (id, nama_program, personel, urutan, updated_at) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET nama_program=excluded.nama_program, personel=excluded.personel, urutan=excluded.urutan, updated_at=excluded.updated_at
      `).bind(body.id, body.nama_program, body.personel || '', body.urutan ?? 0, Date.now()).run();
      return json({ ok: true });
    }

    if (body.type === 'stat') {
      if (!body.key || !body.label || body.value === undefined) return json({ error: 'Data tidak lengkap.' }, 400);
      await env.DB.prepare(`
        INSERT INTO pers_stats (stat_key, label, value, keterangan, updated_at) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(stat_key) DO UPDATE SET label=excluded.label, value=excluded.value, keterangan=excluded.keterangan, updated_at=excluded.updated_at
      `).bind(body.key, body.label, body.value, body.keterangan || '', Date.now()).run();
      return json({ ok: true });
    }

    if (body.type === 'note') {
      if (!body.id || !body.section || !body.judul) return json({ error: 'Data tidak lengkap.' }, 400);
      await env.DB.prepare(`
        INSERT INTO pers_notes (id, section, judul, isi, updated_at) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET section=excluded.section, judul=excluded.judul, isi=excluded.isi, updated_at=excluded.updated_at
      `).bind(body.id, body.section, body.judul, body.isi || '', Date.now()).run();
      return json({ ok: true });
    }

    if (body.type === 'record') {
      if (!body.id || !body.nama) return json({ error: 'Data tidak lengkap.' }, 400);
      await env.DB.prepare(`
        INSERT INTO pers_records (id, nama, nrp, jabatan, status, updated_at) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET nama=excluded.nama, nrp=excluded.nrp, jabatan=excluded.jabatan, status=excluded.status, updated_at=excluded.updated_at
      `).bind(body.id, body.nama, body.nrp || '', body.jabatan || '', body.status || '', Date.now()).run();
      return json({ ok: true });
    }

    // default: prestasi
    if (!body.id || !body.nama || !body.prestasi) return json({ error: 'Data tidak lengkap.' }, 400);
    await env.DB.prepare(`
      INSERT INTO pers_prestasi (id, nama, prestasi, keterangan, updated_at) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET nama=excluded.nama, prestasi=excluded.prestasi, keterangan=excluded.keterangan, updated_at=excluded.updated_at
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
    const type = url.searchParams.get('type');
    if (!id) return json({ error: 'Perlu parameter id.' }, 400);

    const tableMap = {
      pendidikan: 'pers_pendidikan', stat: 'pers_stats', note: 'pers_notes',
      record: 'pers_records', prestasi: 'pers_prestasi',
    };
    const table = tableMap[type] || 'pers_prestasi';
    const col = type === 'stat' ? 'stat_key' : 'id';
    await env.DB.prepare(`DELETE FROM ${table} WHERE ${col} = ?`).bind(id).run();
    return json({ ok: true });
  } catch (err) {
    return json({ error: 'Server error: ' + err.message }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}
