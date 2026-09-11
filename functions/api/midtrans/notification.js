import { createClient } from '@supabase/supabase-js';

async function isValidSignature(notification, serverKey) {
  const raw = `${notification.order_id}${notification.status_code}${notification.gross_amount}${serverKey}`;
  const digest = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(raw));
  const expected = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  const actual = String(notification.signature_key || '');
  return expected.length === actual.length && expected === actual;
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const serverKey = env.MIDTRANS_SERVER_KEY;
  if (!supabaseUrl || !serviceKey || !serverKey) return Response.json({ error: 'Payment service is not configured' }, { status: 500 });

  const notification = await request.json().catch(() => ({}));
  if (!notification.order_id || !notification.status_code || !notification.gross_amount || !notification.signature_key) return Response.json({ error: 'Invalid Midtrans notification payload' }, { status: 400 });
  if (!(await isValidSignature(notification, serverKey))) return Response.json({ error: 'Invalid Midtrans signature' }, { status: 401 });

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const orderId = String(notification.order_id);
  const transactionStatus = String(notification.transaction_status || '').toLowerCase();
  const success = ['settlement', 'capture'].includes(transactionStatus) && String(notification.status_code) === '200' && (notification.fraud_status == null || String(notification.fraud_status).toUpperCase() === 'ACCEPT');
  const refunded = ['refund', 'partial_refund'].includes(transactionStatus);
  const terminalFailure = ['deny', 'cancel', 'expire', 'failure'].includes(transactionStatus);

  const { data: job, error: findError } = await admin.from('jobs').select('id, status, final_amount, employer_total, total, payment_status, midtrans_transaction_status, midtrans_transaction_id, paid_at, midtrans_pending_amount').eq('midtrans_order_id', orderId).maybeSingle();
  if (findError) return Response.json({ error: findError.message }, { status: 500 });
  if (!job) return Response.json({ error: 'KerjaHarian job not found for Midtrans order' }, { status: 404 });

  // Settlement must never be able to move a non-completed job into a paid state.
  // This is defense-in-depth for old/stale order IDs because new payment creation
  // already rejects every status other than completed.
  if (success && String(job.status) !== 'completed') return Response.json({ error: 'Payment notification rejected: job is not completed' }, { status: 409 });

  const expectedAmount = Number(job.midtrans_pending_amount ?? job.final_amount ?? job.employer_total ?? job.total ?? 0);
  const notifiedAmount = Number(notification.gross_amount);
  if (!Number.isFinite(expectedAmount) || expectedAmount !== notifiedAmount) return Response.json({ error: 'Gross amount mismatch' }, { status: 409 });

  const incomingTransactionId = notification.transaction_id ? String(notification.transaction_id) : null;
  const duplicate = job.midtrans_transaction_status === transactionStatus && job.midtrans_transaction_id === incomingTransactionId;
  if (duplicate) return Response.json({ ok: true, order_id: orderId, payment_status: job.payment_status, duplicate: true });
  if (['settled', 'refunded', 'partial_refund'].includes(String(job.payment_status)) && !success && !refunded) return Response.json({ ok: true, order_id: orderId, payment_status: job.payment_status, ignored: true });

  const nextPaymentStatus = success ? 'settled' : refunded ? (transactionStatus === 'partial_refund' ? 'partial_refund' : 'refunded') : terminalFailure ? 'cancelled' : 'pending';
  const update = {
    midtrans_transaction_status: transactionStatus || 'unknown',
    midtrans_transaction_id: incomingTransactionId,
    payment_status: nextPaymentStatus,
    paid_at: success ? (job.paid_at || new Date().toISOString()) : job.paid_at,
    midtrans_pending_amount: success || refunded || terminalFailure ? null : job.midtrans_pending_amount,
  };
  const { error: updateError } = await admin.from('jobs').update(update).eq('id', job.id);
  if (updateError) return Response.json({ error: updateError.message }, { status: 500 });

  const { error: auditError } = await admin.from('job_payment_events').insert({
    job_id: job.id,
    midtrans_order_id: orderId,
    transaction_id: incomingTransactionId,
    transaction_status: transactionStatus || 'unknown',
    gross_amount: notifiedAmount,
    payment_status: nextPaymentStatus,
    metadata: { status_code: String(notification.status_code), payment_type: notification.payment_type || null, fraud_status: notification.fraud_status || null, settlement_time: notification.settlement_time || null },
  });
  if (auditError && auditError.code !== '23505') return Response.json({ error: auditError.message }, { status: 500 });
  return Response.json({ ok: true, order_id: orderId, payment_status: nextPaymentStatus });
}
