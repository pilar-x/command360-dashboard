/**
 * APMS COMMAND360 — API Data Staf Intelijen
 * GET    /api/intel-data                — ambil semua stats + violations
 * POST   /api/intel-data                — simpan 1 stat (body: {type:'stat', key, label, value, keterangan})
 *                                          atau 1 violation (body: {type:'violation', id, nama, ...})
 * DELETE /api/intel-data?type=violation&id=X — hapus 1 violation
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
    const stats = await env.DB.prepare('SELECT * FROM intel_stats').all();
    const violations = await env.DB.prepare('SELECT * FROM intel_violations ORDER BY tanggal DESC').all();
    const reports = await env.DB.prepare('SELECT * FROM intel_reports ORDER BY tanggal DESC').all();
    return json({ ok: true, stats: stats.results, violations: violations.results, reports: reports.results });
  } catch (err) {
    return json({ error: 'Server error: ' + err.message }, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!checkAuth(request, env)) return json({ error: 'Unauthorized' }, 401);

  try {
    const body = await request.json();

    if (body.type === 'stat') {
      if (!body.key || !body.label || body.value === undefined) {
        return json({ error: 'Data stat tidak lengkap (perlu: key, label, value).' }, 400);
      }
      await env.DB.prepare(`
        INSERT INTO intel_stats (stat_key, label, value, keterangan, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(stat_key) DO UPDATE SET
          label = excluded.label, value = excluded.value, keterangan = excluded.keterangan, updated_at = excluded.updated_at
      `).bind(body.key, body.label, body.value, body.keterangan || '', Date.now()).run();
      return json({ ok: true });
    }

    if (body.type === 'violation') {
      if (!body.id || !body.nama) {
        return json({ error: 'Data pelanggaran tidak lengkap (perlu: id, nama).' }, 400);
      }
      await env.DB.prepare(`
        INSERT INTO intel_violations (id, nama, pangkat_nrp, satuan, jenis_pelanggaran, tanggal, status, keterangan, tindak_lanjut, dokumen, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          nama = excluded.nama, pangkat_nrp = excluded.pangkat_nrp, satuan = excluded.satuan,
          jenis_pelanggaran = excluded.jenis_pelanggaran, tanggal = excluded.tanggal, status = excluded.status,
          keterangan = excluded.keterangan, tindak_lanjut = excluded.tindak_lanjut, dokumen = excluded.dokumen,
          updated_at = excluded.updated_at
      `).bind(
        body.id, body.nama, body.pangkat_nrp || '', body.satuan || '', body.jenis_pelanggaran || '',
        body.tanggal || '', body.status || '', body.keterangan || '', body.tindak_lanjut || '', body.dokumen || '',
        Date.now()
      ).run();
      return json({ ok: true });
    }

    if (body.type === 'report') {
      if (!body.id || !body.judul) {
        return json({ error: 'Data laporan tidak lengkap (perlu: id, judul).' }, 400);
      }
      await env.DB.prepare(`
        INSERT INTO intel_reports (id, judul, jenis, tanggal, pembuat, status, clearance, ringkasan, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          judul = excluded.judul, jenis = excluded.jenis, tanggal = excluded.tanggal, pembuat = excluded.pembuat,
          status = excluded.status, clearance = excluded.clearance, ringkasan = excluded.ringkasan, updated_at = excluded.updated_at
      `).bind(
        body.id, body.judul, body.jenis || '', body.tanggal || '', body.pembuat || '',
        body.status || '', body.clearance || '', body.ringkasan || '', Date.now()
      ).run();
      return json({ ok: true });
    }

    return json({ error: 'type harus "stat", "violation", atau "report".' }, 400);
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

    if (type === 'violation') {
      await env.DB.prepare('DELETE FROM intel_violations WHERE id = ?').bind(id).run();
    } else if (type === 'stat') {
      await env.DB.prepare('DELETE FROM intel_stats WHERE stat_key = ?').bind(id).run();
    } else if (type === 'report') {
      await env.DB.prepare('DELETE FROM intel_reports WHERE id = ?').bind(id).run();
    } else {
      return json({ error: 'type harus "stat", "violation", atau "report".' }, 400);
    }
    return json({ ok: true });
  } catch (err) {
    return json({ error: 'Server error: ' + err.message }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}
