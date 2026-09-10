import { authenticate, cors, json } from '../lib/ai-core.js';

export async function onRequest({ request, env }) {
  const headers = cors(request.headers.get('origin') || '*');
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405, headers);
  try {
    const auth = await authenticate(request, env, ['worker', 'employer']);
    if (!auth) return json({ error: 'Sesi user tidak valid.' }, 401, headers);
    const body = await request.json();
    const action = typeof body?.action === 'string' ? body.action : '';
    if (auth.profile.role !== 'worker' || action !== 'accept_offer') return json({ error: 'Perintah aman yang tersedia saat ini hanya menerima penawaran worker.' }, 403, headers);
    if (body?.confirmed !== true) return json({ error: 'Konfirmasi eksplisit diperlukan.' }, 400, headers);
    const offerId = typeof body?.offer_id === 'string' ? body.offer_id : '';
    if (!offerId) return json({ error: 'Penawaran belum dipilih.' }, 400, headers);
    const { data: offer, error } = await auth.client.from('dispatch_offers').select('id,job_id,worker_id,status,expires_at').eq('id', offerId).eq('worker_id', auth.user.id).maybeSingle();
    if (error || !offer) return json({ error: 'Penawaran tidak ditemukan.' }, 404, headers);
    if (offer.status !== 'offered' || new Date(offer.expires_at).getTime() <= Date.now()) return json({ error: 'Penawaran sudah tidak aktif.' }, 409, headers);
    const { data, error: rpcError } = await auth.client.rpc('accept_dispatch_offer', { p_offer_id: offerId });
    if (rpcError) return json({ error: `Penawaran gagal diterima: ${rpcError.message}` }, 409, headers);
    return json({ ok: true, action, result: data, permission_level: 'confirmation', critical: false, writes_performed: true }, 200, headers);
  } catch (e) { return json({ error: e instanceof Error ? e.message : 'Perintah AI gagal.' }, 500, headers); }
}
