import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, BriefcaseBusiness, CheckCircle2, Clock3, DollarSign, RefreshCw, ShieldAlert, Users, UserRoundCheck, UserRoundPlus, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type JobKpiRow = {
  id: string;
  employer_id: string | null;
  worker_id: string | null;
  status: string | null;
  workflow_status: string | null;
  payment_status: string | null;
  created_at: string;
  completed_at: string | null;
  paid_at: string | null;
  worker_amount: number | null;
  midtrans_transaction_status: string | null;
};

type ProfileKpiRow = { role: string | null; is_online: boolean | null };
type Metrics = { activeWorkers:number; activeEmployers:number; jobsToday:number; publishedJobs:number; filledJobs:number; completedJobs:number; paidJobs:number; workerIncome:number; repeatEmployers:number; reports:number };
const emptyMetrics:Metrics={activeWorkers:0,activeEmployers:0,jobsToday:0,publishedJobs:0,filledJobs:0,completedJobs:0,paidJobs:0,workerIncome:0,repeatEmployers:0,reports:0};
const money=(value:number)=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(value);
const pct=(value:number|null)=>value===null?'—':`${Math.round(value*100)}%`;

export default function MarketplaceKpiPanel(){
  const [metrics,setMetrics]=useState<Metrics>(emptyMetrics);const [loading,setLoading]=useState(true);const [notice,setNotice]=useState('');
  const load=useCallback(async()=>{setLoading(true);setNotice('');const now=new Date();const todayStart=new Date(now.getFullYear(),now.getMonth(),now.getDate()).toISOString();const [profiles,jobs,reports]=await Promise.all([
    supabase.from('profiles').select('role,is_online'),
    supabase.from('jobs').select('id,employer_id,worker_id,status,workflow_status,payment_status,created_at,completed_at,paid_at,worker_amount,midtrans_transaction_status').eq('is_deleted',false),
    supabase.from('job_reports').select('id',{count:'exact',head:true})
  ]);const error=profiles.error??jobs.error??reports.error;if(error){setNotice(`KPI belum dapat dimuat: ${error.message}`);setLoading(false);return}
    const jobRows=(jobs.data??[]) as JobKpiRow[];const profileRows=(profiles.data??[]) as ProfileKpiRow[];
    const filled=jobRows.filter(j=>j.worker_id!==null||['assigned','worker_checked_in','employer_checked_in','ready_to_start','active','overtime','completed'].includes(j.workflow_status??'')).length;
    const completed=jobRows.filter(j=>j.status==='completed'||j.workflow_status==='completed');
    const paid=completed.filter(j=>j.payment_status==='settled'||j.paid_at!==null||['settlement','capture'].includes(j.midtrans_transaction_status??''));
    const employerCompletions=new Map<string,number>();for(const job of completed)if(job.employer_id)employerCompletions.set(job.employer_id,(employerCompletions.get(job.employer_id)??0)+1);
    setMetrics({activeWorkers:profileRows.filter(p=>p.role==='worker'&&p.is_online===true).length,activeEmployers:profileRows.filter(p=>p.role==='employer'&&p.is_online===true).length,jobsToday:jobRows.filter(j=>j.created_at>=todayStart).length,publishedJobs:jobRows.length,filledJobs:filled,completedJobs:completed.length,paidJobs:paid.length,workerIncome:paid.reduce((sum,job)=>sum+Number(job.worker_amount??0),0),repeatEmployers:[...employerCompletions.values()].filter(count=>count>=2).length,reports:reports.count??0});setLoading(false);
  },[]);
  useEffect(()=>{void load()},[load]);
  const fillRate=useMemo(()=>metrics.publishedJobs>0?metrics.filledJobs/metrics.publishedJobs:null,[metrics]);const completionRate=useMemo(()=>metrics.filledJobs>0?metrics.completedJobs/metrics.filledJobs:null,[metrics]);const jobToIncome=useMemo(()=>metrics.publishedJobs>0?metrics.paidJobs/metrics.publishedJobs:null,[metrics]);
  const cards=[['Active Workers',metrics.activeWorkers,Users],['Active Employers',metrics.activeEmployers,BriefcaseBusiness],['Jobs Today',metrics.jobsToday,BriefcaseBusiness],['Jobs Filled',metrics.filledJobs,UserRoundCheck],['Match / Fill Rate',pct(fillRate),Activity],['Completion Rate',pct(completionRate),CheckCircle2],['Paid Jobs',metrics.paidJobs,DollarSign],['Worker Income',money(metrics.workerIncome),DollarSign],['Repeat Employers',metrics.repeatEmployers,UserRoundPlus],['Reports / Incidents',metrics.reports,ShieldAlert],['Published Jobs',metrics.publishedJobs,BriefcaseBusiness],['Job → Income',pct(jobToIncome),CheckCircle2]] as const;
  return <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200" aria-label="Marketplace KPI Command Center"><div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Activity className="h-5 w-5"/><h2 className="font-extrabold">Marketplace KPI Command Center</h2></div><p className="mt-1 text-xs text-slate-500">Metrik operasional dari job, profil, pembayaran, dan laporan yang sudah ada. Tidak membuat data sintetis.</p></div><button onClick={()=>void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading?'animate-spin':''}`}/>Sync KPI</button></div>{notice&&<div className="mb-4 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">{notice}</div>}<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label,value,Icon])=><div key={label} className="rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-slate-500">{label}</span><Icon className="h-4 w-4 text-slate-400"/></div><div className="mt-2 text-xl font-black">{loading?'—':value}</div></div>)}</div>{!loading&&metrics.publishedJobs===0&&<div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-600"><Clock3 className="h-4 w-4"/>Belum ada data transaksi. KPI rasio tetap ditampilkan sebagai — sampai job nyata masuk.</div>}{!loading&&metrics.publishedJobs>0&&metrics.paidJobs===0&&<div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-600"><XCircle className="h-4 w-4"/>Belum ada job yang teridentifikasi sebagai settled/paid; income tidak diasumsikan dari nilai job.</div>}</section>;
}
