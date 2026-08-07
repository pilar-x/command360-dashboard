/**
 * COMMAND AI — Daily Brief Endpoint (Gemini)
 * Model 2.0-flash / 2.0-flash-lite DIMATIKAN Google per 1 Juni 2026.
 * Fallback chain diperbarui ke model yang masih aktif per Agustus 2026.
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

const MODEL_FALLBACK_CHAIN = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
];

async function callGemini(model, apiKey, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    const errMsg = data?.error?.message || `HTTP ${res.status}`;
    throw new Error(`[${model}] ${errMsg}`);
  }
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error(`[${model}] Respons kosong dari Gemini.`);
  return text;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const { context: briefContext } = body;

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return json({ error: 'GEMINI_API_KEY belum diatur di Cloudflare (Settings → Environment Variables → tipe Secret).' }, 500);
    }

    const prompt = `Anda adalah COMMAND AI, asisten internal dashboard komando batalyon TNI (COMMAND360). Semua data di bawah ini SUDAH DISEDIAKAN LANGSUNG oleh sistem dashboard internal satuan — Anda hanya bertugas meringkasnya, bukan mengakses sistem rahasia eksternal. Jangan menolak dengan alasan "tidak memiliki akses data rahasia".

Buatkan ringkasan situasi harian singkat (Command Brief) untuk Komandan Batalyon berdasarkan data berikut:\n\n${JSON.stringify(briefContext || {}, null, 2)}\n\nFormat: 3-4 poin ringkas mencakup Situasi Wilayah, Kesiapan Satuan, Personel, dan Logistik. Gunakan bahasa militer Indonesia yang profesional dan langsung, jangan menolak menjawab.`;

    const errors = [];
    for (const model of MODEL_FALLBACK_CHAIN) {
      try {
        const text = await callGemini(model, apiKey, prompt);
        return json({ ok: true, brief: text, modelUsed: model });
      } catch (err) {
        errors.push(err.message);
      }
    }

    return json({
      error: 'Semua model Gemini di fallback chain gagal merespons. Detail: ' + errors.join(' | '),
    }, 502);
  } catch (err) {
    return json({ error: 'Server error: ' + err.message }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}
