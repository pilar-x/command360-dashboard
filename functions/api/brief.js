/**
 * Command AI — Generator Ringkasan Eksekutif (Brief), terhubung ke Google Gemini
 * POST /api/command-ai/brief
 * Body: { briefType, staffData }
 * Perlu env GEMINI_API_KEY di Cloudflare Dashboard (Settings > Environment Variables)
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

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Data staf terkini: ${JSON.stringify(staffData || {})}` }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] },
          generationConfig: { temperature: 0.3, responseMimeType: 'application/json' },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return json({ error: 'Gagal menghubungi Gemini API: ' + errText }, 502);
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    let parsed;
    try {
      parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim());
    } catch (e) {
      parsed = { title: 'Executive Brief', summary: rawText };
    }

    return json({ ...parsed, isAiGenerated: true, generatedAt: new Date().toISOString() });
  } catch (err) {
    return json({ error: 'Server error: ' + err.message }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}
