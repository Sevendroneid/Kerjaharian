const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

const cors = (origin) => ({
  'access-control-allow-origin': origin || '*',
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
});

const normalize = (value) => value.toLowerCase().normalize('NFKC').trim();

function classify(message) {
  const text = normalize(message);
  if (/tidak ada|sepi|belum dapat|belum dapat kerja|susah cari|cari kerja|butuh kerja|kerja sekarang|kerja hari ini/.test(text)) return 'find_work';
  if (/lowongan|butuh pekerja|cari pekerja|pekerja belum|belum ada yang ambil|tidak ada yang ambil|sulit dapat pekerja/.test(text)) return 'hire_worker';
  if (/order|pesanan|pekerjaan|ambil kerja|claim|ditolak|gagal/.test(text)) return 'order_issue';
  if (/verifikasi|kyc|ktp|identitas/.test(text)) return 'verification';
  if (/online|offline|radar|panggilan/.test(text)) return 'availability';
  if (/akun|login|masuk|password|passkey/.test(text)) return 'account';
  return 'general';
}

function extractFilters(message) {
  const text = normalize(message);
  const categories = [
    ['logistik', /logistik|bongkar|muat|pindahan|gudang/],
    ['tukang', /tukang|bangunan|renovasi|cat|perbaikan/],
    ['kebersihan', /bersih|kebersihan|cleaning|sapu|pel/],
    ['serabutan', /serabutan|bantu|umum|tenaga kasar/],
  ];
  const category = categories.find(([, pattern]) => pattern.test(text))?.[0] || null;
  const km = text.match(/(\d+(?:[.,]\d+)?)\s*(?:km|kilometer)/)?.[1];
  const wage = text.match(/(?:rp\.?\s*|rupiah\s*)([\d.]+)/)?.[1];
  return { category, radiusKm: km ? Number(km.replace(',', '.')) : null, minWage: wage ? Number(wage.replace(/\./g, '')) : null };
}

function fallbackAnswer({ message, role, jobs, filters, profile }) {
  const intent = classify(message);
  const visibleJobs = jobs.filter((job) => !filters.category || job.category === filters.category).filter((job) => !filters.minWage || Number(job.wage) >= filters.minWage);
  const jobCount = visibleJobs.length;
  const first = visibleJobs[0];

  if (intent === 'find_work') {
    if (!profile) return { answer: 'Untuk mencari dan mengambil pekerjaan, masuk atau daftar dulu. Setelah masuk, saya bisa membantu membaca lowongan yang tersedia.', actions: [{ label: 'Masuk / Daftar', href: '/cari-kerja' }] };
    if (profile.is_online === false) return { answer: 'Langkah pertama: aktifkan status Online di Radar Kerja. Setelah Online, lowongan terbuka bisa Anda ambil.', actions: [{ label: 'Buka Radar Kerja', href: '/cari-kerja' }] };
    if (!jobCount) return { answer: `Belum ada lowongan terbuka yang cocok${filters.category ? ` untuk kategori ${filters.category}` : ''}${filters.minWage ? ` dengan upah minimal Rp${filters.minWage.toLocaleString('id-ID')}` : ''}. Coba perluas kategori atau jangka waktu pencarian.`, actions: [{ label: 'Lihat semua lowongan', href: '/cari-kerja' }] };
    return { answer: `Saya menemukan ${jobCount} lowongan terbuka yang cocok. Yang paling baru: “${first.title}” dengan upah Rp${Number(first.wage).toLocaleString('id-ID')} di ${first.location}.`, jobs: visibleJobs.slice(0, 3), actions: [{ label: 'Buka Cari Kerja', href: '/cari-kerja' }] };
  }

  if (intent === 'availability') return profile ? (profile.is_online ? { answer: 'Status Anda saat ini Online. Radar dapat menerima panggilan kerja.' } : { answer: 'Status Anda saat ini Offline. Aktifkan Online di halaman Cari Kerja agar dapat menerima panggilan.' , actions: [{ label: 'Aktifkan Online', href: '/cari-kerja' }] }) : { answer: 'Masuk terlebih dahulu agar saya dapat membaca status ketersediaan akun Anda.', actions: [{ label: 'Masuk / Daftar', href: '/cari-kerja' }] };
  if (intent === 'verification') return { answer: 'KYC digunakan untuk membantu menjaga kepercayaan marketplace. Jika Anda sedang terhenti di verifikasi, jangan kirim data sensitif di chat ini; buka alur verifikasi resmi di akun Anda.', actions: [{ label: 'Buka Cari Kerja', href: '/cari-kerja' }] };
  if (intent === 'account') return { answer: 'Untuk masalah akun, gunakan tombol Masuk/Daftar dan ikuti alur autentikasi yang tersedia. Saya tidak akan meminta PIN, password, atau kode verifikasi Anda.' };
  if (intent === 'hire_worker') return role === 'employer' ? { answer: jobCount ? `Ada ${jobCount} lowongan terbuka yang sedang terlihat di marketplace. Jika yang Anda maksud lowongan milik Anda belum diambil, periksa upah, lokasi, jadwal, dan kejelasan pekerjaan sebelum mengubahnya.` : 'Saya tidak menemukan lowongan terbuka yang terlihat dari akun ini. Pastikan lowongan sudah dibuat dan statusnya terbuka.' , actions: [{ label: 'Buka Cari Pekerja', href: '/cari-pekerja' }] } : { answer: 'Untuk mencari pekerja, buka halaman Cari Pekerja dan buat kebutuhan pekerjaan dengan lokasi, waktu, jumlah orang, dan upah yang jelas.', actions: [{ label: 'Cari Pekerja', href: '/cari-pekerja' }] };
  if (intent === 'order_issue') return { answer: 'Saya bisa membantu mendiagnosis masalah order, tetapi saya tidak akan mengubah status order dari chat. Beri tahu apa yang terjadi (misalnya gagal mengambil, order tidak muncul, atau pekerjaan sudah selesai tetapi status belum berubah).', actions: [{ label: 'Buka dashboard', href: role === 'employer' ? '/cari-pekerja' : '/cari-kerja' }] };
  return { answer: 'Ceritakan masalah Anda dengan bahasa sehari-hari. Contoh: “Saya butuh kerja hari ini”, “Kenapa lowongan saya belum diambil?”, atau “Status saya sudah Online tapi tidak ada panggilan?”. Saya akan mencocokkannya dengan data KerjaHarian yang tersedia.' };
}

