/**
 * Command AI — Chat, terhubung ke Google Gemini
 * POST /api/command-ai/chat
 * Body: { prompt, context: { metrics, role } }
 * Perlu env GEMINI_API_KEY di Cloudflare Dashboard (Settings > Environment Variables)
 *
 * Otomatis mencoba beberapa model secara berurutan kalau salah satu gagal
 * (misal karena jatah gratis model tersebut 0), supaya tidak perlu diedit manual tiap kali.
 */

const MODEL_CANDIDATES = [
  'gemini-2.0-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-flash-latest',
];

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

async function tryGenerateContent(apiKey, systemInstruction, prompt) {
  const errors = [];
  for (const model of MODEL_CANDIDATES) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: { parts: [{ text: systemInstruction }] },
            generationConfig: { temperature: 0.3 },
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return { ok: true, text, modelUsed: model };
      }
      const errText = await res.text();
      errors.push(`${model}: ${errText.slice(0, 200)}`);
    } catch (e) {
      errors.push(`${model}: ${e.message}`);
    }
  }
  return { ok: false, errors };
}

export async function onRequestGet(context) {
  const { env } = context;
  if (!env.GEMINI_API_KEY) return json({ error: 'GEMINI_API_KEY belum diatur.' }, 400);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${env.GEMINI_API_KEY}`);
    const data = await res.json();
    if (!res.ok) return json({ error: 'Gagal ambil daftar model: ' + JSON.stringify(data) }, 502);
    const models = (data.models || [])
      .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map(m => m.name);
    return json({ ok: true, availableModels: models, modelCandidatesInUse: MODEL_CANDIDATES });
  } catch (err) {
    return json({ error: 'Server error: ' + err.message }, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const { prompt, context: ctx } = body;

    if (!prompt) return json({ error: 'Prompt wajib diisi.' }, 400);

    if (!env.GEMINI_API_KEY) {
      return json({
        response: `[MODE DEMO / API KEY BELUM DIATUR] Pertanyaan Anda: "${prompt}" telah diterima. Berdasarkan data fusion Intelijen, Operasi, Personel, dan Logistik terkini, kondisi kesiapan satuan secara keseluruhan berada pada angka **91.8% (SIAP TINGGI)**. Untuk analisis AI sungguhan, tambahkan GEMINI_API_KEY di pengaturan Cloudflare.`,
        timestamp: new Date().toISOString(),
        model: 'demo-mode',
      });
    }

    const systemInstruction = `Anda adalah COMMAND AI - Asisten Intelijen & Kepemimpinan Eksekutif untuk Sistem COMMAND360 (Pusat Komando & Informasi Staf Terpadu Batalyon TNI AD).
Peran pengguna saat ini: ${ctx?.role || 'Pimpinan Eksekutif / Komandan'}.
Konteks data fusion COMMAND360 (gunakan sebagai bahan analisis, JANGAN sekadar mengulang angka mentah):
${ctx?.metrics ? JSON.stringify(ctx.metrics) : 'Semua staf (Intelijen, Operasi, Personel, Logistik) dalam kondisi Siap Sedia.'}

Pedoman Jawaban:
1. Jawab dalam bahasa Indonesia yang ringkas, tegas, terstruktur, profesional, bergaya militer/eksekutif.
2. Sertakan label "[AI GENERATED - VERIFIKASI PIMPINAN DIBUTUHKAN]" pada rekomendasi/analisis taktis.
3. Gunakan poin-poin tebal untuk kemudahan dibaca pimpinan.
4. Jangan mengarang data spesifik (nama personel, angka pasti) yang tidak ada di konteks — jika tidak tahu, katakan perlu verifikasi staf terkait.`;

    const result = await tryGenerateContent(env.GEMINI_API_KEY, systemInstruction, prompt);

    if (!result.ok) {
      return json({ error: 'Semua model Gemini gagal dicoba: ' + result.errors.join(' | ') }, 502);
    }

    return json({ response: result.text, timestamp: new Date().toISOString(), model: result.modelUsed });
  } catch (err) {
    return json({ error: 'Server error: ' + err.message }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}
