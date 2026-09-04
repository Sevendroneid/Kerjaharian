import { useCallback, useEffect, useRef, useState } from 'react';
import { Fingerprint, LockKeyhole, ShieldCheck, MessageCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const ADMIN_CANONICAL = '6282340871029';
const RECOVERY_STORAGE_KEY = 'kh_admin_recovery_challenge';
const RECOVERY_TTL_MS = 5 * 60 * 1000;
interface AdminLoginProps { onClose: () => void; }

export default function AdminLogin({ onClose }: AdminLoginProps) {
const [pin, setPin] = useState('');
const [loading, setLoading] = useState(false);
const [checkingRecovery, setCheckingRecovery] = useState(false);
const [error, setError] = useState('');
const [recoveryMessage, setRecoveryMessage] = useState('');
const [challengeId, setChallengeId] = useState('');
const challengeIdRef = useRef('');
const [passkeySupported] = useState(() => typeof window !== 'undefined' && !!window.PublicKeyCredential);
const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
const pollInFlightRef = useRef(false);

useEffect(() => { challengeIdRef.current = challengeId; }, [challengeId]);
useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); pollRef.current = null; pollInFlightRef.current = false; }, []);

const invokePhoneAuth = useCallback(async (body: Record<string, unknown>) => {
const result = await supabase.functions.invoke('phone-auth-otpid', { body });
if (result.error) {
const context = result.error.context;
let detail = '';
if (context instanceof Response) {
try {
const payload = await context.clone().json();
detail = payload?.error || payload?.message || '';
} catch { }
}
throw new Error(detail || result.error.message || 'Gagal menghubungi layanan verifikasi.');
}
return result.data;
}, []);

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

const clearRecoveryStorage = () => { try { localStorage.removeItem(RECOVERY_STORAGE_KEY); } catch { } };

const stopRecoveryPolling = useCallback(() => {
if (pollRef.current) clearInterval(pollRef.current);
pollRef.current = null;
pollInFlightRef.current = false;
clearRecoveryStorage();
}, []);

const completeRecoverySession = useCallback(async (tokenHash: string) => {
const { data, error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });
if (verifyError) throw verifyError;
if (!data.session?.user) throw new Error('Sesi Admin tidak terbentuk setelah verifikasi WhatsApp.');
const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', data.session.user.id).maybeSingle();
if (profileError) throw profileError;
if (profile?.role !== 'admin') { await supabase.auth.signOut(); throw new Error('Akun hasil recovery bukan Admin KerjaHarian.'); }
return data.session;
}, []);

const checkRecoveryStatus = useCallback(async (activeChallengeId?: string) => {
const id = activeChallengeId || challengeIdRef.current;
if (!id || pollInFlightRef.current) return false;
pollInFlightRef.current = true;
setCheckingRecovery(true);
try {
const status = await invokePhoneAuth({ action: 'status', phone: ADMIN_CANONICAL, challenge_id: id });
if (status?.status === 'success' && status?.token_hash) {
stopRecoveryPolling();
setRecoveryMessage('Verifikasi berhasil. Membuka Dashboard Admin...');
await completeRecoverySession(String(status.token_hash));
setLoading(false);
onClose();
return true;
}
if (status?.status === 'expired') {
stopRecoveryPolling();
setLoading(false);
setRecoveryMessage('Sesi WhatsApp kedaluwarsa. Silakan mulai lagi.');
return true;
}
setRecoveryMessage('Belum terverifikasi. Jika sudah menekan Kirim di WhatsApp, kembali ke KerjaHarian dan cek lagi.');
return false;
} catch (err: any) {
stopRecoveryPolling();
setLoading(false);
setError(err?.message || 'Gagal memeriksa verifikasi WhatsApp.');
return true;
} finally {
pollInFlightRef.current = false;
setCheckingRecovery(false);
}
}, [completeRecoverySession, invokePhoneAuth, onClose, stopRecoveryPolling]);

const startPolling = useCallback((id: string, startedAt: number) => {
if (pollRef.current) clearInterval(pollRef.current);
pollRef.current = setInterval(() => {
if (Date.now() - startedAt > RECOVERY_TTL_MS) {
stopRecoveryPolling(); setLoading(false); setRecoveryMessage('Sesi WhatsApp kedaluwarsa. Silakan mulai lagi.'); return;
}
void checkRecoveryStatus(id);
}, 3000);
}, [checkRecoveryStatus, stopRecoveryPolling]);

useEffect(() => {
try {
const raw = localStorage.getItem(RECOVERY_STORAGE_KEY);
if (raw) {
const saved = JSON.parse(raw) as { challengeId: string; startedAt: number };
if (saved?.challengeId && Date.now() - saved.startedAt < RECOVERY_TTL_MS) {
challengeIdRef.current = saved.challengeId;
setChallengeId(saved.challengeId);
setLoading(true);
setRecoveryMessage('Melanjutkan verifikasi WhatsApp yang tertunda...');
void checkRecoveryStatus(saved.challengeId);
startPolling(saved.challengeId, saved.startedAt);
} else {
clearRecoveryStorage();
}
}
} catch { }
}, []);

