import { useState } from 'react';
import { Fingerprint, ShieldCheck, LockKeyhole } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const withTimeout = async <T,>(promise: Promise<T>, ms: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
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

  // Access tokens can expire while the admin dashboard remains mounted.
  // Recover the persisted Supabase session before reporting "session missing".
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

export default function AdminPasskeySetup() {
  const [loading, setLoading] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [pinMessage, setPinMessage] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const supported = typeof window !== 'undefined' && !!window.PublicKeyCredential;

  const register = async () => {
    setMessage('');
    if (!supported) {
      setMessage('Perangkat/browser ini tidak mendukung Passkey. Gunakan PIN Admin.');
      return;
    }
    if (typeof supabase.auth.registerPasskey !== 'function') {
      setMessage('Passkey belum tersedia pada konfigurasi autentikasi ini. Gunakan PIN Admin.');
      return;
    }
    setLoading(true);
    setMessage('Menyiapkan sesi Admin...');
    try {
      await assertAdminSession();
      setMessage('Menunggu konfirmasi biometrik perangkat...');
      const result = await withTimeout(supabase.auth.registerPasskey(), 20000);
      if (result.error) throw result.error;
      setMessage(result.data?.friendly_name ? `Passkey ${result.data.friendly_name} aktif.` : 'Fingerprint / Passkey berhasil diaktifkan.');
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Gagal mengaktifkan Passkey. PIN Admin tetap dapat digunakan.');
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
    <div className="flex items-center gap-3"><div className="rounded-xl bg-slate-100 p-2"><ShieldCheck size={19}/></div><div className="flex-1"><p className="font-semibold text-sm">Keamanan Admin</p><p className="text-xs text-slate-500">Atur PIN cadangan dan aktifkan Fingerprint / Passkey pada perangkat ini.</p></div></div>
    <div className="mt-4 rounded-xl border border-slate-200 p-3">
      <div className="flex items-center gap-2"><LockKeyhole size={17}/><p className="font-semibold text-sm">PIN Admin</p></div>
      <p className="text-[11px] text-slate-500 mt-1">PIN wajib 8 digit dan menjadi metode pemulihan utama bila fingerprint belum tersedia.</p>
      <input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g,'').slice(0,8))} type="password" inputMode="numeric" autoComplete="new-password" maxLength={8} placeholder="PIN baru 8 digit" className="w-full border rounded-xl px-3 py-2.5 mt-3 text-center tracking-[0.3em]" />
      <input value={pinConfirm} onChange={e => setPinConfirm(e.target.value.replace(/\D/g,'').slice(0,8))} type="password" inputMode="numeric" autoComplete="new-password" maxLength={8} placeholder="Ulangi PIN" className="w-full border rounded-xl px-3 py-2 mt-2 text-center tracking-[0.3em]" onKeyDown={e => { if (e.key === 'Enter') void savePin(); }} />
      <button onClick={()=>void savePin()} disabled={pinLoading} className="w-full mt-2 border border-slate-300 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60"><LockKeyhole size={17} className="inline mr-1"/>{pinLoading ? 'Menyimpan PIN...' : 'Simpan / Ubah PIN Admin'}</button>
      {pinMessage && <p className="text-xs text-slate-600 mt-2">{pinMessage}</p>}
    </div>
    {supported && <div className="mt-3"><div className="flex items-center gap-2"><Fingerprint size={17}/><p className="font-semibold text-sm">Fingerprint / Passkey</p></div><p className="text-[11px] text-slate-500 mt-1">Passkey bersifat opsional; halaman Keamanan tidak lagi menunggu pemeriksaan passkey saat dibuka.</p><button onClick={()=>void register()} disabled={loading} className="w-full mt-3 border border-slate-300 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60"><Fingerprint size={17} className="inline mr-1"/>{loading ? 'Menunggu biometrik...' : 'Aktifkan Fingerprint / Passkey'}</button>{message && <p className="text-xs text-slate-600 mt-2">{message}</p>}</div>}
  </div>;
}
