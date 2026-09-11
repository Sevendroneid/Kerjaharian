import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

type RequestRow = { id: string; request_type: 'access'|'correction'|'deletion'; reason: string|null; status: string; created_at: string; resolved_at: string|null; resolution_note: string|null };

const labels: Record<'id'|'en', Record<string,string>> = {
  id: { access:'Akses data saya', correction:'Koreksi data saya', deletion:'Ajukan penghapusan data' },
  en: { access:'Access my data', correction:'Correct my data', deletion:'Request data deletion' },
};

export function PrivacyCenter({ lang = 'id' }: { lang?: 'id'|'en' }) {
  const { user } = useAuth();
  const [rows,setRows]=useState<RequestRow[]>([]); const [type,setType]=useState<RequestRow['request_type']>('access'); const [reason,setReason]=useState(''); const [busy,setBusy]=useState(false); const [message,setMessage]=useState(''); const [error,setError]=useState('');
  const id = lang === 'id';
  const copy = id ? {
    title:'Pusat Privasi',
    description:'Ajukan akses, koreksi, atau penghapusan data. Permintaan penghapusan ditinjau agar catatan transaksi, pembayaran, dan keselamatan yang wajib disimpan tidak hilang secara otomatis.',
    success:'Permintaan privasi berhasil dicatat dan akan ditinjau.',
    reason:'Alasan / detail (opsional)',
    submit:'Kirim Permintaan', sending:'Mengirim...',
    empty:'Belum ada permintaan privasi.',
    loadError:'Permintaan privasi tidak dapat dimuat.',
    submitError:'Permintaan privasi gagal dikirim.',
  } : {
    title:'Privacy Center',
    description:'Request access, correction, or deletion of your data. Deletion requests are reviewed so records that must be retained for transactions, payments, or safety are not removed automatically.',
    success:'Your privacy request has been recorded and will be reviewed.',
    reason:'Reason / details (optional)',
    submit:'Submit Request', sending:'Submitting...',
    empty:'No privacy requests yet.',
    loadError:'Privacy requests could not be loaded.',
    submitError:'Privacy request could not be submitted.',
  };
  const requestLabels = labels[lang];
  const load=useCallback(async()=>{if(!user)return;const{data,error:e}=await supabase.from('privacy_requests').select('id,request_type,reason,status,created_at,resolved_at,resolution_note').eq('user_id',user.id).order('created_at',{ascending:false}).limit(20);if(e)setError(e.message||copy.loadError);else setRows((data??[]) as RequestRow[])},[user,copy.loadError]);
  useEffect(()=>{void load()},[load]);
  const submit=async()=>{if(!user)return;setBusy(true);setError('');setMessage('');const{error:e}=await supabase.rpc('submit_privacy_request',{p_request_type:type,p_reason:reason.trim()||null});if(e)setError(e.message||copy.submitError);else{setMessage(copy.success);setReason('');await load()}setBusy(false)};
  if(!user)return null;
  return <section className="mx-auto w-full max-w-6xl px-4 pb-8"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-primary-600"/><div><h2 className="font-display font-bold text-slate-900">{copy.title}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{copy.description}</p></div></div>{message&&<div className="mt-4 flex gap-2 rounded-lg bg-success-50 p-3 text-xs font-semibold text-success-700"><CheckCircle2 className="h-4 w-4"/>{message}</div>}{error&&<div className="mt-4 rounded-lg bg-error-50 p-3 text-xs font-semibold text-error-700">{error}</div>}<div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1.5fr_auto]"><select value={type} onChange={e=>setType(e.target.value as RequestRow['request_type'])} className="input" aria-label={id?'Jenis permintaan privasi':'Privacy request type'}>{Object.entries(requestLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><input value={reason} onChange={e=>setReason(e.target.value.slice(0,1000))} placeholder={copy.reason} className="input"/><button disabled={busy} onClick={()=>void submit()} className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy?copy.sending:copy.submit}</button></div><div className="mt-5 space-y-2">{rows.map(r=><div key={r.id} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200"><div className="flex items-center justify-between gap-3"><span className="text-xs font-bold">{requestLabels[r.request_type]||r.request_type}</span><span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-slate-600">{r.status}</span></div><p className="mt-1 text-[11px] text-slate-500">{new Date(r.created_at).toLocaleString(id?'id-ID':'en-US')}{r.resolution_note?` · ${r.resolution_note}`:''}</p></div>)}{rows.length===0&&<p className="text-xs text-slate-500">{copy.empty}</p>}</div></div></section>;
}
