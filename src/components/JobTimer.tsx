import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Loader2, Play, TimerReset } from 'lucide-react';
import { supabase, type Job } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { calculateJobTiming } from '@/lib/jobTiming';
import { formatIDR } from '@/lib/format';

interface JobTimerProps { role: 'employer' | 'worker'; lang?: 'id' | 'en'; }

function formatDuration(minutes: number) {
  const safe = Number.isFinite(minutes) ? Math.max(0, Math.floor(minutes)) : 0;
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

function isUsableJob(value: unknown): value is Job {
  if (!value || typeof value !== 'object') return false;
  const job = value as Partial<Job>;
  return typeof job.id === 'string' && typeof job.status === 'string';
}

export function JobTimer({ role, lang = 'id' }: JobTimerProps) {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [now, setNow] = useState(() => new Date().toISOString());
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user) { setJobs([]); setLoading(false); return; }
    setLoading(true);
    try {
      let query = supabase.from('jobs').select('*').order('created_at', { ascending: false }).limit(20);
      query = role === 'employer'
        ? query.eq('employer_id', user.id).in('status', ['assigned', 'completed'])
        : query.eq('worker_id', user.id).in('status', ['assigned', 'completed']);
      const { data, error: queryError } = await query;
      if (queryError) throw queryError;
      setJobs((data ?? []).filter(isUsableJob));
      setError('');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Gagal memuat pekerjaan.';
      console.error('KerjaHarian JobTimer load error:', cause);
      setError(message);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [role, user]);

  useEffect(() => {
    void load();
    if (!user) return undefined;
    const channel = supabase.channel(`job-timer-${role}-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load, role, user]);

  useEffect(() => {
    if (!jobs.some((job) => job.status === 'assigned' && job.started_at && job.scheduled_end_at)) return undefined;
    const interval = window.setInterval(() => setNow(new Date().toISOString()), 1000);
    return () => window.clearInterval(interval);
  }, [jobs]);

  const active = useMemo(
    () => jobs.find((job) => job.status === 'assigned' && typeof job.started_at === 'string' && typeof job.scheduled_end_at === 'string'),
    [jobs],
  );

  const timing = useMemo(() => {
    if (!active?.started_at || !active.scheduled_end_at || !Number.isFinite(Number(active.duration_minutes))) return null;
    try {
      return calculateJobTiming(
        { durationMinutes: Number(active.duration_minutes), basePrice: Number(active.wage ?? 0), overtimeRatePerMinute: Number(active.overtime_rate_per_minute ?? 0), alertBeforeMinutes: 15 },
        { startedAt: active.started_at, scheduledEndAt: active.scheduled_end_at, now },
      );
    } catch (cause) {
      console.error('KerjaHarian JobTimer timing error:', cause);
      return null;
    }
  }, [active, now]);

  const start = async (jobId: string) => {
    setBusyId(jobId); setError('');
    try {
      const { error: rpcError } = await supabase.rpc('start_job', { p_job_id: jobId });
      if (rpcError) throw rpcError;
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memulai pekerjaan.');
    } finally { setBusyId(null); }
  };

  const resolve = async (jobId: string, decision: 'finished' | 'continued') => {
    setBusyId(jobId); setError('');
    try {
      const { error: rpcError } = await supabase.rpc('resolve_job_duration', { p_job_id: jobId, p_decision: decision });
      if (rpcError) throw rpcError;
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal menyelesaikan pekerjaan.');
    } finally { setBusyId(null); }
  };

  if (!user || loading) return null;
  if (jobs.length === 0) return error ? <div className="mb-6 rounded-xl border border-error-200 bg-error-50 p-4 text-sm font-semibold text-error-700">{error}</div> : null;

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div><div className="flex items-center gap-2 text-primary-700"><Clock3 className="h-5 w-5" /><h2 className="font-display font-bold">{role === 'worker' ? 'Pekerjaan Saya' : 'Pekerjaan Berjalan'}</h2></div><p className="mt-1 text-xs text-slate-500">Waktu tersimpan di server dan tetap berjalan saat halaman ditutup.</p></div>
        <TimerReset className="h-5 w-5 text-slate-300" />
      </div>
      {error && <div className="mt-4 rounded-lg bg-error-50 p-3 text-xs font-semibold text-error-700">{error}</div>}
      {jobs.map((job) => {
        const jobTiming = job === active ? timing : null;
        const overtimeAmount = jobTiming?.overtimeAmount ?? Number(job.overtime_amount ?? 0);
        const finalAmount = Number(job.final_amount ?? job.employer_total ?? job.total ?? 0);
        const workerAmount = Number(job.worker_amount ?? ((job.wage ?? 0) + (job.worker_overtime_amount ?? job.overtime_amount ?? 0)));
        const alreadyContinued = job.completion_decision === 'continued';
        return (
          <div key={job.id} className="mt-4 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-slate-900">{job.title || 'Pekerjaan'}</p><p className="mt-1 text-xs text-slate-500">{job.location || 'Lokasi belum tersedia'}</p></div>{job.status === 'completed' ? <span className="rounded-full bg-success-50 px-2.5 py-1 text-[11px] font-bold text-success-700">SELESAI</span> : jobTiming?.isOvertime ? <span className="rounded-full bg-warning-100 px-2.5 py-1 text-[11px] font-bold text-warning-700">LEMBUR</span> : jobTiming?.isAlert && !alreadyContinued ? <span className="rounded-full bg-warning-50 px-2.5 py-1 text-[11px] font-bold text-warning-700">SEGERA SELESAI</span> : job.started_at ? <span className="rounded-full bg-success-50 px-2.5 py-1 text-[11px] font-bold text-success-700">BERJALAN</span> : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">MENUNGGU MULAI</span>}</div>
            {job.status === 'completed' ? (
              <div className="mt-4 rounded-xl bg-white p-4 ring-1 ring-slate-200"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{lang === 'id' ? 'Ringkasan Pembayaran' : 'Payment Summary'}</p><div className="mt-3 grid gap-2 sm:grid-cols-3"><div><p className="text-[11px] text-slate-400">{role === 'worker' ? 'Pendapatan' : 'Upah Pekerja'}</p><p className="font-bold text-slate-900">{formatIDR(workerAmount)}</p></div><div><p className="text-[11px] text-slate-400">Lembur ({Number(job.overtime_minutes ?? 0)} menit)</p><p className="font-bold text-warning-700">{formatIDR(Number(job.worker_overtime_amount ?? overtimeAmount))}</p></div><div><p className="text-[11px] text-slate-400">{role === 'worker' ? 'Status' : 'Total Tagihan'}</p><p className="font-bold text-primary-700">{role === 'worker' ? (job.payment_status === 'settled' ? 'Sudah dibayar' : 'Menunggu pembayaran') : formatIDR(finalAmount)}</p></div></div></div>
            ) : !job.started_at || !job.scheduled_end_at ? (
              role === 'employer' ? <button onClick={() => start(job.id)} disabled={busyId === job.id || !(Number(job.duration_minutes) > 0)} className="btn-primary mt-4 w-full">{busyId === job.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Mulai Pekerjaan</button> : <p className="mt-4 rounded-lg bg-white p-3 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">Menunggu pemberi kerja memulai timer.</p>
            ) : jobTiming ? (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-white p-3 ring-1 ring-slate-200"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{jobTiming.isOvertime ? 'Lembur' : 'Sisa Waktu'}</p><p className={`mt-1 font-mono text-2xl font-extrabold ${jobTiming.isOvertime ? 'text-warning-600' : jobTiming.isAlert ? 'text-warning-600' : 'text-slate-900'}`}>{jobTiming.isOvertime ? `+${formatDuration(jobTiming.overtimeMinutes)}` : formatDuration(jobTiming.remainingMinutes)}</p></div><div className="rounded-xl bg-white p-3 ring-1 ring-slate-200"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Durasi Deal</p><p className="mt-1 text-lg font-bold text-slate-900">{formatDuration(Number(job.duration_minutes ?? 0))}</p></div><div className="rounded-xl bg-white p-3 ring-1 ring-slate-200"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Nominal Lembur</p><p className="mt-1 text-lg font-bold text-warning-700">{formatIDR(overtimeAmount)}</p></div></div>
                {jobTiming.isAlert && !jobTiming.isOvertime && !alreadyContinued && <div className="mt-3 rounded-xl bg-warning-50 p-3 text-xs font-bold text-warning-800 ring-1 ring-warning-200"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 shrink-0" />Waktu kerja tersisa {jobTiming.remainingMinutes} menit.</div><p className="mt-1 font-medium">Selesaikan sekarang = pembayaran tetap sesuai deal. Lanjutkan = timer tetap berjalan dan waktu setelah durasi deal menjadi lembur.</p>{role === 'employer' && <div className="mt-3 grid grid-cols-2 gap-2"><button onClick={() => resolve(job.id, 'finished')} disabled={busyId === job.id} className="flex items-center justify-center gap-1.5 rounded-lg bg-success-600 px-3 py-2.5 text-sm font-bold text-white"><CheckCircle2 className="h-4 w-4" />Selesai</button><button onClick={() => resolve(job.id, 'continued')} disabled={busyId === job.id} className="flex items-center justify-center gap-1.5 rounded-lg bg-warning-500 px-3 py-2.5 text-sm font-bold text-white"><Clock3 className="h-4 w-4" />Lanjutkan</button></div>}</div>}
                {alreadyContinued && !jobTiming.isOvertime && <div className="mt-3 rounded-xl bg-primary-50 p-3 text-xs font-semibold text-primary-800 ring-1 ring-primary-200">Lanjutkan sudah dipilih. Timer akan otomatis berubah menjadi lembur setelah batas deal terlewati.</div>}
                {jobTiming.isFinished && role === 'employer' && !alreadyContinued && <div className="mt-3 rounded-xl bg-error-50 p-3 ring-1 ring-error-200"><p className="text-sm font-bold text-error-800">Durasi deal telah berakhir.</p><p className="mt-1 text-xs font-medium text-error-700">Setiap menit penuh setelah batas deal masuk ke lembur.</p><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={() => resolve(job.id, 'finished')} disabled={busyId === job.id} className="flex items-center justify-center gap-1.5 rounded-lg bg-success-600 px-3 py-2.5 text-sm font-bold text-white"><CheckCircle2 className="h-4 w-4" />Selesai</button><button onClick={() => resolve(job.id, 'continued')} disabled={busyId === job.id} className="flex items-center justify-center gap-1.5 rounded-lg bg-warning-500 px-3 py-2.5 text-sm font-bold text-white"><Clock3 className="h-4 w-4" />Lanjutkan</button></div></div>}
                {jobTiming.isOvertime && <div className="mt-3 rounded-xl bg-warning-50 p-3 text-sm font-semibold text-warning-800 ring-1 ring-warning-200">Lembur berjalan: {jobTiming.overtimeMinutes} menit — {formatIDR(overtimeAmount)}{role === 'employer' && <button onClick={() => resolve(job.id, 'finished')} disabled={busyId === job.id} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-success-600 px-3 py-2.5 text-sm font-bold text-white"><CheckCircle2 className="h-4 w-4" />Selesai &amp; Tutup Pembayaran</button>}</div>}
                {jobTiming.isFinished && role === 'worker' && <p className="mt-3 text-xs font-semibold text-slate-500">{alreadyContinued ? 'Lembur berjalan. Menunggu pemberi kerja menekan Selesai.' : 'Durasi deal selesai. Menunggu pemberi kerja memilih Selesai atau Lanjutkan.'}</p>}
              </>
            ) : <p className="mt-4 rounded-lg bg-warning-50 p-3 text-xs font-semibold text-warning-800 ring-1 ring-warning-200">Timer belum dapat dihitung. Data waktu pekerjaan tidak valid.</p>}
          </div>
        );
      })}
    </section>
  );
}
