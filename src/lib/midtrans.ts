import { supabase } from './supabase';

declare global {
  interface Window {
    snap?: { pay: (token: string, options?: { onSuccess?: () => void; onPending?: () => void; onError?: () => void; onClose?: () => void }) => void };
  }
}

async function loadSnap(clientKey: string) {
  if (window.snap) return;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-midtrans-snap]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Gagal memuat Midtrans Snap')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
    script.dataset.clientKey = clientKey;
    script.dataset.midtransSnap = 'true';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Gagal memuat Midtrans Snap'));
    document.head.appendChild(script);
  });
}

export async function payCompletedJob(jobId: string, onFinished?: () => void) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Sesi login tidak ditemukan');

  const response = await fetch('/api/midtrans/create-transaction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ job_id: jobId }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.token || !result.client_key) throw new Error(result.error || 'Gagal membuat transaksi pembayaran');

  await loadSnap(result.client_key);
  if (!window.snap) throw new Error('Midtrans Snap belum siap');

  window.snap.pay(result.token, {
    onSuccess: onFinished,
    onPending: onFinished,
    onError: onFinished,
    onClose: onFinished,
  });
}
