/**
 * API Data Staf Teritorial (Komsos & Bakti TNI)
 * GET    /api/terit-data — ambil semua data komsos + bakti TNI
 * POST   /api/terit-data — tambah/edit (body: {type:'komsos'|'bakti', ...})
 * DELETE /api/terit-data?type=komsos|bakti&id=X — hapus
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
    const komsos = await env.DB.prepare('SELECT * FROM terit_komsos ORDER BY updated_at DESC').all();
    const bakti = await env.DB.prepare('SELECT * FROM terit_bakti_tni ORDER BY updated_at DESC').all();
    return json({ ok: true, komsos: komsos.results, bakti: bakti.results });
  } catch (err) {
    return json({ error: 'Server error: ' + err.message }, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!checkAuth(request, env)) return json({ error: 'Unauthorized' }, 401);
  try {
    const body = await request.json();

    if (body.type === 'komsos') {
      if (!body.id || !body.nama_tokoh) return json({ error: 'Data tidak lengkap (perlu: id, nama_tokoh).' }, 400);
      await env.DB.prepare(`
        INSERT INTO terit_komsos (id, nama_tokoh, jabatan_role, wilayah_binaan, satuan_pembina, status_jaringan, keterangan, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          nama_tokoh=excluded.nama_tokoh, jabatan_role=excluded.jabatan_role, wilayah_binaan=excluded.wilayah_binaan,
          satuan_pembina=excluded.satuan_pembina, status_jaringan=excluded.status_jaringan, keterangan=excluded.keterangan, updated_at=excluded.updated_at
      `).bind(body.id, body.nama_tokoh, body.jabatan_role || '', body.wilayah_binaan || '', body.satuan_pembina || '', body.status_jaringan || '', body.keterangan || '', Date.now()).run();
      return json({ ok: true });
    }

    if (body.type === 'bakti') {
      if (!body.id || !body.nama_kegiatan) return json({ error: 'Data tidak lengkap (perlu: id, nama_kegiatan).' }, 400);
      await env.DB.prepare(`
        INSERT INTO terit_bakti_tni (id, nama_kegiatan, kategori, lokasi, sub_kompi_pelaksana, target_progres, masyarakat_terlibat, status, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          nama_kegiatan=excluded.nama_kegiatan, kategori=excluded.kategori, lokasi=excluded.lokasi,
          sub_kompi_pelaksana=excluded.sub_kompi_pelaksana, target_progres=excluded.target_progres,
          masyarakat_terlibat=excluded.masyarakat_terlibat, status=excluded.status, updated_at=excluded.updated_at
      `).bind(body.id, body.nama_kegiatan, body.kategori || '', body.lokasi || '', body.sub_kompi_pelaksana || '', body.target_progres ?? 0, body.masyarakat_terlibat ?? 0, body.status || '', Date.now()).run();
      return json({ ok: true });
    }

    return json({ error: 'type harus "komsos" atau "bakti".' }, 400);
  } catch (err) {
    return json({ error: 'Server error: ' + err.message }, 500);
  }
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  if (!checkAuth(request, env)) return json({ error: 'Unauthorized' }, 401);
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const id = url.searchParams.get('id');
    if (!id) return json({ error: 'Perlu parameter id.' }, 400);
    if (type === 'komsos') await env.DB.prepare('DELETE FROM terit_komsos WHERE id = ?').bind(id).run();
    else if (type === 'bakti') await env.DB.prepare('DELETE FROM terit_bakti_tni WHERE id = ?').bind(id).run();
    else return json({ error: 'type harus "komsos" atau "bakti".' }, 400);
    return json({ ok: true });
  } catch (err) {
    return json({ error: 'Server error: ' + err.message }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}
