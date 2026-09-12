import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Camera, CheckCircle2, FileCheck2, IdCard, Loader2, Lock, ShieldCheck, Upload, UserRound, XCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const LEGAL_VERSION = '1.0';
type Step = 'identity' | 'face' | 'review';

export default function KycGate({ children }: { children: ReactNode }) {
  const { user, profile, refreshProfile } = useAuth();
  const [legalLoading, setLegalLoading] = useState(true);
  const [legalSaving, setLegalSaving] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [ktpPreview, setKtpPreview] = useState<string | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('identity');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const ktpInput = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const status = profile?.kyc_status ?? (profile?.kyc_verified ? 'approved' : 'not_started');
  const verified = status === 'approved' || profile?.kyc_verified === true;
  const role = profile?.role === 'worker' ? 'worker' : 'employer';
  const roleLabel = role === 'worker' ? 'Pekerja' : 'Employer';
  const needsFace = role === 'employer';

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

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  }, []);

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
    <div className="min-h-screen bg-slate-50 px-4 py-10"><div className="mx-auto max-w-lg"><div className="card overflow-hidden">
      <div className="bg-slate-900 p-6 text-white"><div className="flex items-center gap-3"><ShieldCheck className="h-7 w-7"/><div><h1 className="text-xl font-extrabold">Sebelum mulai</h1><p className="text-sm text-slate-300">Persetujuan penggunaan KerjaHarian</p></div></div></div>
      <div className="space-y-4 p-6"><p className="text-sm leading-6 text-slate-600">KerjaHarian menggunakan proses verifikasi bertahap agar transaksi lebih aman. Anda dapat membaca dokumen lengkap sebelum menyetujui.</p>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700"><p><b>Peran Anda: {roleLabel}</b></p>{role === 'worker' ? <p className="mt-2">Anda bebas memilih, menerima, atau menolak pekerjaan yang tersedia. KerjaHarian bukan atasan Anda dan tidak menjamin jumlah pekerjaan atau pendapatan.</p> : <p className="mt-2">Anda bertanggung jawab memberikan informasi pekerjaan, lokasi, ruang lingkup, dan kondisi keselamatan yang benar kepada Pekerja.</p>}</div>
        <label className="flex gap-3 text-sm text-slate-700"><input type="checkbox" checked={termsChecked} onChange={e=>setTermsChecked(e.target.checked)} className="mt-1 h-4 w-4"/><span>Saya telah membaca dan menyetujui <a href="/terms" target="_blank" rel="noreferrer" className="font-bold text-blue-700 underline">Syarat &amp; Ketentuan</a>.</span></label>
        <label className="flex gap-3 text-sm text-slate-700"><input type="checkbox" checked={privacyChecked} onChange={e=>setPrivacyChecked(e.target.checked)} className="mt-1 h-4 w-4"/><span>Saya telah membaca <a href="/privacy" target="_blank" rel="noreferrer" className="font-bold text-blue-700 underline">Kebijakan Privasi</a>.</span></label>
        <label className="flex gap-3 text-sm text-slate-700"><input type="checkbox" checked={roleChecked} onChange={e=>setRoleChecked(e.target.checked)} className="mt-1 h-4 w-4"/><span>Saya memahami peran dan tanggung jawab saya sebagai {roleLabel} di KerjaHarian.</span></label>
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
        <button disabled={!termsChecked || !privacyChecked || !roleChecked || legalSaving} onClick={()=>void acceptLegal()} className="btn-primary flex w-full items-center justify-center gap-2 disabled:opacity-50">{legalSaving?<Loader2 className="h-4 w-4 animate-spin"/>:<CheckCircle2 className="h-4 w-4"/>}{legalSaving?'Menyimpan persetujuan...':'Saya Setuju & Lanjutkan'}</button>
        <p className="text-center text-[11px] leading-5 text-slate-400">Versi dokumen yang disetujui dicatat bersama waktu dan konteks akun/transaksi sebagai bukti persetujuan elektronik.</p>
      </div></div></div></div>
  );

  if (verified) return <>{children}</>;

  const selectKtp = (next: File | undefined) => {
    if (!next) return;
    if (!['image/jpeg','image/png','image/webp'].includes(next.type)) { setError('Gunakan foto JPG, PNG, atau WEBP.'); return; }
    if (next.size > 5*1024*1024) { setError('Ukuran foto maksimal 5MB.'); return; }
    setError(''); const reader = new FileReader();
    reader.onload = e => { setKtpFile(next); setKtpPreview(String(e.target?.result ?? '')); };
    reader.readAsDataURL(next);
  };

  const startCamera = async () => {
    setCameraError(''); setCameraLoading(true); setCameraOpen(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Kamera langsung tidak didukung browser ini. Gunakan Chrome terbaru di HP.');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } }, audio: false });
      streamRef.current?.getTracks().forEach(track=>track.stop()); streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
    } catch (e) { setCameraError(e instanceof Error ? e.message : 'Kamera tidak dapat dibuka.'); }
    finally { setCameraLoading(false); }
  };

  const closeCamera = () => { streamRef.current?.getTracks().forEach(track=>track.stop()); streamRef.current = null; setCameraOpen(false); };

  const captureSelfie = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) { setCameraError('Kamera belum siap. Tunggu sebentar lalu coba lagi.'); return; }
    const canvas = document.createElement('canvas');
    const width = Math.min(video.videoWidth || 720, 1080);
    const height = Math.round(width * ((video.videoHeight || 720)/(video.videoWidth || 720)));
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d'); if (!ctx) { setCameraError('Kamera gagal diproses.'); return; }
    ctx.drawImage(video,0,0,width,height);
    canvas.toBlob(blob=>{
      if (!blob) { setCameraError('Foto selfie gagal dibuat.'); return; }
      const file = new File([blob], `selfie-${Date.now()}.jpg`, {type:'image/jpeg'});
      setSelfieFile(file); setSelfiePreview(canvas.toDataURL('image/jpeg',0.9)); setCameraError(''); closeCamera(); setStep('review');
    },'image/jpeg',0.9);
  };

  const submit = async () => {
    if (!ktpFile || !user || (needsFace && !selfieFile)) return;
    setBusy(true); setError('');
    const uploadOne = async (file: File, prefix: string) => {
      const path = `${user.id}/${prefix}-${Date.now()}.jpg`;
      const result = await supabase.storage.from('kyc-docs').upload(path,file,{contentType:'image/jpeg',upsert:false});
      if (result.error) throw new Error(result.error.message); return path;
    };
    try {
      const ktpPath = await uploadOne(ktpFile,'ktp');
      const selfiePath = needsFace && selfieFile ? await uploadOne(selfieFile,'selfie') : null;
      const update = await supabase.from('profiles').update({ktp_photo_url:ktpPath,...(needsFace?{selfie_photo_url:selfiePath}:{})}).eq('id',user.id);
      if (update.error) throw new Error(update.error.message);
      const submitResult = await supabase.rpc('verify_kyc'); if (submitResult.error) throw new Error(submitResult.error.message);
      await refreshProfile(); setKtpFile(null); setKtpPreview(null); setSelfieFile(null); setSelfiePreview(null); setBusy(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'Gagal mengirim dokumen verifikasi.'); setBusy(false); }
  };

  const stepNumber = step === 'identity' ? 1 : step === 'face' ? 2 : 3;
  const totalSteps = needsFace ? 3 : 2;

  return <div className="min-h-screen bg-slate-50 px-4 py-8"><div className="mx-auto max-w-lg">
    <div className="mb-4 flex items-center justify-between text-xs font-bold text-slate-500"><span>Verifikasi identitas</span><span>Langkah {stepNumber} dari {totalSteps}</span></div>
    <div className="mb-5 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-primary-600 transition-all" style={{width:`${(stepNumber/totalSteps)*100}%`}}/></div>
    <div className="card overflow-hidden"><div className="bg-slate-900 p-6 text-white"><div className="flex items-center gap-3"><ShieldCheck className="h-7 w-7"/><div><h1 className="text-xl font-extrabold">Verifikasi Identitas</h1><p className="text-sm text-slate-300">Satu kali sebelum mulai bertransaksi</p></div></div></div>
      <div className="p-6">
        {status === 'pending' && <div className="rounded-xl bg-amber-50 p-5 ring-1 ring-amber-200"><CheckCircle2 className="h-8 w-8 text-amber-600"/><h2 className="mt-3 font-bold text-amber-900">Verifikasi sedang diperiksa</h2><p className="mt-1 text-sm leading-relaxed text-amber-800">Dokumen sudah diterima. Tunggu pemeriksaan admin sebelum melakukan transaksi.</p></div>}
        {status === 'rejected' && <div className="mb-5 rounded-xl bg-red-50 p-4 ring-1 ring-red-200"><XCircle className="h-6 w-6 text-red-600"/><p className="mt-2 text-sm font-bold text-red-900">Verifikasi perlu diperbaiki</p><p className="mt-1 text-sm text-red-800">{profile.kyc_rejection_reason || 'Silakan periksa kembali foto dan kirim ulang.'}</p></div>}
        {status !== 'pending' && step === 'identity' && <>
          <div className="rounded-xl bg-primary-50 p-4 ring-1 ring-primary-100"><div className="flex gap-3"><IdCard className="h-5 w-5 shrink-0 text-primary-700"/><div><p className="text-sm font-bold text-primary-900">Langkah 1 — Verifikasi KTP</p><p className="mt-1 text-xs leading-5 text-primary-800">Ambil foto KTP asli langsung dari HP. Pastikan seluruh kartu terlihat, tidak buram, tidak terpotong, dan tidak memantulkan cahaya.</p></div></div></div>
          <div className="mt-5 rounded-xl border-2 border-dashed border-slate-200 p-5 text-center">{ktpPreview?<img src={ktpPreview} alt="Preview KTP" className="mx-auto max-h-56 rounded-lg object-contain"/>:<><IdCard className="mx-auto h-12 w-12 text-slate-300"/><p className="mt-2 text-sm font-semibold text-slate-600">Foto KTP bagian depan</p></>}
            <input ref={ktpInput} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={e=>selectKtp(e.target.files?.[0])}/><button onClick={()=>ktpInput.current?.click()} className="btn-secondary mt-4 inline-flex items-center gap-2"><Upload className="h-4 w-4"/>{ktpFile?'Ganti Foto KTP':'Ambil Foto KTP'}</button></div>
          {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}<button disabled={!ktpFile} onClick={()=>setStep(needsFace?'face':'review')} className="btn-primary mt-5 w-full disabled:opacity-50">{needsFace?'Lanjut ke Verifikasi Wajah':'Periksa & Kirim'}</button>
        </>}
        {status !== 'pending' && step === 'face' && needsFace && <>
          <div className="rounded-xl bg-primary-50 p-4 ring-1 ring-primary-100"><div className="flex gap-3"><UserRound className="h-5 w-5 shrink-0 text-primary-700"/><div><p className="text-sm font-bold text-primary-900">Langkah 2 — Verifikasi Wajah</p><p className="mt-1 text-xs leading-5 text-primary-800">Seperti onboarding mitra Gojek: ambil selfie langsung dari kamera HP. Wajah harus jelas, sendirian, tanpa masker, topi, atau kacamata hitam.</p></div></div></div>
          <div className="mt-5 rounded-xl border-2 border-dashed border-slate-200 p-5 text-center">{selfiePreview?<img src={selfiePreview} alt="Preview selfie" className="mx-auto max-h-64 rounded-xl object-contain"/>:<div className="mx-auto grid h-28 w-28 place-items-center rounded-full bg-slate-100"><Camera className="h-12 w-12 text-slate-300"/></div>}
            <p className="mt-3 text-sm font-semibold text-slate-700">Selfie wajah langsung</p><p className="mt-1 text-xs text-slate-500">Cari tempat terang dan posisikan wajah di tengah kamera.</p><button onClick={()=>void startCamera()} className="btn-primary mt-4 inline-flex items-center gap-2"><Camera className="h-4 w-4"/>{selfieFile?'Ambil Ulang Selfie':'Buka Kamera & Selfie'}</button></div>
          {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}<button disabled={!selfieFile} onClick={()=>setStep('review')} className="btn-secondary mt-4 w-full disabled:opacity-50">Lanjutkan</button>
        </>}
        {status !== 'pending' && step === 'review' && <>
          <div className="rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-200"><div className="flex gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700"/><div><p className="text-sm font-bold text-emerald-900">Langkah terakhir — Periksa data</p><p className="mt-1 text-xs leading-5 text-emerald-800">Pastikan foto KTP dan selfie jelas. Setelah dikirim, status menjadi menunggu pemeriksaan admin.</p></div></div></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-slate-200 p-3"><p className="mb-2 text-xs font-bold text-slate-500">KTP</p>{ktpPreview&&<img src={ktpPreview} alt="KTP" className="h-36 w-full rounded-lg object-contain bg-slate-50"/>}<button onClick={()=>setStep('identity')} className="mt-2 text-xs font-bold text-primary-700">Ganti KTP</button></div>
            {needsFace&&<div className="rounded-xl border border-slate-200 p-3"><p className="mb-2 text-xs font-bold text-slate-500">SELFIE</p>{selfiePreview&&<img src={selfiePreview} alt="Selfie" className="h-36 w-full rounded-lg object-contain bg-slate-50"/>}<button onClick={()=>setStep('face')} className="mt-2 text-xs font-bold text-primary-700">Ambil ulang</button></div>}</div>
          {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}<button disabled={busy||!ktpFile||(needsFace&&!selfieFile)} onClick={()=>void submit()} className="btn-primary mt-5 flex w-full items-center justify-center gap-2 disabled:opacity-50">{busy?<Loader2 className="h-4 w-4 animate-spin"/>:<FileCheck2 className="h-4 w-4"/>}{busy?'Mengirim untuk pemeriksaan...':'Kirim untuk Verifikasi'}</button>
          <div className="mt-4 flex gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500"><Lock className="h-4 w-4 shrink-0"/><span>Dokumen disimpan di penyimpanan privat dan digunakan untuk proses verifikasi identitas.</span></div>
        </>}
      </div></div>
  </div>
  {cameraOpen&&<div className="fixed inset-0 z-[200] grid place-items-center bg-slate-950/80 p-4"><div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between p-4"><div><h2 className="font-extrabold text-slate-900">Verifikasi wajah</h2><p className="text-xs text-slate-500">Pastikan hanya wajah Anda yang terlihat.</p></div><button onClick={closeCamera} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">✕</button></div><div className="relative bg-black"><video ref={videoRef} muted playsInline className="aspect-square w-full object-cover"/><div className="pointer-events-none absolute inset-0 grid place-items-center"><div className="h-64 w-52 rounded-[45%] border-2 border-white/80"/></div>{cameraLoading&&<div className="absolute inset-0 grid place-items-center bg-black/50 text-white"><Loader2 className="h-8 w-8 animate-spin"/></div>}</div><div className="space-y-3 p-4"><p className="text-xs leading-5 text-slate-600">Wajah harus terang dan jelas. Jangan gunakan masker, topi, atau kacamata hitam. Selfie diambil langsung dari kamera perangkat.</p>{cameraError&&<p className="rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700">{cameraError}</p>}<button disabled={cameraLoading||!!cameraError} onClick={captureSelfie} className="btn-primary flex w-full items-center justify-center gap-2 disabled:opacity-50"><Camera className="h-4 w-4"/>Ambil Selfie Sekarang</button></div></div></div>}
  </div>;
}
