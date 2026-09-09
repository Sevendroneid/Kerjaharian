import { useEffect, useRef, useState } from 'react';
import { Bot, Loader2, Mic, MicOff, Send, Volume2, VolumeX, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/supabase';

type SpeechRecognitionResultLike = { [index: number]: { [index: number]: { transcript: string } }; length: number };
interface SpeechRecognitionEventLike extends Event { results: SpeechRecognitionResultLike }
interface SpeechRecognitionLike { lang: string; interimResults: boolean; continuous: boolean; start: () => void; stop: () => void; abort: () => void; onresult: ((event: SpeechRecognitionEventLike) => void) | null; onerror: ((event: Event) => void) | null; onend: (() => void) | null }
interface WindowSpeech extends Window { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }
interface Props { role: 'admin' | null; profile: Profile | null }

const clean = (value: string) => value.replace(/\s+/g, ' ').trim();

/** Admin-only voice console: mic toggles recording; stopping only fills the editable input. */
export function AIVoiceAssistant({ role, profile }: Props) {
  const authorized = role === 'admin' && profile?.role === 'admin';
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [text, setText] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [voiceOn, setVoiceOn] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef('');
  const supported = typeof window !== 'undefined' && !!((window as WindowSpeech).SpeechRecognition || (window as WindowSpeech).webkitSpeechRecognition);

  useEffect(() => () => { recognitionRef.current?.abort(); window.speechSynthesis?.cancel(); }, []);

  const speak = (value: string) => {
    if (!voiceOn || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(value);
    utterance.lang = 'id-ID';
    utterance.rate = 0.98;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const startRecording = () => {
    if (!supported || busy) {
      if (!supported) setError('Browser ini belum menyediakan input suara. Gunakan Chrome/Edge atau ketik manual.');
      return;
    }
    setError('');
    transcriptRef.current = '';
    const W = window as WindowSpeech;
    const Recognition = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = 'id-ID';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i += 1) transcript += event.results[i]?.[0]?.transcript || '';
      transcriptRef.current = clean(transcript);
      setText(transcriptRef.current);
    };
    recognition.onerror = () => { setListening(false); setError('Input suara gagal. Pastikan izin mikrofon diberikan.'); };
    recognition.onend = () => { setListening(false); setText(clean(transcriptRef.current)); };
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  const toggleRecording = () => {
    if (busy) return;
    if (listening) recognitionRef.current?.stop();
    else startRecording();
  };

  const send = async () => {
    const prompt = clean(text);
    if (!prompt || busy || listening) return;
    setBusy(true); setError(''); setAnswer('');
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error('Sesi login tidak ditemukan. Silakan login sebagai admin.');
      if (profile?.role !== 'admin') throw new Error('Akses ditolak. Fitur ini hanya untuk Administrator KerjaHarian.');
      const response = await fetch('/api/ai-admin-voice', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ message: prompt }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'AI Admin tidak tersedia.');
      const result = String(data?.answer || 'AI belum memberikan jawaban.');
      setAnswer(result); setText(''); speak(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan.';
      setError(message); speak(message);
    } finally { setBusy(false); }
  };

  const close = () => { recognitionRef.current?.stop(); window.speechSynthesis?.cancel(); setListening(false); setSpeaking(false); setOpen(false); };
  if (!authorized) return null;

  return <>
    <button type="button" onClick={() => setOpen(true)} className="fixed bottom-20 right-4 z-[59] grid h-12 w-12 place-items-center rounded-full bg-slate-950 text-white shadow-xl ring-1 ring-slate-700 transition hover:scale-105 sm:bottom-20 sm:right-5" aria-label="Buka KerjaHarian Admin AI" title="KerjaHarian Admin AI"><Bot className="h-5 w-5" /></button>
    {open && <div className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
      <header className="flex items-center justify-between bg-slate-950 px-4 py-3 text-white">
        <div className="flex items-center gap-2"><Bot className="h-5 w-5" /><div><p className="text-sm font-extrabold">KerjaHarian Admin AI</p><p className="text-[10px] text-slate-300">Voice Operations Command Center</p></div></div>
        <div className="flex items-center gap-1"><button type="button" onClick={() => { setVoiceOn(v => !v); if (voiceOn) window.speechSynthesis?.cancel(); }} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/10" aria-label={voiceOn ? 'Matikan suara AI' : 'Nyalakan suara AI'}>{voiceOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}</button><button type="button" onClick={close} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/10" aria-label="Tutup"><X className="h-4 w-4" /></button></div>
      </header>
      <div className="space-y-3 p-4">
        <p className="text-xs text-slate-500">Tekan mikrofon sekali untuk mulai. Tekan lagi untuk Stop. Hasil rekaman masuk ke kolom dan tidak dikirim otomatis.</p>
        {answer && <div className="rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-700" aria-live="polite">{answer}</div>}
        {speaking && <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Volume2 className="h-4 w-4 animate-pulse" />AI sedang berbicara…</div>}
        {error && <div className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</div>}
        <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm focus-within:ring-2 focus-within:ring-slate-300">
          <textarea value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }} maxLength={4000} rows={2} disabled={busy} placeholder={listening ? 'Sedang merekam… tekan Stop jika selesai' : 'Tulis perintah admin atau tekan mikrofon'} className="min-h-11 min-w-0 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-400 disabled:opacity-60" />
          <button type="button" onClick={toggleRecording} disabled={busy} className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${listening ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-950 hover:bg-slate-800'}`} aria-label={listening ? 'Stop rekaman' : 'Mulai rekaman'} title={listening ? 'Stop rekaman' : 'Mulai rekaman'}>{listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}</button>
          <button type="button" onClick={() => void send()} disabled={busy || !text.trim() || listening} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-950 text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Kirim perintah ke AI" title="Kirim">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}</button>
        </div>
        {!supported && <p className="text-[11px] text-amber-700">Input suara tidak tersedia di browser ini. Kolom teks tetap dapat digunakan.</p>}
      </div>
    </div>}
  </>;
}
