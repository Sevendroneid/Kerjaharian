import { useEffect, useState } from 'react';
import { X, CheckCircle2, Fingerprint, Mail, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

type Step = 'login' | 'profile' | 'ktp';
type LoginMethod = 'phone' | 'email';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  lang?: 'id' | 'en';
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('62')) return `+${digits}`;
  if (digits.startsWith('0')) return `+62${digits.slice(1)}`;
  return `+62${digits}`;
}

export function AuthModal({ open, onClose, lang = 'id' }: AuthModalProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState<Step>('login');
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('phone');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [role, setRole] = useState<'worker' | 'employer'>('worker');
  const [roleSelected, setRoleSelected] = useState(false);
  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const passkeyEnabled = import.meta.env.VITE_ENABLE_PASSKEY === 'true';
  const passkeySupported = typeof window !== 'undefined' && !!window.PublicKeyCredential;

  useEffect(() => {
    if (!open) return;
    setError('');
    if (user && !profile?.full_name) {
      setStep('profile');
      setRoleSelected(false);
      setFullName(typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '');
      setProfilePhone(user.phone || phone || '');
    } else if (user && profile?.full_name) {
      setStep('login');
    }
  }, [open, user, profile]);

  if (!open) return null;

  const finishAuth = async (currentUserId?: string) => {
    const currentUser = currentUserId
      ? (await supabase.auth.getUser()).data.user
      : (await supabase.auth.getUser()).data.user;
    if (!currentUser) throw new Error('Sesi login tidak ditemukan');
    const { data: currentProfile } = await supabase.from('profiles').select('full_name').eq('id', currentUser.id).maybeSingle();
    if (!currentProfile?.full_name) {
      setFullName(typeof currentUser.user_metadata?.full_name === 'string' ? currentUser.user_metadata.full_name : '');
      setProfilePhone(currentUser.phone || phone || '');
      setRoleSelected(false);
      setStep('profile');
    } else {
      await refreshProfile();
      onClose();
    }
  };

  const handleSendOtp = async () => {
    const normalized = normalizePhone(phone);
    if (!normalized || normalized.length < 12) return setError('Masukkan nomor HP Indonesia yang valid, contoh 081234567890');
    setLoading(true);
    setError('');
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({ phone: normalized, options: { shouldCreateUser: true } });
      if (otpError) throw otpError;
      setPhone(normalized);
      setOtpSent(true);
    } catch (err: any) {
      setError(err?.message || 'OTP gagal dikirim. Pastikan layanan SMS/OTP aktif.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const normalized = normalizePhone(phone);
    if (!/^\d{6}$/.test(otp.trim())) return setError('Masukkan kode OTP 6 digit');
    setLoading(true);
    setError('');
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({ phone: normalized, token: otp.trim(), type: 'sms' });
      if (verifyError) throw verifyError;
      if (!data.user) throw new Error('Verifikasi berhasil tetapi sesi belum tersedia');
      await finishAuth(data.user.id);
    } catch (err: any) {
      setError(err?.message || 'Kode OTP salah atau sudah kedaluwarsa');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    const { error: authError } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    if (authError) setError(authError.message);
    setLoading(false);
  };

  const handlePasskey = async () => {
    setLoading(true);
    setError('');
    try {
      const { error: authError } = await supabase.auth.signInWithPasskey();
      if (authError) throw authError;
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Passkey belum tersedia di perangkat ini');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email.trim() || !password) return setError('Isi email dan kata sandi terlebih dahulu');
    if (password.length < 8) return setError('Kata sandi minimal 8 karakter');
    setLoading(true);
    setError('');
    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: fullName.trim() } } });
        if (signUpError) throw signUpError;
        if (!data.session) { setError('Pendaftaran berhasil. Cek email untuk konfirmasi, lalu masuk kembali.'); return; }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) throw signInError;
      }
      await finishAuth();
    } catch (err: any) {
      setError(err?.message || 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteProfile = async () => {
    if (!fullName.trim()) return setError('Tulis nama lengkap terlebih dahulu');
    if (!roleSelected) return setError('Pilih Pekerja atau Pemberi Kerja terlebih dahulu');
    setLoading(true);
    setError('');
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Sesi habis. Silakan masuk lagi.');
      const normalizedPhone = normalizePhone(profilePhone || phone);
      const { error: profileError } = await supabase.from('profiles').update({ full_name: fullName.trim(), role, whatsapp: normalizedPhone || null, phone: normalizedPhone || null }).eq('id', currentUser.id);
      if (profileError) throw profileError;
      await refreshProfile();
      if (role === 'employer') setStep('ktp'); else onClose();
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan profil');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadKtp = async () => {
    if (!ktpFile) return setError('Pilih foto KTP terlebih dahulu');
    setLoading(true);
    setError('');
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Sesi habis. Silakan masuk lagi.');
      const extension = ktpFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `${currentUser.id}/ktp-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from('ktp-photos').upload(filePath, ktpFile, { upsert: false });
      if (uploadError) throw uploadError;
      const { error: updateError } = await supabase.from('profiles').update({ ktp_photo_url: filePath }).eq('id', currentUser.id);
      if (updateError) throw updateError;
      await refreshProfile();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Gagal mengunggah KTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm relative shadow-xl max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-black" aria-label="Tutup"><X size={20} /></button>

        {step === 'login' && (
          <>
            <h2 className="text-xl font-bold mb-1">Masuk KerjaHarian</h2>
            <p className="text-sm text-gray-500 mb-5">Masuk cepat dengan nomor HP. Tidak perlu email.</p>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <button onClick={() => { setLoginMethod('phone'); setError(''); }} className={`py-2.5 rounded-lg text-sm font-semibold ${loginMethod === 'phone' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}><Phone size={15} className="inline mr-1" />Nomor HP</button>
              <button onClick={() => { setLoginMethod('email'); setError(''); }} className={`py-2.5 rounded-lg text-sm font-semibold ${loginMethod === 'email' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}><Mail size={15} className="inline mr-1" />Email</button>
            </div>

            {loginMethod === 'phone' ? (
              <>
                <label className="text-xs font-semibold text-slate-600">Nomor HP Indonesia</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" inputMode="tel" autoComplete="tel" className="w-full border rounded-lg px-3 py-3 mt-1 text-sm" disabled={otpSent} />
                {!otpSent ? (
                  <button onClick={handleSendOtp} disabled={loading} className="w-full mt-3 bg-blue-600 text-white rounded-lg py-3 text-sm font-semibold disabled:opacity-60">{loading ? 'Mengirim OTP...' : 'Kirim Kode OTP'}</button>
                ) : (
                  <>
                    <label className="text-xs font-semibold text-slate-600 block mt-3">Kode OTP</label>
                    <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6 digit" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="w-full border rounded-lg px-3 py-3 mt-1 text-center tracking-[0.5em] font-bold" />
                    <button onClick={handleVerifyOtp} disabled={loading || otp.length !== 6} className="w-full mt-3 bg-blue-600 text-white rounded-lg py-3 text-sm font-semibold disabled:opacity-60">{loading ? 'Memverifikasi...' : 'Verifikasi & Masuk'}</button>
                    <button onClick={() => { setOtpSent(false); setOtp(''); setError(''); }} className="w-full mt-2 text-xs text-blue-600 py-2">Ganti nomor / kirim ulang</button>
                  </>
                )}
              </>
            ) : (
              <>
                {mode === 'signup' && <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nama lengkap" className="w-full border rounded-lg px-3 py-2.5 mb-2.5 text-sm" />}
                <div className="relative mb-2.5"><Mail size={16} className="absolute left-3 top-3 text-slate-400" /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full border rounded-lg pl-9 pr-3 py-2.5 text-sm" /></div>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Kata sandi (min. 8 karakter)" className="w-full border rounded-lg px-3 py-2.5 text-sm" />
                <div className="flex gap-2 mt-3"><button onClick={() => setMode('signin')} className={`flex-1 py-2 rounded-lg text-xs font-semibold ${mode === 'signin' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>Masuk</button><button onClick={() => setMode('signup')} className={`flex-1 py-2 rounded-lg text-xs font-semibold ${mode === 'signup' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>Daftar</button></div>
                <button onClick={handleEmailAuth} disabled={loading} className="w-full mt-3 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60">{loading ? 'Memproses...' : mode === 'signup' ? 'Buat Akun' : 'Masuk dengan Email'}</button>
              </>
            )}

            {passkeyEnabled && passkeySupported && <button onClick={handlePasskey} disabled={loading} className="w-full mt-3 border border-slate-300 rounded-lg py-2.5 text-sm font-semibold"><Fingerprint size={17} className="inline mr-1" /> Passkey</button>}
            <div className="flex items-center gap-3 my-4 text-xs text-slate-400"><span className="h-px bg-slate-200 flex-1" />atau<span className="h-px bg-slate-200 flex-1" /></div>
            <button onClick={handleGoogle} disabled={loading} className="w-full border border-slate-300 rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60"><span className="text-lg font-bold mr-2">G</span>{loading ? 'Membuka Google...' : 'Lanjut dengan Google'}</button>
            {error && <p className="text-red-500 text-xs mt-3">{error}</p>}
            <p className="text-[11px] text-slate-400 mt-4 text-center">Nomor HP adalah metode login utama KerjaHarian. Email dan Google hanya alternatif.</p>
          </>
        )}

        {step === 'profile' && (
          <>
            <h2 className="text-xl font-bold mb-1">Lengkapi Profil</h2>
            <p className="text-sm text-gray-500 mb-4">Login sudah berhasil. Tinggal pilih peran Anda.</p>
            <label className="text-xs font-semibold text-gray-600">Nama lengkap</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Contoh: Budi Santoso" className="w-full border rounded-lg px-3 py-2.5 mt-1 mb-3 text-sm" />
            <label className="text-xs font-semibold text-gray-600">Nomor HP / WhatsApp</label>
            <input value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} placeholder="08xxxxxxxxxx" inputMode="tel" className="w-full border rounded-lg px-3 py-2.5 mt-1 mb-4 text-sm" />
            <label className="text-xs font-semibold text-gray-600">Saya mendaftar sebagai</label>
            <div className="grid grid-cols-2 gap-2 mt-1 mb-4"><button onClick={() => { setRole('worker'); setRoleSelected(true); }} type="button" className={`py-3 rounded-lg border text-sm font-semibold ${roleSelected && role === 'worker' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50'}`}>👷 Pekerja</button><button onClick={() => { setRole('employer'); setRoleSelected(true); }} type="button" className={`py-3 rounded-lg border text-sm font-semibold ${roleSelected && role === 'employer' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50'}`}>🏠 Pemberi Kerja</button></div>
            {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
            <button onClick={handleCompleteProfile} disabled={loading || !fullName.trim() || !roleSelected} className="w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-semibold disabled:opacity-60">{loading ? 'Menyimpan...' : 'Lanjutkan'}</button>
          </>
        )}

        {step === 'ktp' && (
          <>
            <div className="flex items-center gap-2 mb-2"><CheckCircle2 className="text-green-600" size={20} /><h2 className="text-xl font-bold">Verifikasi Pemberi Kerja</h2></div>
            <p className="text-sm text-gray-500 mb-4">Foto KTP membantu mengurangi pesanan palsu. Data digunakan untuk verifikasi.</p>
            <input type="file" accept="image/*" onChange={(e) => setKtpFile(e.target.files?.[0] || null)} className="w-full border rounded-lg px-3 py-2 mb-4 text-sm" />
            {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
            <button onClick={handleUploadKtp} disabled={loading || !ktpFile} className="w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-semibold disabled:opacity-60">{loading ? 'Mengunggah...' : 'Unggah KTP & Selesai'}</button>
          </>
        )}
      </div>
    </div>
  );
}
