import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Briefcase, CheckCircle2, MapPin, Radar, ShieldCheck, UserCheck } from 'lucide-react';
import { Worker } from '@/components/Worker';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

interface WorkerEntryProps { onAuthClick:(mode:'signin'|'signup')=>void }
interface JobItem { id:string; status:string; title?:string|null; category?:string|null; created_at:string }

export function WorkerEntry({onAuthClick}:WorkerEntryProps){
 const {user,profile}=useAuth();
 const [showJobs,setShowJobs]=useState(false);
 const [jobs,setJobs]=useState<JobItem[]>([]);
 const [loading,setLoading]=useState(false);
 const loadJobs=useCallback(async()=>{
  if(!user||profile?.role!=='worker')return;
  setLoading(true);
  const {data}=await supabase.from('jobs').select('id,status,title,category,created_at').eq('status','open').order('created_at',{ascending:false}).limit(10);
  if(data)setJobs(data as JobItem[]);
  setLoading(false);
 },[user,profile?.role]);
 useEffect(()=>{void loadJobs()},[loadJobs]);
 if(showJobs)return <Worker onAuthClick={onAuthClick}/>;
 return <div className="bg-slate-50 pb-20 pt-6 sm:pt-8"><div className="container-app"><div className="mx-auto max-w-5xl">
  <div className="mb-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
   <div className="inline-flex items-center gap-2 rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-700"><Briefcase className="h-3.5 w-3.5"/>Mitra Pekerja</div>
   <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Cari pekerjaan hari ini</h1>
   <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Setelah KYC disetujui, urutan kerja Anda adalah: cek pekerjaan → siapkan status online → pilih dan ambil pekerjaan.</p>
  </div>
  <div className="mb-5 grid gap-3 sm:grid-cols-3">
   <div className="card flex items-center gap-3 p-4"><div className="rounded-xl bg-primary-50 p-2"><MapPin className="h-5 w-5 text-primary-600"/></div><div><p className="text-xs font-bold uppercase text-slate-500">1. Cek Pekerjaan</p><p className="font-extrabold text-slate-900">{loading?'Memuat…':`${jobs.length} tersedia`}</p></div></div>
   <div className="card flex items-center gap-3 p-4"><div className="rounded-xl bg-primary-50 p-2"><Radar className="h-5 w-5 text-primary-600"/></div><div><p className="text-xs font-bold uppercase text-slate-500">2. Status Online</p><p className="font-extrabold text-slate-900">Siap menerima</p></div></div>
   <div className="card flex items-center gap-3 p-4"><div className="rounded-xl bg-primary-50 p-2"><ShieldCheck className="h-5 w-5 text-primary-600"/></div><div><p className="text-xs font-bold uppercase text-slate-500">KYC</p><p className="font-extrabold text-slate-900">{profile?.kyc_verified?'Terverifikasi':'Menunggu'}</p></div></div>
  </div>
  <section className="card p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="font-extrabold text-slate-900">1. Cek Pekerjaan</h2><p className="mt-1 text-sm text-slate-500">Lihat pekerjaan yang tersedia sebelum mengaktifkan radar kerja.</p></div><CheckCircle2 className="h-5 w-5 text-green-600"/></div>
   <div className="mt-4 space-y-2">{jobs.length?jobs.slice(0,5).map(job=><div key={job.id} className="rounded-xl border bg-white p-4"><p className="font-semibold text-slate-900">{job.title||'Pekerjaan tersedia'}</p><p className="mt-1 text-xs text-slate-500">{job.category||'Kategori pekerjaan'}</p></div>):<p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Belum ada pekerjaan terbuka yang terdeteksi.</p>}</div>
  </section>
  <section className="mt-4 card p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="font-extrabold text-slate-900">2. Aktifkan Radar Kerja</h2><p className="mt-1 text-sm text-slate-500">Aktifkan status online dan gunakan lokasi Anda untuk mendapatkan pekerjaan di sekitar.</p></div><Radar className="h-5 w-5 text-primary-600"/></div><button type="button" onClick={()=>setShowJobs(true)} className="btn-primary mt-4 flex items-center gap-2"><UserCheck className="h-4 w-4"/>Buka Radar & Status Online<ArrowRight className="h-4 w-4"/></button></section>
  <section className="mt-4 card p-5 sm:p-6"><h2 className="font-extrabold text-slate-900">3. Pilih / Ambil Pekerjaan</h2><p className="mt-1 text-sm text-slate-500">Setelah online, pilih pekerjaan yang sesuai dan ambil pekerjaan tersebut.</p><div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Pekerjaan hanya dapat diambil ketika status Anda <b>Online</b>.</div></section>
 </div></div></div>;
}
