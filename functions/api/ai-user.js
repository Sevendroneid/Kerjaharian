import { authenticate, clean, classify, cors, json, model, userContext } from '../lib/ai-core.js';

function fallback(message, ctx) {
  const intent = classify(message); const lower=message.toLowerCase();
  if (ctx.role==='worker' && /terima|ambil|accept/.test(lower) && ctx.offers?.length) {
    const offer=ctx.offers[0]; const job=offer.job||{};
    return { answer:`Saya menemukan penawaran “${job.title||'pekerjaan'}”. Jika Anda memang ingin menerimanya, tekan tombol konfirmasi di bawah.`, commands:[{id:'accept_offer',label:'Terima pekerjaan ini',type:'action',action:'accept_offer',offer_id:offer.id,requires_confirmation:true}] };
  }
  if (intent === 'work') {
    if (ctx.role === 'worker') {
      if (!ctx.is_online) return { answer: 'Anda masih Offline. Aktifkan Online agar sistem dapat mencocokkan pekerjaan yang tersedia.', commands: [{ id: 'open_radar', label: 'Buka Radar Kerja', type: 'navigate', target: '/cari-kerja' }] };
      const jobs = Array.isArray(ctx.jobs) ? ctx.jobs : [];
      return jobs.length ? { answer: `Saya menemukan ${jobs.length} lowongan terbuka yang dapat Anda periksa.`, jobs: jobs.slice(0, 5), commands: [{ id: 'open_jobs', label: 'Lihat pekerjaan', type: 'navigate', target: '/cari-kerja' }] } : { answer: 'Saat ini saya tidak menemukan lowongan terbuka pada data yang dapat saya akses. Saya akan tetap membantu mencari jika Anda memperluas kebutuhan.' };
    }
    return { answer: 'Saya bisa membantu membuat dan memantau kebutuhan pekerja. Sebutkan jenis pekerjaan, jumlah orang, lokasi, waktu, dan kebutuhan khusus.', commands: [{ id: 'create_order', label: 'Buat pekerjaan', type: 'navigate', target: '/cari-pekerja' }] };
  }
  if (intent === 'worker_search') return { answer: 'Saya dapat membantu employer memahami kebutuhan dan memantau pencarian pekerja. Kandidat tetap ditentukan matching engine berdasarkan persyaratan pekerjaan dan sinyal trust yang diperbolehkan.', commands: [{ id: 'open_matching', label: 'Buka Cari Pekerja', type: 'navigate', target: '/cari-pekerja' }] };
  if (intent === 'account') return { answer: 'Saya dapat memandu registrasi dan login. Jangan pernah kirim OTP atau kode rahasia kepada saya.', commands: [{ id: 'login', label: 'Masuk / Daftar', type: 'navigate', target: '/cari-kerja' }] };
  if (intent === 'pricing') return { answer: 'Saya dapat membantu membaca harga yang sudah ditetapkan sistem. Untuk perubahan harga, gunakan alur pricing resmi agar perubahan tercatat dan tervalidasi.' };
  if (intent === 'problem') return { answer: 'Saya akan menganalisis masalah berdasarkan status aktual akun dan pekerjaan. Jika tindakan diperlukan, saya hanya akan menawarkan tindakan yang memang diizinkan oleh sistem.' };
  return { answer: 'Saya siap membantu registrasi, mencari pekerjaan, membuat kebutuhan pekerja, matching, status order, dan penyelesaian masalah. Jelaskan kebutuhan Anda dengan bahasa sehari-hari.' };
}

export async function onRequest({ request, env }) {
  const headers = cors(request.headers.get('origin') || '*');
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405, headers);
  try {
    const auth = await authenticate(request, env, ['worker', 'employer']);
    if (!auth) return json({ error: 'Sesi user tidak valid.' }, 401, headers);
    const body = await request.json(); const message = clean(body?.message).slice(0, 1600);
    if (!message) return json({ error: 'Pesan wajib diisi.' }, 400, headers);
    const context = await userContext(auth); const base = fallback(message, context);
    const ai = await model(message, { role: context.role, is_online: context.is_online, jobs: context.jobs.slice(0, 10), own_jobs: context.own_jobs, offers: context.offers }, env, 'Anda adalah AI User KerjaHarian untuk WORKER dan EMPLOYER. Anda mempunyai kemampuan yang sama secara prinsip: memahami registrasi, pekerjaan, order, matching, harga, masalah dan solusi. Bedakan hanya role dan kewenangan. Berikan solusi konkret berdasarkan CONTEXT. Jangan mengarang. Jangan meminta OTP. Jangan memberikan instruksi diskriminatif. Jangan melakukan critical action. Jika menyarankan tindakan, gunakan command aman yang dapat dikonfirmasi UI.');
    return json({ ...base, ...(ai ? { answer: ai.answer, provider: ai.provider } : {}), role: context.role, grounded: true }, 200, headers);
  } catch (e) { return json({ error: e instanceof Error ? e.message : 'AI User gagal.' }, 500, headers); }
}
