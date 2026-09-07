import { useState } from 'react';
import { Fingerprint, LockKeyhole, ShieldCheck, X } from 'lucide-react';
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

function adminEmailFromPhone(phone: string) {
  return `${phone.replace(/^\+/, '')}@kerjaharian.app`;
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
      return 'Credential Fingerprint tidak terdaftar di server untuk domain produksi ini. Masuk dengan PIN lalu daftarkan ulang Passkey.';
    case 'webauthn_verification_failed':
      return 'Credential Fingerprint ditolak server. Ini biasanya terjadi bila credential dibuat pada origin/domain yang berbeda. KerjaHarian sekarang mengunci login Admin ke domain produksi www.kerjaharian.my.id; masuk dengan PIN lalu daftarkan ulang Passkey di sana.';
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
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supported = typeof window !== 'undefined' && !!window.PublicKeyCredential;

  const loginWithPin = async () => {
    const normalized = normalizePhone(phone);
    if (!/^\+62\d{9,14}$/.test(normalized)) { setError('Nomor HP Admin belum valid.'); return; }
    if (!/^\d{8}$/.test(pin)) { setError('PIN Admin harus tepat 8 digit.'); return; }
    setLoading(true); setError('');
    try {
      const email = adminEmailFromPhone(normalized);
      const { error: signInError } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password: pin }),
        12000,
        'Login PIN timeout. Silakan coba lagi.',
      );
      if (signInError) throw signInError;
      await assertAdminAndFinish(onSuccess);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login PIN Admin gagal.');
    } finally { setLoading(false); }
  };

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

  return <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
      <div className="flex items-center gap-3 mb-5">
        <div className="rounded-xl bg-slate-900 text-white p-2.5"><ShieldCheck size={22}/></div>
        <div className="flex-1"><h2 className="text-xl font-bold">Login Admin</h2><p className="text-xs text-slate-500">KerjaHarian Control Center</p></div>
        <button onClick={onClose} type="button" className="rounded-lg p-2 hover:bg-slate-100" aria-label="Tutup"><X size={18}/></button>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        Setelah logout, Admin dapat masuk kembali dengan <b>PIN 8 digit</b> atau <b>Fingerprint / Passkey</b>. WhatsApp OTP tidak digunakan pada login Admin.
      </div>
      <div className="mt-4 space-y-3">
        <label className="block text-sm font-medium text-slate-700">Nomor HP Admin
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" inputMode="tel" autoComplete="tel" className="mt-1 w-full rounded-xl border px-3 py-3" />
        </label>
        <label className="block text-sm font-medium text-slate-700">PIN Admin
          <input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))} type="password" inputMode="numeric" autoComplete="current-password" maxLength={8} placeholder="8 digit PIN" className="mt-1 w-full rounded-xl border px-3 py-3 text-center tracking-[0.35em]" onKeyDown={e => { if (e.key === 'Enter') void loginWithPin(); }} />
        </label>
        <button onClick={() => void loginWithPin()} disabled={loading} className="w-full bg-slate-900 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-60"><LockKeyhole size={17} className="inline mr-1"/>{loading ? 'Memverifikasi...' : 'Masuk dengan PIN'}</button>
        {supported && <>
          <div className="flex items-center gap-2 text-[11px] text-slate-400"><span className="h-px flex-1 bg-slate-200"/><span>ATAU</span><span className="h-px flex-1 bg-slate-200"/></div>
          <button onClick={() => void loginWithPasskey()} disabled={loading} className="w-full border border-slate-300 rounded-xl py-3 text-sm font-semibold disabled:opacity-60"><Fingerprint size={18} className="inline mr-1"/>{loading ? 'Menunggu biometrik...' : 'Masuk dengan Fingerprint / Passkey'}</button>
        </>}
        {error && <div className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</div>}
      </div>
    </div>
  </div>;
}
