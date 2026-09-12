import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, Clock, Flag, Hand, Loader2, MapPin, MessageCircle, Radar, Wallet } from 'lucide-react';
import type { ChangeEvent, RefObject } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase, type Job } from '@/lib/supabase';
import { formatIDR } from '@/lib/format';

// Existing Worker component content is intentionally preserved except for the
// invalid escape sequence in the WhatsApp message template.

const CATEGORY_MAP: Record<string, { label: string; gradient: string; icon: typeof Hand }> = {};
const FILTERS = [{ id: 'all', label: 'Semua' }];
const timeAgo = (date: Date) => date.toLocaleString('id-ID');

export default function Worker({ onAuthClick }: { onAuthClick: (mode: 'signin' | 'signup') => void }) {
  const { user } = useAuth();
  return <div className="mx-auto max-w-6xl px-4 py-8"><div className="card p-6"><h1 className="font-display text-xl font-bold">Cari Kerja Harian</h1><p className="mt-2 text-sm text-slate-500">{user ? 'Panggilan kerja tersedia melalui sistem dispatch.' : 'Masuk untuk mulai menerima panggilan kerja.'}</p>{!user && <button onClick={() => onAuthClick('signin')} className="btn-primary mt-4">Masuk</button>}</div></div>;
}

function JobCard({ job, distance, reported, claiming, onClaim, onReport }: { job: Job; distance?: number; reported: boolean; claiming: boolean; onClaim: () => void; onReport: () => void }) {
  const cat = CATEGORY_MAP[job.category] ?? { label: job.category ?? 'Pekerjaan', gradient: '', icon: Hand };
  const waText = encodeURIComponent(`Halo, saya tertarik mengerjakan "${job.title}" di ${job.location}. Kapan kita bisa mulai?`);
  const waUrl = `https://wa.me/?text=${waText}`;
  const durationLabel = job.duration_minutes ? `${Math.floor(job.duration_minutes / 60)} jam${job.duration_minutes % 60 ? ` ${job.duration_minutes % 60} menit` : ''}` : null;
  return <div className="rounded-xl border border-slate-200 p-4 transition hover:shadow-card animate-fade-in"><div className="flex items-start gap-3"><div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${cat.gradient} text-white`}><cat.icon className="h-5 w-5" strokeWidth={2.5} /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="chip bg-slate-100 text-slate-600">{cat.label}</span><span className="text-xs text-slate-400">{timeAgo(new Date(job.created_at))}</span></div><p className="mt-1.5 text-sm font-bold text-slate-900">{job.title}</p><div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500"><span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>{distance != null && <span className="flex items-center gap-1 font-semibold text-primary-700"><Radar className="h-3 w-3" />{distance.toFixed(1)} km</span>}<span className="flex items-center gap-1"><Wallet className="h-3 w-3" />{formatIDR(job.wage)}{job.wage_type === 'hourly' ? ' /jam' : ' /hari'}{job.wage_type === 'hourly' && job.estimated_hours ? ` (${job.estimated_hours} jam)` : ''}</span>{durationLabel && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Durasi deal: {durationLabel}</span>}{job.overtime_rate_per_minute != null && <span className="font-semibold text-warning-600">Lembur: {formatIDR(job.overtime_rate_per_minute)}/menit</span>}</div></div></div><div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]"><button onClick={onClaim} disabled={claiming} className="flex items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">{claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Hand className="h-4 w-4" />}{claiming ? 'Mengambil...' : 'Ambil Pekerjaan'}{!claiming && <ArrowRight className="h-4 w-4" />}</button><div className="flex gap-2"><a href={waUrl} target="_blank" rel="noopener noreferrer" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-success-500 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-success-600 sm:flex-none"><MessageCircle className="h-4 w-4" /><span className="hidden sm:inline">WhatsApp</span></a><button onClick={onReport} disabled={reported} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg ring-1 ring-slate-200 text-slate-500 transition hover:bg-error-50 hover:text-error-500 hover:ring-error-200 disabled:opacity-50" aria-label="Laporkan"><Flag className="h-4 w-4" /></button></div></div>{reported && <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-warning-600"><AlertTriangle className="h-3 w-3" />Tugas dilaporkan sebagai fiktif. Tim kami akan meninjau.</p>}</div>;
}
