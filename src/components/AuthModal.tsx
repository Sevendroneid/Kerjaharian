import { useEffect, useState } from 'react';
import { X, CheckCircle2, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
type Step = 'login' | 'profile' | 'ktp';
interface AuthModalProps { open: boolean; onClose: () => void; lang?: 'id' | 'en'; }
function normalizePhone(value: string) {
const digits = value.replace(/\D/g, '');
if (!digits) return '';
if (digits.startsWith('0')) return +62${digits.slice(1)};
if (digits.startsWith('62')) return +${digits};
return +62${digits};
}
function canonicalPhone(value: string) { return normalizePhone(value).replace(/^+/, ''); }
async function callPhoneAuth(body: Record<string, unknown>) {
const { data, error } = await supabase.functions.invoke('phone-auth-otpid', { body });
if (error) {
let message = error.message || 'Gagal menghubungi server';
try {
const ctx = (error as any).context;
if (ctx && typeof ctx.json === 'function') {
const parsed = await ctx.json();
if (parsed?.error) message = parsed.error;
}
} catch (_) { /* pesan default dipakai */ }
throw new Error(message);
}
if (data?.error) throw new Error(data.error);
return data;
}
export function AuthModal({ open, onClose }: AuthModalProps) {
const { user, profile, refreshProfile } = useAuth();
const [step, setStep] = useState('login');
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
if (user && !profile?.full_name) { setStep('profile'); setRoleSelected(false); setFullName(typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : ''); setProfilePhone(user.phone || phone || ''); }
else if (user && profile?.full_name) setStep('login');
}, [open, user, profile, phone]);
if (!open) return null;
const finishAuth = async () => {
const currentUser = (await supabase.auth.getUser()).data.user;
if (!currentUser) throw new Error('Sesi login tidak ditemukan');
const { data: currentProfile } = await supabase.from('profiles').select('full_name').eq('id', currentUser.id).maybeSingle();
if (!currentProfile?.full_name) { setFullName(typeof currentUser.user_metadata?.full_name === 'string' ? currentUser.user_metadata.full_name : ''); setProfilePhone(currentUser.phone || phone || ''); setRoleSelected(false); setStep('profile'); }
else { await refreshProfile(); onClose(); }
};
const handleSendOtp = async () => {
const normalized = normalizePhone(phone);
const canonical = canonicalPhone(phone);
if (!/^+62\d{9,14}$/.test(normalized)) return setError('Nomor HP belum valid, contoh 081234567890');
setLoading(true); setError('');
try {
const data = await callPhoneAuth({ action: 'request', phone: canonical });
if (!data?.challenge_id) throw new Error('Kode tidak terkirim, coba lagi');
setPhone(normalized);
setChallengeId(data.challenge_id);
setOtpCode('');
setOtpSent(true);
} catch (err: any) {
setError(err?.message || 'Gagal mengirim kode');
} finally {
setLoading(false);
}
};
const handleVerifyOtp = async () => {
const canonical = canonicalPhone(phone);
const code = otpCode.replace(/\D/g, '');
if (!challengeId) return setError('Sesi kedaluwarsa, kirim ulang kode');
if (code.length < 3) return setError('Masukkan kode dari WhatsApp Anda');
setLoading(true); setError('');
try {
const data = await callPhoneAuth({ action: 'verify', phone: canonical, challenge_id: challengeId, code });
if (data?.status !== 'success' || !data?.token_hash) throw new Error('Verifikasi gagal, coba lagi');
const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: 'magiclink' });
if (verifyError) throw verifyError;
await finishAuth();
} catch (err: any) {
setError(err?.message || 'Kode salah atau kedaluwarsa');
} finally {
setLoading(false);
}
};
const handleResendOtp = () => { setOtpSent(false); setChallengeId(null); setOtpCode(''); setError(''); };
const handleCompleteProfile = async () => {
if (!fullName.trim()) return setError('Isi nama lengkap');
if (!roleSelected) return setError('Pilih Pekerja atau Pemberi Kerja');
setLoading(true); setError('');
try {
const { data: { user: currentUser } } = await supabase.auth.getUser();
if (!currentUser) throw new Error('Sesi habis, masuk lagi');
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
if (!ktpFile) return setError('Pilih foto KTP');
setLoading(true); setError('');
try {
const { data: { user: currentUser } } = await supabase.auth.getUser();
if (!currentUser) throw new Error('Sesi habis, masuk lagi');
const extension = ktpFile.name.split('.').pop()?.toLowerCase() || 'jpg';
const filePath = ${currentUser.id}/ktp-${Date.now()}.${extension};
const { error: uploadError } = await supabase.storage.from('ktp-photos').upload(filePath, ktpFile, { upsert: false });
if (uploadError) throw uploadError;
const { error: updateError } = await supabase.from('profiles').update({ ktp_photo_url: filePath }).eq('id', currentUser.id);
if (updateError) throw updateError;
await refreshProfile();
onClose();
} catch (err: any) {
setError(err?.message || 'Gagal unggah KTP');
} finally {
setLoading(false);
}
};
return 

{step === 'login' && <>
Masuk KerjaHarian
Cuma pakai nomor HP. Cepat.
{!otpSent ? <>
Nomor HP / WhatsApp
<input value={phone} onChange={e => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" inputMode="tel" autoComplete="tel" className="w-full border rounded-lg px-3 py-3 mt-1 text-sm" />
{loading ? 'Mengirim...' : 'Kirim Kode WhatsApp'}
</> : <>

 Kode terkirim
Cek WhatsApp Anda, masukkan 6 digit kodenya di bawah.

<input value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" inputMode="numeric" maxLength={6} className="w-full border rounded-lg px-3 py-3 mt-3 text-center text-lg tracking-[0.4em] font-semibold" />
<button onClick={handleVerifyOtp} disabled={loading || otpCode.replace(/\D/g, '').length < 3} className="w-full mt-3 bg-green-600 text-white rounded-lg py-3 text-sm font-semibold disabled:opacity-60">{loading ? 'Memeriksa...' : 'Masuk'}
Kirim ulang / ganti nomor
</>}
{error && {error}}
</>}
{step === 'profile' && <>
Satu Langkah Lagi
Pilih peran Anda.
Nama lengkap
<input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Contoh: Budi Santoso" className="w-full border rounded-lg px-3 py-2.5 mt-1 mb-3 text-sm" />
Nomor HP / WhatsApp
<input value={profilePhone} onChange={e => setProfilePhone(e.target.value)} placeholder="08xxxxxxxxxx" inputMode="tel" className="w-full border rounded-lg px-3 py-2.5 mt-1 mb-4 text-sm" />

<button onClick={() => { setRole('worker'); setRoleSelected(true); }} type="button" className={py-3 rounded-lg border text-sm font-semibold ${roleSelected && role === 'worker' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50'}}>👷 Pekerja
<button onClick={() => { setRole('employer'); setRoleSelected(true); }} type="button" className={py-3 rounded-lg border text-sm font-semibold ${roleSelected && role === 'employer' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50'}}>🏠 Pemberi Kerja

{error && {error}}
<button onClick={handleCompleteProfile} disabled={loading || !fullName.trim() || !roleSelected} className="w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-semibold disabled:opacity-60">{loading ? 'Menyimpan...' : 'Lanjutkan'}
</>}
{step === 'ktp' && <>
Verifikasi Pemberi Kerja
Upload KTP, cegah pesanan palsu. Aman, cuma dilihat admin.
<input type="file" accept="image/*" onChange={e => setKtpFile(e.target.files?.[0] || null)} className="w-full border rounded-lg px-3 py-2 mb-4 text-sm" />
{error && {error}}
<button onClick={handleUploadKtp} disabled={loading || !ktpFile} className="w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-semibold disabled:opacity-60">{loading ? 'Mengunggah...' : 'Unggah KTP & Selesai'}
</>}

;}
