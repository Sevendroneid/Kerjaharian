import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminRoute({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'allowed' | 'denied'>('loading');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setStatus('denied');
      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
      setStatus(profile?.is_admin ? 'allowed' : 'denied');
    })();
  }, []);

  if (status === 'loading') return <div className="p-6">Memuat...</div>;
  if (status === 'denied') return <div className="p-6">Akses ditolak — halaman ini khusus admin.</div>;
  return <>{children}</>;
}
