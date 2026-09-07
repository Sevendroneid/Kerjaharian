import { useState } from 'react';
import { Fingerprint, ShieldCheck, LockKeyhole, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const ADMIN_CANONICAL_ORIGIN = 'https://www.kerjaharian.my.id';

const withTimeout = async <T,>(promise: PromiseLike<T>, ms: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Operasi keamanan timeout. Silakan coba lagi.')), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

async function ensureAdminSession() {
  const current = await withTimeout(supabase.auth.getSession(), 8000);
  if (current.data.session?.user) return current.data.session;
  const refreshed = await withTimeout(supabase.auth.refreshSession(), 10000);
  if (refreshed.error) throw refreshed.error;
  if (!refreshed.data.session?.user) throw new Error('Sesi Admin tidak ditemukan. Silakan login ulang.');
  return refreshed.data.session;
}

async function assertAdminSession() {
  const session = await ensureAdminSession();
  const profileResult = await withTimeout(
    Promise.resolve(supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle()),
    8000,
  );
  if (profileResult.error) throw profileResult.error;
  if (profileResult.data?.role !== 'admin') throw new Error('Akun aktif bukan akun Admin KerjaHarian.');
  return session;
}

function readablePasskeyError(error: unknown) {
  const value = error as { code?: string; message?: string } | null;
  switch (value?.code) {
    case 'webauthn_credential_not_found':
      return 'Passkey lama tidak terdaftar di server. Daftarkan ulang Fingerprint / Passkey.';
    case 'webauthn_verification_failed':
      return 'Verifikasi passkey gagal. Pastikan pendaftaran dan login dilakukan dari www.kerjaharian.my.id.';
    case 'passkey_disabled':
      return 'Passkey belum aktif di konfigurasi Supabase Auth.';
    case 'email_not_confirmed':
    case 'phone_not_confirmed':
      return 'Identitas Admin belum terkonfirmasi di Supabase Auth.';
    default:
      return value?.message || 'Gagal mengaktifkan Passkey.';
  }
}

export default function AdminPasskeySetup() {
  const [loading, setLoading] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [pinMessage, setPinMessage] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const supported = typeof window !== 'undefined' && !!window.PublicKeyCredential;

  const register = async (resetExisting: boolean) => {
    setMessage('');
    if (!supported) {
      setMessage('Perangkat/browser ini tidak mendukung Passkey. Gunakan PIN Admin.');
      return;
    }
    if (typeof supabase.auth.registerPasskey !== 'function' || typeof supabase.auth.passkey?.list !== 'function') {
      setMessage('Passkey belum tersedia pada client KerjaHarian.');
      return;
    }
    // WebAuthn is bound to the relying-party/origin configuration. Never enroll
    // an Admin credential from apex or pages.dev; use one stable production origin.
    if (window.location.origin !== ADMIN_CANONICAL_ORIGIN) {
      setMessage('Membuka domain produksi Admin yang aman...');
      window.location.replace(`${ADMIN_CANONICAL_ORIGIN}/rahasia`);
      return;
    }
    setLoading(true);
    try {
      await assertAdminSession();

      if (resetExisting && typeof supabase.auth.passkey.delete === 'function') {
        setMessage('Membersihkan credential Fingerprint lama...');
        const listed = await withTimeout(supabase.auth.passkey.list(), 10000);
        if (listed.error) throw listed.error;
        for (const passkey of listed.data ?? []) {
          const removed = await withTimeout(
            supabase.auth.passkey.delete({ passkeyId: passkey.id }),
            10000,
          );
          if (removed.error) throw removed.error;
        }
      }

      setMessage('Menunggu konfirmasi biometrik perangkat...');
      const result = await withTimeout(supabase.auth.registerPasskey(), 30000);
      if (result.error) throw result.error;

      const verified = await withTimeout(supabase.auth.passkey.list(), 10000);
      if (verified.error) throw verified.error;
      if (!verified.data?.length) throw new Error('Passkey tidak ditemukan setelah pendaftaran.');

      setMessage(result.data?.friendly_name
        ? `Passkey ${result.data.friendly_name} berhasil didaftarkan. Logout lalu test login biometrik.`
        : 'Fingerprint / Passkey berhasil didaftarkan. Logout lalu test login biometrik.');
    } catch (err: unknown) {
      setMessage(readablePasskeyError(err));
    } finally {
      setLoading(false);
    }
  };

  const savePin = async () => {
    setPinMessage('');
    if (!/^\d{8}$/.test(pin)) {
      setPinMessage('PIN harus tepat 8 digit angka.');
      return;
    }
    if (pin !== pinConfirm) {
      setPinMessage('Konfirmasi PIN tidak sama.');
      return;
    }
    setPinLoading(true);
    setPinMessage('Menyimpan PIN...');
    try {
      await assertAdminSession();
      const updated = await withTimeout(supabase.auth.updateUser({ password: pin }), 10000);
      if (updated.error) throw updated.error;
      setPin('');
      setPinConfirm('');
      setPinMessage('PIN Admin berhasil disimpan.');
    } catch (err: unknown) {
      setPinMessage(err instanceof Error ? err.message : 'Gagal menyimpan PIN Admin.');
    } finally {
      setPinLoading(false);
    }
  };

  return <div className="rounded-2xl border bg-white p-4 shadow-sm">
    <div className="flex items-center gap-3"><div className="rounded-xl bg-slate-100 p-2"><ShieldCheck size={19}/></div><div className="flex-1"><p className="font-semibold text-sm">Keamanan Admin</p><p className="text-xs text-slate-500">Atur PIN cadangan dan kelola Fingerprint / Passkey pada perangkat ini.</p></div></div>
    <div className="mt-4 rounded-xl border border-slate-200 p-3">
      <div className="flex items-center gap-2"><LockKeyhole size={17}/><p className="font-semibold text-sm">PIN Admin</p></div>
      <p className="text-[11px] text-slate-500 mt-1">PIN wajib 8 digit dan menjadi metode pemulihan utama bila fingerprint belum tersedia.</p>
      <input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g,'').slice(0,8))} type="password" inputMode="numeric" autoComplete="new-password" maxLength={8} placeholder="PIN baru 8 digit" className="w-full border rounded-xl px-3 py-2.5 mt-3 text-center tracking-[0.3em]" />
      <input value={pinConfirm} onChange={e => setPinConfirm(e.target.value.replace(/\D/g,'').slice(0,8))} type="password" inputMode="numeric" autoComplete="new-password" maxLength={8} placeholder="Ulangi PIN" className="w-full border rounded-xl px-3 py-2 mt-2 text-center tracking-[0.3em]" onKeyDown={e => { if (e.key === 'Enter') void savePin(); }} />
      <button onClick={()=>void savePin()} disabled={pinLoading} className="w-full mt-2 border border-slate-300 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60"><LockKeyhole size={17} className="inline mr-1"/>{pinLoading ? 'Menyimpan PIN...' : 'Simpan / Ubah PIN Admin'}</button>
      {pinMessage && <p className="text-xs text-slate-600 mt-2">{pinMessage}</p>}
    </div>
    {supported && <div className="mt-3"><div className="flex items-center gap-2"><Fingerprint size={17}/><p className="font-semibold text-sm">Fingerprint / Passkey</p></div><p className="text-[11px] text-slate-500 mt-1">Credential lama dapat dihapus lalu didaftarkan ulang jika login menghasilkan “Credential verification failed”. Pendaftaran Admin selalu dilakukan pada www.kerjaharian.my.id.</p><button onClick={()=>void register(true)} disabled={loading} className="w-full mt-3 border border-slate-300 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60"><RefreshCw size={17} className="inline mr-1"/>{loading ? 'Menyiapkan Passkey...' : 'Daftarkan Ulang Fingerprint / Passkey'}</button>{message && <p className="text-xs text-slate-600 mt-2">{message}</p>}</div>}
  </div>;
}
