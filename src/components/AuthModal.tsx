import { useEffect, useState } from 'react';
import { CheckCircle2, Fingerprint, LockKeyhole, MessageCircle, ShieldCheck, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

type Step = 'login' | 'otp' | 'pin' | 'profile' | 'passkey';
interface AuthModalProps { open: boolean; onClose: () => void; lang?: 'id' | 'en'; }

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `+62${digits.slice(1)}`;
  if (digits.startsWith('62')) return `+${digits}`;
  return `+62${digits}`;
}
function canonicalPhone(value: string) { return normalizePhone(value).replace(/^\+/, ''); }
function internalEmailFromPhone(phone: string) { return `${phone.replace(/^\+/, '')}@kerjaharian.app`; }

async function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([Promise.resolve(promise), new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error(label)), ms); })]); }
  finally { if (timer) clearTimeout(timer); }
}

async function callPhoneAuth(body: Record<string, unknown>) {
  const response = await fetch('/api/phone-auth-otpid', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body), cache: 'no-store' });
  const text = await response.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { error: text || `HTTP ${response.status}` }; }
  if (!response.ok || data?.error) throw new Error(data?.error || `Server OTP mengembalikan HTTP ${response.status}`);
  return data;
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState<Step>('login');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [role, setRole] = useState<'worker' | 'employer'>('worker');
  const [roleSelected, setRoleSelected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supported = typeof window !== 'undefined' && !!window.PublicKeyCredential;

  useEffect(() => {
    if (!open) return;
    setError('');
    if (user && profile?.full_name) { onClose(); return; }
    if (user && !profile?.full_name) {
      setStep('profile'); setFullName(typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : ''); setProfilePhone(user.phone || phone || '');
    }
  }, [open, user, profile, phone, onClose]);

  const finishProfile = async () => { await refreshProfile(); setStep('passkey'); };

  const loginWithPin = async () => {
    const normalized = normalizePhone(phone);
    if (!/^\+62\d{9,14}$/.test(normalized)) { setError('Nomor HP belum valid.'); return; }
    if (!/^\d{6,8}$/.test(pin)) { setError('PIN harus 6–8 digit.'); return; }
    setLoading(true); setError('');
    try {
      const { error: signInError } = await withTimeout(supabase.auth.signInWithPassword({ email: internalEmailFromPhone(normalized), password: pin }), 12000, 'Login PIN timeout. Silakan coba lagi.');
      if (signInError) throw signInError;
      const { data: current } = await supabase.auth.getUser();
      if (!current.user) throw new Error('Sesi login tidak terbentuk.');
      const { data: p } = await supabase.from('profiles').select('role,is_admin').eq('id', current.user.id).maybeSingle();
      if (p?.is_admin || p?.role === 'admin') { await supabase.auth.signOut(); throw new Error('Gunakan Login Admin untuk akun Administrator.'); }
      await refreshProfile(); onClose();
    } catch (err: any) { setError(err?.message || 'Login PIN gagal.'); }
    finally { setLoading(false); }
  };

  const loginWithPasskey = async () => {
    setLoading(true); setError('');
    try {
      if (!supported) throw new Error('Browser/perangkat ini tidak mendukung Passkey.');
      if (typeof supabase.auth.signInWithPasskey !== 'function') throw new Error('Passkey belum tersedia pada client KerjaHarian.');
      const result = await withTimeout(supabase.auth.signInWithPasskey(), 30000, 'Verifikasi Fingerprint/Passkey timeout.');
      if (result.error) throw result.error;
      const { data: current } = await supabase.auth.getUser();
      if (!current.user) throw new Error('Sesi login tidak terbentuk.');
      const { data: p } = await supabase.from('profiles').select('role,is_admin').eq('id', current.user.id).maybeSingle();
      if (p?.is_admin || p?.role === 'admin') { await supabase.auth.signOut(); throw new Error('Gunakan Login Admin untuk akun Administrator.'); }
      await refreshProfile(); onClose();
    } catch (err: any) { setError(err?.message || 'Login Fingerprint / Passkey gagal.'); }
    finally { setLoading(false); }
  };

  const handleSendOtp = async () => {
    const normalized = normalizePhone(phone);
    if (!/^\+62\d{9,14}$/.test(normalized)) { setError('Nomor HP belum valid, contoh 081234567890'); return; }
    setLoading(true); setError('');
    try {
      const data = await callPhoneAuth({ action: 'request', phone: canonicalPhone(phone) });
      if (!data?.challenge_id) throw new Error('Kode tidak terkirim, coba lagi');
      setPhone(normalized); setChallengeId(data.challenge_id); setOtpCode(''); setStep('otp');
    } catch (err: any) { setError(err?.message || 'Gagal mengirim kode'); }
    finally { setLoading(false); }
  };

  const handleVerifyOtp = async () => {
    const canonical = canonicalPhone(phone); const code = otpCode.replace(/\D/g, '');
    if (!challengeId) { setError('Sesi verifikasi kedaluwarsa, kirim ulang kode.'); return; }
    if (code.length < 3) { setError('Masukkan kode dari WhatsApp Anda.'); return; }
    setLoading(true); setError('');
    try {
      const data = await callPhoneAuth({ action: 'verify', phone: canonical, challenge_id: challengeId, code });
      if (data?.status !== 'success' || !data?.token_hash) throw new Error('Verifikasi gagal, coba lagi');
      const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: 'magiclink' });
      if (verifyError) throw verifyError;
      setPin(''); setPinConfirm(''); setStep('pin');
    } catch (err: any) { setError(err?.message || 'Kode salah atau kedaluwarsa'); }
    finally { setLoading(false); }
  };

  const handleCreatePin = async () => {
    if (!/^\d{6,8}$/.test(pin)) { setError('Buat PIN 6–8 digit.'); return; }
    if (pin !== pinConfirm) { setError('Konfirmasi PIN tidak sama.'); return; }
    setLoading(true); setError('');
    try {
      const { data: current } = await supabase.auth.getUser();
      if (!current.user) throw new Error('Sesi verifikasi tidak ditemukan.');
      const { error: updateError } = await supabase.auth.updateUser({ password: pin });
      if (updateError) throw updateError;
      setFullName(typeof current.user.user_metadata?.full_name === 'string' ? current.user.user_metadata.full_name : '');
      setProfilePhone(current.user.phone || phone);
      setRoleSelected(false); setStep('profile');
    } catch (err: any) { setError(err?.message || 'PIN gagal dibuat.'); }
    finally { setLoading(false); }
  };

  const handleCompleteProfile = async () => {
    if (!fullName.trim()) { setError('Isi nama lengkap.'); return; }
    if (!roleSelected) { setError('Pilih Pekerja atau Pemberi Kerja.'); return; }
    setLoading(true); setError('');
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Sesi habis, masuk lagi.');
      const normalizedPhone = normalizePhone(profilePhone || phone);
      const { error: profileError } = await supabase.from('profiles').update({ full_name: fullName.trim(), role, whatsapp: normalizedPhone || null, phone: normalizedPhone || null }).eq('id', currentUser.id);
      if (profileError) throw profileError;
      await finishProfile();
    } catch (err: any) { setError(err?.message || 'Gagal menyimpan profil.'); }
    finally { setLoading(false); }
  };

  const registerPasskey = async () => {
    setLoading(true); setError('');
    try {
      if (!supported) throw new Error('Browser/perangkat ini tidak mendukung Passkey.');
      if (typeof supabase.auth.registerPasskey !== 'function') throw new Error('Passkey belum tersedia pada client KerjaHarian.');
      const result = await withTimeout(supabase.auth.registerPasskey(), 30000, 'Pendaftaran Fingerprint/Passkey timeout.');
      if (result.error) throw result.error;
      const listed = await supabase.auth.passkey.list();
      if (listed.error) throw listed.error;
      if (!listed.data?.length) throw new Error('Passkey belum tercatat. Silakan ulangi.');
      await refreshProfile(); onClose();
    } catch (err: any) { setError(err?.message || 'Pendaftaran Fingerprint / Passkey gagal.'); }
    finally { setLoading(false); }
  };

  if (!open) return null;

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
    <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-2 font-semibold text-slate-900"><ShieldCheck className="h-5 w-5 text-blue-600" />KerjaHarian</div>
        <button onClick={onClose} type="button" className="rounded-lg p-2 hover:bg-slate-100" aria-label="Tutup"><X className="h-5 w-5" /></button>
      </div>
      <div className="p-5">
        {step === 'login' && <>
          <h2 className="text-xl font-bold text-slate-900">Masuk KerjaHarian</h2>
          <p className="mt-1 text-sm text-slate-500">Login utama sama untuk Pekerja dan Pemberi Kerja.</p>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600"><b>PIN atau Fingerprint / Passkey.</b> WhatsApp OTP hanya dipakai saat pendaftaran/verifikasi nomor, bukan setiap login.</div>
          <div className="mt-4 space-y-3">
            <label className="block text-sm font-medium text-slate-700">Nomor HP
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" inputMode="tel" autoComplete="tel" className="mt-1 w-full rounded-xl border px-3 py-3" />
            </label>
            <label className="block text-sm font-medium text-slate-700">PIN
              <input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))} type="password" inputMode="numeric" autoComplete="current-password" maxLength={8} placeholder="6–8 digit PIN" className="mt-1 w-full rounded-xl border px-3 py-3 text-center tracking-[0.35em]" onKeyDown={e => { if (e.key === 'Enter') void loginWithPin(); }} />
            </label>
            <button onClick={() => void loginWithPin()} disabled={loading} className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white disabled:opacity-60"><LockKeyhole size={17} className="mr-1 inline" />{loading ? 'Memverifikasi...' : 'Masuk dengan PIN'}</button>
            {supported && <><div className="flex items-center gap-2 text-[11px] text-slate-400"><span className="h-px flex-1 bg-slate-200"/><span>ATAU</span><span className="h-px flex-1 bg-slate-200"/></div><button onClick={() => void loginWithPasskey()} disabled={loading} className="w-full rounded-xl border border-slate-300 py-3 text-sm font-semibold disabled:opacity-60"><Fingerprint size={18} className="mr-1 inline" />{loading ? 'Menunggu biometrik...' : 'Masuk dengan Fingerprint / Passkey'}</button></>}
            <button onClick={() => { setError(''); setStep('otp'); setChallengeId(null); setOtpCode(''); }} type="button" className="w-full py-2 text-sm font-semibold text-blue-700">Daftar akun baru</button>
          </div>
        </>}

        {step === 'otp' && <>
          <h2 className="text-xl font-bold">Verifikasi Nomor</h2><p className="mt-1 text-sm text-slate-500">OTP WhatsApp hanya untuk membuktikan kepemilikan nomor saat pendaftaran.</p>
          <div className="mt-5 space-y-3">
            <label className="block text-sm font-medium text-slate-700">Nomor HP / WhatsApp<input value={phone} onChange={e => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" inputMode="tel" className="mt-1 w-full rounded-xl border px-3 py-3" /></label>
            {!challengeId ? <button onClick={() => void handleSendOtp()} disabled={loading} className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-60">{loading ? 'Mengirim...' : 'Kirim Kode WhatsApp'}</button> : <><div className="rounded-lg bg-green-50 p-3 text-sm text-green-800"><CheckCircle2 className="mr-1 inline h-5 w-5" />Kode terkirim. Cek WhatsApp Anda.</div><input value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" inputMode="numeric" maxLength={6} className="w-full rounded-xl border px-3 py-3 text-center text-lg font-semibold tracking-[0.4em]" /><button onClick={() => void handleVerifyOtp()} disabled={loading} className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-60">{loading ? 'Memeriksa...' : 'Verifikasi Nomor'}</button><button onClick={() => { setChallengeId(null); setOtpCode(''); }} type="button" className="w-full py-2 text-sm text-slate-600 underline">Kirim ulang / ganti nomor</button></>}
          </div>
        </>}

        {step === 'pin' && <>
          <h2 className="text-xl font-bold">Buat PIN Login</h2><p className="mt-1 text-sm text-slate-500">PIN ini menjadi metode login utama setelah verifikasi nomor selesai.</p>
          <div className="mt-5 space-y-3"><input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))} type="password" inputMode="numeric" maxLength={8} placeholder="6–8 digit PIN" className="w-full rounded-xl border px-3 py-3 text-center tracking-[0.35em]" /><input value={pinConfirm} onChange={e => setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 8))} type="password" inputMode="numeric" maxLength={8} placeholder="Ulangi PIN" className="w-full rounded-xl border px-3 py-3 text-center tracking-[0.35em]" /><button onClick={() => void handleCreatePin()} disabled={loading} className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white disabled:opacity-60">{loading ? 'Menyimpan...' : 'Simpan PIN & Lanjutkan'}</button></div>
        </>}

        {step === 'profile' && <>
          <h2 className="text-xl font-bold">Profil Akun</h2><p className="mt-1 text-sm text-slate-500">Tentukan apakah akun digunakan sebagai Pekerja atau Pemberi Kerja.</p>
          <div className="mt-5 space-y-3"><label className="block text-sm font-medium text-slate-700">Nama lengkap<input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Contoh: Budi Santoso" className="mt-1 w-full rounded-xl border px-3 py-3" /></label><label className="block text-sm font-medium text-slate-700">Nomor HP / WhatsApp<input value={profilePhone} onChange={e => setProfilePhone(e.target.value)} placeholder="08xxxxxxxxxx" inputMode="tel" className="mt-1 w-full rounded-xl border px-3 py-3" /></label><div className="grid grid-cols-2 gap-3"><button onClick={() => { setRole('worker'); setRoleSelected(true); }} type="button" className={`rounded-xl border py-3 text-sm font-semibold ${roleSelected && role === 'worker' ? 'border-blue-600 bg-blue-600 text-white' : 'bg-slate-50'}`}>👷 Pekerja</button><button onClick={() => { setRole('employer'); setRoleSelected(true); }} type="button" className={`rounded-xl border py-3 text-sm font-semibold ${roleSelected && role === 'employer' ? 'border-blue-600 bg-blue-600 text-white' : 'bg-slate-50'}`}>🏢 Pemberi Kerja</button></div><button onClick={() => void handleCompleteProfile()} disabled={loading || !fullName.trim() || !roleSelected} className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-60">{loading ? 'Menyimpan...' : 'Lanjutkan'}</button></div>
        </>}

        {step === 'passkey' && <>
          <h2 className="text-xl font-bold">Aktifkan Login Fingerprint</h2><p className="mt-1 text-sm text-slate-500">Opsional, tetapi direkomendasikan. Setelah terdaftar, login berikutnya bisa memakai biometrik seperti Admin.</p>
          <div className="mt-5 space-y-3"><button onClick={() => void registerPasskey()} disabled={loading || !supported} className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white disabled:opacity-60"><Fingerprint size={18} className="mr-1 inline" />{loading ? 'Mendaftarkan...' : 'Daftarkan Fingerprint / Passkey'}</button><button onClick={onClose} disabled={loading} type="button" className="w-full rounded-xl border py-3 text-sm font-semibold">Lewati, gunakan PIN</button><p className="text-xs text-slate-500">Setelah login, verifikasi identitas dilakukan terpisah melalui proses KYC. Status KYC tidak menentukan apakah Anda boleh login.</p></div>
        </>}

        {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</div>}
      </div>
    </div>
  </div>;
}
