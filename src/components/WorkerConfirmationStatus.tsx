import { useCallback, useEffect, useState } from 'react';
import { Clock3, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

type Pending = { id: string; expires_at: string; job: { title: string | null } | null };

export function WorkerConfirmationStatus() {
  const { user } = useAuth();
  const [items, setItems] = useState<Pending[]>([]);
  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('dispatch_confirmations').select('id,expires_at,job:jobs!dispatch_confirmations_job_id_fkey(title)').eq('worker_id', user.id).eq('status', 'pending').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(5);
    setItems((data ?? []) as unknown as Pending[]);
  }, [user]);
  useEffect(() => { void load(); if (!user) return; const timer = window.setInterval(() => void load(), 3000); return () => window.clearInterval(timer); }, [load, user]);
  if (!user || items.length === 0) return null;
  return <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5" aria-live="polite"><div className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-amber-700"/><div><h2 className="font-display font-bold text-slate-900">Menunggu Konfirmasi Employer</h2><p className="text-xs text-slate-600">Anda sudah menerima tawaran. Jangan berangkat dulu sampai employer mengonfirmasi.</p></div></div><div className="mt-3 space-y-2">{items.map(item => <div key={item.id} className="flex items-center gap-2 rounded-xl bg-white p-3 text-sm font-semibold text-slate-700 ring-1 ring-amber-100"><ShieldCheck className="h-4 w-4 text-amber-600"/>{item.job?.title || 'Pekerjaan'}<span className="ml-auto text-xs font-bold text-amber-700">Maks. 2 menit</span></div>)}</div></section>;
}
