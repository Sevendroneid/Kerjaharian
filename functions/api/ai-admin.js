import { authenticate, adminContext, clean, cors, json, model } from '../lib/ai-core.js';

function rules(ctx) {
  const c = ctx.counts;
  const out = [];
  if (c.open > c.online_workers && c.online_workers >= 0) out.push({ priority: 'high', title: 'Demand melebihi supply online', reason: `${c.open} open job dan ${c.online_workers} worker online.`, action: 'Periksa radius dispatch, kategori, dan ketersediaan supply.' });
  if (c.pending_kyc > 0) out.push({ priority: 'medium', title: 'Ada KYC menunggu', reason: `${c.pending_kyc} akun berstatus pending.`, action: 'Tinjau queue KYC melalui panel resmi.' });
  if (c.open > 0) out.push({ priority: 'medium', title: 'Ada pekerjaan menunggu matching', reason: `${c.open} job masih open.`, action: 'Periksa apakah requirement sudah confirmed dan dispatch berjalan.' });
  if (!out.length) out.push({ priority: 'low', title: 'Tidak ada alarm utama', reason: 'Tidak ditemukan kondisi sederhana yang melewati rule dasar.', action: 'Tetap pantau KPI dan lifecycle job.' });
  return out;
}

export async function onRequest({ request, env }) {
  const headers = cors(request.headers.get('origin') || '*');
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405, headers);
  try {
    const auth = await authenticate(request, env, ['admin']);
    if (!auth) return json({ error: 'Akses hanya untuk admin terautentikasi.' }, 401, headers);
    const body = await request.json();
    const message = clean(body?.message || 'Berikan ringkasan kondisi operasional KerjaHarian dan masalah yang harus saya prioritaskan.').slice(0, 2000);
    const context = await adminContext(auth);
    const recommendations = rules(context);
    const ai = await model(message, context, env, 'Anda adalah AI Admin KerjaHarian. Anda adalah otak operasional yang membantu admin seperti analyst dan problem solver. Baca chart/KPI dan data operasional yang diberikan, cari masalah, penyebab yang mungkin hanya jika didukung data, dan berikan solusi nyata. Anda boleh menyarankan automation dan safe action, tetapi tidak boleh melakukan critical action, mengarang angka, identitas, hukum, atau status. Untuk hukum/UU/upah eksternal, nyatakan bahwa data perlu sumber resmi terkini jika sumber belum tersedia. Jawab Bahasa Indonesia dan prioritaskan tindakan.');
    return json({ summary: ai?.answer || `Monitoring selesai. ${context.counts.open} open job, ${context.counts.online_workers} worker online, ${context.counts.active} active job.`, recommendations, context, provider: ai?.provider || 'rule-engine', grounded: true, checked_at: new Date().toISOString() }, 200, headers);
  } catch (e) { return json({ error: e instanceof Error ? e.message : 'AI Admin gagal.' }, 500, headers); }
}
