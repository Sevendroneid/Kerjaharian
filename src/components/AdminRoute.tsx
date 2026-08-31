import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminRoute({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'allowed' | 'denied'>('loading');
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (!user) {
        setDebugInfo(`Tidak ada user login. Error: ${userError?.message || 'tidak ada sesi aktif'}`);
        return setStatus('denied');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (profileError) {
        setDebugInfo(`User login (id: ${user.id}), tapi gagal ambil profil. Error: ${profileError.message}`);
        return setStatus('denied');
      }

      setDebugInfo(`User login (id: ${user.id}). is_admin di database: ${profile?.is_admin}`);
      setStatus(profile?.is_admin ? 'allowed' : 'denied');
    })();
  }, []);

  if (status === 'loading') return <div className="p-6">Memuat...</div>;
  if (status === 'denied') return (
    <div className="p-6">
      <p>Akses ditolak — halaman ini khusus admin.</p>
      <p className="text-xs text-gray-400 mt-4 break-all">{debugInfo}</p>
    </div>
  );
  return <>{children}</>;
}
