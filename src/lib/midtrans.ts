import { supabase } from './supabase';

declare global {
  interface Window {
    snap?: { pay: (token: string, options?: { onSuccess?: () => void; onPending?: () => void; onError?: () => void; onClose?: () => void }) => void };
  }
}

async function loadSnap(clientKey: string, environment: 'sandbox' | 'production') {
  if (window.snap) return;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-midtrans-snap]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Gagal memuat Midtrans Snap')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = environment === 'production' ? 'https://app.midtrans.com/snap/snap.js' : 'https://app.sandbox.midtrans.com/snap/snap.js';
    script.dataset.clientKey = clientKey;
    script.dataset.midtransSnap = 'true';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Gagal memuat Midtrans Snap'));
    document.head.appendChild(script);
  });
}

async function waitForPaymentSettlement(jobId: string, maxAttempts = 20) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const { data, error } = await supabase
      .from('jobs')
      .select('payment_status,midtrans_transaction_status')
      .eq('id', jobId)
      .single();
    if (!error && data?.payment_status === 'settled') return true;
    if (!error && ['cancelled', 'refunded', 'partial_refund'].includes(String(data?.payment_status))) return false;
    await new Promise((resolve) => window.setTimeout(resolve, 1500));
  }
  return false;
}

export async function payJob(jobId: string, onSettled?: () => void, onPending?: () => void) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Sesi login tidak ditemukan');

  const response = await fetch('/api/midtrans/create-transaction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ job_id: jobId }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.token || !result.client_key) throw new Error(result.error || 'Gagal membuat transaksi pembayaran');

  const environment: 'sandbox' | 'production' = result.environment === 'production' ? 'production' : 'sandbox';
  await loadSnap(result.client_key, environment);
  if (!window.snap) throw new Error('Midtrans Snap belum siap');

  const finish = async (success: boolean) => {
    if (success && await waitForPaymentSettlement(jobId)) onSettled?.();
    else onPending?.();
  };

  window.snap.pay(result.token, {
    onSuccess: () => { void finish(true); },
    onPending: () => { void finish(true); },
    onError: () => { onPending?.(); },
    onClose: () => { onPending?.(); },
  });
}

export const payCompletedJob = payJob;
