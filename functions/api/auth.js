/**
 * API Autentikasi — Login Satuan (Tenant) & Verifikasi Password Role
 * POST /api/auth  { action: 'login', username, password }
 * POST /api/auth  { action: 'verify_role', tenant_id, role, password }
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();

    if (body.action === 'login') {
      const { username, password } = body;
      if (!username || !password) return json({ error: 'Username dan password wajib diisi.' }, 400);

      const tenant = await env.DB.prepare(
        'SELECT * FROM satuan_tenants WHERE username = ? AND password = ?'
      ).bind(username, password).first();

      if (!tenant) return json({ error: 'Username atau password salah.' }, 401);

      return json({
        ok: true,
        tenant: {
          id: tenant.id,
          namaLengkap: tenant.nama_lengkap,
          namaSingkat: tenant.nama_singkat,
          motto: tenant.motto,
          kodam: tenant.kodam,
          brigif: tenant.brigif,
          korem: tenant.korem,
          kedudukan: tenant.kedudukan,
        },
      });
    }

    if (body.action === 'verify_role') {
      const { tenant_id, role, password } = body;
      if (!tenant_id || !role || !password) return json({ error: 'Data tidak lengkap.' }, 400);

      const match = await env.DB.prepare(
        'SELECT id FROM role_passwords WHERE tenant_id = ? AND role = ? AND password = ?'
      ).bind(tenant_id, role, password).first();

      if (!match) return json({ error: 'Password role salah.' }, 401);
      return json({ ok: true });
    }

    return json({ error: 'action harus "login" atau "verify_role".' }, 400);
  } catch (err) {
    return json({ error: 'Server error: ' + err.message }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}
