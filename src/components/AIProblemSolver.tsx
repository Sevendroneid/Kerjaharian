import { useRef, useState } from 'react';
import { ArrowRight, Bot, Loader2, Send, Sparkles, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import type { Job } from '@/lib/supabase';

interface SolverResponse { answer: string; jobs?: Pick<Job, 'id' | 'title' | 'category' | 'location' | 'wage' | 'wage_type'>[]; actions?: { label: string; href: string }[]; provider?: string; grounded?: boolean; }

const SUGGESTIONS = ['Saya butuh kerja hari ini', 'Kenapa saya belum dapat panggilan?', 'Kenapa lowongan saya belum diambil?'];

export function AIProblemSolver() {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
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
      const token = user ? (await import('@/lib/supabase').then(({ supabase }) => supabase.auth.getSession())).data.session?.access_token : null;
      const response = await fetch('/api/ai-problem-solver', { method: 'POST', signal: controller.signal, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ message: prompt, role: profile?.role, isOnline: profile?.is_online }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Problem Solver sedang tidak tersedia.');
      setAnswer(data); setMessage('');
    } catch (cause) {
      setError(cause instanceof DOMException && cause.name === 'AbortError' ? 'Permintaan terlalu lama. Coba lagi.' : cause instanceof Error ? cause.message : 'Tidak dapat menghubungi Problem Solver.');
    } finally { window.clearTimeout(timeout); setBusy(false); }
  };

  const openSolver = () => { setOpen(true); window.setTimeout(() => inputRef.current?.focus(), 0); };

  return <>
    <button onClick={openSolver} className="fixed bottom-5 right-5 z-40 flex min-h-12 items-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-xl ring-1 ring-white/20 transition hover:-translate-y-0.5" aria-label="Buka KerjaHarian AI Problem Solver"><Sparkles className="h-4 w-4" />Tanya AI</button>
    {open && <div className="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200" role="dialog" aria-modal="true" aria-label="KerjaHarian AI Problem Solver">
      <div className="flex items-center justify-between bg-slate-950 px-4 py-3 text-white"><div className="flex items-center gap-2"><div className="grid h-9 w-9 place-items-center rounded-xl bg-white/10"><Bot className="h-5 w-5" /></div><div><p className="text-sm font-extrabold">KerjaHarian AI</p><p className="text-[11px] text-slate-300">Problem Solver berbasis data KerjaHarian</p></div></div><button onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-lg hover:bg-white/10" aria-label="Tutup AI"><X className="h-5 w-5" /></button></div>
      <div className="max-h-[55vh] overflow-y-auto p-4">
        {!answer && <><p className="text-sm leading-relaxed text-slate-600">Ceritakan masalah Anda dengan bahasa sehari-hari. Saya akan mencari konteks yang tersedia dan memberi langkah yang bisa dilakukan.</p><div className="mt-4 flex flex-wrap gap-2">{SUGGESTIONS.map(item => <button key={item} onClick={() => ask(item)} disabled={busy} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">{item}</button>)}</div></>}
        {message && answer && <div className="mb-3 rounded-2xl rounded-br-md bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</div>}
        {busy && <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Menganalisis masalah…</div>}
        {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
        {answer && !busy && <div className="mt-4 rounded-2xl bg-slate-50 p-4"><p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{answer.answer}</p>{answer.jobs?.length ? <div className="mt-3 space-y-2">{answer.jobs.map(job => <div key={job.id} className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-sm font-bold text-slate-900">{job.title}</p><p className="mt-1 text-xs text-slate-500">{job.location} · Rp{Number(job.wage).toLocaleString('id-ID')} / {job.wage_type === 'hourly' ? 'jam' : 'hari'}</p></div>)}</div> : null}{answer.actions?.length ? <div className="mt-4 flex flex-wrap gap-2">{answer.actions.map(action => <a key={action.href} href={action.href} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white">{action.label}<ArrowRight className="h-3.5 w-3.5" /></a>)}</div> : null}<button onClick={() => { setAnswer(null); setError(''); window.setTimeout(() => inputRef.current?.focus(), 0); }} className="mt-4 text-xs font-bold text-slate-500 underline underline-offset-2">Tanya masalah lain</button></div>}
      </div>
      <form onSubmit={e => { e.preventDefault(); void ask(); }} className="flex gap-2 border-t border-slate-100 p-3"><input ref={inputRef} value={message} onChange={e => setMessage(e.target.value)} maxLength={1200} disabled={busy} placeholder="Contoh: saya butuh kerja hari ini…" className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400" aria-label="Masalah Anda" /><button disabled={busy || !message.trim()} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-950 text-white disabled:opacity-40" aria-label="Kirim"><Send className="h-4 w-4" /></button></form>
    </div>}
  </>;
}
