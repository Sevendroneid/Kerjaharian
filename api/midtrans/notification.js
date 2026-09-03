import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function isValidSignature(notification, serverKey) {
  const raw = `${notification.order_id}${notification.status_code}${notification.gross_amount}${serverKey}`;
  const expected = crypto.createHash('sha512').update(raw).digest('hex');
  const actual = String(notification.signature_key || '');
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!supabaseUrl || !serviceKey || !serverKey) return json(res, 500, { error: 'Payment service is not configured' });

  const notification = req.body || {};
  if (!notification.order_id || !notification.status_code || !notification.gross_amount || !notification.signature_key) {
    return json(res, 400, { error: 'Invalid Midtrans notification payload' });
  }
  if (!isValidSignature(notification, serverKey)) return json(res, 401, { error: 'Invalid Midtrans signature' });

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const orderId = String(notification.order_id);
  const transactionStatus = String(notification.transaction_status || '').toLowerCase();
  const success = ['settlement', 'capture'].includes(transactionStatus) && String(notification.status_code) === '200' && (notification.fraud_status == null || String(notification.fraud_status).toUpperCase() === 'ACCEPT');

  const { data: job, error: findError } = await admin
    .from('jobs')
    .select('id, final_amount, employer_total, total, payment_status')
    .eq('midtrans_order_id', orderId)
    .maybeSingle();

  if (findError) return json(res, 500, { error: findError.message });
  if (!job) return json(res, 404, { error: 'KerjaHarian job not found for Midtrans order' });

  const expectedAmount = Number(job.final_amount ?? job.employer_total ?? job.total ?? 0);
  const notifiedAmount = Number(notification.gross_amount);
  if (!Number.isFinite(expectedAmount) || expectedAmount !== notifiedAmount) {
    return json(res, 409, { error: 'Gross amount mismatch' });
  }

  const update = {
    midtrans_transaction_status: transactionStatus || 'unknown',
    midtrans_transaction_id: notification.transaction_id ? String(notification.transaction_id) : null,
    payment_status: success ? 'settled' : ['deny', 'cancel', 'expire', 'failure'].includes(transactionStatus) ? 'cancelled' : 'pending',
    paid_at: success ? new Date().toISOString() : null,
  };

  const { error: updateError } = await admin.from('jobs').update(update).eq('id', job.id);
  if (updateError) return json(res, 500, { error: updateError.message });

  return json(res, 200, { ok: true, order_id: orderId, payment_status: update.payment_status });
}
