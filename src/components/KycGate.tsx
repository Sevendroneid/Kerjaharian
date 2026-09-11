import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, FileCheck2, IdCard, Loader2, Lock, ShieldCheck, Upload, XCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const LEGAL_VERSION = '1.0';

export default function KycGate({ children }: { children: ReactNode }) {
  const { user, profile, refreshProfile } = useAuth();
  const [legalLoading, setLegalLoading] = useState(true);
  const [legalSaving, setLegalSaving] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement | null>(null);
  const status = profile?.kyc_status ?? (profile?.kyc_verified ? 'approved' : 'not_started');
  const verified = status === 'approved' || profile?.kyc_verified === true;
  const role = profile?.role === 'worker' ? 'worker' : 'employer';
  const roleLabel = role === 'worker' ? 'Pekerja' : 'Employer';

  useEffect(() => {
    let cancelled = false;
    const loadLegal = async () => {
      if (!user || !profile || profile.role === 'admin') { setLegalLoading(false); return; }
      setLegalLoading(true);
      const { data, error: e } = await supabase
        .from('platform_consents')
        .select('consent_type,document_version')
        .eq('user_id', user.id)
        .in('consent_type', ['platform_terms', 'privacy_policy', role === 'worker' ? 'worker_role_notice' : 'employer_role_notice'])
        .eq('document_version', LEGAL_VERSION);
      if (cancelled) return;
      if (e) { setError(e.message); setLegalLoading(false); return; }
      const accepted = new Set((data ?? []).map((r: { consent_type: string }) => r.consent_type));
      setLegalAccepted(accepted.has('platform_terms') && accepted.has('privacy_policy') && accepted.has(role === 'worker' ? 'worker_role_notice' : 'employer_role_notice'));
      setLegalLoading(false);
    };
    void loadLegal();
    return () => { cancelled = true; };
  }, [user, profile, role]);

  const acceptLegal = async () => {
    if (!user || !profile || !termsChecked || !privacyChecked || !roleChecked) return;
    setLegalSaving(true); setError('');
    const common = { p_role: role, p_document_version: LEGAL_VERSION };
    const entries = [
      { p_consent_type: 'platform_terms', p_document_key: 'platform_terms' },
      { p_consent_type: 'privacy_policy', p_document_key: 'privacy_policy' },
      { p_consent_type: role === 'worker' ? 'worker_role_notice' : 'employer_role_notice', p_document_key: role === 'worker' ? 'worker_role_notice' : 'employer_role_notice' },
    ];
    for (const entry of entries) {
      const { error: e } = await supabase.rpc('record_platform_consent', { ...common, ...entry });
      if (e) { setError(e.message); setLegalSaving(false); return; }
    }
    setLegalAccepted(true); setLegalSaving(false);
  };

  if (!user || !profile || verified && legalAccepted) return <>{children}</>;

  if (legalLoading) return <div className="min-h-screen bg-slate-50 grid place-items-center p-6"><div className="flex items-center gap-2 text-sm font-semibold text-slate-600"><Loader2 className="h-5 w-5 animate-spin" />Memuat persetujuan akun...</div></div>;

  if (!legalAccepted) return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <div className="card overflow-hidden">
          <div className="bg-slate-900 p-6 text-white"><div className="flex items-center gap-3"><ShieldCheck className="h-7 w-7" /><div><h1 className="text-xl font-extrabold">Sebelum mulai</h1><p className="text-sm text-slate-300">Persetujuan penggunaan KerjaHarian</p></div></div></div>
          <div className="space-y-4 p-6">
            <p className="text-sm leading-6 text-slate-600">KerjaHarian adalah platform marketplace pekerjaan harian. Anda dapat membaca dokumen lengkap melalui tautan di bawah sebelum menyetujui.</p>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <p><b>Peran Anda: {roleLabel}</b></p>
              {role === 'worker' ? <p className="mt-2">Anda bebas memilih, menerima, atau menolak pekerjaan yang tersedia. KerjaHarian bukan atasan Anda dan tidak menjamin jumlah pekerjaan atau pendapatan.</p> : <p className="mt-2">Anda bertanggung jawab memberikan informasi pekerjaan, lokasi, ruang lingkup, dan kondisi keselamatan yang benar kepada Pekerja.</p>}
            </div>
            <label className="flex gap-3 text-sm text-slate-700"><input type="checkbox" checked={termsChecked} onChange={e => setTermsChecked(e.target.checked)} className="mt-1 h-4 w-4"/><span>Saya telah membaca dan menyetujui <a href="/terms" target="_blank" rel="noreferrer" className="font-bold text-blue-700 underline">Syarat &amp; Ketentuan</a>.</span></label>
            <label className="flex gap-3 text-sm text-slate-700"><input type="checkbox" checked={privacyChecked} onChange={e => setPrivacyChecked(e.target.checked)} className="mt-1 h-4 w-4"/><span>Saya telah membaca <a href="/privacy" target="_blank" rel="noreferrer" className="font-bold text-blue-700 underline">Kebijakan Privasi</a>.</span></label>
            <label className="flex gap-3 text-sm text-slate-700"><input type="checkbox" checked={roleChecked} onChange={e => setRoleChecked(e.target.checked)} className="mt-1 h-4 w-4"/><span>Saya memahami peran dan tanggung jawab saya sebagai {roleLabel} di KerjaHarian.</span></label>
            {error && <div className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
            <button disabled={!termsChecked || !privacyChecked || !roleChecked || legalSaving} onClick={() => void acceptLegal()} className="btn-primary flex w-full items-center justify-center gap-2 disabled:opacity-50">{legalSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{legalSaving ? 'Menyimpan persetujuan...' : 'Saya Setuju & Lanjutkan'}</button>
            <p className="text-center text-[11px] leading-5 text-slate-400">Versi dokumen yang disetujui dicatat bersama waktu dan konteks akun/transaksi sebagai bukti persetujuan elektronik.</p>
          </div>
        </div>
      </div>
    </div>
  );

  if (verified) return <>{children}</>;

  const selectFile = (next: File | undefined) => {
    if (!next) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(next.type)) { setError('Gunakan foto KTP JPG, PNG, atau WEBP.'); return; }
    if (next.size > 5 * 1024 * 1024) { setError('Ukuran foto maksimal 5MB.'); return; }
    setError(''); setFile(next);
    const reader = new FileReader(); reader.onload = (e) => setPreview(String(e.target?.result ?? '')); reader.readAsDataURL(next);
  };

  const submit = async () => {
    if (!file || !user) return;
    setBusy(true); setError('');
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${user.id}/ktp-${Date.now()}.${ext}`;
    const upload = await supabase.storage.from('kyc-docs').upload(path, file, { contentType: file.type, upsert: false });
    if (upload.error) { setError(upload.error.message); setBusy(false); return; }
    const update = await supabase.from('profiles').update({ ktp_photo_url: path }).eq('id', user.id);
    if (update.error) { setError(update.error.message); setBusy(false); return; }
    const submitResult = await supabase.rpc('verify_kyc');
    if (submitResult.error) { setError(submitResult.error.message); setBusy(false); return; }
    await refreshProfile(); setBusy(false); setFile(null); setPreview(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <div className="card overflow-hidden">
          <div className="bg-slate-900 p-6 text-white"><div className="flex items-center gap-3"><ShieldCheck className="h-7 w-7" /><div><h1 className="text-xl font-extrabold">Verifikasi Identitas</h1><p className="text-sm text-slate-300">Wajib untuk {roleLabel}</p></div></div></div>
          <div className="p-6">
            {status === 'pending' ? <div className="rounded-xl bg-amber-50 p-5 ring-1 ring-amber-200"><CheckCircle2 className="h-8 w-8 text-amber-600" /><h2 className="mt-3 font-bold text-amber-900">Dokumen sedang diperiksa</h2><p className="mt-1 text-sm leading-relaxed text-amber-800">KTP Anda sudah diterima dan menunggu pemeriksaan admin. Anda belum dapat melakukan transaksi sampai identitas disetujui.</p></div> : status === 'rejected' ? <div className="mb-5 rounded-xl bg-red-50 p-4 ring-1 ring-red-200"><XCircle className="h-6 w-6 text-red-600" /><p className="mt-2 text-sm font-bold text-red-900">Verifikasi ditolak</p><p className="mt-1 text-sm text-red-800">{profile.kyc_rejection_reason || 'Foto KTP perlu diperbaiki atau diganti.'}</p></div> : null}
            {status !== 'pending' && <><p className="text-sm leading-relaxed text-slate-600">Upload <b>foto KTP asli</b> yang jelas. Jangan upload screenshot, SIM, kartu lain, atau hasil edit. Pemeriksaan akhir dilakukan admin KerjaHarian.</p><div className="mt-5 rounded-xl border-2 border-dashed border-slate-200 p-5 text-center">{preview ? <img src={preview} alt="Preview KTP" className="mx-auto max-h-56 rounded-lg object-contain" /> : <><IdCard className="mx-auto h-12 w-12 text-slate-300" /><p className="mt-2 text-sm font-semibold text-slate-600">Foto KTP bagian depan</p></>}<input ref={input} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(e) => selectFile(e.target.files?.[0])} /><button onClick={() => input.current?.click()} className="btn-secondary mt-4 inline-flex items-center gap-2"><Upload className="h-4 w-4" />{file ? 'Ganti Foto' : 'Ambil / Pilih Foto KTP'}</button></div>{error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}<button disabled={!file || busy} onClick={submit} className="btn-primary mt-5 flex w-full items-center justify-center gap-2 disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}{busy ? 'Mengirim...' : 'Kirim untuk Verifikasi'}</button><div className="mt-4 flex gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500"><Lock className="h-4 w-4 shrink-0" /><span>Dokumen disimpan di penyimpanan privat dan hanya dapat diakses untuk proses verifikasi.</span></div></>}
            {status === 'pending' && <div className="mt-5 flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Status akan diperbarui setelah admin selesai memeriksa.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
