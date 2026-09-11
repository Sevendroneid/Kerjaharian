import { authenticate, clean, cors, json } from '../lib/ai-core.js';

const classifyIntent = (message) => {
  const text = clean(message).toLowerCase();
  if (/refund|kembalikan dana|suspend|blokir|ban|hapus akun|hapus data|ubah harga massal|permission|izin|dispute|sengketa|bayar pekerja|kompensasi/.test(text)) return 'critical';
  if (/masalah|gagal|kendala|tidak datang|no.?show|error|batal|cancel|gps|insiden|kecelakaan/.test(text)) return 'problem';
  if (/cari kerja|lowongan|kerja hari ini|ambil kerja|panggilan/.test(text)) return 'work';
  if (/cari pekerja|butuh pekerja|kandidat|matching|pekerja/.test(text)) return 'matching';
  if (/harga|upah|tarif|bayaran/.test(text)) return 'pricing';
  if (/ringkasan|kondisi|operasional|kpi|berapa|jumlah|statistik|laporan/.test(text)) return 'operations';
  return 'general';
};

const invokeRoleAgent = async (request, path, message) => {
  const url = new URL(request.url);
  url.pathname = path;
  url.search = '';
  return fetch(url.toString(), {
    method: 'POST',
    headers: {
      authorization: request.headers.get('authorization') || '',
      'content-type': 'application/json',
      origin: request.headers.get('origin') || url.origin,
    },
    body: JSON.stringify({ message }),
  });
};

export async function onRequest({ request, env }) {
  const headers = cors(request.headers.get('origin') || '*');
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405, headers);

  try {
    const auth = await authenticate(request, env, ['worker', 'employer', 'admin']);
    if (!auth) return json({ error: 'Sesi login tidak valid.' }, 401, headers);

    const body = await request.json().catch(() => ({}));
    const message = clean(body?.message || '').slice(0, 2000);
    if (!message) return json({ error: 'Pesan wajib diisi.' }, 400, headers);

    const role = auth.profile.role;
    const intent = classifyIntent(message);
    const target = role === 'admin' ? '/api/ai-admin' : '/api/ai-user';
    const delegated = await invokeRoleAgent(request, target, message);
    const payload = await delegated.json().catch(() => ({}));

    return json({
      ...payload,
      ai_core: {
        role,
        mode: role === 'admin' ? 'admin-operator' : role === 'worker' ? 'worker-assistant' : 'employer-assistant',
        intent,
        delegated_endpoint: target,
        autonomous_critical_action: false,
        authoritative_system: 'database-and-business-rules',
      },
    }, delegated.status, headers);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'KerjaHarian AI Core gagal.' }, 500, headers);
  }
}
