import { useEffect, useState } from 'react';
import { Fingerprint, ShieldCheck, LockKeyhole } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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
    (async () => {
      if (!supported) return;
      try {
        const { data } = await supabase.auth.passkey.list();
        if (active) setReady(Boolean(data?.length));
      } catch (_) {}
    })();
    return () => { active = false; };
  }, [supported]);

  const register = async () => {
    setLoading(true); setMessage('');
    try {
      const { data, error } = await supabase.auth.registerPasskey();
      if (error) throw error;
      setReady(true);
      setMessage(data?.friendly_name ? `Passkey ${data.friendly_name} aktif.` : 'Fingerprint / Passkey berhasil diaktifkan.');
    } catch (err: any) { setMessage(err?.message || 'Gagal mengaktifkan Passkey.'); }
    finally { setLoading(false); }
  };

  const savePin = async () => {
    if (!/^\d{8}$/.test(pin)) return setPinMessage('PIN harus tepat 8 digit angka.');
    if (pin !== pinConfirm) return setPinMessage('Konfirmasi PIN tidak sama.');
    setPinLoading(true); setPinMessage('');
    try {
      const { data: current } = await supabase.auth.getUser();
      if (current.user?.id) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', current.user.id).maybeSingle();
        if (profile?.role !== 'admin') throw new Error('Akun aktif bukan akun Admin KerjaHarian.');
      }
      const { error } = await supabase.auth.updateUser({ password: pin });
      if (error) throw error;
      setPin(''); setPinConfirm('');
      setPinMessage('PIN Admin berhasil disimpan. PIN ini dapat dipakai untuk login berikutnya.');
    } catch (err: any) { setPinMessage(err?.message || 'Gagal menyimpan PIN Admin.'); }
    finally { setPinLoading(false); }
  };

  return <div className="rounded-2xl border bg-white p-4 shadow-sm">
    <div className="flex items-center gap-3"><div className="rounded-xl bg-slate-100 p-2"><ShieldCheck size={19}/></div><div className="flex-1"><p className="font-semibold text-sm">Keamanan Admin</p><p className="text-xs text-slate-500">Atur PIN cadangan dan aktifkan Fingerprint / Passkey pada perangkat ini.</p></div></div>
    <div className="mt-4 rounded-xl border border-slate-200 p-3">
      <div className="flex items-center gap-2"><LockKeyhole size={17}/><p className="font-semibold text-sm">PIN Admin</p></div>
      <p className="text-[11px] text-slate-500 mt-1">PIN wajib 8 digit dan menjadi metode pemulihan utama bila fingerprint belum tersedia.</p>
      <input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g,'').slice(0,8))} type="password" inputMode="numeric" autoComplete="new-password" maxLength={8} placeholder="PIN baru 8 digit" className="w-full border rounded-xl px-3 py-2.5 mt-3 text-center tracking-[0.3em]" />
      <input value={pinConfirm} onChange={e => setPinConfirm(e.target.value.replace(/\D/g,'').slice(0,8))} type="password" inputMode="numeric" autoComplete="new-password" maxLength={8} placeholder="Ulangi PIN" className="w-full border rounded-xl px-3 py-2.5 mt-2 text-center tracking-[0.3em]" onKeyDown={e => { if (e.key === 'Enter') void savePin(); }} />
      <button onClick={savePin} disabled={pinLoading} className="w-full mt-2 border border-slate-300 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60"><LockKeyhole size={17} className="inline mr-1"/>{pinLoading ? 'Menyimpan PIN...' : 'Simpan / Ubah PIN Admin'}</button>
      {pinMessage && <p className="text-xs text-slate-600 mt-2">{pinMessage}</p>}
    </div>
    {supported && <div className="mt-3"><div className="flex items-center gap-2"><Fingerprint size={17}/><p className="font-semibold text-sm">Fingerprint / Passkey</p></div><p className="text-[11px] text-slate-500 mt-1">{ready ? 'Fingerprint / Passkey sudah aktif di perangkat ini.' : 'Aktifkan login biometrik agar login berikutnya tanpa PIN.'}</p>{!ready && <button onClick={register} disabled={loading} className="w-full mt-3 border border-slate-300 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60"><Fingerprint size={17} className="inline mr-1"/>{loading ? 'Menyiapkan biometrik...' : 'Aktifkan Fingerprint / Passkey'}</button>}{message && <p className="text-xs text-slate-600 mt-2">{message}</p>}</div>}
  </div>;
}
