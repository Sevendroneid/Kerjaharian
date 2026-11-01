import { useState } from 'react';
import { Fingerprint, ShieldCheck, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AdminLoginProps { onClose: () => void; onSuccess: () => void; }

const ADMIN_CANONICAL_ORIGIN = 'https://www.kerjaharian.my.id';

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `+62${digits.slice(1)}`;
  if (digits.startsWith('62')) return `+${digits}`;
  return `+62${digits}`;
}

function canonicalPhone(value: string) { return normalizePhone(value).replace(/^\+/, ''); }

async function callPhoneAuth(body: Record<string, unknown>) {
  const response = await fetch('/api/phone-auth-otpid', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body), cache: 'no-store' });
  const text = await response.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { error: text || `HTTP ${response.status}` }; }
  if (!response.ok || data?.error) throw new Error(data?.error || `Server OTP mengembalikan HTTP ${response.status}`);
  return data;
}

async function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error(label)), ms); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function assertAdminAndFinish(onSuccess: () => void) {
  const { data: { user }, error: userError } = await withTimeout(supabase.auth.getUser(), 8000, 'Sesi Admin timeout.');
  if (userError) throw userError;
  if (!user) throw new Error('Login gagal: sesi Admin tidak terbentuk.');
  const { data: profile, error: profileError } = await withTimeout(
    supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
    8000,
    'Pemeriksaan akun Admin timeout.',
  );
  if (profileError) throw profileError;
  if (profile?.role !== 'admin') {
    await supabase.auth.signOut();
    throw new Error('Akun ini bukan akun Administrator KerjaHarian.');
  }
  onSuccess();
}

function readablePasskeyError(error: unknown) {
  const value = error as { code?: string; message?: string } | null;
  switch (value?.code) {
    case 'webauthn_credential_not_found':
      return 'Credential Fingerprint tidak terdaftar di server untuk domain produksi ini. Masuk dengan OTP WhatsApp lalu daftarkan ulang Passkey.';
    case 'webauthn_verification_failed':
      return 'Credential Fingerprint ditolak server. Ini biasanya terjadi bila credential dibuat pada origin/domain yang berbeda. KerjaHarian sekarang mengunci login Admin ke domain produksi www.kerjaharian.my.id; masuk dengan OTP WhatsApp lalu daftarkan ulang Passkey di sana.';
    case 'webauthn_challenge_expired':
    case 'webauthn_challenge_not_found':
      return 'Sesi verifikasi Fingerprint kedaluwarsa. Tekan Fingerprint sekali lagi untuk membuat challenge baru.';
    case 'passkey_disabled':
      return 'Passkey belum aktif di konfigurasi Supabase Auth.';
    case 'email_not_confirmed':
    case 'phone_not_confirmed':
      return 'Identitas Admin belum terkonfirmasi di Supabase Auth.';
    default:
      return value?.message || 'Login Fingerprint / Passkey gagal.';
  }
}