async function loadContext(request, env) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const anonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return { jobs: [], profile: null };
  const headers = { apikey: anonKey, Authorization: request.headers.get('authorization') || `Bearer ${anonKey}` };
  const response = await fetch(`${url}/rest/v1/jobs?select=id,title,category,location,wage,wage_type,status,created_at&status=eq.open&order=created_at.desc&limit=30`, { headers });
  const jobs = response.ok ? await response.json() : [];
  return { jobs: Array.isArray(jobs) ? jobs : [], profile: null };
}

async function callModel(message, context, env) {
  const endpoint = env.AI_API_URL;
  const key = env.AI_API_KEY;
  if (!endpoint || !key) return null;
  const model = env.AI_MODEL || 'gpt-4o-mini';
  const system = 'Anda adalah KerjaHarian AI Problem Solver. Gunakan hanya fakta dalam CONTEXT. Jangan mengarang lowongan, harga, identitas, saldo, status order, atau tindakan yang sudah dilakukan. Jika data tidak cukup, katakan tidak cukup dan minta informasi yang aman. Jawab ringkas dalam Bahasa Indonesia dan berikan langkah berikutnya yang konkret.';
  const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` }, body: JSON.stringify({ model, temperature: 0.2, messages: [{ role: 'system', content: system }, { role: 'user', content: `CONTEXT: ${JSON.stringify(context)}\n\nMASALAH: ${message}` }] }) });
  if (!response.ok) return null;
  const data = await response.json();
  const answer = data?.choices?.[0]?.message?.content;
  return typeof answer === 'string' && answer.trim() ? { answer: answer.trim() } : null;
}

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('origin') || '*';
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
  if (request.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);
  try {
    const body = await request.json();
    const message = typeof body?.message === 'string' ? body.message.trim().slice(0, 1200) : '';
    if (!message) return json({ error: 'Pesan wajib diisi.' }, 400);
    const role = body?.role === 'employer' || body?.role === 'worker' ? body.role : null;
    const { jobs, profile } = await loadContext(request, env);
    const filters = extractFilters(message);
    const fallback = fallbackAnswer({ message, role, jobs, filters, profile });
    const modelAnswer = await callModel(message, { role, jobs: jobs.slice(0, 10), filters }, env);
    return new Response(JSON.stringify({ ...fallback, ...(modelAnswer || {}), grounded: true, provider: modelAnswer ? 'configured-model' : 'safe-fallback' }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8', ...cors(origin), 'cache-control': 'no-store' } });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Terjadi kesalahan saat memproses masalah.' }, 500);
  }
}
