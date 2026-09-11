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
    .select('id, employer_id, worker_id, title, final_amount, employer_total, total, payment_status, status, midtrans_order_id, midtrans_snap_token, midtrans_transaction_status, midtrans_pending_amount')
    .eq('id', jobId)
    .single();

  if (jobError || !job) return Response.json({ error: 'Job not found' }, { status: 404 });
  if (job.employer_id !== userData.user.id) return Response.json({ error: 'Only the employer can initiate payment' }, { status: 403 });
  if (String(job.status) !== 'completed') return Response.json({ error: 'Job is not payable until it is completed' }, { status: 409 });
  if (job.payment_status === 'refunded' || job.payment_status === 'partial_refund') return Response.json({ error: 'Payment has already been refunded' }, { status: 409 });

  const targetAmount = Number(job.final_amount ?? job.employer_total ?? job.total ?? 0);
  if (!Number.isInteger(targetAmount) || targetAmount <= 0) return Response.json({ error: 'Invalid server-side payment amount' }, { status: 409 });

  const { data: paidRows, error: paidError } = await admin
    .from('job_payment_events')
    .select('gross_amount')
    .eq('job_id', job.id)
    .eq('payment_status', 'settled');
  if (paidError) return Response.json({ error: 'Could not verify previous payments' }, { status: 500 });
  const paidAmount = (paidRows ?? []).reduce((sum, row) => sum + Number(row.gross_amount || 0), 0);
  const amountDue = Math.max(0, targetAmount - paidAmount);

  if (amountDue === 0) {
    if (job.payment_status !== 'settled') await admin.from('jobs').update({ payment_status: 'settled', midtrans_pending_amount: null }).eq('id', job.id);
    return Response.json({ error: 'Payment is already fully settled' }, { status: 409 });
  }

  const pendingStatus = String(job.midtrans_transaction_status || '').toLowerCase();
  if (job.midtrans_snap_token && ['pending', 'authorize'].includes(pendingStatus) && Number(job.midtrans_pending_amount || 0) === amountDue) {
    return Response.json({ token: job.midtrans_snap_token, client_key: clientKey, order_id: job.midtrans_order_id, gross_amount: amountDue, environment, reused: true });
  }

  // A terminal/failed Midtrans attempt must never reuse its old order ID.
  // Reuse is limited to an actually pending transaction; otherwise create a
  // fresh order ID so a new attempt cannot collide with the old transaction.
  const hasPriorOrder = Boolean(job.midtrans_order_id);
  const orderId = paidAmount > 0
    ? `KH-${job.id}-TOPUP-${Date.now()}`
    : hasPriorOrder
      ? `KH-${job.id}-RETRY-${Date.now()}`
      : `KH-${job.id}`;
  const payload = {
    transaction_details: { order_id: orderId, gross_amount: amountDue },
    item_details: [{ id: job.id, price: amountDue, quantity: 1, name: String(job.title || 'KerjaHarian job').slice(0, 50) }],
  };

  const authorization = btoa(`${serverKey}:`);
  const midtransResponse = await fetch(snapApiUrl, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Basic ${authorization}`, 'Idempotency-Key': orderId.slice(0, 46) },
    body: JSON.stringify(payload),
  });
  const result = await midtransResponse.json().catch(() => ({}));
  if (!midtransResponse.ok || !result.token) return Response.json({ error: 'Midtrans transaction creation failed', detail: result?.error_messages || result?.status_message || 'Unknown Midtrans error' }, { status: 502 });

  const { error: updateError } = await admin.from('jobs').update({ midtrans_order_id: orderId, midtrans_snap_token: result.token, midtrans_transaction_status: 'pending', payment_status: 'pending', midtrans_pending_amount: amountDue }).eq('id', job.id);
  if (updateError) return Response.json({ error: 'Payment token created but could not be stored', detail: updateError.message }, { status: 500 });

  return Response.json({ token: result.token, client_key: clientKey, order_id: orderId, gross_amount: amountDue, environment, top_up: paidAmount > 0 });
}
