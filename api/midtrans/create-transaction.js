import { createClient } from '@supabase/supabase-js';

const MIDTRANS_SNAP_URL = 'https://app.sandbox.midtrans.com/snap/v1/transactions';

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const clientKey = process.env.MIDTRANS_CLIENT_KEY;

  if (!supabaseUrl || !anonKey || !serviceKey || !serverKey || !clientKey) {
    return json(res, 500, { error: 'Payment service is not configured' });
  }

  const authHeader = req.headers.authorization || '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!accessToken) return json(res, 401, { error: 'Authentication required' });

  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await authClient.auth.getUser(accessToken);
  if (userError || !userData.user) return json(res, 401, { error: 'Invalid session' });

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const jobId = typeof req.body?.job_id === 'string' ? req.body.job_id : '';
  if (!jobId) return json(res, 400, { error: 'job_id is required' });

  const { data: job, error: jobError } = await admin
    .from('jobs')
    .select('id, employer_id, worker_id, title, final_amount, employer_total, total, payment_status, status, midtrans_order_id, midtrans_snap_token')
    .eq('id', jobId)
    .single();

  if (jobError || !job) return json(res, 404, { error: 'Job not found' });
  if (job.employer_id !== userData.user.id) return json(res, 403, { error: 'Only the employer can initiate payment' });
  if (job.status !== 'completed') return json(res, 409, { error: 'Job must be completed before payment' });
  if (!job.worker_id) return json(res, 409, { error: 'Job has no worker' });
  if (job.payment_status === 'settled') return json(res, 409, { error: 'Payment is already settled' });

  const grossAmount = Number(job.final_amount ?? job.employer_total ?? job.total ?? 0);
  if (!Number.isInteger(grossAmount) || grossAmount <= 0) return json(res, 409, { error: 'Invalid server-side payment amount' });

  const orderId = job.midtrans_order_id || `KH-${job.id}`;
  const payload = {
    transaction_details: { order_id: orderId, gross_amount: grossAmount },
    item_details: [{ id: job.id, price: grossAmount, quantity: 1, name: String(job.title || 'KerjaHarian job').slice(0, 50) }],
  };

  const authorization = Buffer.from(`${serverKey}:`).toString('base64');
  const midtransResponse = await fetch(MIDTRANS_SNAP_URL, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Basic ${authorization}` },
    body: JSON.stringify(payload),
  });

  const result = await midtransResponse.json().catch(() => ({}));
  if (!midtransResponse.ok || !result.token) {
    return json(res, 502, { error: 'Midtrans transaction creation failed', detail: result?.error_messages || result?.status_message || 'Unknown Midtrans error' });
  }

  const { error: updateError } = await admin.from('jobs').update({
    midtrans_order_id: orderId,
    midtrans_snap_token: result.token,
    midtrans_transaction_status: 'pending',
    payment_status: 'pending',
  }).eq('id', job.id);

  if (updateError) return json(res, 500, { error: 'Payment token created but could not be stored', detail: updateError.message });

  return json(res, 200, { token: result.token, client_key: clientKey, order_id: orderId, gross_amount: grossAmount, environment: 'sandbox' });
}
