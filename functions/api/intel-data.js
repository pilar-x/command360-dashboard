/**
 * APMS COMMAND360 — API Data Staf Intelijen
 * Semua data terisolasi per satuan (tenant_id).
 * GET    /api/intel-data?tenant_id=X
 * POST   /api/intel-data   (body wajib punya tenant_id)
 * DELETE /api/intel-data?type=X&id=Y&tenant_id=Z
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

    const stats = await env.DB.prepare('SELECT * FROM intel_stats WHERE tenant_id = ?').bind(tenantId).all();
    const violations = await env.DB.prepare('SELECT * FROM intel_violations WHERE tenant_id = ? ORDER BY tanggal DESC').bind(tenantId).all();
    const reports = await env.DB.prepare('SELECT * FROM intel_reports WHERE tenant_id = ? ORDER BY tanggal DESC').bind(tenantId).all();
    const incidents = await env.DB.prepare('SELECT * FROM intel_incidents WHERE tenant_id = ? ORDER BY waktu_kejadian DESC').bind(tenantId).all();
    const notes = await env.DB.prepare('SELECT * FROM intel_notes WHERE tenant_id = ? ORDER BY section, urutan').bind(tenantId).all();
    const accessRequests = await env.DB.prepare('SELECT * FROM intel_access_requests WHERE tenant_id = ? ORDER BY requested_at DESC').bind(tenantId).all();
    return json({ ok: true, stats: stats.results, violations: violations.results, reports: reports.results, incidents: incidents.results, notes: notes.results, accessRequests: accessRequests.results });
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

    if (body.type === 'stat') {
      if (!body.key || !body.label || body.value === undefined) {
        return json({ error: 'Data stat tidak lengkap (perlu: key, label, value).' }, 400);
      }
      await env.DB.prepare(`
        INSERT INTO intel_stats (stat_key, label, value, keterangan, tenant_id, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(stat_key) DO UPDATE SET
          label = excluded.label, value = excluded.value, keterangan = excluded.keterangan, updated_at = excluded.updated_at
      `).bind(body.key, body.label, body.value, body.keterangan || '', tenantId, Date.now()).run();
      return json({ ok: true });
    }

    if (body.type === 'violation') {
      if (!body.id || !body.nama) {
        return json({ error: 'Data pelanggaran tidak lengkap (perlu: id, nama).' }, 400);
      }
      await env.DB.prepare(`
        INSERT INTO intel_violations (id, nama, pangkat_nrp, satuan, jenis_pelanggaran, tanggal, status, keterangan, tindak_lanjut, dokumen, tenant_id, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          nama = excluded.nama, pangkat_nrp = excluded.pangkat_nrp, satuan = excluded.satuan,
          jenis_pelanggaran = excluded.jenis_pelanggaran, tanggal = excluded.tanggal, status = excluded.status,
          keterangan = excluded.keterangan, tindak_lanjut = excluded.tindak_lanjut, dokumen = excluded.dokumen,
          updated_at = excluded.updated_at
      `).bind(
        body.id, body.nama, body.pangkat_nrp || '', body.satuan || '', body.jenis_pelanggaran || '',
        body.tanggal || '', body.status || '', body.keterangan || '', body.tindak_lanjut || '', body.dokumen || '',
        tenantId, Date.now()
      ).run();
      return json({ ok: true });
    }

    if (body.type === 'report') {
      if (!body.id || !body.judul) {
        return json({ error: 'Data laporan tidak lengkap (perlu: id, judul).' }, 400);
      }
      await env.DB.prepare(`
        INSERT INTO intel_reports (id, judul, jenis, tanggal, pembuat, status, clearance, ringkasan, tenant_id, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          judul = excluded.judul, jenis = excluded.jenis, tanggal = excluded.tanggal, pembuat = excluded.pembuat,
          status = excluded.status, clearance = excluded.clearance, ringkasan = excluded.ringkasan, updated_at = excluded.updated_at
      `).bind(
        body.id, body.judul, body.jenis || '', body.tanggal || '', body.pembuat || '',
        body.status || '', body.clearance || '', body.ringkasan || '', tenantId, Date.now()
      ).run();
      return json({ ok: true });
    }

    if (body.type === 'incident') {
      if (!body.id || !body.judul) {
        return json({ error: 'Data kejadian tidak lengkap (perlu: id, judul).' }, 400);
      }
      await env.DB.prepare(`
        INSERT INTO intel_incidents (id, kode_kejadian, judul, lokasi, lat, lng, kategori, tingkat_ancaman, sumber, waktu_kejadian, ringkasan, clearance, tenant_id, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          kode_kejadian = excluded.kode_kejadian, judul = excluded.judul, lokasi = excluded.lokasi,
          lat = excluded.lat, lng = excluded.lng, kategori = excluded.kategori, tingkat_ancaman = excluded.tingkat_ancaman,
          sumber = excluded.sumber, waktu_kejadian = excluded.waktu_kejadian, ringkasan = excluded.ringkasan,
          clearance = excluded.clearance, updated_at = excluded.updated_at
      `).bind(
        body.id, body.kode_kejadian || '', body.judul, body.lokasi || '', body.lat ?? null, body.lng ?? null,
        body.kategori || '', body.tingkat_ancaman || '', body.sumber || '', body.waktu_kejadian || '',
        body.ringkasan || '', body.clearance || '', tenantId, Date.now()
      ).run();
      return json({ ok: true });
    }

    if (body.type === 'note') {
      if (!body.id || !body.section || !body.judul) {
        return json({ error: 'Data catatan tidak lengkap (perlu: id, section, judul).' }, 400);
      }
      await env.DB.prepare(`
        INSERT INTO intel_notes (id, section, judul, isi, urutan, tenant_id, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          section = excluded.section, judul = excluded.judul, isi = excluded.isi, urutan = excluded.urutan, updated_at = excluded.updated_at
      `).bind(body.id, body.section, body.judul, body.isi || '', body.urutan ?? 0, tenantId, Date.now()).run();
      return json({ ok: true });
    }

    if (body.type === 'access_request') {
      const id = `req-${Date.now()}`;
      await env.DB.prepare(`
        INSERT INTO intel_access_requests (id, requested_by_role, status, tenant_id, requested_at)
        VALUES (?, ?, 'pending', ?, ?)
      `).bind(id, body.requested_by_role || 'PASI PERS', tenantId, Date.now()).run();
      return json({ ok: true, id });
    }

    if (body.type === 'respond_access_request') {
      if (!body.id || !body.status) return json({ error: 'Data tidak lengkap.' }, 400);
      await env.DB.prepare(`
        UPDATE intel_access_requests SET status = ?, responded_at = ?, responded_by_role = ? WHERE id = ? AND tenant_id = ?
      `).bind(body.status, Date.now(), body.responded_by_role || '', body.id, tenantId).run();
      return json({ ok: true });
    }

    return json({ error: 'type harus "stat", "violation", "report", "incident", "note", "access_request", atau "respond_access_request".' }, 400);
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
    const tenantId = url.searchParams.get('tenant_id') || 'sat-897';
    if (!id) return json({ error: 'Perlu parameter id.' }, 400);

    if (type === 'violation') {
      await env.DB.prepare('DELETE FROM intel_violations WHERE id = ? AND tenant_id = ?').bind(id, tenantId).run();
    } else if (type === 'stat') {
      await env.DB.prepare('DELETE FROM intel_stats WHERE stat_key = ? AND tenant_id = ?').bind(id, tenantId).run();
    } else if (type === 'report') {
      await env.DB.prepare('DELETE FROM intel_reports WHERE id = ? AND tenant_id = ?').bind(id, tenantId).run();
    } else if (type === 'incident') {
      await env.DB.prepare('DELETE FROM intel_incidents WHERE id = ? AND tenant_id = ?').bind(id, tenantId).run();
    } else if (type === 'note') {
      await env.DB.prepare('DELETE FROM intel_notes WHERE id = ? AND tenant_id = ?').bind(id, tenantId).run();
    } else {
      return json({ error: 'type harus "stat", "violation", "report", "incident", atau "note".' }, 400);
    }
    return json({ ok: true });
  } catch (err) {
    return json({ error: 'Server error: ' + err.message }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}
