import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminRoute({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'allowed' | 'denied'>('loading');

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (active) setStatus('denied');
        return;
      }

      // `role=admin` is the canonical authorization gate used by the
      // current KYC/server-side admin functions. Keep the UI gate aligned
      // with the database security model rather than relying on a debug flag.
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!active) return;
      if (error || profile?.role !== 'admin') {
        setStatus('denied');
        return;
      }
      setStatus('allowed');
    })();
    return () => { active = false; };
  }, []);

  if (status === 'loading') {
    return <div className="min-h-screen grid place-items-center bg-slate-950 text-white"><div className="text-sm font-semibold">Memverifikasi akses admin…</div></div>;
  }

  if (status === 'denied') {
    return <div className="min-h-screen grid place-items-center bg-slate-950 p-6 text-white"><div className="w-full max-w-md rounded-2xl bg-white/10 p-6 text-center ring-1 ring-white/10"><h1 className="text-lg font-extrabold">Akses ditolak</h1><p className="mt-2 text-sm text-slate-300">Console ini hanya dapat dibuka oleh akun dengan role Admin.</p><button onClick={() => window.location.assign('/')} className="mt-5 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900">Kembali ke KerjaHarian</button></div></div>;
  }

  return <>{children}</>;
}
