import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ShieldCheck, MapPin, Wallet, MessageCircle, ArrowRight, Flag, Radar, Briefcase, X, AlertTriangle, IdCard, CheckCircle2, Loader2, Lock, Upload, ImageIcon, Clock, Hand } from 'lucide-react';
import { CATEGORY_MAP } from '@/lib/data';
import { formatIDR, timeAgo } from '@/lib/format';
import { Stars } from './Stars';
import { useAuth } from '@/lib/auth';
import { supabase, type Job } from '@/lib/supabase';

type Filter = 'all' | 'logistik' | 'tukang' | 'kebersihan' | 'serabutan';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Semua' }, { id: 'logistik', label: 'Logistik' }, { id: 'tukang', label: 'Tukang' }, { id: 'kebersihan', label: 'Kebersihan' }, { id: 'serabutan', label: 'Serabutan' },
];
interface WorkerProps { onAuthClick: (mode: 'signin' | 'signup') => void; }
type LocatedJob = Job & { __location?: { lat: number; lng: number }; __distanceKm?: number };
const distanceKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const toRad = (value: number) => value * Math.PI / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(b.lat - a.lat); const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

export function Worker({ onAuthClick }: WorkerProps) {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const [showWorkerDashboard, setShowWorkerDashboard] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [radius, setRadius] = useState(5);
  const [workerLocation, setWorkerLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [reporting, setReporting] = useState<Job | null>(null);
  const [reported, setReported] = useState<Set<string>>(new Set());
  const [jobs, setJobs] = useState<LocatedJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [claimingJobId, setClaimingJobId] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState('');
  const [kycModalOpen, setKycModalOpen] = useState(false);
  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [ktpPreview, setKtpPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null) as React.RefObject<HTMLInputElement>;
  const kycVerified = profile?.kyc_verified ?? false;
  const isOnline = profile?.is_online ?? false;

  const requestWorkerLocation = useCallback(() => {
    if (!navigator.geolocation) { setLocationError('Perangkat/browser tidak mendukung GPS.'); return; }
    setLocationLoading(true); setLocationError('');
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setWorkerLocation({ lat: coords.latitude, lng: coords.longitude }); setLocationLoading(false);
    }, () => {
      setLocationError('Lokasi diperlukan untuk menampilkan pekerjaan sesuai radius radar.'); setLocationLoading(false);
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
  }, []);

  const fetchJobs = useCallback(async () => {
    setLoadingJobs(true); setError('');
    const { data, error: jobsError } = await supabase.from('jobs').select('*').eq('status', 'open').order('created_at', { ascending: false });
    if (jobsError) { setError(jobsError.message); setJobs([]); setLoadingJobs(false); return; }
    const openJobs = (data ?? []) as Job[];
    const orderIds = openJobs.map((job) => job.order_id).filter((id): id is string => Boolean(id));
    if (!orderIds.length) { setJobs(openJobs); setLoadingJobs(false); return; }
    const { data: locations, error: locationsError } = await supabase.from('order_locations').select('order_id,lat,lng').in('order_id', orderIds);
    if (locationsError) { setError(locationsError.message); setJobs([]); setLoadingJobs(false); return; }
    const locationMap = new Map((locations ?? []).filter((row) => row.lat != null && row.lng != null).map((row) => [row.order_id, { lat: Number(row.lat), lng: Number(row.lng) }]));
    setJobs(openJobs.map((job) => ({ ...job, __location: job.order_id ? locationMap.get(job.order_id) : undefined })));
    setLoadingJobs(false);
  }, []);
  useEffect(() => { void fetchJobs(); }, [fetchJobs]);
  useEffect(() => { if (user) requestWorkerLocation(); }, [user, requestWorkerLocation]);
  const filteredJobs = useMemo(() => {
    if (!workerLocation) return [];
    return jobs.filter((j) => filter === 'all' || j.category === filter).map((job) => ({ ...job, __distanceKm: job.__location ? distanceKm(workerLocation, job.__location) : Infinity })).filter((job) => job.__distanceKm <= radius).sort((a, b) => (a.__distanceKm ?? Infinity) - (b.__distanceKm ?? Infinity));
  }, [jobs, filter, workerLocation, radius]);

  const handleVerify = async () => { if (!user) { onAuthClick('signup'); return; } setKycModalOpen(true); };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith('image/')) { setError('File harus berupa gambar (foto KTP).'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Ukuran file maksimal 5MB.'); return; }
    setError(''); setKtpFile(file); const reader = new FileReader(); reader.onload = (ev) => setKtpPreview(ev.target?.result as string); reader.readAsDataURL(file);
  };
  const handleUploadKyc = async () => {
    if (!user || !ktpFile) return; setUploading(true); setError('');
    const fileExt = ktpFile.name.split('.').pop(); const fileName = `${user.id}/ktp-${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('kyc-docs').upload(fileName, ktpFile, { upsert: true });
    if (uploadError) { setError(uploadError.message); setUploading(false); return; }
    const { error: updateError } = await supabase.from('profiles').update({ ktp_photo_url: fileName }).eq('id', user.id);
    if (updateError) { setError(updateError.message); setUploading(false); return; }
    const { error: rpcError } = await supabase.rpc('verify_kyc');
    if (rpcError) { setError(rpcError.message); setUploading(false); return; }
    await refreshProfile(); setUploading(false); setKycModalOpen(false); setKtpFile(null); setKtpPreview(null);
  };
  const handleToggleOnline = async () => {
    if (!user) { onAuthClick('signin'); return; }
    setToggling(true); setError('');
    const { error } = await supabase.rpc('update_worker_status', { p_is_online: !isOnline });
    if (error) setError(error.message); else await refreshProfile();
    setToggling(false);
  };
  const handleClaim = async (job: Job) => {
    if (!user) { onAuthClick('signin'); return; }
    if (!isOnline) { setError('Aktifkan status Online terlebih dahulu untuk mengambil pekerjaan.'); return; }
    setClaimingJobId(job.id); setError('');
    const { error: claimError } = await supabase.rpc('claim_job', { p_job_id: job.id });
    if (claimError) setError(claimError.message || 'Pekerjaan sudah diambil mitra lain.');
    else setJobs((prev) => prev.filter((item) => item.id !== job.id));
    setClaimingJobId(null);
  };
  const handleReport = async (job: Job) => {
    if (!user) return;
    const { error } = await supabase.from('job_reports').insert({ job_id: job.id, reporter_id: user.id, reason: 'Laporan tugas fiktif/tidak valid' });
    if (!error) setReported((prev) => new Set(prev).add(job.id)); setReporting(null);
  };
  const initials = profile?.full_name ? profile.full_name.split(' ').slice(0, 2).map((s) => s[0]).join('').toUpperCase() : 'U';

  if (!showWorkerDashboard) return <div className="bg-slate-50 pb-20 pt-6 sm:pt-8"><div className="container-app"><div className="mx-auto max-w-5xl">
    <div className="mb-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7"><div className="inline-flex items-center gap-2 rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-700"><Briefcase className="h-3.5 w-3.5"/>Mitra Pekerja</div><h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Cari pekerjaan hari ini</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Setelah KYC disetujui, urutan kerja Anda adalah: cek pekerjaan → aktifkan status online → pilih dan ambil pekerjaan.</p></div>
    <div className="mb-5 grid gap-3 sm:grid-cols-3"><div className="card flex items-center gap-3 p-4"><div className="rounded-xl bg-primary-50 p-2"><MapPin className="h-5 w-5 text-primary-600"/></div><div><p className="text-xs font-bold uppercase text-slate-500">1. Cek Pekerjaan</p><p className="font-extrabold text-slate-900">{loadingJobs?'Memuat…':`${jobs.length} tersedia`}</p></div></div><div className="card flex items-center gap-3 p-4"><div className="rounded-xl bg-primary-50 p-2"><Radar className="h-5 w-5 text-primary-600"/></div><div><p className="text-xs font-bold uppercase text-slate-500">2. Status Online</p><p className="font-extrabold text-slate-900">{isOnline?'Online':'Offline'}</p></div></div><div className="card flex items-center gap-3 p-4"><div className="rounded-xl bg-primary-50 p-2"><ShieldCheck className="h-5 w-5 text-primary-600"/></div><div><p className="text-xs font-bold uppercase text-slate-500">KYC</p><p className="font-extrabold text-slate-900">{kycVerified?'Terverifikasi':'Menunggu'}</p></div></div></div>
    <section className="card p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="font-extrabold text-slate-900">1. Cek Pekerjaan</h2><p className="mt-1 text-sm text-slate-500">Lihat pekerjaan yang tersedia sebelum masuk ke radar kerja.</p></div><CheckCircle2 className="h-5 w-5 text-green-600"/></div><div className="mt-4 space-y-2">{jobs.length?jobs.slice(0,5).map(job=><div key={job.id} className="rounded-xl border bg-white p-4"><p className="font-semibold text-slate-900">{job.title||'Pekerjaan tersedia'}</p><p className="mt-1 text-xs text-slate-500">{job.category||'Kategori pekerjaan'}</p></div>):<p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Belum ada pekerjaan terbuka yang terdeteksi.</p>}</div></section>
    <section className="mt-4 card p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="font-extrabold text-slate-900">2. Aktifkan Status Online</h2><p className="mt-1 text-sm text-slate-500">Masuk ke Radar Kerja untuk mengaktifkan status online dan menentukan radius.</p></div><Radar className="h-5 w-5 text-primary-600"/></div><button type="button" onClick={()=>setShowWorkerDashboard(true)} className="btn-primary mt-4 flex items-center gap-2">Buka Radar & Status Online<ArrowRight className="h-4 w-4"/></button></section>
    <section className="mt-4 card p-5 sm:p-6"><h2 className="font-extrabold text-slate-900">3. Pilih / Ambil Pekerjaan</h2><p className="mt-1 text-sm text-slate-500">Setelah Online dan GPS aktif, pilih pekerjaan yang sesuai lalu tekan Ambil Pekerjaan.</p><div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Pekerjaan hanya dapat diambil ketika status Anda <b>Online</b> dan berada dalam radius yang dipilih.</div></section>
  </div></div></div>;

  return <div className="bg-slate-50 pb-20 pt-8"><div className="container-app">
    <div className="mb-8"><div className="inline-flex items-center gap-2 rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-700"><Briefcase className="h-3.5 w-3.5" />Mitra Pekerja</div><h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Radar Kerja Real-Time</h1><p className="mt-2 max-w-xl text-slate-500">Aktifkan status online untuk menerima panggilan kerja dari pemberi kerja terdekat.</p></div>
    {error && <div className="mb-4 flex items-center gap-2 rounded-lg bg-error-50 px-4 py-3 text-sm font-semibold text-error-700 ring-1 ring-error-200"><AlertTriangle className="h-4 w-4" />{error}</div>}
    <div className="grid gap-6 lg:grid-cols-3"><div className="lg:col-span-1">
      <div className="card p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Status Ketersediaan</p><p className={`mt-1 font-display text-lg font-bold ${isOnline ? 'text-success-600' : 'text-slate-500'}`}>{isOnline ? 'Online' : 'Offline'}</p></div><button onClick={handleToggleOnline} disabled={authLoading || toggling} className={`relative h-8 w-14 rounded-full transition-colors ${isOnline ? 'bg-success-500' : 'bg-slate-300'} disabled:cursor-not-allowed disabled:opacity-50`} aria-label="Toggle online">{toggling ? <Loader2 className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 animate-spin text-white" /> : <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-soft transition-transform ${isOnline ? 'translate-x-7' : 'translate-x-1'}`} />}</button></div>
        {authLoading ? <div className="mt-4 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div> : !user ? <div className="mt-4 rounded-xl bg-primary-50 p-4 ring-1 ring-primary-200"><div className="flex items-center gap-2"><Lock className="h-5 w-5 text-primary-600" /><p className="text-sm font-bold text-primary-800">Masuk Diperlukan</p></div><p className="mt-1.5 text-xs leading-relaxed text-primary-700">Masuk atau daftar untuk mengelola status online dan menerima panggilan kerja.</p><button onClick={() => onAuthClick('signin')} className="btn-primary mt-3 w-full">Masuk Sekarang</button></div> : <div className="mt-4 flex items-center gap-2 rounded-xl bg-success-50 p-3 ring-1 ring-success-200"><CheckCircle2 className="h-4 w-4 text-success-600" /><p className="text-xs font-semibold text-success-700">Online dapat digunakan untuk mengambil pekerjaan. KYC sudah melewati gate sebelum panel ini.</p></div>}
      </div>
      <div className="card mt-4 p-6"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Radar className="h-5 w-5 text-primary-600" /><h3 className="font-display text-sm font-bold text-slate-900">Jangkauan Radar</h3></div><span className="text-sm font-bold text-primary-700">{radius} km</span></div><div className="relative mx-auto mt-5 h-44 w-44"><div className="absolute inset-0 rounded-full bg-primary-50" /><div className="absolute inset-[12%] rounded-full bg-primary-100/70" /><div className="absolute inset-[28%] rounded-full bg-primary-200/60" /><div className="absolute inset-[44%] rounded-full bg-primary-300/50" /><div className="absolute inset-0 animate-radar-sweep rounded-full"><div className="absolute left-1/2 top-1/2 h-1/2 w-1/2 origin-left bg-gradient-to-r from-primary-400/40 to-transparent" /></div><div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"><div className="relative"><span className="absolute inset-0 animate-pulse-ring rounded-full bg-primary-500" /><span className="relative block h-3 w-3 rounded-full bg-primary-600 ring-4 ring-white" /></div></div>{filteredJobs.slice(0, 5).map((job, i) => { const angle = (i / 5) * Math.PI * 2; const r = 35 + (i % 3) * 12; return <span key={job.id} style={{ left: `${50 + Math.cos(angle) * r}%`, top: `${50 + Math.sin(angle) * r}%`, animationDelay: `${i * 0.4}s` }} className="absolute h-2.5 w-2.5 animate-pulse-ring rounded-full bg-accent-500" />; })}</div><div className="mt-5"><input type="range" min={1} max={10} value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="w-full accent-primary-600" /><div className="flex justify-between text-xs text-slate-400"><span>1 km</span><span>10 km</span></div></div><div className="mt-3 flex items-center justify-between gap-3 text-xs"><span className="text-slate-500">{workerLocation ? 'GPS aktif' : locationLoading ? 'Mencari lokasi…' : 'GPS belum tersedia'}</span><button onClick={requestWorkerLocation} disabled={locationLoading} className="font-bold text-primary-700">{locationLoading ? 'Memproses' : 'Perbarui lokasi'}</button></div>{locationError && <p className="mt-2 text-xs font-semibold text-warning-600">{locationError}</p>}</div>
      <div className="card mt-4 p-6"><h3 className="font-display text-sm font-bold text-slate-900">Profil Mitra</h3>{user ? <div className="mt-3 flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-base font-bold text-white">{initials}</div><div><div className="flex items-center gap-1.5"><p className="text-sm font-bold text-slate-900">{profile?.full_name}</p>{kycVerified && <ShieldCheck className="h-4 w-4 text-success-500" />}</div><Stars value={profile?.rating ?? 5} size={12} /><p className="mt-0.5 text-xs text-slate-500">{profile?.jobs_done ?? 0} pekerjaan selesai</p></div></div> : <p className="mt-3 text-sm text-slate-400">Masuk untuk melihat profil Anda.</p>}</div>
    </div><div className="lg:col-span-2"><div className="card p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><h3 className="font-display text-base font-bold text-slate-900">Panggilan Masuk</h3><div className="flex flex-wrap gap-1.5">{FILTERS.map((f) => <button key={f.id} onClick={() => setFilter(f.id)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${filter === f.id ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{f.label}</button>)}</div></div>
      {loadingJobs ? <div className="mt-6 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div> : !user ? <div className="mt-6 rounded-xl border-2 border-dashed border-slate-200 p-10 text-center"><Radar className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-500">Masuk untuk mulai menerima panggilan kerja.</p></div> : !isOnline ? <div className="mt-6 rounded-xl border-2 border-dashed border-slate-200 p-10 text-center"><Radar className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-500">Aktifkan status online untuk menerima panggilan kerja.</p></div> : !workerLocation ? <div className="mt-6 rounded-xl border-2 border-dashed border-slate-200 p-10 text-center"><MapPin className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-500">Aktifkan izin lokasi untuk menggunakan Radar.</p><button onClick={requestWorkerLocation} className="btn-primary mt-3">Aktifkan Lokasi</button></div> : filteredJobs.length === 0 ? <div className="mt-6 rounded-xl border-2 border-dashed border-slate-200 p-10 text-center"><p className="text-sm text-slate-400">Tidak ada panggilan dalam radius {radius} km. Perluas jangkauan radar Anda.</p></div> : <div className="mt-5 space-y-3">{filteredJobs.map((job) => <JobCard key={job.id} job={job} distance={job.__distanceKm} reported={reported.has(job.id)} claiming={claimingJobId === job.id} onClaim={() => handleClaim(job)} onReport={() => setReporting(job)} />)}</div>}
    </div></div></div></div></div>;
}

function JobCard({ job, distance, reported, claiming, onClaim, onReport }: { job: Job; distance?: number; reported: boolean; claiming: boolean; onClaim: () => void; onReport: () => void }) {
  const cat = CATEGORY_MAP[job.category]; const waText = encodeURIComponent(`Halo, saya tertarik mengerjakan "${job.title}" di ${job.location}. Kapan kita bisa mulai?`); const waUrl = `https://wa.me/?text=${waText}`; const durationLabel = job.duration_minutes ? `${Math.floor(job.duration_minutes / 60)} jam${job.duration_minutes % 60 ? ` ${job.duration_minutes % 60} menit` : ''}` : null;
  return <div className="rounded-xl border border-slate-200 p-4 transition hover:shadow-card animate-fade-in"><div className="flex items-start gap-3"><div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${cat.gradient} text-white`}><cat.icon className="h-5 w-5" strokeWidth={2.5} /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="chip bg-slate-100 text-slate-600">{cat.label}</span><span className="text-xs text-slate-400">{timeAgo(new Date(job.created_at))}</span></div><p className="mt-1.5 text-sm font-bold text-slate-900">{job.title}</p><div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500"><span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>{distance != null && <span className="flex items-center gap-1 font-semibold text-primary-700"><Radar className="h-3 w-3" />{distance.toFixed(1)} km</span>}<span className="flex items-center gap-1"><Wallet className="h-3 w-3" />{formatIDR(job.wage)}{job.wage_type === 'hourly' ? ' /jam' : ' /hari'}{job.wage_type === 'hourly' && job.estimated_hours ? ` (${job.estimated_hours} jam)` : ''}</span>{durationLabel && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Durasi deal: {durationLabel}</span>}{job.overtime_rate_per_minute != null && <span className="font-semibold text-warning-600">Lembur: {formatIDR(job.overtime_rate_per_minute)}/menit</span>}</div></div></div><div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]"><button onClick={onClaim} disabled={claiming} className="flex items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">{claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Hand className="h-4 w-4" />}{claiming ? 'Mengambil...' : 'Ambil Pekerjaan'}{!claiming && <ArrowRight className="h-4 w-4" />}</button><div className="flex gap-2"><a href={waUrl} target="_blank" rel="noopener noreferrer" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-success-500 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-success-600 sm:flex-none"><MessageCircle className="h-4 w-4" /><span className="hidden sm:inline">WhatsApp</span></a><button onClick={onReport} disabled={reported} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg ring-1 ring-slate-200 text-slate-500 transition hover:bg-error-50 hover:text-error-500 hover:ring-error-200 disabled:opacity-50" aria-label="Laporkan"><Flag className="h-4 w-4" /></button></div></div>{reported && <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-warning-600"><AlertTriangle className="h-3 w-3" />Tugas dilaporkan sebagai fiktif. Tim kami akan meninjau.</p>}</div>;
}

function KycModal({ onClose, onFileSelect, onUpload, ktpPreview, uploading, error, fileInputRef }: { onClose: () => void; onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void; onUpload: () => void; ktpPreview: string | null; uploading: boolean; error: string; fileInputRef: React.RefObject<HTMLInputElement> }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-pop animate-fade-up" onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="grid h-10 w-10 place-items-center rounded-xl bg-warning-100 text-warning-600"><IdCard className="h-5 w-5" /></div><h3 className="font-display text-lg font-bold text-slate-900">Verifikasi KYC</h3></div><button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button></div><p className="mt-4 text-sm text-slate-600">Upload foto KTP Anda yang jelas dan dapat dibaca. Untuk pengujian timer/lembur, KYC tidak diwajibkan.</p><input ref={fileInputRef} type="file" accept="image/*" onChange={onFileSelect} className="hidden" />{ktpPreview ? <div className="mt-4"><div className="relative overflow-hidden rounded-xl ring-1 ring-slate-200"><img src={ktpPreview} alt="Preview KTP" className="max-h-64 w-full object-contain" /></div><button onClick={() => fileInputRef.current?.click()} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600"><Upload className="h-3.5 w-3.5" />Ganti Foto</button></div> : <button onClick={() => fileInputRef.current?.click()} className="mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-8 text-slate-400"><ImageIcon className="h-10 w-10" /><p className="text-sm font-semibold">Klik untuk upload foto KTP</p><p className="text-xs">Format: JPG, PNG. Maksimal 5MB.</p></button>}{error && <div className="mt-3 flex items-center gap-2 rounded-lg bg-error-50 px-3 py-2 text-xs font-semibold text-error-700 ring-1 ring-error-200"><AlertTriangle className="h-3.5 w-3.5" />{error}</div>}<div className="mt-5 flex gap-3"><button onClick={onClose} className="btn-ghost flex-1">Batal</button><button onClick={onUpload} disabled={!ktpPreview || uploading} className="btn-primary flex-1">{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ShieldCheck className="h-4 w-4" />Verifikasi Sekarang</>}</button></div></div></div>;
}

function ReportModal({ job, onClose, onConfirm }: { job: Job; onClose: () => void; onConfirm: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}><div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-pop animate-fade-up" onClick={(e) => e.stopPropagation()}><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-error-100 text-error-600"><Flag className="h-5 w-5" /></div><h3 className="font-display text-lg font-bold text-slate-900">Laporkan Pekerjaan</h3></div><p className="mt-4 text-sm text-slate-600">Laporkan <strong>{job.title}</strong> jika menurut Anda tugas ini fiktif atau tidak valid.</p><div className="mt-5 flex gap-3"><button onClick={onClose} className="btn-ghost flex-1">Batal</button><button onClick={onConfirm} className="flex-1 rounded-lg bg-error-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-error-700">Laporkan</button></div></div></div>;
}
