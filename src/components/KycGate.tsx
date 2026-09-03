import { useRef, useState } from 'react';
import { CheckCircle2, FileCheck2, IdCard, Loader2, Lock, ShieldCheck, Upload, XCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function KycGate({ children }: { children: React.ReactNode }) {
  const { user, profile, refreshProfile } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement | null>(null);
  const status = profile?.kyc_status ?? (profile?.kyc_verified ? 'approved' : 'not_started');
  const verified = status === 'approved' || profile?.kyc_verified === true;

  if (!user || !profile || verified) return <>{children}</>;

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

  const roleLabel = profile.role === 'worker' ? 'Mitra Pekerja' : 'Pemberi Kerja';
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <div className="card overflow-hidden">
          <div className="bg-slate-900 p-6 text-white">
            <div className="flex items-center gap-3"><ShieldCheck className="h-7 w-7" /><div><h1 className="text-xl font-extrabold">Verifikasi Identitas</h1><p className="text-sm text-slate-300">Wajib untuk {roleLabel}</p></div></div>
          </div>
          <div className="p-6">
            {status === 'pending' ? (
              <div className="rounded-xl bg-amber-50 p-5 ring-1 ring-amber-200"><CheckCircle2 className="h-8 w-8 text-amber-600" /><h2 className="mt-3 font-bold text-amber-900">Dokumen sedang diperiksa</h2><p className="mt-1 text-sm leading-relaxed text-amber-800">KTP Anda sudah diterima dan menunggu pemeriksaan admin. Anda belum dapat melakukan transaksi sampai identitas disetujui.</p></div>
            ) : status === 'rejected' ? (
              <div className="mb-5 rounded-xl bg-red-50 p-4 ring-1 ring-red-200"><XCircle className="h-6 w-6 text-red-600" /><p className="mt-2 text-sm font-bold text-red-900">Verifikasi ditolak</p><p className="mt-1 text-sm text-red-800">{profile.kyc_rejection_reason || 'Foto KTP perlu diperbaiki atau diganti.'}</p></div>
            ) : null}
            {status !== 'pending' && <>
              <p className="text-sm leading-relaxed text-slate-600">Upload <b>foto KTP asli</b> yang jelas. Jangan upload screenshot, SIM, kartu lain, atau hasil edit. Pemeriksaan akhir dilakukan admin KerjaHarian.</p>
              <div className="mt-5 rounded-xl border-2 border-dashed border-slate-200 p-5 text-center">
                {preview ? <img src={preview} alt="Preview KTP" className="mx-auto max-h-56 rounded-lg object-contain" /> : <><IdCard className="mx-auto h-12 w-12 text-slate-300" /><p className="mt-2 text-sm font-semibold text-slate-600">Foto KTP bagian depan</p></>}
                <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(e) => selectFile(e.target.files?.[0])} />
                <button onClick={() => input.current?.click()} className="btn-secondary mt-4 inline-flex items-center gap-2"><Upload className="h-4 w-4" />{file ? 'Ganti Foto' : 'Ambil / Pilih Foto KTP'}</button>
              </div>
              {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
              <button disabled={!file || busy} onClick={submit} className="btn-primary mt-5 flex w-full items-center justify-center gap-2 disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}{busy ? 'Mengirim...' : 'Kirim untuk Verifikasi'}</button>
              <div className="mt-4 flex gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500"><Lock className="h-4 w-4 shrink-0" /><span>Dokumen disimpan di penyimpanan privat dan hanya dapat diakses untuk proses verifikasi.</span></div>
            </>}
            {status === 'pending' && <div className="mt-5 flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Status akan diperbarui setelah admin selesai memeriksa.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
