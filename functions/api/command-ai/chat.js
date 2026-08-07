/**
 * COMMAND AI — Chat Endpoint (Gemini)
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

// Urutan model dari yang paling murah/cepat ke yang lebih kuat, semua masih aktif per Agustus 2026
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
    const { prompt } = body;
    if (!prompt || !prompt.trim()) {
      return json({ error: 'Prompt tidak boleh kosong.' }, 400);
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return json({ error: 'GEMINI_API_KEY belum diatur di Cloudflare (Settings → Environment Variables → tipe Secret).' }, 500);
    }

    const errors = [];
    for (const model of MODEL_FALLBACK_CHAIN) {
      try {
        const text = await callGemini(model, apiKey, prompt);
        return json({ ok: true, response: text, modelUsed: model });
      } catch (err) {
        errors.push(err.message);
      }
    }

    // Semua model di fallback chain gagal — kembalikan detail supaya bisa didiagnosa
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
