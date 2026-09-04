import { useCallback, useState } from 'react';
import { ShieldCheck, MessageCircle, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const ADMIN_CANONICAL = '6282340871029';
const OTP_PROXY_URL = '/api/phone-auth-otpid';
interface AdminLoginProps { onClose: () => void; }

export default function AdminLogin({ onClose }: AdminLoginProps) {
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [otp, setOtp] = useState('');

  const invokePhoneAuth = useCallback(async (body: Record<string, unknown>) => {
    let response: Response;
    try {
      response = await fetch(OTP_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (error: any) {
      throw new Error(error?.message === 'Failed to fetch'
        ? 'Koneksi ke layanan WhatsApp terputus. Periksa koneksi internet lalu coba lagi.'
        : String(error?.message || 'Gagal menghubungi layanan WhatsApp.'));
    }
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(String(payload?.error || payload?.message || `HTTP ${response.status}`));
    return payload;
  }, []);

  const completeSession = useCallback(async (data: any) => {
    if (data?.action_link) {
      window.location.assign(String(data.action_link));
      return;
    }
    if (data?.token_hash) {
      const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: String(data.token_hash), type: 'email' });
      if (verifyError) throw verifyError;
      setMessage('Verifikasi berhasil. Membuka Admin...');
      return;
    }
    throw new Error('Layanan login tidak mengembalikan token sesi.');
  }, []);

  const handleRequestOtp = async () => {
    setLoading(true); setError(''); setMessage('Mengirim OTP WhatsApp...'); setChallengeId(''); setOtp('');
    try {
      const data = await invokePhoneAuth({ action: 'request', phone: ADMIN_CANONICAL });
      if (!data?.challenge_id) throw new Error('OTP.ID tidak mengembalikan sesi OTP.');
      setChallengeId(String(data.challenge_id));
      setMessage('OTP 6 digit sudah dikirim ke WhatsApp Admin. Masukkan kode di bawah.');
    } catch (err: any) {
      setMessage('');
      setError(err?.message || 'Gagal mengirim OTP WhatsApp.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!challengeId) return;
    const code = otp.replace(/\D/g, '');
    if (!/^\d{6}$/.test(code)) {
      setError('Masukkan kode OTP 6 digit yang dikirim ke WhatsApp.');
      return;
    }
    setVerifying(true); setError(''); setMessage('Memverifikasi OTP...');
    try {
      const data = await invokePhoneAuth({ action: 'verify', phone: ADMIN_CANONICAL, challenge_id: challengeId, code });
      if (data?.status === 'mismatch') throw new Error('Kode OTP salah. Periksa kembali kode di WhatsApp.');
      await completeSession(data);
    } catch (err: any) {
      setMessage('');
      setError(err?.message || 'Gagal memverifikasi OTP.');
    } finally {
      setVerifying(false);
    }
  };

  return <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4"><div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
    <div className="flex items-center gap-3 mb-5"><div className="rounded-xl bg-slate-900 text-white p-2.5"><ShieldCheck size={22}/></div><div><h2 className="text-xl font-bold">Login Admin</h2><p className="text-xs text-slate-500">KerjaHarian Control Center</p></div></div>
    <div className="rounded-xl border border-green-200 bg-green-50 p-4"><div className="flex items-center gap-2 font-semibold text-green-800"><MessageCircle size={19}/> Verifikasi WhatsApp</div><p className="text-xs text-green-700 mt-2">Klik kirim. OTP.ID akan mengirim kode 6 digit ke WhatsApp Admin. Ketik kode tersebut di sini untuk masuk.</p>
      <button onClick={handleRequestOtp} disabled={loading || verifying} className="w-full mt-3 bg-green-600 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-60"><MessageCircle size={17} className="inline mr-1"/>{loading ? 'Mengirim OTP...' : challengeId ? 'Kirim OTP Baru' : 'Kirim OTP via WhatsApp'}</button>
      {challengeId && <><label className="block text-xs font-semibold text-slate-700 mt-4 mb-1">Kode OTP</label><input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} onKeyDown={(e) => { if (e.key === 'Enter') void handleVerifyOtp(); }} inputMode="numeric" autoComplete="one-time-code" placeholder="Masukkan 6 digit" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-xl font-bold tracking-[0.35em] focus:outline-none focus:ring-2 focus:ring-green-500" autoFocus/><button onClick={() => void handleVerifyOtp()} disabled={verifying || otp.length !== 6} className="w-full mt-3 bg-slate-900 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-60"><ArrowRight size={17} className="inline mr-1"/>{verifying ? 'Memverifikasi...' : 'Verifikasi & Masuk'}</button><p className="text-[11px] text-slate-500 mt-2 text-center">Kode berlaku selama 5 menit. Jangan bagikan kode kepada siapa pun.</p></>}
      {message && <p className="text-[11px] text-green-700 mt-2">{message}</p>}
    </div>
    {error && <p className="text-red-500 text-xs mt-3">{error}</p>}<button onClick={onClose} disabled={loading || verifying} className="w-full mt-4 text-xs text-slate-500 py-2">Kembali</button>
  </div></div>;
}
