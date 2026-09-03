import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Camera, CheckCircle2, Clock3, ExternalLink, MapPin, Play, TimerReset, UserCheck } from 'lucide-react';
import { supabase, type Job } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { calculateJobTiming } from '@/lib/jobTiming';
import { formatIDR } from '@/lib/format';

interface JobTimerProps { role: 'employer' | 'worker'; lang?: 'id' | 'en'; }
type WorkflowStatus = 'assigned' | 'worker_checked_in' | 'employer_checked_in' | 'ready_to_start' | 'active' | 'overtime' | 'completed' | 'cancelled';
type WorkflowJob = Job & {
  workflow_status?: WorkflowStatus;
  worker_checked_in_at?: string | null;
  worker_checkin_lat?: number | null;
  worker_checkin_lng?: number | null;
  worker_checkin_photo_path?: string | null;
  employer_checked_in_at?: string | null;
  employer_checkin_lat?: number | null;
  employer_checkin_lng?: number | null;
  employer_checkin_photo_path?: string | null;
  employer_start_authorized_at?: string | null;
  employer_start_authorization_mode?: 'physical' | 'remote' | null;
  presence_radius_meters?: number;
};
type Location = { lat: number | null; lng: number | null };

function formatDuration(minutes: number) {
  const safe = Number.isFinite(minutes) ? Math.max(0, Math.floor(minutes)) : 0;
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}
function isUsableJob(value: unknown): value is WorkflowJob {
  if (!value || typeof value !== 'object') return false;
  const job = value as Partial<WorkflowJob>;
  return typeof job.id === 'string' && typeof job.status === 'string';
}
function getJobTiming(job: WorkflowJob, now: string) {
  if (job.status !== 'assigned' || typeof job.started_at !== 'string' || typeof job.scheduled_end_at !== 'string') return null;
  const durationMinutes = Number(job.duration_minutes);
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return null;
  try {
    return calculateJobTiming({ durationMinutes, basePrice: Number(job.wage ?? 0), overtimeRatePerMinute: Number(job.overtime_rate_per_minute ?? 0), alertBeforeMinutes: 15 }, { startedAt: job.started_at, scheduledEndAt: job.scheduled_end_at, now });
  } catch (cause) { console.error('KerjaHarian JobTimer timing error:', cause); return null; }
}

