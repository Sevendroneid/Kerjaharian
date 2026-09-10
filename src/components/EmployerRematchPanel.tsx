import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatIDR, timeAgo } from '@/lib/format';
import { useAuth } from '@/lib/auth';

type RematchOrder = {
  id: string;
  status: string;
  worker_id: string | null;
  total_price: number;
  created_at: string;
  title: string | null;
};

const REASONS = [
  { value: 'job_fit', label: 'Tidak sesuai kebutuhan pekerjaan' },
  { value: 'worker_no_show', label: 'Pekerja tidak hadir' },
  { value: 'late', label: 'Pekerja terlambat' },
  { value: 'communication', label: 'Masalah komunikasi' },
  { value: 'safety_concern', label: 'Ada kekhawatiran keselamatan' },
  { value: 'other', label: 'Alasan lain' },
] as const;

export function EmployerRematchPanel({ lang = 'id' }: { lang?: 'id' | 'en' }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<RematchOrder[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('orders')
      .select('id,status,worker_id,total_price,created_at,title')
      .eq('employer_id', user.id)
      .eq('status', 'assigned')
      .not('worker_id', 'is', null)
      .order('created_at', { ascending: false });
    setOrders((data ?? []) as RematchOrder[]);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const requestRematch = async (order: RematchOrder) => {
    const selected = window.prompt(
      lang === 'id'
        ? 'Pilih alasan rematch dengan mengetik nomor:\n1. Tidak sesuai kebutuhan pekerjaan\n2. Pekerja tidak hadir\n3. Pekerja terlambat\n4. Masalah komunikasi\n5. Kekhawatiran keselamatan\n6. Alasan lain'
        : 'Enter rematch reason number:\n1. Job does not fit\n2. Worker no-show\n3. Worker late\n4. Communication issue\n5. Safety concern\n6. Other'
    );
    if (!selected) return;
    const reason = REASONS[Number(selected) - 1];
    if (!reason) {
      setMessage(lang === 'id' ? 'Pilihan alasan tidak valid.' : 'Invalid reason.');
      return;
    }

    const ok = window.confirm(
      lang === 'id'
        ? 'Pekerja akan dilepas dari pesanan dan pesanan dibuka kembali untuk mencari pekerja lain. Lanjutkan?'
        : 'The worker will be released and the order reopened for another worker. Continue?'
    );
    if (!ok) return;

    setBusy(order.id);
    setMessage('');
    const { error } = await supabase.rpc('employer_request_rematch', {
      p_order_id: order.id,
      p_reason: reason.value,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(lang === 'id' ? 'Pesanan dibuka kembali. KerjaHarian akan mencari pekerja lain.' : 'Order reopened. KerjaHarian can match another worker.');
      await load();
    }
    setBusy(null);
  };

  if (!user || orders.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-4">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-base font-bold text-slate-900">
              {lang === 'id' ? 'Tidak cocok dengan pekerja?' : 'Worker not a fit?'}
            </h2>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              {lang === 'id'
                ? 'Tidak perlu memaksa transaksi. Minta pekerja lain berdasarkan kebutuhan pekerjaan. KerjaHarian tidak menggunakan ras, penampilan, atau prasangka sebagai kriteria pencocokan.'
                : 'You do not have to force the transaction. Request another worker based on job needs. KerjaHarian does not use race, appearance, or assumptions as matching criteria.'}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="rounded-xl border border-amber-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{order.title || 'Pekerjaan'}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {timeAgo(order.created_at, lang)} · {formatIDR(order.total_price)}
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">Pekerja ditugaskan</span>
              </div>
              <button
                type="button"
                disabled={busy === order.id}
                onClick={() => void requestRematch(order)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-100 px-4 py-2.5 text-sm font-bold text-amber-900 hover:bg-amber-200 disabled:opacity-60"
              >
                {busy === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {lang === 'id' ? 'Minta Pekerja Lain' : 'Request Another Worker'}
              </button>
            </div>
          ))}
        </div>

        {message && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-amber-200">
            {message.includes('dibuka') || message.includes('reopened') ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" /> : <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />}
            <span>{message}</span>
          </div>
        )}
      </div>
    </section>
  );
}