useEffect(() => {
if (!challengeId) return;
const recheck = () => { void checkRecoveryStatus(challengeIdRef.current); };
const onVisible = () => { if (document.visibilityState === 'visible') recheck(); };
document.addEventListener('visibilitychange', onVisible);
window.addEventListener('focus', recheck);
return () => { document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('focus', recheck); };
}, [challengeId, checkRecoveryStatus]);

const handleWhatsAppRecovery = async () => {
setLoading(true); setError(''); setRecoveryMessage('Menyiapkan verifikasi WhatsApp...'); setChallengeId(''); stopRecoveryPolling();
try {
const data = await invokePhoneAuth({ action: 'request', phone: ADMIN_CANONICAL });
if (!data?.challenge_id || !data?.verification?.wa_link) throw new Error('OTP.ID tidak mengembalikan sesi WhatsApp.');
const newChallengeId = data.challenge_id as string;
const startedAt = Date.now();
challengeIdRef.current = newChallengeId;
setChallengeId(newChallengeId);
try { localStorage.setItem(RECOVERY_STORAGE_KEY, JSON.stringify({ challengeId: newChallengeId, startedAt })); } catch { }
setRecoveryMessage('WhatsApp sudah disiapkan. Tekan Kirim pada pesan verifikasi, lalu kembali ke KerjaHarian.');
window.open(data.verification.wa_link, '_blank', 'noopener,noreferrer');
startPolling(newChallengeId, startedAt);
} catch (err: any) { setLoading(false); setRecoveryMessage(''); setError(err?.message || 'Gagal memulai pemulihan Admin melalui WhatsApp.'); }
};

return <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4"><div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
<div className="flex items-center gap-3 mb-5"><div className="rounded-xl bg-slate-900 text-white p-2.5"><ShieldCheck size={22}/></div><div><h2 className="text-xl font-bold">Login Admin</h2><p className="text-xs text-slate-500">KerjaHarian Control Center</p></div></div>
<label className="text-xs font-semibold text-slate-600">PIN Admin</label><input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g,'').slice(0,8))} type="password" inputMode="numeric" autoComplete="current-password" maxLength={8} placeholder="8 digit PIN" className="w-full border rounded-xl px-4 py-3 mt-1 text-center text-lg tracking-[0.35em]" onKeyDown={e => { if (e.key === 'Enter') void handlePin(); }} />
<button onClick={handlePin} disabled={loading} className="w-full mt-3 bg-slate-900 text-white rounded-xl py-3 font-semibold disabled:opacity-60"><LockKeyhole size={17} className="inline mr-1"/>{loading ? 'Memproses...' : 'Masuk dengan PIN'}</button>
{passkeySupported && <><div className="flex items-center gap-3 my-4 text-xs text-slate-400"><span className="h-px bg-slate-200 flex-1"/>atau<span className="h-px bg-slate-200 flex-1"/></div><button onClick={handlePasskey} disabled={loading} className="w-full border border-slate-300 rounded-xl py-3 font-semibold disabled:opacity-60"><Fingerprint size={18} className="inline mr-1"/>Fingerprint / Passkey</button></>}
<div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3"><p className="text-xs font-semibold text-green-800">Belum punya PIN atau fingerprint?</p><p className="text-[11px] text-green-700 mt-1">Pulihkan akses Admin melalui WhatsApp, lalu atur PIN dan fingerprint dari dashboard.</p><button onClick={handleWhatsAppRecovery} disabled={loading} className="w-full mt-2 border border-green-600 text-green-700 bg-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60"><MessageCircle size={17} className="inline mr-1"/>{loading ? 'Menunggu verifikasi WhatsApp...' : 'Pulihkan via WhatsApp'}</button>{recoveryMessage && <p className="text-[11px] text-green-700 mt-2">{recoveryMessage}</p>}{challengeId && <button onClick={() => void checkRecoveryStatus(challengeIdRef.current)} disabled={checkingRecovery || !challengeId} className="w-full mt-2 border border-green-500 text-green-700 bg-white rounded-xl py-2 text-xs font-semibold disabled:opacity-60"><RefreshCw size={14} className="inline mr-1"/>{checkingRecovery ? 'Memeriksa...' : 'Saya sudah kirim — cek sekarang'}</button>}</div>
{error && <p className="text-red-500 text-xs mt-3">{error}</p>}<button onClick={onClose} disabled={loading} className="w-full mt-4 text-xs text-slate-500 py-2">Kembali</button>
</div></div>;
}