export default function AdminLogin({ onClose, onSuccess }: AdminLoginProps) {
  const [phone, setPhone] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supported = typeof window !== 'undefined' && !!window.PublicKeyCredential;

  const loginWithPasskey = async () => {
    setLoading(true); setError('');
    try {
      if (!supported) throw new Error('Browser/perangkat ini tidak mendukung Passkey.');
      // WebAuthn credentials are bound to their RP ID/origin. Always run the Admin
      // ceremony on the single canonical production origin so www/apex/pages.dev
      // cannot create an origin mismatch that results in server verification failure.
      if (window.location.origin !== ADMIN_CANONICAL_ORIGIN) {
        window.location.replace(`${ADMIN_CANONICAL_ORIGIN}/rahasia`);
        return;
      }
      if (typeof supabase.auth.signInWithPasskey !== 'function') throw new Error('Passkey belum tersedia pada client KerjaHarian.');
      const result = await withTimeout(supabase.auth.signInWithPasskey(), 30000, 'Verifikasi Fingerprint/Passkey timeout.');
      if (result.error) throw result.error;
      await assertAdminAndFinish(onSuccess);
    } catch (err: unknown) {
      setError(readablePasskeyError(err));
    } finally { setLoading(false); }
  };

  const sendOtp = async () => {
    const normalized = normalizePhone(phone);
    if (!/^\+62\d{9,14}$/.test(normalized)) { setError('Nomor HP Admin belum valid.'); return; }
    setLoading(true); setError('');
    try {
      const data = await callPhoneAuth({ action: 'request', phone: canonicalPhone(normalized) });
      if (!data?.challenge_id) throw new Error('OTP WhatsApp gagal dikirim.');
      setPhone(normalized); setChallengeId(data.challenge_id); setOtpCode('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim OTP WhatsApp.');
    } finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    const code = otpCode.replace(/\D/g, '');
    if (!challengeId) { setError('Kirim OTP WhatsApp terlebih dahulu.'); return; }
    if (code.length < 3) { setError('Masukkan kode OTP.'); return; }
    setLoading(true); setError('');
    try {
      const data = await callPhoneAuth({ action: 'verify', phone: canonicalPhone(phone), challenge_id: challengeId, code });
      if (data?.status !== 'success' || !data?.token_hash) throw new Error('Verifikasi OTP gagal.');
      const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: 'magiclink' });
      if (verifyError) throw verifyError;
      await assertAdminAndFinish(onSuccess);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verifikasi OTP Admin gagal.');
    } finally { setLoading(false); }
  };

  return <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
      <div className="flex items-center gap-3 mb-5">
        <div className="rounded-xl bg-slate-900 text-white p-2.5"><ShieldCheck size={22}/></div>
        <div className="flex-1"><h2 className="text-xl font-bold">Login Admin</h2><p className="text-xs text-slate-500">KerjaHarian Control Center</p></div>
        <button onClick={onClose} type="button" className="rounded-lg p-2 hover:bg-slate-100" aria-label="Tutup"><X size={18}/></button>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        Login Admin menggunakan OTP WhatsApp melalui OTP.ID. Fingerprint / Passkey tetap tersedia sebagai alternatif pada domain produksi resmi.
      </div>
      <div className="mt-4 space-y-3">
        <label className="block text-sm font-medium text-slate-700">Nomor HP Admin
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" inputMode="tel" autoComplete="tel" className="mt-1 w-full rounded-xl border px-3 py-3" />
        </label>
        {!challengeId ? <button onClick={() => void sendOtp()} disabled={loading} className="w-full bg-slate-900 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-60">{loading ? 'Mengirim OTP...' : 'Kirim OTP WhatsApp'}</button> : <>
          <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800">OTP terkirim. Periksa WhatsApp Admin.</div>
          <input value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="Kode OTP" className="w-full rounded-xl border px-3 py-3 text-center tracking-[0.4em]" onKeyDown={e => { if (e.key === 'Enter') void verifyOtp(); }} />
          <button onClick={() => void verifyOtp()} disabled={loading} className="w-full bg-slate-900 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-60">{loading ? 'Memverifikasi...' : 'Verifikasi OTP & Masuk'}</button>
          <button onClick={() => { setChallengeId(null); setOtpCode(''); }} type="button" className="w-full py-2 text-sm text-slate-600 underline">Kirim ulang / ganti nomor</button>
        </>}
        {supported && <>
          <div className="flex items-center gap-2 text-[11px] text-slate-400"><span className="h-px flex-1 bg-slate-200"/><span>ATAU</span><span className="h-px flex-1 bg-slate-200"/></div>
          <button onClick={() => void loginWithPasskey()} disabled={loading} className="w-full border border-slate-300 rounded-xl py-3 text-sm font-semibold disabled:opacity-60"><Fingerprint size={18} className="inline mr-1"/>{loading ? 'Menunggu biometrik...' : 'Masuk dengan Fingerprint / Passkey'}</button>
        </>}
        {error && <div className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</div>}
      </div>
    </div>
  </div>;
}
