import { createClient } from '@supabase/supabase-js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const serverKey = env.MIDTRANS_SERVER_KEY;
  const clientKey = env.MIDTRANS_CLIENT_KEY;
  const environment = String(env.MIDTRANS_ENV || 'sandbox').toLowerCase() === 'production' ? 'production' : 'sandbox';
  const snapApiUrl = environment === 'production' ? 'https://app.midtrans.com/snap/v1/transactions' : 'https://app.sandbox.midtrans.com/snap/v1/transactions';
  if (!supabaseUrl || !anonKey || !serviceKey || !serverKey || !clientKey) return Response.json({ error: 'Payment service is not configured' }, { status: 500 });
  const authHeader = request.headers.get('Authorization') || '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!accessToken) return Response.json({ error: 'Authentication required' }, { status: 401 });
  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await authClient.auth.getUser(accessToken);
  if (userError || !userData.user) return Response.json({ error: 'Invalid session' }, { status: 401 });
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: profile } = await admin.from('profiles').select('id,role,kyc_verified').eq('id', userData.user.id).single();
  if (!profile || profile.role !== 'employer' || !profile.kyc_verified) return Response.json({ error: 'Employer terverifikasi diperlukan' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const amount = Number(body?.amount);
  if (!Number.isInteger(amount) || amount < 10000 || amount > 50000000) return Response.json({ error: 'Nominal top-up harus Rp10.000 sampai Rp50.000.000' }, { status: 400 });
  const topupId = crypto.randomUUID();
  const orderId = `KH-WALLET-${topupId}`;
  const { error: insertError } = await admin.from('employer_wallet_topups').insert({ id: topupId, employer_id: userData.user.id, midtrans_order_id: orderId, gross_amount: amount, status: 'pending' });
  if (insertError) return Response.json({ error: 'Gagal membuat catatan top-up', detail: insertError.message }, { status: 500 });
  const payload = { transaction_details: { order_id: orderId, gross_amount: amount }, item_details: [{ id: 'wallet-topup', price: amount, quantity: 1, name: 'Saldo KerjaHarian' }] };
  const authorization = btoa(`${serverKey}:`);
  const midtransResponse = await fetch(snapApiUrl, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Basic ${authorization}`, 'Idempotency-Key': orderId.slice(0, 46) }, body: JSON.stringify(payload) });
  const result = await midtransResponse.json().catch(() => ({}));
  if (!midtransResponse.ok || !result.token) {
    await admin.from('employer_wallet_topups').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', topupId);
    return Response.json({ error: 'Midtrans transaction creation failed', detail: result?.error_messages || result?.status_message || 'Unknown Midtrans error' }, { status: 502 });
  }
  const { error: updateError } = await admin.from('employer_wallet_topups').update({ snap_token: result.token, updated_at: new Date().toISOString() }).eq('id', topupId);
  if (updateError) return Response.json({ error: 'Token top-up berhasil dibuat tetapi gagal disimpan' }, { status: 500 });
  return Response.json({ token: result.token, client_key: clientKey, order_id: orderId, gross_amount: amount, environment, topup_id: topupId });
}
