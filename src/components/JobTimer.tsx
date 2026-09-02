import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Loader2, Play, TimerReset } from 'lucide-react';
import { supabase, type Job } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { calculateJobTiming } from '@/lib/jobTiming';
import { formatIDR } from '@/lib/format';

interface JobTimerProps {
  role: 'employer' | 'worker';
  lang?: 'id' | 'en';
}

function formatDuration(minutes: number) {
  const safe = Math.max(0, Math.floor(minutes));
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function JobTimer({ role, lang = 'id' }: JobTimerProps) {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [now, setNow] = useState(() => new Date().toISOString());
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user) {
      setJobs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let query = supabase.from('jobs').select('*').eq('status', 'assigned').order('created_at', { ascending: false });
    query = role === 'employer' ? query.eq('employer_id', user.id) : query.eq('worker_id', user.id);
    const { data, error: queryError } = await query;
    if (queryError) setError(queryError.message);
    else setJobs((data ?? []) as Job[]);
    setLoading(false);
  }, [role, user]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`job-timer-${role}-${user?.id ?? 'guest'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load, role, user?.id]);

  useEffect(() => {
    if (jobs.length === 0) return;
    const interval = window.setInterval(() => setNow(new Date().toISOString()), 1000);
    return () => window.clearInterval(interval);
  }, [jobs.length]);

  const active = useMemo(() => jobs.find((job) => job.started_at && job.scheduled_end_at), [jobs]);
  const timing = active && active.duration_minutes
    ? calculateJobTiming(
        {
          durationMinutes: active.duration_minutes,
          basePrice: active.wage,
          overtimeRatePerMinute: active.overtime_rate_per_minute ?? 0,
          alertBeforeMinutes: 15,
        },
        { startedAt: active.started_at!, scheduledEndAt: active.scheduled_end_at!, now },
      )
    : null;

  const start = async (jobId: string) => {
    setBusyId(jobId);
    setError('');
    const { error: rpcError } = await supabase.rpc('start_job', { p_job_id: jobId });
    if (rpcError) setError(rpcError.message);
    await load();
    setBusyId(null);
  };

  const resolve = async (jobId: string, decision: 'finished' | 'continued') => {
    setBusyId(jobId);
    setError('');
    const { error: rpcError } = await supabase.rpc('resolve_job_duration', {
      p_job_id: jobId,
      p_decision: decision,
    });
    if (rpcError) setError(rpcError.message);
    await load();
    setBusyId(null);
  };

  if (!user || loading || jobs.length === 0) return null;

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-primary-700">
            <Clock3 className="h-5 w-5" />
            <h2 className="font-display font-bold">{lang === 'id' ? 'Pekerjaan Berjalan' : 'Active Work'}</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {lang === 'id' ? 'Waktu tersimpan di server dan tetap berjalan saat halaman ditutup.' : 'Server-based timing continues even if the page is closed.'}
          </p>
        </div>
        <TimerReset className="h-5 w-5 text-slate-300" />
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-error-50 p-3 text-xs font-semibold text-error-700">{error}</div>
      )}

      {jobs.map((job) => {
        const jobTiming = job === active ? timing : null;
        const overtimeAmount = jobTiming?.overtimeAmount ?? job.overtime_amount ?? 0;
        const canResolve = role === 'employer' && !!jobTiming?.isFinished;

        return (
          <div key={job.id} className="mt-4 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-900">{job.title}</p>
                <p className="mt-1 text-xs text-slate-500">{job.location}</p>
              </div>
              {job.started_at && job.scheduled_end_at ? (
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${jobTiming?.isOvertime ? 'bg-warning-100 text-warning-700' : jobTiming?.isAlert ? 'bg-warning-50 text-warning-700' : 'bg-success-50 text-success-700'}`}>
                  {jobTiming?.isOvertime ? 'LEMBUR' : jobTiming?.isAlert ? 'SEGERA SELESAI' : 'BERJALAN'}
                </span>
              ) : null}
            </div>

            {!job.started_at || !job.scheduled_end_at ? (
              role === 'employer' ? (
                <button
                  onClick={() => start(job.id)}
                  disabled={busyId === job.id || !job.duration_minutes}
                  className="btn-primary mt-4 w-full"
                >
                  {busyId === job.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  {lang === 'id' ? 'Mulai Pekerjaan' : 'Start Job'}
                </button>
              ) : (
                <p className="mt-4 rounded-lg bg-white p-3 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                  Menunggu pemberi kerja memulai timer.
                </p>
              )
            ) : jobTiming ? (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{jobTiming.isOvertime ? 'Lembur' : 'Sisa Waktu'}</p>
                    <p className={`mt-1 font-mono text-2xl font-extrabold ${jobTiming.isOvertime ? 'text-warning-600' : jobTiming.isAlert ? 'text-warning-600' : 'text-slate-900'}`}>
                      {jobTiming.isOvertime ? `+${formatDuration(jobTiming.overtimeMinutes)}` : formatDuration(jobTiming.remainingMinutes)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Durasi Deal</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{formatDuration(job.duration_minutes)}</p>
                  </div>
                  <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Nominal Lembur</p>
                    <p className="mt-1 text-lg font-bold text-warning-700">{formatIDR(overtimeAmount)}</p>
                  </div>
                </div>

                {jobTiming.isAlert && !jobTiming.isOvertime && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-warning-50 p-3 text-xs font-bold text-warning-800 ring-1 ring-warning-200">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {lang === 'id' ? `Waktu kerja tersisa ${jobTiming.remainingMinutes} menit. Selesaikan atau lanjutkan.` : `${jobTiming.remainingMinutes} minutes remaining. Finish or continue.`}
                  </div>
                )}

                {jobTiming.isFinished && !jobTiming.isOvertime && role === 'employer' && (
                  <div className="mt-3 rounded-xl bg-error-50 p-3 ring-1 ring-error-200">
                    <p className="flex items-center gap-2 text-sm font-bold text-error-800">
                      <AlertTriangle className="h-4 w-4" />
                      {lang === 'id' ? 'Durasi deal telah berakhir.' : 'Agreed duration has ended.'}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button onClick={() => resolve(job.id, 'finished')} disabled={busyId === job.id} className="flex items-center justify-center gap-1.5 rounded-lg bg-success-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-success-700 disabled:opacity-50">
                        <CheckCircle2 className="h-4 w-4" /> Selesai
                      </button>
                      <button onClick={() => resolve(job.id, 'continued')} disabled={busyId === job.id} className="flex items-center justify-center gap-1.5 rounded-lg bg-warning-500 px-3 py-2.5 text-sm font-bold text-white hover:bg-warning-600 disabled:opacity-50">
                        <Clock3 className="h-4 w-4" /> Lanjutkan
                      </button>
                    </div>
                  </div>
                )}

                {jobTiming.isOvertime && (
                  <div className="mt-3 rounded-xl bg-warning-50 p-3 text-sm font-semibold text-warning-800 ring-1 ring-warning-200">
                    Lembur berjalan: {jobTiming.overtimeMinutes} menit — {formatIDR(overtimeAmount)}
                    {role === 'employer' && (
                      <button onClick={() => resolve(job.id, 'finished')} disabled={busyId === job.id} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-success-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-success-700 disabled:opacity-50">
                        <CheckCircle2 className="h-4 w-4" /> Selesai & Tutup Pembayaran
                      </button>
                    )}
                  </div>
                )}

                {!canResolve && jobTiming.isFinished && role === 'worker' && (
                  <p className="mt-3 text-xs font-semibold text-slate-500">Menunggu pemberi kerja memilih Selesai atau Lanjutkan.</p>
                )}
              </>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}
