import { useCallback, useEffect, useState } from 'react';
import { Bell, MapPin, Navigation, Loader2, CreditCard } from 'lucide-react';
import { supabase, type Job } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { formatIDR } from '@/lib/format';
import { payJob } from '@/lib/midtrans';

type Offer = { id: string; job_id: string; rank: number; distance_meters: number | null; score: number | null; expires_at: string; status: string; };
type PaymentJob = { id: string; title: string | null; total: number | null; employer_total: number | null; final_amount: number | null; payment_status: string | null; status: string | null; };

function useWorkerLocation(enabled: boolean) {
  const { user } = useAuth();
  useEffect(() => {
    if (!enabled || !user || !navigator.geolocation) return;
    let stopped = false;
    const push = () => navigator.geolocation.getCurrentPosition(async (pos) => {
      if (stopped) return;
      const { error } = await supabase.rpc('update_worker_location', { p_lat: pos.coords.latitude, p_lng: pos.coords.longitude, p_accuracy: pos.coords.accuracy });
      if (error) console.warn('Worker location update:', error.message);
    }, () => undefined, { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 });
    push();
    const timer = window.setInterval(push, 30000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [enabled, user]);
}

export function WorkerDispatchPanel() {
  const { user, profile } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [jobs, setJobs] = useState<Record<string, Job>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const online = profile?.role === 'worker' && profile.is_online;
  useWorkerLocation(!!online);

  const load = useCallback(async () => {
    if (!user || !online) { setOffers([]); return; }
    const { data, error: offerError } = await supabase.from('dispatch_offers').select('id,job_id,rank,distance_meters,score,expires_at,status').eq('worker_id', user.id).eq('status','offered').gt('expires_at', new Date().toISOString()).order('offered_at',{ascending:false}).limit(10);
    if (offerError) { setError(offerError.message); return; }
    const next = (data ?? []) as Offer[];
    setOffers(next);
    if (next.length) {
      const { data: jobRows } = await supabase.from('jobs').select('*').in('id', next.map(o => o.job_id));
      const map: Record<string, Job> = {}; for (const job of jobRows ?? []) map[job.id] = job as Job; setJobs(map);
    } else setJobs({});
    setError('');
  }, [online, user]);

  useEffect(() => { void load(); if (!user || !online) return; const channel = supabase.channel(`dispatch-offers-${user.id}`).on('postgres_changes',{event:'*',schema:'public',table:'dispatch_offers',filter:`worker_id=eq.${user.id}`},()=>void load()).subscribe(); const timer=window.setInterval(()=>void load(),5000); return ()=>{window.clearInterval(timer);void supabase.removeChannel(channel);}; },[load,online,user]);

  const accept = async (offerId: string) => {
    setBusy(offerId); setError('');
    const { error: acceptError } = await supabase.rpc('accept_dispatch_offer',{p_offer_id:offerId});
    if (acceptError) setError(acceptError.message); else await load();
    setBusy(null);
  };

  if (!online || !user || offers.length === 0) return null;
  return <section className="mb-6 rounded-2xl border-2 border-primary-200 bg-primary-50/60 p-5 shadow-sm" aria-live="polite">
    <div className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary-600" /><div><h2 className="font-display font-bold text-slate-900">Panggilan Kerja Terdekat</h2><p className="text-xs text-slate-500">Dispatch real-time — tawaran berlaku 8 detik per tahap.</p></div></div>
    {error && <p className="mt-3 rounded-lg bg-error-50 p-3 text-xs font-semibold text-error-700">{error}</p>}
    <div className="mt-4 space-y-3">{offers.map(offer=>{const job=jobs[offer.job_id]; if(!job)return null; return <div key={offer.id} className="rounded-xl bg-white p-4 ring-1 ring-primary-100"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-slate-900">{job.title||'Pekerjaan'}</p><p className="mt-1 text-xs text-slate-500">{job.location||'Lokasi belum tersedia'}</p><p className="mt-2 text-sm font-extrabold text-primary-700">{formatIDR(Number(job.wage??0))}</p></div><span className="rounded-full bg-primary-100 px-2 py-1 text-[11px] font-bold text-primary-700">{offer.distance_meters!=null?`${(offer.distance_meters/1000).toFixed(1)} km`: 'Terdekat'}</span></div><div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500"><MapPin className="h-3.5 w-3.5" />Panggilan dikirim berdasarkan lokasi, status online, rating, dan ketersediaan.</div><button onClick={()=>void accept(offer.id)} disabled={busy===offer.id} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{busy===offer.id?<Loader2 className="h-4 w-4 animate-spin"/>:<Navigation className="h-4 w-4"/>}{busy===offer.id?'Mengambil...':'Terima Pekerjaan'}</button></div>})}</div>
  </section>;
}

export function EmployerDispatchWatcher() {
  const { user, profile } = useAuth();
  const [paymentJobs, setPaymentJobs] = useState<PaymentJob[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadEmployerJobs = useCallback(async () => {
    if (!user || profile?.role !== 'employer') { setPaymentJobs([]); return; }
    const { data, error: queryError } = await supabase
      .from('jobs')
      .select('id,title,total,employer_total,final_amount,payment_status,status')
      .eq('employer_id', user.id)
      .eq('status', 'completed')
      .eq('payment_status', 'pending')
      .order('completed_at', { ascending: false })
      .limit(10);
    if (queryError) setError(queryError.message); else setPaymentJobs((data ?? []) as PaymentJob[]);
  }, [profile?.role, user]);

  const dispatch = useCallback(async () => {
    if (!user || profile?.role !== 'employer') return;
    const { data, error: queryError } = await supabase.from('jobs').select('id').eq('employer_id',user.id).eq('status','open').order('created_at',{ascending:false}).limit(10);
    if (queryError) { setError(queryError.message); return; }
    for (const row of data ?? []) {
      const { error: dispatchError }=await supabase.rpc('dispatch_open_job',{p_job_id:row.id,p_limit:10});
      if(dispatchError && !dispatchError.message.toLowerCase().includes('koordinat')) setError(dispatchError.message);
    }
  }, [profile?.role, user]);

  useEffect(() => {
    if (!user || profile?.role !== 'employer') return;
    let stopped=false;
    const tick = async () => { if (stopped) return; await loadEmployerJobs(); await dispatch(); };
    void tick();
    const timer=window.setInterval(()=>void tick(),5000);
    return()=>{stopped=true;window.clearInterval(timer);};
  },[dispatch,loadEmployerJobs,profile?.role,user]);

  const pay = async (jobId: string) => {
    setBusy(jobId); setError('');
    try {
      await payJob(jobId, async () => {
        await loadEmployerJobs();
        await dispatch();
      }, () => {
        setError('Pembayaran belum terverifikasi. Anda dapat mencoba lagi dari tombol Bayar.');
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Pembayaran gagal dimulai');
    } finally {
      setBusy(null);
    }
  };

  if (!user || profile?.role !== 'employer' || paymentJobs.length === 0) return null;

  return <section className="mb-6 rounded-2xl border-2 border-amber-200 bg-amber-50 p-5 shadow-sm" aria-live="polite">
    <div className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-amber-700" /><div><h2 className="font-display font-bold text-slate-900">Pembayaran pekerjaan selesai</h2><p className="text-xs text-slate-600">Pekerjaan sudah selesai. Lakukan pembayaran melalui Midtrans untuk menyelesaikan transaksi.</p></div></div>
    {error && <p className="mt-3 rounded-lg bg-error-50 p-3 text-xs font-semibold text-error-700">{error}</p>}
    <div className="mt-4 space-y-3">{paymentJobs.map((job) => { const amount=Number(job.final_amount ?? job.employer_total ?? job.total ?? 0); return <div key={job.id} className="flex items-center justify-between gap-4 rounded-xl bg-white p-4 ring-1 ring-amber-200"><div><p className="font-bold text-slate-900">{job.title || 'Pekerjaan'}</p><p className="mt-1 text-sm font-extrabold text-amber-700">{formatIDR(amount)}</p><p className="mt-1 text-[11px] text-slate-500">Status: Menunggu pembayaran</p></div><button onClick={()=>void pay(job.id)} disabled={busy===job.id} className="flex shrink-0 items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{busy===job.id?<Loader2 className="h-4 w-4 animate-spin"/>:<CreditCard className="h-4 w-4"/>}{busy===job.id?'Memproses...':'Bayar'}</button></div>; })}</div>
  </section>;
}
