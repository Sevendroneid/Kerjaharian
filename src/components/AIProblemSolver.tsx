import { useRef, useState } from 'react';
import { ArrowRight, Bot, Loader2, Send, Sparkles, X, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Job } from '@/lib/supabase';
import { ResolutionCenter } from '@/components/ResolutionCenter';

interface SolverResponse { answer: string; jobs?: Pick<Job, 'id' | 'title' | 'category' | 'location' | 'wage' | 'wage_type'>[]; actions?: { label: string; href: string }[]; provider?: string; grounded?: boolean; }

const SUGGESTIONS = ['Saya butuh kerja hari ini', 'Kenapa saya belum dapat panggilan?', 'Kenapa lowongan saya belum diambil?'];

export function AIProblemSolver() {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [showResolution, setShowResolution] = useState(false);
  const [message, setMessage] = useState('');
  const [answer, setAnswer] = useState<SolverResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const ask = async (value = message) => {
    const prompt = value.trim();
    if (!prompt || busy) return;
    setBusy(true); setError(''); setMessage(prompt);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const token = user ? (await supabase.auth.getSession()).data.session?.access_token : null;
      const response = await fetch('/api/ai-problem-solver', { method: 'POST', signal: controller.signal, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ message: prompt, role: profile?.role, isOnline: profile?.is_online }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Problem Solver sedang tidak tersedia.');
      setAnswer(data); setMessage('');
    } catch (cause) {
      setError(cause instanceof DOMException && cause.name === 'AbortError' ? 'Permintaan terlalu lama. Coba lagi.' : cause instanceof Error ? cause.message : 'Tidak dapat menghubungi Problem Solver.');
    } finally { window.clearTimeout(timeout); setBusy(false); }
  };

  const openSolver = () => { setOpen(true); setShowResolution(false); window.setTimeout(() => inputRef.current?.focus(), 0); };
  const closeSolver = () => { setOpen(false); setShowResolution(false); };

  return <>
    {!open && <button onClick={openSolver} className="fixed bottom-4 right-4 z-[60] grid h-11 w-11 place-items-center rounded-full bg-slate-950 text-white shadow-lg ring-1 ring-white/30 transition hover:scale-105 hover:-translate-y-0.5 active:scale-95 sm:bottom-5 sm:right-5" aria-label="Buka KerjaHarian AI Problem Solver" title="Tanya AI"><Sparkles className="h-4 w-4" /></button>}
    {open && <div className={`fixed bottom-4 right-4 z-[60] w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 sm:bottom-5 sm:right-5 ${showResolution ? 'max-w-lg' : 'max-w-sm'}`} role="dialog" aria-modal="true" aria-label="KerjaHarian AI Problem Solver">
      <div className="flex items-center justify-between bg-slate-950 px-3 py-2.5 text-white"><div className="flex min-w-0 items-center gap-2"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10"><Bot className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate text-xs font-extrabold">KerjaHarian</p><p className="truncate text-[10px] text-slate-300">{showResolution ? 'Pusat Resolusi' : 'AI Problem Solver'}</p></div></div><div className="flex items-center gap-1"><button onClick={() => setShowResolution(v => !v)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/10" aria-label="Pusat Resolusi" title="Pusat Resolusi"><ShieldCheck className="h-4 w-4" /></button><button onClick={closeSolver} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg hover:bg-white/10" aria-label="Tutup AI"><X className="h-4 w-4" /></button></div></div>
      {showResolution ? <div className="max-h-[78vh] overflow-y-auto p-3"><ResolutionCenter /></div> : <>
        <div className="max-h-[52vh] overflow-y-auto p-3">
          {!answer && <><p className="text-xs leading-relaxed text-slate-600">Ceritakan masalah Anda. Saya akan mencari konteks KerjaHarian dan memberi langkah yang bisa dilakukan.</p><div className="mt-3 flex flex-wrap gap-1.5">{SUGGESTIONS.map(item => <button key={item} onClick={() => ask(item)} disabled={busy} className="rounded-full border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">{item}</button>)}</div></>}
          {message && answer && <div className="mb-3 rounded-2xl rounded-br-md bg-slate-100 px-3 py-2 text-xs text-slate-700">{message}</div>}
          {busy && <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Menganalisis masalah…</div>}
          {error && <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</div>}
          {answer && !busy && <div className="mt-3 rounded-xl bg-slate-50 p-3"><p className="whitespace-pre-line text-xs leading-relaxed text-slate-700">{answer.answer}</p>{answer.jobs?.length ? <div className="mt-3 space-y-2">{answer.jobs.map(job => <div key={job.id} className="rounded-lg border border-slate-200 bg-white p-2.5"><p className="text-xs font-bold text-slate-900">{job.title}</p><p className="mt-1 text-[11px] text-slate-500">{job.location} · Rp{Number(job.wage).toLocaleString('id-ID')} / {job.wage_type === 'hourly' ? 'jam' : 'hari'}</p></div>)}</div> : null}{answer.actions?.length ? <div className="mt-3 flex flex-wrap gap-2">{answer.actions.map(action => <a key={action.href} href={action.href} className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-slate-950 px-3 py-2 text-[11px] font-bold text-white">{action.label}<ArrowRight className="h-3 w-3" /></a>)}</div> : null}<button onClick={() => { setAnswer(null); setError(''); window.setTimeout(() => inputRef.current?.focus(), 0); }} className="mt-3 text-[11px] font-bold text-slate-500 underline underline-offset-2">Tanya masalah lain</button></div>}
        </div>
        <form onSubmit={e => { e.preventDefault(); void ask(); }} className="flex gap-2 border-t border-slate-100 p-2.5"><input ref={inputRef} value={message} onChange={e => setMessage(e.target.value)} maxLength={1200} disabled={busy} placeholder="Contoh: saya butuh kerja hari ini…" className="min-h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 text-xs outline-none focus:border-slate-400" aria-label="Masalah Anda" /><button disabled={busy || !message.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-950 text-white disabled:opacity-40" aria-label="Kirim"><Send className="h-3.5 w-3.5" /></button></form>
      </>}
    </div>}
  </>;
}
