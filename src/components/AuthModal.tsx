import { useEffect, useState } from 'react';
import { X, CheckCircle2, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

type Step = 'login' | 'profile' | 'ktp';
interface AuthModalProps { open: boolean; onClose: () => void; lang?: 'id' | 'en'; }

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `+62${digits.slice(1)}`;
  if (digits.startsWith('62')) return `+${digits}`;
  return `+62${digits}`;
}
function canonicalPhone(value: string) { return normalizePhone(value).replace(/^\+/, ''); }

async function callPhoneAuth(body: Record<string, unknown>) {
  const response = await fetch('/api/phone-auth-otpid', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const text = await response.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; }
  catch { data = { error: text || `HTTP ${response.status}` }; }
  if (!response.ok) throw new Error(data?.error || `Server OTP mengembalikan HTTP ${response.status}`);
  if (data?.error) throw new Error(data.error);
  return data;
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState<Step>('login');
  const [phone, setPhone] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [fullName, setFullName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [role, setRole] = useState<'worker' | 'employer'>('worker');
  const [roleSelected, setRoleSelected] = useState(false);
  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (user && !profile?.full_name) {
      setStep('profile');
      setRoleSelected(false);
      setFullName(typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '');
      setProfilePhone(user.phone || phone || '');
    } else if (user && profile?.full_name) setStep('login');
  }, [open, user, profile, phone]);

  if (!open) return null;

  const finishAuth = async () => {
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) throw new Error('Sesi login tidak ditemukan');
    const { data: currentProfile } = await supabase.from('profiles').select('full_name').eq('id', currentUser.id).maybeSingle();
    if (!currentProfile?.full_name) {
      setFullName(typeof currentUser.user_metadata?.full_name === 'string' ? currentUser.user_metadata.full_name : '');
      setProfilePhone(currentUser.phone || phone || '');
      setRoleSelected(false);
      setStep('profile');
    } else { await refreshProfile(); onClose(); }
  };

  const handleSendOtp = async () => {
    const normalized = normalizePhone(phone);
    const canonical = canonicalPhone(phone);
    if (!/^\+62\d{9,14}$/.test(normalized)) { setError('Nomor HP belum valid, contoh 081234567890'); return; }
    setLoading(true); setError('');
    try {
      const data = await callPhoneAuth({ action: 'request', phone: canonical });
      if (!data?.challenge_id) throw new Error('Kode tidak terkirim, coba lagi');
      setPhone(normalized); setChallengeId(data.challenge_id); setOtpCode(''); setOtpSent(true);
    } catch (err: any) { setError(err?.message || 'Gagal mengirim kode'); }
    finally { setLoading(false); }
  };

  const handleVerifyOtp = async () => {
    const canonical = canonicalPhone(phone);
    const code = otpCode.replace(/\D/g, '');
    if (!challengeId) { setError('Sesi kedaluwarsa, kirim ulang kode'); return; }
    if (code.length < 3) { setError('Masukkan kode dari WhatsApp Anda'); return; }
    setLoading(true); setError('');
    try {
      const data = await callPhoneAuth({ action: 'verify', phone: canonical, challenge_id: challengeId, code });
      if (data?.status !== 'success' || !data?.token_hash) throw new Error('Verifikasi gagal, coba lagi');
      const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: 'magiclink' });
      if (verifyError) throw verifyError;
      await finishAuth();
    } catch (err: any) { setError(err?.message || 'Kode salah atau kedaluwarsa'); }
    finally { setLoading(false); }
  };

  const handleResendOtp = () => { setOtpSent(false); setChallengeId(null); setOtpCode(''); setError(''); };

  const handleCompleteProfile = async () => {
    if (!fullName.trim()) { setError('Isi nama lengkap'); return; }
    if (!roleSelected) { setError('Pilih Pekerja atau Pemberi Kerja'); return; }
    setLoading(true); setError('');
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Sesi habis, masuk lagi');
      const normalizedPhone = normalizePhone(profilePhone || phone);
      const { error: profileError } = await supabase.from('profiles').update({ full_name: fullName.trim(), role, whatsapp: normalizedPhone || null, phone: normalizedPhone || null }).eq('id', currentUser.id);
      if (profileError) throw profileError;
      await refreshProfile();
      if (role === 'employer') setStep('ktp'); else onClose();
    } catch (err: any) { setError(err?.message || 'Gagal menyimpan profil'); }
    finally { setLoading(false); }
  };

  const handleUploadKtp = async () => {
    if (!ktpFile) { setError('Pilih foto KTP'); return; }
    setLoading(true); setError('');
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Sesi habis, masuk lagi');
      const extension = ktpFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `${currentUser.id}/ktp-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from('ktp-photos').upload(filePath, ktpFile, { upsert: false });
      if (uploadError) throw uploadError;
      const { error: updateError } = await supabase.from('profiles').update({ ktp_photo_url: filePath }).eq('id', currentUser.id);
      if (updateError) throw updateError;
      await refreshProfile(); onClose();
    } catch (err: any) { setError(err?.message || 'Gagal unggah KTP'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2 font-semibold text-slate-900"><MessageCircle className="h-5 w-5 text-green-600" />KerjaHarian</div>
          <button onClick={onClose} type="button" className="rounded-lg p-2 hover:bg-slate-100" aria-label="Tutup"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5">
          {step === 'login' && <>
            <h2 className="text-xl font-bold text-slate-900">Masuk KerjaHarian</h2>
            <p className="mt-1 text-sm text-slate-500">Cuma pakai nomor HP. Cepat.</p>
            {!otpSent ? <div className="mt-5 space-y-3">
              <label className="block text-sm font-medium text-slate-700">Nomor HP / WhatsApp
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" inputMode="tel" autoComplete="tel" className="mt-1 w-full rounded-lg border px-3 py-3 text-sm" />
              </label>
              <button onClick={handleSendOtp} disabled={loading} className="w-full rounded-lg bg-green-600 py-3 text-sm font-semibold text-white disabled:opacity-60">{loading ? 'Mengirim...' : 'Kirim Kode WhatsApp'}</button>
            </div> : <div className="mt-5 space-y-3">
              <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-800"><CheckCircle2 className="h-5 w-5" />Kode terkirim. Cek WhatsApp Anda.</div>
              <input value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" inputMode="numeric" maxLength={6} className="w-full rounded-lg border px-3 py-3 text-center text-lg font-semibold tracking-[0.4em]" />
              <button onClick={handleVerifyOtp} disabled={loading || otpCode.replace(/\D/g, '').length < 3} className="w-full rounded-lg bg-green-600 py-3 text-sm font-semibold text-white disabled:opacity-60">{loading ? 'Memeriksa...' : 'Masuk'}</button>
              <button onClick={handleResendOtp} type="button" className="w-full py-2 text-sm text-slate-600 underline">Kirim ulang / ganti nomor</button>
            </div>}
          </>}
          {step === 'profile' && <>
            <h2 className="text-xl font-bold text-slate-900">Satu Langkah Lagi</h2>
            <p className="mt-1 text-sm text-slate-500">Pilih peran Anda.</p>
            <div className="mt-5 space-y-3">
              <label className="block text-sm font-medium text-slate-700">Nama lengkap
                <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Contoh: Budi Santoso" className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm" />
              </label>
              <label className="block text-sm font-medium text-slate-700">Nomor HP / WhatsApp
                <input value={profilePhone} onChange={e => setProfilePhone(e.target.value)} placeholder="08xxxxxxxxxx" inputMode="tel" className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { setRole('worker'); setRoleSelected(true); }} type="button" className={`rounded-lg border py-3 text-sm font-semibold ${roleSelected && role === 'worker' ? 'border-blue-600 bg-blue-600 text-white' : 'bg-slate-50'}`}>👷 Pekerja</button>
                <button onClick={() => { setRole('employer'); setRoleSelected(true); }} type="button" className={`rounded-lg border py-3 text-sm font-semibold ${roleSelected && role === 'employer' ? 'border-blue-600 bg-blue-600 text-white' : 'bg-slate-50'}`}>🏠 Pemberi Kerja</button>
              </div>
              <button onClick={handleCompleteProfile} disabled={loading || !fullName.trim() || !roleSelected} className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-60">{loading ? 'Menyimpan...' : 'Lanjutkan'}</button>
            </div>
          </>}
          {step === 'ktp' && <>
            <h2 className="text-xl font-bold text-slate-900">Verifikasi Pemberi Kerja</h2>
            <p className="mt-1 text-sm text-slate-500">Upload KTP untuk verifikasi admin.</p>
            <div className="mt-5 space-y-3">
              <input type="file" accept="image/*" onChange={e => setKtpFile(e.target.files?.[0] || null)} className="w-full rounded-lg border px-3 py-2 text-sm" />
              <button onClick={handleUploadKtp} disabled={loading || !ktpFile} className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-60">{loading ? 'Mengunggah...' : 'Unggah KTP & Selesai'}</button>
            </div>
          </>}
          {error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        </div>
      </div>
    </div>
  );
}
