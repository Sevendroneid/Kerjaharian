import { useCallback, useEffect, useRef, useState } from 'react';
import { ShieldCheck, MessageCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const ADMIN_CANONICAL = '6282340871029';
const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '');
interface AdminLoginProps { onClose: () => void; }

export default function AdminLogin({ onClose }: AdminLoginProps) {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const challengeRef = useRef('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollInFlightRef = useRef(false);

  useEffect(() => { challengeRef.current = challengeId; }, [challengeId]);
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); pollRef.current = null; pollInFlightRef.current = false; }, []);

  const invokePhoneAuth = useCallback(async (body: Record<string, unknown>) => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Konfigurasi koneksi Supabase tidak tersedia.');
    const functionUrl = `${SUPABASE_URL}/functions/v1/phone-auth-otpid`;
    try {
      const result = await supabase.functions.invoke('phone-auth-otpid', { body });
      if (!result.error) return result.data;
      throw result.error;
    } catch (invokeError: any) {
      try {
        const response = await fetch(functionUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }, body: JSON.stringify(body) });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(String(payload?.error || payload?.message || `HTTP ${response.status}`));
        return payload;
      } catch (directError: any) {
        throw new Error(directError?.message || invokeError?.message || 'Gagal menghubungi layanan WhatsApp.');
      }
    }
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    pollInFlightRef.current = false;
  }, []);

  const checkStatus = useCallback(async (id?: string) => {
    const activeId = id || challengeRef.current;
    if (!activeId || pollInFlightRef.current) return false;
    pollInFlightRef.current = true;
    setChecking(true);
    try {
      const status = await invokePhoneAuth({ action: 'status', phone: ADMIN_CANONICAL, challenge_id: activeId });
      if (status?.status === 'success' && status?.action_link) {
        stopPolling();
        setMessage('Verifikasi berhasil. Membuka Admin...');
        window.location.assign(String(status.action_link));
        return true;
      }
      if (status?.status === 'expired') {
        stopPolling();
        setLoading(false);
        setMessage('Sesi WhatsApp kedaluwarsa. Silakan kirim OTP lagi.');
        return true;
      }
      setMessage('Belum terverifikasi. Tekan Kirim di WhatsApp.');
      return false;
    } catch (err: any) {
      stopPolling();
      setLoading(false);
      setError(err?.message || 'Gagal memeriksa verifikasi WhatsApp.');
      return true;
    } finally {
      pollInFlightRef.current = false;
      setChecking(false);
    }
  }, [invokePhoneAuth, stopPolling]);

  const startPolling = useCallback((id: string, startedAt: number) => {
    stopPolling();
    pollRef.current = setInterval(() => {
      if (Date.now() - startedAt > 5 * 60 * 1000) {
        stopPolling();
        setLoading(false);
        setMessage('Sesi WhatsApp kedaluwarsa. Silakan kirim OTP lagi.');
        return;
      }
      void checkStatus(id);
    }, 2000);
  }, [checkStatus, stopPolling]);

  const handleWhatsAppLogin = async () => {
    setLoading(true); setError(''); setMessage('Menyiapkan OTP WhatsApp...'); stopPolling(); setChallengeId(''); challengeRef.current = '';
    try {
      const data = await invokePhoneAuth({ action: 'request', phone: ADMIN_CANONICAL });
      if (!data?.challenge_id || !data?.verification?.wa_link) throw new Error('OTP.ID tidak mengembalikan sesi WhatsApp.');
      const id = String(data.challenge_id);
      challengeRef.current = id;
      setChallengeId(id);
      setMessage('WhatsApp siap. Tekan Kirim pada pesan OTP, lalu kembali ke KerjaHarian.');
      window.open(String(data.verification.wa_link), '_blank', 'noopener,noreferrer');
      startPolling(id, Date.now());
    } catch (err: any) {
      setLoading(false);
      setMessage('');
      setError(err?.message || 'Gagal memulai OTP WhatsApp.');
    }
  };

  return <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4"><div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
    <div className="flex items-center gap-3 mb-5"><div className="rounded-xl bg-slate-900 text-white p-2.5"><ShieldCheck size={22}/></div><div><h2 className="text-xl font-bold">Login Admin</h2><p className="text-xs text-slate-500">KerjaHarian Control Center</p></div></div>
    <div className="rounded-xl border border-green-200 bg-green-50 p-4"><div className="flex items-center gap-2 font-semibold text-green-800"><MessageCircle size={19}/> Masuk dengan WhatsApp</div><p className="text-xs text-green-700 mt-2">Gunakan verifikasi WhatsApp yang sama dengan login KerjaHarian. Tidak ada recovery khusus Admin.</p><button onClick={handleWhatsAppLogin} disabled={loading} className="w-full mt-3 bg-green-600 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-60"><MessageCircle size={17} className="inline mr-1"/>{loading ? 'Menunggu verifikasi WhatsApp...' : 'Kirim OTP via WhatsApp'}</button>{message && <p className="text-[11px] text-green-700 mt-2">{message}</p>}{challengeId && <button onClick={() => void checkStatus(challengeRef.current)} disabled={checking || !challengeId} className="w-full mt-2 border border-green-600 text-green-700 bg-white rounded-xl py-2 text-xs font-semibold disabled:opacity-60"><RefreshCw size={14} className="inline mr-1"/>{checking ? 'Memeriksa...' : 'Saya sudah kirim — cek sekarang'}</button>}</div>
    {error && <p className="text-red-500 text-xs mt-3">{error}</p>}<button onClick={onClose} disabled={loading} className="w-full mt-4 text-xs text-slate-500 py-2">Kembali</button>
  </div></div>;
}
