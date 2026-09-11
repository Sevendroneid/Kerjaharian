import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, SlidersHorizontal } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export function WorkerMatchingProfile() {
  const { user } = useAuth();
  const [gender, setGender] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [lifting, setLifting] = useState('');
  const [night, setNight] = useState(false);
  const [privateHome, setPrivateHome] = useState(false);
  const [skills, setSkills] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => { if (!user) return; void (async () => { const { data } = await supabase.from('profiles').select('gender,birth_year,lifting_capacity_kg,night_work_ok,private_home_ok,matching_skills').eq('id', user.id).maybeSingle(); if (data) { setGender(data.gender ?? ''); setBirthYear(data.birth_year ? String(data.birth_year) : ''); setLifting(data.lifting_capacity_kg != null ? String(data.lifting_capacity_kg) : ''); setNight(Boolean(data.night_work_ok)); setPrivateHome(Boolean(data.private_home_ok)); setSkills((data.matching_skills ?? []).join(', ')); } })(); }, [user]);

  const save = async () => {
    if (!user) return; setBusy(true); setMessage('');
    const year = birthYear.trim() ? Number(birthYear) : null; const kg = lifting.trim() ? Number(lifting) : null;
    if (year !== null && (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear() - 18)) { setMessage('Tahun lahir tidak valid.'); setBusy(false); return; }
    if (kg !== null && (!Number.isInteger(kg) || kg < 0 || kg > 100)) { setMessage('Kapasitas angkat harus 0–100 kg.'); setBusy(false); return; }
    const { error } = await supabase.rpc('update_worker_matching_profile', { p_gender: gender || null, p_birth_year: year, p_lifting_capacity_kg: kg, p_night_work_ok: night, p_private_home_ok: privateHome, p_matching_skills: skills.split(',').map(s => s.trim()).filter(Boolean) });
    setMessage(error ? error.message : 'Profil kesiapan kerja tersimpan. Data ini dipakai hanya untuk mencocokkan kebutuhan pekerjaan.'); setBusy(false);
  };
  if (!user) return null;
  return <section className="card mt-4 p-6"><div className="flex items-start gap-3"><SlidersHorizontal className="mt-0.5 h-5 w-5 text-primary-600"/><div><h3 className="font-display text-sm font-bold text-slate-900">Kesiapan & Kecocokan Kerja</h3><p className="mt-1 text-xs leading-relaxed text-slate-500">Isi yang relevan saja. Tidak wajib mengisi data yang tidak diperlukan untuk pekerjaan biasa.</p></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Gender (opsional)<select value={gender} onChange={e=>setGender(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm"><option value="">Tidak diisi</option><option value="male">Laki-laki</option><option value="female">Perempuan</option><option value="other">Lainnya</option><option value="prefer_not_to_say">Tidak ingin menyebutkan</option></select></label><label className="text-xs font-semibold text-slate-600">Tahun lahir (opsional)<input type="number" inputMode="numeric" min="1900" max={new Date().getFullYear()-18} value={birthYear} onChange={e=>setBirthYear(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm" placeholder="Contoh: 1985"/></label><label className="text-xs font-semibold text-slate-600">Kapasitas angkat (kg)<input type="number" min="0" max="100" value={lifting} onChange={e=>setLifting(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm" placeholder="Kosongkan jika tidak perlu"/></label><label className="text-xs font-semibold text-slate-600">Keahlian<input value={skills} onChange={e=>setSkills(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm" placeholder="Contoh: angkut, pindahan"/></label></div><div className="mt-3 space-y-2 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={night} onChange={e=>setNight(e.target.checked)}/> Bersedia kerja malam</label><label className="flex items-center gap-2"><input type="checkbox" checked={privateHome} onChange={e=>setPrivateHome(e.target.checked)}/> Bersedia bekerja di rumah/ruang privat</label></div><button type="button" onClick={()=>void save()} disabled={busy} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{busy?<Loader2 className="h-4 w-4 animate-spin"/>:<CheckCircle2 className="h-4 w-4"/>}Simpan Kesiapan Kerja</button>{message&&<p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs font-semibold text-slate-600">{message}</p>}</section>;
}
