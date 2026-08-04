/**
 * API Proksi Berita Wilayah — ambil & urai RSS resmi ANTARA Sumbar
 * Sumber: LKBN ANTARA (kantor berita negara RI), legal untuk disindikasikan.
 * GET /api/news-feed?daerah=terkini  (atau: kab-padang-pariaman, kab-solok, dst)
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

// Ekstraksi sederhana pakai regex (Cloudflare Workers tidak punya DOMParser bawaan)
function parseRss(xml) {
  const items = [];
  const itemBlocks = xml.split('<item>').slice(1);
  for (const block of itemBlocks) {
    const get = (tag) => {
      const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
      if (!m) return '';
      return m[1].replace('<![CDATA[', '').replace(']]>', '').trim();
    };
    const title = get('title');
    const link = get('link');
    const pubDate = get('pubDate');
    let description = get('description');
    // buang tag img/html dari deskripsi, ambil teksnya saja
    description = description.replace(/<img[^>]*>/g, '').replace(/<[^>]+>/g, '').trim();
    if (description.length > 220) description = description.slice(0, 220) + '...';

    if (title) items.push({ title, link, pubDate, description });
  }
  return items;
}

const ALLOWED_FEEDS = {
  terkini: 'https://sumbar.antaranews.com/rss/terkini.xml',
  'top-news': 'https://sumbar.antaranews.com/rss/top-news.xml',
  'kab-padang-pariaman': 'https://sumbar.antaranews.com/rss/kab-padang-pariaman.xml',
  'kab-pasaman-barat': 'https://sumbar.antaranews.com/rss/kab-pasaman-barat.xml',
  'kab-pasaman': 'https://sumbar.antaranews.com/rss/kab-pasaman.xml',
  'kab-pesisir-selatan': 'https://sumbar.antaranews.com/rss/kab-pesisir-selatan.xml',
  'kab-solok': 'https://sumbar.antaranews.com/rss/kab-solok.xml',
  'kab-solok-selatan': 'https://sumbar.antaranews.com/rss/kab-solok-selatan.xml',
  'kab-sijunjung': 'https://sumbar.antaranews.com/rss/kab-sijunjung.xml',
  'kab-dharmasraya': 'https://sumbar.antaranews.com/rss/kab-dharmasraya.xml',
};

export async function onRequestGet(context) {
  const { request } = context;
  try {
    const url = new URL(request.url);
    const daerah = url.searchParams.get('daerah') || 'terkini';
    const feedUrl = ALLOWED_FEEDS[daerah];
    if (!feedUrl) {
      return json({ error: 'Daerah tidak dikenal. Pilihan: ' + Object.keys(ALLOWED_FEEDS).join(', ') }, 400);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // batas 8 detik, tidak menggantung lama

    let res;
    try {
      res = await fetch(feedUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 Command360-NewsMonitor/1.0' },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!res.ok) return json({ error: 'Gagal mengambil feed berita (status ' + res.status + ')' }, 502);

    const xml = await res.text();
    const items = parseRss(xml).slice(0, 15);

    return json({ ok: true, sumber: 'ANTARA News Sumatera Barat (LKBN ANTARA)', daerah, items });
  } catch (err) {
    const isTimeout = err.name === 'AbortError';
    return json({ error: isTimeout ? 'Waktu tunggu habis mengambil berita (server ANTARA lambat merespons). Coba lagi.' : 'Server error: ' + err.message }, isTimeout ? 504 : 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}
