import { useEffect, useRef, useState } from 'react';
import { Fingerprint, LockKeyhole, ShieldCheck, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const ADMIN_PHONE = '+6282340871029';
const ADMIN_CANONICAL = '6282340871029';
interface AdminLoginProps { onClose: () => void; }

export default function AdminLogin({ onClose }: AdminLoginProps) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recovery, setRecovery] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [passkeySupported] = useState(() => typeof window !== 'undefined' && !!window.PublicKeyCredential);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const handlePin = async () => {
    if (!/^\d{8}$/.test(pin)) return setError('Masukkan PIN Admin 8 digit.');
    setLoading(true); setError('');
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email: `${ADMIN_CANONICAL}@kerjaharian.app`, password: pin });
      if (authError) throw authError;
      if (!data.user) throw new Error('Sesi admin tidak terbentuk.');
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
      if (profile?.role !== 'admin') { await supabase.auth.signOut(); throw new Error('Akun ini bukan Admin KerjaHarian.'); }
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

  const handleWhatsAppRecovery = async () => {
    setLoading(true); setError(''); setRecovery(true); setRecoveryMessage('Menyiapkan verifikasi WhatsApp...');
    try {
      const { data, error: requestError } = await supabase.functions.invoke('phone-auth-otpid', { body: { action: 'request', phone: ADMIN_CANONICAL } });
      if (requestError) throw requestError;
      if (!data?.challenge_id || !data?.verification?.wa_link) throw new Error('OTP.ID tidak mengembalikan sesi WhatsApp.');
      setRecoveryMessage('WhatsApp sudah disiapkan. Tekan Kirim pada pesan verifikasi.');
      window.open(data.verification.wa_link, '_blank', 'noopener,noreferrer');
      const startedAt = Date.now();
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        if (Date.now() - startedAt > 5 * 60 * 1000) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null; setLoading(false); setRecoveryMessage('Sesi WhatsApp kedaluwarsa. Silakan mulai lagi.'); return;
        }
        try {
          const { data: status, error: statusError } = await supabase.functions.invoke('phone-auth-otpid', { body: { action: 'status', phone: ADMIN_CANONICAL, challenge_id: data.challenge_id } });
          if (statusError) throw statusError;
          if (status?.status === 'success' && status?.action_link) {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null; window.location.assign(status.action_link); return;
          }
          if (status?.status === 'expired') {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null; setLoading(false); setRecoveryMessage('Sesi WhatsApp kedaluwarsa. Silakan mulai lagi.');
          }
        } catch (err: any) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null; setLoading(false); setError(err?.message || 'Gagal memeriksa verifikasi WhatsApp.');
        }
      }, 2000);
    } catch (err: any) { setLoading(false); setRecoveryMessage(''); setError(err?.message || 'Gagal memulai pemulihan Admin melalui WhatsApp.'); }
  };

  return <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4"><div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
    <div className="flex items-center gap-3 mb-5"><div className="rounded-xl bg-slate-900 text-white p-2.5"><ShieldCheck size={22}/></div><div><h2 className="text-xl font-bold">Login Admin</h2><p className="text-xs text-slate-500">082340871029</p></div></div>
    <label className="text-xs font-semibold text-slate-600">PIN Admin</label><input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g,'').slice(0,8))} type="password" inputMode="numeric" autoComplete="current-password" maxLength={8} placeholder="8 digit PIN" className="w-full border rounded-xl px-4 py-3 mt-1 text-center text-lg tracking-[0.35em]" onKeyDown={e => { if (e.key === 'Enter') void handlePin(); }} />
    <button onClick={handlePin} disabled={loading} className="w-full mt-3 bg-slate-900 text-white rounded-xl py-3 font-semibold disabled:opacity-60"><LockKeyhole size={17} className="inline mr-1"/>{loading ? 'Memproses...' : 'Masuk dengan PIN'}</button>
    {passkeySupported && <><div className="flex items-center gap-3 my-4 text-xs text-slate-400"><span className="h-px bg-slate-200 flex-1"/>atau<span className="h-px bg-slate-200 flex-1"/></div><button onClick={handlePasskey} disabled={loading} className="w-full border border-slate-300 rounded-xl py-3 font-semibold disabled:opacity-60"><Fingerprint size={18} className="inline mr-1"/>Fingerprint / Passkey</button></>}
    <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3"><p className="text-xs font-semibold text-green-800">Belum punya PIN atau fingerprint?</p><p className="text-[11px] text-green-700 mt-1">Pulihkan akses Admin melalui WhatsApp, lalu atur PIN dan fingerprint dari dashboard.</p><button onClick={handleWhatsAppRecovery} disabled={loading} className="w-full mt-2 border border-green-600 text-green-700 bg-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60"><MessageCircle size={17} className="inline mr-1"/>{loading ? 'Menunggu verifikasi WhatsApp...' : 'Pulihkan via WhatsApp'}</button>{recoveryMessage && <p className="text-[11px] text-green-700 mt-2">{recoveryMessage}</p>}</div>
    {error && <p className="text-red-500 text-xs mt-3">{error}</p>}<button onClick={onClose} disabled={loading} className="w-full mt-4 text-xs text-slate-500 py-2">Kembali</button>
  </div></div>;
}
