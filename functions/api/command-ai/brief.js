/**
 * Command AI — Generator Ringkasan Eksekutif (Brief), terhubung ke Google Gemini
 * POST /api/command-ai/brief
 * Body: { briefType, staffData }
 * Perlu env GEMINI_API_KEY di Cloudflare Dashboard (Settings > Environment Variables)
 * Otomatis mencoba beberapa model berurutan kalau salah satu gagal.
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

async function tryGenerateContent(apiKey, systemInstruction, userText) {
  const errors = [];
  for (const model of MODEL_CANDIDATES) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: userText }] }],
            systemInstruction: { parts: [{ text: systemInstruction }] },
            generationConfig: { temperature: 0.3, responseMimeType: 'application/json' },
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

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const { briefType, staffData } = body;

    if (!env.GEMINI_API_KEY) {
      return json({
        title: `EXECUTIVE BRIEF (${(briefType || 'DAILY').toUpperCase()})`,
        summary: `Ringkasan Situasi Terintegrasi COMMAND360 (${new Date().toLocaleDateString('id-ID')}):\n• INTELIJEN: Wilayah kondusif, hotspot karhutla dalam penanganan.\n• OPERASI: Kesiapan Satuan tinggi.\n• PERSONEL: DSPP vs Riil dalam batas normal.\n• LOGISTIK: Stok Bekal Amunisi & BBM aman.\n\n[MODE DEMO — tambahkan GEMINI_API_KEY di Cloudflare untuk analisis AI sungguhan]`,
        recommendations: ['Pertahankan tingkat kesiapsiagaan Satuan.', 'Lakukan pengecekan rutin suku cadang ranmor.'],
        isAiGenerated: true,
      });
    }

    const systemInstruction = `Anda adalah COMMAND AI Generator untuk Laporan Singkat Pimpinan (Executive Brief) Batalyon TNI AD.
Buat ringkasan eksekutif berjenjang berdasarkan data fusion staf (Intel, Ops, Pers, Log) yang diberikan.
Jenis Brief: ${briefType || 'Executive Brief'}.
PENTING: Jawab HANYA dengan JSON valid, tanpa markdown/backtick, format persis:
{"title": "Judul Brief", "summary": "Ringkasan situasi utama 3-4 kalimat", "recommendations": ["rekomendasi 1", "rekomendasi 2"]}`;

    const result = await tryGenerateContent(env.GEMINI_API_KEY, systemInstruction, `Data staf terkini: ${JSON.stringify(staffData || {})}`);

    if (!result.ok) {
      return json({ error: 'Semua model Gemini gagal dicoba: ' + result.errors.join(' | ') }, 502);
    }

    let parsed;
    try {
      parsed = JSON.parse(result.text.replace(/```json|```/g, '').trim());
    } catch (e) {
      parsed = { title: 'Executive Brief', summary: result.text };
    }

    return json({ ...parsed, isAiGenerated: true, generatedAt: new Date().toISOString(), modelUsed: result.modelUsed });
  } catch (err) {
    return json({ error: 'Server error: ' + err.message }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}
