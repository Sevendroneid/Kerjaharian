import { useEffect, useState } from 'react';
import { Fingerprint, ShieldCheck, LockKeyhole } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const withTimeout = async <T,>(promise: Promise<T>, ms: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([promise, new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error('Operasi keamanan timeout. Silakan coba lagi.')), ms); })]); }
  finally { if (timer) clearTimeout(timer); }
};

export default function AdminPasskeySetup() {
  const [loading, setLoading] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [pinMessage, setPinMessage] = useState('');
  const [ready, setReady] = useState(false);
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const supported = typeof window !== 'undefined' && !!window.PublicKeyCredential;

  useEffect(() => {
    let active = true;
    if (!supported || typeof supabase.auth.passkey?.list !== 'function') return () => { active = false; };
    void (async () => {
      try {
        const result = await withTimeout(supabase.auth.passkey.list(), 4000);
        if (active) setReady(Boolean(result.data?.length));
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : 'Status Passkey tidak dapat diperiksa.');
      }
    })();
    return () => { active = false; };
  }, [supported]);

  const register = async () => {
    if (!supported) { setMessage('Perangkat/browser ini tidak mendukung Passkey.'); return; }
    if (typeof supabase.auth.registerPasskey !== 'function') { setMessage('Fitur Passkey belum tersedia pada konfigurasi autentikasi ini.'); return; }
    setLoading(true); setMessage('Menunggu konfirmasi biometrik perangkat...');
    try {
      const result = await withTimeout(supabase.auth.registerPasskey(), 20000);
      if (result.error) throw result.error;
      setReady(true);
      setMessage(result.data?.friendly_name ? `Passkey ${result.data.friendly_name} aktif.` : 'Fingerprint / Passkey berhasil diaktifkan.');
    } catch (err: unknown) { setMessage(err instanceof Error ? err.message : 'Gagal mengaktifkan Passkey.'); }
    finally { setLoading(false); }
  };

  const savePin = async () => {
    if (!/^\d{8}$/.test(pin)) { setPinMessage('PIN harus tepat 8 digit angka.'); return; }
    if (pin !== pinConfirm) { setPinMessage('Konfirmasi PIN tidak sama.'); return; }
    setPinLoading(true); setPinMessage('Menyimpan PIN...');
    try {
      const current = await withTimeout(supabase.auth.getUser(), 8000);
      if (current.error) throw current.error;
      if (!current.data.user?.id) throw new Error('Sesi Admin tidak ditemukan. Silakan login ulang.');
      const profileResult = await withTimeout(Promise.resolve(supabase.from('profiles').select('role').eq('id', current.data.user.id).maybeSingle()), 8000);
      if (profileResult.error) throw profileResult.error;
      if (profileResult.data?.role !== 'admin') throw new Error('Akun aktif bukan akun Admin KerjaHarian.');
      const updated = await withTimeout(supabase.auth.updateUser({ password: pin }), 10000);
      if (updated.error) throw updated.error;
      setPin(''); setPinConfirm('');
      setPinMessage('PIN Admin berhasil disimpan.');
    } catch (err: unknown) { setPinMessage(err instanceof Error ? err.message : 'Gagal menyimpan PIN Admin.'); }
    finally { setPinLoading(false); }
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
    {supported && <div className="mt-3"><div className="flex items-center gap-2"><Fingerprint size={17}/><p className="font-semibold text-sm">Fingerprint / Passkey</p></div><p className="text-[11px] text-slate-500 mt-1">{ready ? 'Fingerprint / Passkey sudah aktif di perangkat ini.' : 'Aktifkan login biometrik agar login berikutnya tanpa PIN.'}</p>{!ready && <button onClick={()=>void register()} disabled={loading} className="w-full mt-3 border border-slate-300 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60"><Fingerprint size={17} className="inline mr-1"/>{loading ? 'Menunggu biometrik...' : 'Aktifkan Fingerprint / Passkey'}</button>}{message && <p className="text-xs text-slate-600 mt-2">{message}</p>}</div>}
  </div>;
}
