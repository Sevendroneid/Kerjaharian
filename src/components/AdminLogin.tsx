import { useState } from 'react';
import { Fingerprint, LockKeyhole, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const ADMIN_PHONE = '+6282340871029';
interface AdminLoginProps { onClose: () => void; }

export default function AdminLogin({ onClose }: AdminLoginProps) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passkeySupported] = useState(() => typeof window !== 'undefined' && !!window.PublicKeyCredential);

  const handlePin = async () => {
    if (!/^\d{8}$/.test(pin)) return setError('Masukkan PIN Admin 8 digit.');
    setLoading(true); setError('');
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ phone: ADMIN_PHONE, password: pin });
      if (authError) throw authError;
      if (!data.user) throw new Error('Sesi admin tidak terbentuk.');
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
      if (profile?.role !== 'admin') { await supabase.auth.signOut(); throw new Error('Nomor ini bukan akun Admin KerjaHarian.'); }
      onClose();
    } catch (err: any) { setError(err?.message || 'PIN admin salah atau belum diaktifkan.'); }
    finally { setLoading(false); }
  };

  const handlePasskey = async () => {
    setLoading(true); setError('');
    try {
      const { data, error: authError } = await supabase.auth.signInWithPasskey();
      if (authError) throw authError;
      if (data?.user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
        if (profile?.role !== 'admin') { await supabase.auth.signOut(); throw new Error('Passkey ini bukan milik akun Admin KerjaHarian.'); }
      }
      onClose();
    } catch (err: any) { setError(err?.message || 'Passkey belum terdaftar di perangkat ini.'); }
    finally { setLoading(false); }
  };

  return <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4"><div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
    <div className="flex items-center gap-3 mb-5"><div className="rounded-xl bg-slate-900 text-white p-2.5"><ShieldCheck size={22}/></div><div><h2 className="text-xl font-bold">Login Admin</h2><p className="text-xs text-slate-500">082340871029</p></div></div>
    <label className="text-xs font-semibold text-slate-600">PIN Admin</label><input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g,'').slice(0,8))} type="password" inputMode="numeric" autoComplete="current-password" maxLength={8} placeholder="8 digit PIN" className="w-full border rounded-xl px-4 py-3 mt-1 text-center text-lg tracking-[0.35em]" onKeyDown={e => { if (e.key === 'Enter') void handlePin(); }} />
    <button onClick={handlePin} disabled={loading} className="w-full mt-3 bg-slate-900 text-white rounded-xl py-3 font-semibold disabled:opacity-60"><LockKeyhole size={17} className="inline mr-1"/>{loading ? 'Memproses...' : 'Masuk dengan PIN'}</button>
    {passkeySupported && <><div className="flex items-center gap-3 my-4 text-xs text-slate-400"><span className="h-px bg-slate-200 flex-1"/>atau<span className="h-px bg-slate-200 flex-1"/></div><button onClick={handlePasskey} disabled={loading} className="w-full border border-slate-300 rounded-xl py-3 font-semibold disabled:opacity-60"><Fingerprint size={18} className="inline mr-1"/>Fingerprint / Passkey</button></>}
    {error && <p className="text-red-500 text-xs mt-3">{error}</p>}<button onClick={onClose} disabled={loading} className="w-full mt-4 text-xs text-slate-500 py-2">Kembali</button>
  </div></div>;
}
