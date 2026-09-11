import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { formatIDR } from '@/lib/format';

type JobRow = {
  id: string;
  title: string | null;
  status: string | null;
  workflow_status: string | null;
  started_at: string | null;
  scheduled_end_at: string | null;
  overtime_rate_per_minute: number | null;
  overtime_consent_status: 'not_requested' | 'requested' | 'confirmed' | 'declined';
  overtime_requested_at: string | null;
  overtime_confirmed_at: string | null;
  overtime_minutes: number | null;
  overtime_amount: number | null;
  worker_id: string | null;
  employer_id: string | null;
};

export function OvertimeApprovalPanel({ role }: { role: 'worker' | 'employer' }) {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [overtimeChecked, setOvertimeChecked] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!user) return;
    const column = role === 'worker' ? 'worker_id' : 'employer_id';
    const { data, error: e } = await supabase.from('jobs').select('id,title,status,workflow_status,started_at,scheduled_end_at,overtime_rate_per_minute,overtime_consent_status,overtime_requested_at,overtime_confirmed_at,overtime_minutes,overtime_amount,worker_id,employer_id').eq(column, user.id).eq('status', 'assigned').not('started_at', 'is', null).order('started_at', { ascending: false }).limit(20);
    if (e) { setError(e.message); return; }
    setJobs((data ?? []) as JobRow[]);
  }, [role, user]);

  useEffect(() => { void load(); if (!user) return; const channel = supabase.channel(`overtime-consent-${role}-${user.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => { void load(); }).subscribe(); return () => { void supabase.removeChannel(channel); }; }, [load, role, user]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);

  const actions = async (job: JobRow, action: 'request' | 'confirm' | 'decline' | 'finish') => {
    setBusy(job.id); setError('');
    try {
      if (action === 'request') {
        const { error: e } = await supabase.rpc('request_job_overtime', { p_job_id: job.id });
        if (e) throw e;
      } else if (action === 'confirm' || action === 'decline') {
        if (action === 'confirm' && !overtimeChecked[job.id]) {
          throw new Error('Centang persetujuan lembur terlebih dahulu.');
        }
        const { error: e } = await supabase.rpc('confirm_job_overtime', { p_job_id: job.id, p_confirm: action === 'confirm' });
        if (e) throw e;
        if (action === 'confirm') setOvertimeChecked(current => ({ ...current, [job.id]: false }));
      } else {
        const { error: e } = await supabase.rpc('resolve_job_duration', { p_job_id: job.id, p_decision: 'finished' });
        if (e) throw e;
      }
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Tindakan lembur gagal.'); }
    finally { setBusy(null); }
  };

  const visible = useMemo(() => jobs.filter(j => j.workflow_status !== 'completed'), [jobs]);
  if (!user || visible.length === 0) return error ? <div className="mb-6 rounded-xl border border-error-200 bg-error-50 p-4 text-sm font-semibold text-error-700">{error}</div> : null;

  return <section className="mb-6 rounded-2xl border border-warning-200 bg-white p-5 shadow-sm">
    <div className="flex items-start gap-3"><Clock3 className="mt-0.5 h-5 w-5 text-warning-600"/><div><h2 className="font-display font-bold text-slate-900">Persetujuan Perpanjangan Waktu</h2><p className="mt-1 text-xs leading-5 text-slate-500">Pekerjaan tidak diperpanjang otomatis. Tambahan waktu dan biaya lembur hanya aktif setelah persetujuan eksplisit Pekerja.</p></div></div>
    {error && <div className="mt-4 rounded-lg bg-error-50 p-3 text-xs font-semibold text-error-700">{error}</div>}
    <div className="mt-4 space-y-3">{visible.map(job => {
      const expired = !!job.scheduled_end_at && now >= new Date(job.scheduled_end_at).getTime();
      const minutes = job.overtime_consent_status === 'confirmed' && job.scheduled_end_at ? Math.max(0, Math.floor((now - new Date(job.scheduled_end_at).getTime()) / 60000)) : 0;
      const amount = minutes * Math.max(0, Number(job.overtime_rate_per_minute ?? 0));
      return <div key={job.id} className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold">{job.title || 'Pekerjaan'}</p><p className="mt-1 text-xs text-slate-500">{expired ? 'Durasi pekerjaan telah berakhir.' : `Sisa waktu hingga ${job.scheduled_end_at ? new Date(job.scheduled_end_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}`}</p></div><span className="rounded-full bg-warning-50 px-2.5 py-1 text-[10px] font-bold text-warning-700">{job.overtime_consent_status}</span></div>
        {expired && job.overtime_consent_status === 'not_requested' && role === 'employer' && <button disabled={busy===job.id} onClick={() => void actions(job,'request')} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-warning-500 px-3 py-2.5 text-sm font-bold text-white"><AlertTriangle className="h-4 w-4"/>Minta Perpanjangan Waktu</button>}
        {expired && job.overtime_consent_status === 'requested' && role === 'worker' && <div className="mt-3 rounded-lg bg-white p-3 ring-1 ring-warning-200"><p className="text-xs font-semibold text-slate-700">Employer meminta Anda melanjutkan pekerjaan setelah waktu awal berakhir. Persetujuan Anda wajib sebelum waktu tambahan dihitung sebagai lembur.</p><label className="mt-3 flex cursor-pointer gap-3 text-xs leading-5 text-slate-700"><input type="checkbox" checked={!!overtimeChecked[job.id]} onChange={e => setOvertimeChecked(current => ({ ...current, [job.id]: e.target.checked }))} className="mt-1 h-4 w-4"/><span><b>Saya menyetujui perpanjangan waktu pekerjaan.</b> Saya memahami bahwa waktu tambahan setelah durasi awal berakhir dihitung berdasarkan tarif lembur yang ditampilkan dan persetujuan ini dicatat sebagai persetujuan transaksi.</span></label><div className="mt-3 grid grid-cols-2 gap-2"><button disabled={busy===job.id} onClick={() => void actions(job,'decline')} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold">Tidak Setuju</button><button disabled={busy===job.id || !overtimeChecked[job.id]} onClick={() => void actions(job,'confirm')} className="rounded-lg bg-warning-500 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Setujui &amp; Lanjutkan</button></div></div>}
        {job.overtime_consent_status === 'confirmed' && <div className="mt-3 rounded-lg bg-warning-50 p-3 text-xs font-semibold text-warning-800"><div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4"/>Perpanjangan waktu disetujui Pekerja.</div><p className="mt-1">{minutes} menit · {formatIDR(amount)} · tarif {formatIDR(Number(job.overtime_rate_per_minute ?? 0))}/menit</p>{role === 'employer' && <button disabled={busy===job.id} onClick={() => void actions(job,'finish')} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-success-600 px-3 py-2.5 text-sm font-bold text-white"><CheckCircle2 className="h-4 w-4"/>Selesai &amp; Tutup Pembayaran</button>}</div>}
        {job.overtime_consent_status === 'declined' && <p className="mt-3 text-xs font-semibold text-slate-500">Pekerja tidak menyetujui perpanjangan. Tidak ada biaya lembur yang ditambahkan.</p>}
      </div>;
    })}</div>
  </section>;
}
