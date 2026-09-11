import { useEffect, useRef, useState } from 'react';
import { Bot, Loader2, Mic, MicOff, Send, Volume2, VolumeX, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/supabase';

interface Props { role?: 'admin' | null; profile: Profile | null }
type Recognition = { lang:string; interimResults:boolean; continuous:boolean; start:()=>void; stop:()=>void; onresult:((e:any)=>void)|null; onerror:((e:any)=>void)|null; onend:(()=>void)|null };
const clean=(v:string)=>v.replace(/\s+/g,' ').trim();

export function AIVoiceAssistant({profile}:Props){
  const authorized=['admin','worker','employer'].includes(profile?.role||'');
  const endpoint='/api/ai-core';
  const [open,setOpen]=useState(false),[listening,setListening]=useState(false),[busy,setBusy]=useState(false),[speaking,setSpeaking]=useState(false),[text,setText]=useState(''),[answer,setAnswer]=useState(''),[error,setError]=useState(''),[voiceOn,setVoiceOn]=useState(true),[autoSummary,setAutoSummary]=useState('');
  const recognitionRef=useRef<Recognition|null>(null);
  const supported=typeof window!=='undefined'&&!!((window as any).SpeechRecognition||(window as any).webkitSpeechRecognition);

  const runAutoAdmin=async()=>{if(profile?.role!=='admin')return;try{const session=(await supabase.auth.getSession()).data.session;if(!session)return;const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${session.access_token}`},body:JSON.stringify({message:'Lakukan pemeriksaan otomatis operasional terbaru. Ringkas masalah yang perlu diprioritaskan admin.',source:'auto'})});const d=await r.json().catch(()=>({}));if(r.ok)setAutoSummary(String(d.summary||''))}catch{}};
  useEffect(()=>{void runAutoAdmin();if(profile?.role!=='admin')return;const id=window.setInterval(()=>void runAutoAdmin(),15*60*1000);return()=>window.clearInterval(id)},[profile?.role]);
  useEffect(()=>()=>{try{recognitionRef.current?.stop()}catch{};window.speechSynthesis?.cancel()},[]);
  const speak=(v:string)=>{if(!voiceOn||!('speechSynthesis'in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(v);u.lang='id-ID';u.rate=.98;u.onstart=()=>setSpeaking(true);u.onend=()=>setSpeaking(false);u.onerror=()=>setSpeaking(false);window.speechSynthesis.speak(u)};

  const startListening=()=>{
    if(busy||listening)return;
    setError('');
    if(!supported){setError('Perekaman suara tidak tersedia di browser/PWA ini. Gunakan Chrome terbaru atau mode teks.');return;}
    try{
      const C=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
      const r=new C() as Recognition;
      r.lang='id-ID';r.interimResults=false;r.continuous=false;
      r.onresult=e=>setText(clean(Array.from(e.results as any).map((x:any)=>x[0]?.transcript||'').join(' ')));
      r.onerror=e=>{setListening(false);setError(e?.error==='not-allowed'?'Izin mikrofon ditolak. Izinkan mikrofon di browser.':e?.error==='service-not-allowed'?'Layanan pengenalan suara diblokir browser. Coba Chrome terbaru.':'Suara tidak dapat dikenali. Silakan coba lagi.')};
      r.onend=()=>setListening(false);
      recognitionRef.current=r;
      r.start();
      setListening(true);
    }catch(e){recognitionRef.current=null;setListening(false);setError(e instanceof Error?`Mikrofon tidak dapat dimulai: ${e.message}`:'Mikrofon tidak dapat dimulai. Silakan coba lagi.')}
  };
  const stopListening=()=>{try{recognitionRef.current?.stop()}catch{}recognitionRef.current=null;setListening(false)};
  const send=async()=>{const prompt=clean(text);if(!prompt||busy||listening)return;setBusy(true);setError('');setAnswer('');try{const session=(await supabase.auth.getSession()).data.session;if(!session)throw new Error('Sesi login tidak ditemukan. Silakan login terlebih dahulu.');const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${session.access_token}`},body:JSON.stringify({message:prompt,source:'manual'})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d?.error||`AI tidak tersedia (HTTP ${r.status}).`);const result=String(d?.answer||d?.summary||'AI belum memberikan jawaban.');setAnswer(result);setText('');speak(result)}catch(e){const m=e instanceof Error?e.message:'Terjadi kesalahan.';setError(m);speak(m)}finally{setBusy(false)}};
  const close=()=>{stopListening();window.speechSynthesis?.cancel();setSpeaking(false);setOpen(false)};
  if(!authorized)return null;
  const title=profile?.role==='admin'?'KerjaHarian Admin AI':'KerjaHarian AI';
  const subtitle=profile?.role==='admin'?'Otak operasional · auto-check 15 menit':'Asisten Worker & Employer';
  return <><button type="button" onClick={()=>setOpen(true)} className="fixed bottom-20 right-4 z-[59] grid h-12 w-12 place-items-center rounded-full bg-slate-950 text-white shadow-xl ring-1 ring-slate-700 transition hover:scale-105 sm:bottom-20 sm:right-5" aria-label={`Buka ${title}`} title={title}><Bot className="h-5 w-5"/></button>{open&&<div className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"><header className="flex items-center justify-between bg-slate-950 px-4 py-3 text-white"><div className="flex items-center gap-2"><Bot className="h-5 w-5"/><div><p className="text-sm font-extrabold">{title}</p><p className="text-[10px] text-slate-300">{subtitle} · Text + Voice</p></div></div><div className="flex items-center gap-1"><button type="button" onClick={()=>{setVoiceOn(v=>!v);if(voiceOn)window.speechSynthesis?.cancel()}} className="grid h-9 w-9 items-center rounded-lg hover:bg-white/10" aria-label={voiceOn?'Matikan suara AI':'Nyalakan suara AI'}>{voiceOn?<Volume2 className="h-4 w-4"/>:<VolumeX className="h-4 w-4"/>}</button><button type="button" onClick={close} className="grid h-9 w-9 items-center rounded-lg hover:bg-white/10" aria-label="Tutup"><X className="h-4 w-4"/></button></div></header><div className="space-y-3 p-4">{profile?.role==='admin'&&autoSummary&&<div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Pemeriksaan otomatis terakhir</p><p className="mt-1 text-xs leading-relaxed text-slate-700">{autoSummary}</p></div>}<p className="text-xs text-slate-500">Satu KerjaHarian AI Core digunakan melalui teks atau suara. Worker, employer, dan admin mendapatkan kemampuan sesuai role dan kewenangannya.</p>{listening&&<div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-600"/>Mendengarkan… bicara sekarang</div>}{answer&&<div className="rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-700" aria-live="polite">{answer}</div>}{speaking&&<div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Volume2 className="h-4 w-4 animate-pulse"/>AI sedang berbicara…</div>}{error&&<div className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</div>}<div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"><textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void send()}}} maxLength={2000} rows={2} disabled={busy||listening} placeholder={listening?'Sedang mendengarkan…':`Tulis pertanyaan atau perintah ${profile?.role==='admin'?'admin':''}`} className="min-h-11 min-w-0 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-400 disabled:opacity-60"/><button type="button" onClick={listening?stopListening:startListening} disabled={busy} className={`grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${listening?'bg-red-600 hover:bg-red-700':'bg-slate-950 hover:bg-slate-800'}`} aria-label={listening?'Stop mendengarkan':'Gunakan suara'} title={listening?'Stop':'Gunakan suara'}>{listening?<MicOff className="h-5 w-5"/>:<Mic className="h-5 w-5"/>}</button><button type="button" onClick={()=>void send()} disabled={busy||listening||!text.trim()} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-950 text-white shadow-sm disabled:opacity-40" aria-label="Kirim ke AI">{busy?<Loader2 className="h-5 w-5 animate-spin"/>:<Send className="h-5 w-5"/>}</button></div>{!supported&&<p className="text-[11px] text-amber-700">Voice recognition tidak tersedia di browser ini. Mode teks tetap dapat digunakan.</p>}</div></div>}</>;
}
