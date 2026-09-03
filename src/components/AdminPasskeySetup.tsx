import { useEffect, useState } from 'react';
import { Fingerprint, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AdminPasskeySetup() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [ready, setReady] = useState(false);
  const supported = typeof window !== 'undefined' && !!window.PublicKeyCredential;

  useEffect(() => {
    let active = true;
    (async () => {
      if (!supported) return;
      try {
        const { data } = await supabase.auth.passkey.list();
        if (active) setReady(Boolean(data?.length));
      } catch (_) {}
    })();
    return () => { active = false; };
  }, [supported]);

  if (!supported) return null;

  const register = async () => {
    setLoading(true); setMessage('');
    try {
      const { data, error } = await supabase.auth.registerPasskey();
      if (error) throw error;
      setReady(true);
      setMessage(data?.friendly_name ? `Passkey ${data.friendly_name} aktif.` : 'Fingerprint / Passkey berhasil diaktifkan.');
    } catch (err: any) { setMessage(err?.message || 'Gagal mengaktifkan Passkey.'); }
    finally { setLoading(false); }
  };

  return <div className="rounded-2xl border bg-white p-4 shadow-sm"><div className="flex items-center gap-3"><div className="rounded-xl bg-slate-100 p-2"><ShieldCheck size={19}/></div><div className="flex-1"><p className="font-semibold text-sm">Keamanan Admin</p><p className="text-xs text-slate-500">{ready ? 'Fingerprint / Passkey sudah aktif di perangkat ini.' : 'Aktifkan login biometrik agar login berikutnya tanpa OTP.'}</p></div></div>{!ready && <button onClick={register} disabled={loading} className="w-full mt-3 border border-slate-300 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60"><Fingerprint size={17} className="inline mr-1"/>{loading ? 'Menyiapkan biometrik...' : 'Aktifkan Fingerprint / Passkey'}</button>}{message && <p className="text-xs text-slate-600 mt-2">{message}</p>}</div>;
}