export function JobTimer({ role, lang = 'id' }: JobTimerProps) {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<WorkflowJob[]>([]);
  const [locations, setLocations] = useState<Record<string, Location>>({});
  const [workerNames, setWorkerNames] = useState<Record<string, string>>({});
  const [workerPhotos, setWorkerPhotos] = useState<Record<string, string>>({});
  const [now, setNow] = useState(() => new Date().toISOString());
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [photoJobId, setPhotoJobId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) { setJobs([]); setLoading(false); return; }
    setLoading(true);
    try {
      let query = supabase.from('jobs').select('*').order('created_at', { ascending: false }).limit(20);
      query = role === 'employer' ? query.eq('employer_id', user.id).in('status', ['assigned', 'completed']) : query.eq('worker_id', user.id).in('status', ['assigned', 'completed']);
      const { data, error: queryError } = await query;
      if (queryError) throw queryError;
      const nextJobs = (data ?? []).filter(isUsableJob);
      setJobs(nextJobs);
      const orderIds = nextJobs.map(j => j.order_id).filter((id): id is string => typeof id === 'string');
      if (orderIds.length) {
        const { data: locs } = await supabase.from('order_locations').select('order_id,lat,lng,updated_at').in('order_id', orderIds).order('updated_at', { ascending: false });
        const nextLocations: Record<string, Location> = {};
        for (const loc of locs ?? []) if (!(loc.order_id in nextLocations)) nextLocations[loc.order_id] = { lat: loc.lat, lng: loc.lng };
        setLocations(nextLocations);
      } else setLocations({});
      if (role === 'employer') {
        const workerIds = [...new Set(nextJobs.map(j => j.worker_id).filter((id): id is string => typeof id === 'string'))];
        if (workerIds.length) {
          const { data: profiles } = await supabase.from('profiles').select('id,full_name').in('id', workerIds);
          const names: Record<string, string> = {};
          for (const p of profiles ?? []) names[p.id] = p.full_name || 'Mitra pekerja';
          setWorkerNames(names);
        }
      }
      setError('');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Gagal memuat pekerjaan.';
      console.error('KerjaHarian JobTimer load error:', cause); setError(message); setJobs([]);
    } finally { setLoading(false); }
  }, [role, user]);

  useEffect(() => {
    void load();
    if (!user) return undefined;
    const channel = supabase.channel(`job-workflow-${role}-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => { void load(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_events' }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load, role, user]);

  useEffect(() => {
    if (!jobs.some(job => job.status === 'assigned' && job.started_at && job.scheduled_end_at)) return undefined;
    const interval = window.setInterval(() => setNow(new Date().toISOString()), 1000);
    return () => window.clearInterval(interval);
  }, [jobs]);

  const uploadAttendancePhoto = async (job: WorkflowJob, file: File) => {
    if (!user) throw new Error('Login diperlukan');
    if (!file.type.startsWith('image/')) throw new Error('File harus berupa foto.');
    if (file.size > 8 * 1024 * 1024) throw new Error('Foto maksimal 8MB.');
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${user.id}/attendance/${job.id}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('job-attendance').upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;
    return path;
  };

  const getPosition = () => new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Perangkat tidak mendukung GPS.')); return; }
    navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error('Izin lokasi diperlukan untuk verifikasi kehadiran.')), { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  });

  const workerCheckIn = async (job: WorkflowJob, file: File | null) => {
    setBusyId(job.id); setError('');
    try {
      if (!file) throw new Error('Foto kehadiran wajib diambil sebelum check-in.');
      const position = await getPosition();
      const photoPath = await uploadAttendancePhoto(job, file);
      const { error: rpcError } = await supabase.rpc('worker_check_in', { p_job_id: job.id, p_lat: position.coords.latitude, p_lng: position.coords.longitude, p_photo_path: photoPath });
      if (rpcError) throw rpcError;
      setPhotoJobId(null); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Gagal melakukan verifikasi kehadiran.'); }
    finally { setBusyId(null); }
  };

  const employerCheckIn = async (job: WorkflowJob) => {
    setBusyId(job.id); setError('');
    try {
      const position = await getPosition();
      const { error: rpcError } = await supabase.rpc('employer_check_in', { p_job_id: job.id, p_lat: position.coords.latitude, p_lng: position.coords.longitude, p_photo_path: null });
      if (rpcError) throw rpcError;
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Gagal memverifikasi kehadiran pemberi kerja.'); }
    finally { setBusyId(null); }
  };

  const remoteApprove = async (job: WorkflowJob) => {
    setBusyId(job.id); setError('');
    try {
      const { error: rpcError } = await supabase.rpc('authorize_remote_job_start', { p_job_id: job.id });
      if (rpcError) throw rpcError;
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Gagal menyetujui mulai secara remote.'); }
    finally { setBusyId(null); }
  };

  const start = async (jobId: string) => {
    setBusyId(jobId); setError('');
    try {
      const { error: rpcError } = await supabase.rpc('start_job', { p_job_id: jobId });
      if (rpcError) throw rpcError;
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Gagal memulai pekerjaan.'); }
    finally { setBusyId(null); }
  };

  const resolve = async (jobId: string, decision: 'finished' | 'continued') => {
    setBusyId(jobId); setError('');
    try {
      const { error: rpcError } = await supabase.rpc('resolve_job_duration', { p_job_id: jobId, p_decision: decision });
      if (rpcError) throw rpcError;
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Gagal menyelesaikan pekerjaan.'); }
    finally { setBusyId(null); }
  };

  const openNavigation = (job: WorkflowJob) => {
    const loc = job.order_id ? locations[job.order_id] : undefined;
    if (loc?.lat != null && loc?.lng != null) window.open(`https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}`, '_blank', 'noopener,noreferrer');
    else if (job.location) window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.location)}`, '_blank', 'noopener,noreferrer');
  };

  const activeCount = useMemo(() => jobs.filter(j => j.status !== 'completed').length, [jobs]);
  if (!user || loading) return null;
  if (jobs.length === 0) return error ? <div className="mb-6 rounded-xl border border-error-200 bg-error-50 p-4 text-sm font-semibold text-error-700">{error}</div> : null;

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div><div className="flex items-center gap-2 text-primary-700"><Clock3 className="h-5 w-5" /><h2 className="font-display font-bold">{role === 'worker' ? 'Pekerjaan Saya' : 'Order & Pekerjaan'}</h2></div><p className="mt-1 text-xs text-slate-500">{role === 'worker' ? 'Ambil order → menuju lokasi → verifikasi kehadiran → menunggu persetujuan employer.' : `${activeCount} order aktif. Status mitra dan timer diperbarui real-time.`}</p></div><TimerReset className="h-5 w-5 text-slate-300" />
      </div>
      {error && <div className="mt-4 rounded-lg bg-error-50 p-3 text-xs font-semibold text-error-700">{error}</div>}
      {jobs.map(job => {
        const jobTiming = getJobTiming(job, now);
        const overtimeAmount = jobTiming?.overtimeAmount ?? Number(job.overtime_amount ?? 0);
        const finalAmount = Number(job.final_amount ?? job.employer_total ?? job.total ?? 0);
        const workerAmount = Number(job.worker_amount ?? ((job.wage ?? 0) + (job.worker_overtime_amount ?? job.overtime_amount ?? 0)));
        const alreadyContinued = job.completion_decision === 'continued';
        const ready = job.workflow_status === 'ready_to_start';
        const statusLabel = job.status === 'completed' ? 'SELESAI' : job.workflow_status === 'active' ? 'BERJALAN' : job.workflow_status === 'overtime' ? 'LEMBUR' : ready ? 'SIAP MULAI' : job.workflow_status === 'worker_checked_in' ? 'MITRA SUDAH TIBA' : job.workflow_status === 'employer_checked_in' ? 'EMPLOYER SUDAH TIBA' : 'ORDER DIAMBIL';
        return (
          <div key={job.id} className="mt-4 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-slate-900">{job.title || 'Pekerjaan'}</p><p className="mt-1 text-xs text-slate-500">{job.location || 'Lokasi belum tersedia'}</p>{role === 'employer' && job.worker_id && <p className="mt-1 text-xs font-semibold text-primary-700">Mitra: {workerNames[job.worker_id] || 'Mitra pekerja'}</p>}</div><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${job.status === 'completed' ? 'bg-success-50 text-success-700' : job.workflow_status === 'overtime' ? 'bg-warning-100 text-warning-700' : 'bg-primary-50 text-primary-700'}`}>{statusLabel}</span></div>
            {role === 'worker' && job.status !== 'completed' && !job.started_at && (
              <div className="mt-4 space-y-3">
                <button onClick={() => openNavigation(job)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary-200 bg-white px-3 py-2.5 text-sm font-bold text-primary-700"><ExternalLink className="h-4 w-4" />Navigasi ke Lokasi</button>
                {!job.worker_checked_in_at ? (
                  photoJobId === job.id ? <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200"><label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary-200 px-3 py-4 text-sm font-bold text-primary-700"><Camera className="h-5 w-5" />Ambil Foto Kehadiran<input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const file = e.target.files?.[0] ?? null; if (file) void workerCheckIn(job, file); }} /></label><p className="mt-2 text-[11px] text-slate-500">GPS dan foto akan dicatat bersama waktu server. Anda harus berada dalam radius {job.presence_radius_meters ?? 100} meter.</p></div>
                  : <button onClick={() => setPhotoJobId(job.id)} disabled={busyId === job.id} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-3 py-2.5 text-sm font-bold text-white"><UserCheck className="h-4 w-4" />Verifikasi Kehadiran &amp; Foto</button>
                ) : <div className="rounded-xl bg-success-50 p-3 text-xs font-semibold text-success-700 ring-1 ring-success-200"><div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />Kehadiran mitra terverifikasi.</div><p className="mt-1">Menunggu employer hadir di lokasi atau menyetujui mulai secara remote.</p></div>}
              </div>
            )}
            {role === 'employer' && job.status !== 'completed' && !job.started_at && (
              <div className="mt-4 space-y-3">
                {job.worker_checked_in_at ? <div className="rounded-xl bg-success-50 p-3 ring-1 ring-success-200"><p className="text-xs font-bold text-success-800">✓ Mitra sudah terverifikasi di lokasi</p><p className="mt-1 text-[11px] text-success-700">Waktu server: {new Date(job.worker_checked_in_at).toLocaleString('id-ID')}{job.worker_checkin_lat != null && job.worker_checkin_lng != null ? ` • GPS ${Number(job.worker_checkin_lat).toFixed(5)}, ${Number(job.worker_checkin_lng).toFixed(5)}` : ''}</p>{job.worker_checkin_photo_path && <AttendancePhoto path={job.worker_checkin_photo_path} cached={workerPhotos[job.id]} onUrl={url => setWorkerPhotos(prev => ({ ...prev, [job.id]: url }))} />}</div> : <div className="rounded-xl bg-warning-50 p-3 text-xs font-semibold text-warning-800 ring-1 ring-warning-200">Menunggu mitra melakukan verifikasi kehadiran.</div>}
                {!job.employer_checked_in_at && <button onClick={() => employerCheckIn(job)} disabled={busyId === job.id} className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary-200 bg-white px-3 py-2.5 text-sm font-bold text-primary-700"><MapPin className="h-4 w-4" />Saya Hadir di Lokasi &amp; Verifikasi</button>}
                {job.worker_checked_in_at && !job.employer_checked_in_at && !job.employer_start_authorized_at && <button onClick={() => remoteApprove(job)} disabled={busyId === job.id} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-3 py-2.5 text-sm font-bold text-white"><CheckCircle2 className="h-4 w-4" />Setujui &amp; Mulai Secara Remote</button>}
                {ready && <div className="rounded-xl bg-primary-50 p-3 ring-1 ring-primary-200"><p className="text-xs font-bold text-primary-800">✓ Kedua pihak siap. Otorisasi: {job.employer_start_authorization_mode === 'remote' ? 'REMOTE' : 'LOKASI'}</p><button onClick={() => start(job.id)} disabled={busyId === job.id} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-700 px-3 py-3 text-sm font-bold text-white"><Play className="h-4 w-4" />MULAI PEKERJAAN</button></div>}
              </div>
            )}
            {job.status === 'completed' ? (
              <div className="mt-4 rounded-xl bg-white p-4 ring-1 ring-slate-200"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{lang === 'id' ? 'Ringkasan Pembayaran' : 'Payment Summary'}</p><div className="mt-3 grid gap-2 sm:grid-cols-3"><div><p className="text-[11px] text-slate-400">{role === 'worker' ? 'Pendapatan' : 'Upah Pekerja'}</p><p className="font-bold text-slate-900">{formatIDR(workerAmount)}</p></div><div><p className="text-[11px] text-slate-400">Lembur ({Number(job.overtime_minutes ?? 0)} menit)</p><p className="font-bold text-warning-700">{formatIDR(Number(job.worker_overtime_amount ?? overtimeAmount))}</p></div><div><p className="text-[11px] text-slate-400">{role === 'worker' ? 'Status' : 'Total Tagihan'}</p><p className="font-bold text-primary-700">{role === 'worker' ? (job.payment_status === 'settled' ? 'Sudah dibayar' : 'Menunggu pembayaran') : formatIDR(finalAmount)}</p></div></div></div>
            ) : jobTiming ? (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-white p-3 ring-1 ring-slate-200"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{jobTiming.isOvertime ? 'Lembur' : 'Sisa Waktu'}</p><p className={`mt-1 font-mono text-2xl font-extrabold ${jobTiming.isOvertime ? 'text-warning-600' : jobTiming.isAlert ? 'text-warning-600' : 'text-slate-900'}`}>{jobTiming.isOvertime ? `+${formatDuration(jobTiming.overtimeMinutes)}` : formatDuration(jobTiming.remainingMinutes)}</p></div><div className="rounded-xl bg-white p-3 ring-1 ring-slate-200"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Durasi Deal</p><p className="mt-1 text-lg font-bold text-slate-900">{formatDuration(Number(job.duration_minutes ?? 0))}</p></div><div className="rounded-xl bg-white p-3 ring-1 ring-slate-200"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Nominal Lembur</p><p className="mt-1 text-lg font-bold text-warning-700">{formatIDR(overtimeAmount)}</p></div></div>
                {jobTiming.isAlert && !jobTiming.isOvertime && !alreadyContinued && <div className="mt-3 rounded-xl bg-warning-50 p-3 text-xs font-bold text-warning-800 ring-1 ring-warning-200"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 shrink-0" />Waktu kerja tersisa {jobTiming.remainingMinutes} menit.</div><p className="mt-1 font-medium">Selesaikan sekarang = sesuai deal. Lanjutkan = waktu setelah durasi deal menjadi lembur.</p>{role === 'employer' && <div className="mt-3 grid grid-cols-2 gap-2"><button onClick={() => resolve(job.id, 'finished')} disabled={busyId === job.id} className="flex items-center justify-center gap-1.5 rounded-lg bg-success-600 px-3 py-2.5 text-sm font-bold text-white"><CheckCircle2 className="h-4 w-4" />Selesai</button><button onClick={() => resolve(job.id, 'continued')} disabled={busyId === job.id} className="flex items-center justify-center gap-1.5 rounded-lg bg-warning-500 px-3 py-2.5 text-sm font-bold text-white"><Clock3 className="h-4 w-4" />Lanjutkan</button></div>}</div>}
                {alreadyContinued && !jobTiming.isOvertime && <div className="mt-3 rounded-xl bg-primary-50 p-3 text-xs font-semibold text-primary-800 ring-1 ring-primary-200">Lanjutkan sudah dipilih. Timer akan otomatis masuk lembur setelah batas deal.</div>}
                {jobTiming.isFinished && role === 'employer' && !alreadyContinued && <div className="mt-3 rounded-xl bg-error-50 p-3 ring-1 ring-error-200"><p className="text-sm font-bold text-error-800">Durasi deal telah berakhir.</p><p className="mt-1 text-xs font-medium text-error-700">Setiap menit penuh setelah batas deal masuk ke lembur.</p><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={() => resolve(job.id, 'finished')} disabled={busyId === job.id} className="flex items-center justify-center gap-1.5 rounded-lg bg-success-600 px-3 py-2.5 text-sm font-bold text-white"><CheckCircle2 className="h-4 w-4" />Selesai</button><button onClick={() => resolve(job.id, 'continued')} disabled={busyId === job.id} className="flex items-center justify-center gap-1.5 rounded-lg bg-warning-500 px-3 py-2.5 text-sm font-bold text-white"><Clock3 className="h-4 w-4" />Lanjutkan</button></div></div>}
                {jobTiming.isOvertime && <div className="mt-3 rounded-xl bg-warning-50 p-3 text-sm font-semibold text-warning-800 ring-1 ring-warning-200">Lembur berjalan: {jobTiming.overtimeMinutes} menit — {formatIDR(overtimeAmount)}{role === 'employer' && <button onClick={() => resolve(job.id, 'finished')} disabled={busyId === job.id} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-success-600 px-3 py-2.5 text-sm font-bold text-white"><CheckCircle2 className="h-4 w-4" />Selesai &amp; Tutup Pembayaran</button>}</div>}
                {jobTiming.isFinished && role === 'worker' && <p className="mt-3 text-xs font-semibold text-slate-500">{alreadyContinued ? 'Lembur berjalan. Menunggu pemberi kerja menekan Selesai.' : 'Durasi deal selesai. Menunggu pemberi kerja memilih Selesai atau Lanjutkan.'}</p>}
              </>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}

function AttendancePhoto({ path, cached, onUrl }: { path: string; cached?: string; onUrl: (url: string) => void }) {
  useEffect(() => {
    if (cached) return;
    let cancelled = false;
    void supabase.storage.from('job-attendance').createSignedUrl(path, 300).then(({ data, error }) => { if (!cancelled && !error && data?.signedUrl) onUrl(data.signedUrl); });
    return () => { cancelled = true; };
  }, [path, cached, onUrl]);
  return cached ? <img src={cached} alt="Foto verifikasi kehadiran mitra" className="mt-3 h-44 w-full rounded-lg object-cover ring-1 ring-success-200" /> : <div className="mt-3 flex h-32 items-center justify-center rounded-lg bg-white text-xs font-semibold text-slate-400 ring-1 ring-slate-200">Memuat foto verifikasi…</div>;
}
