import { createClient } from '@supabase/supabase-js';

const MIDTRANS_SNAP_URL = 'https://app.sandbox.midtrans.com/snap/v1/transactions';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const serverKey = env.MIDTRANS_SERVER_KEY;
  const clientKey = env.MIDTRANS_CLIENT_KEY;

  if (!supabaseUrl || !anonKey || !serviceKey || !serverKey || !clientKey) {
    return Response.json({ error: 'Payment service is not configured' }, { status: 500 });
  }

  const authHeader = request.headers.get('Authorization') || '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!accessToken) return Response.json({ error: 'Authentication required' }, { status: 401 });

  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await authClient.auth.getUser(accessToken);
  if (userError || !userData.user) return Response.json({ error: 'Invalid session' }, { status: 401 });

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const body = await request.json().catch(() => ({}));
  const jobId = typeof body?.job_id === 'string' ? body.job_id : '';
  if (!jobId) return Response.json({ error: 'job_id is required' }, { status: 400 });

  const { data: job, error: jobError } = await admin
    .from('jobs')
    .select('id, employer_id, worker_id, title, final_amount, employer_total, total, payment_status, status, midtrans_order_id, midtrans_snap_token')
    .eq('id', jobId)
    .single();

  if (jobError || !job) return Response.json({ error: 'Job not found' }, { status: 404 });
  if (job.employer_id !== userData.user.id) return Response.json({ error: 'Only the employer can initiate payment' }, { status: 403 });
  if (job.status !== 'completed') return Response.json({ error: 'Job must be completed before payment' }, { status: 409 });
  if (!job.worker_id) return Response.json({ error: 'Job has no worker' }, { status: 409 });
  if (job.payment_status === 'settled') return Response.json({ error: 'Payment is already settled' }, { status: 409 });

  const grossAmount = Number(job.final_amount ?? job.employer_total ?? job.total ?? 0);
  if (!Number.isInteger(grossAmount) || grossAmount <= 0) return Response.json({ error: 'Invalid server-side payment amount' }, { status: 409 });

  const orderId = job.midtrans_order_id || `KH-${job.id}`;
  const payload = {
    transaction_details: { order_id: orderId, gross_amount: grossAmount },
    item_details: [{ id: job.id, price: grossAmount, quantity: 1, name: String(job.title || 'KerjaHarian job').slice(0, 50) }],
  };

  const authorization = btoa(`${serverKey}:`);
  const midtransResponse = await fetch(MIDTRANS_SNAP_URL, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Basic ${authorization}` },
    body: JSON.stringify(payload),
  });

  const result = await midtransResponse.json().catch(() => ({}));
  if (!midtransResponse.ok || !result.token) {
    return Response.json({ error: 'Midtrans transaction creation failed', detail: result?.error_messages || result?.status_message || 'Unknown Midtrans error' }, { status: 502 });
  }

  const { error: updateError } = await admin.from('jobs').update({
    midtrans_order_id: orderId,
    midtrans_snap_token: result.token,
    midtrans_transaction_status: 'pending',
    payment_status: 'pending',
  }).eq('id', job.id);

  if (updateError) return Response.json({ error: 'Payment token created but could not be stored', detail: updateError.message }, { status: 500 });

  return Response.json({ token: result.token, client_key: clientKey, order_id: orderId, gross_amount: grossAmount, environment: 'sandbox' });
}
