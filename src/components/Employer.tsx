import { useState, useEffect, useCallback } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  MapPin,
  Wallet,
  ShieldCheck,
  Info,
  Trash2,
  Send,
  MessageCircle,
  Briefcase,
  Loader2,
  Lock,
  Clock,
} from 'lucide-react';
import { CATEGORIES, CATEGORY_MAP } from '@/lib/data';
import type { CategoryId, WageType } from '@/lib/types';
import {
  formatIDR,
  MIN_WAGE_DAILY,
  MIN_WAGE_HOURLY,
  calculateWage,
  timeAgo,
} from '@/lib/format';
import { calculateOrderPrice } from '@/utils/pricingEngine';
import { useAuth } from '@/lib/auth';
import { supabase, type Job, type JobType } from '@/lib/supabase';

interface EmployerProps {
  onAuthClick: (mode: 'signin' | 'signup') => void;
}

export function Employer({ onAuthClick }: EmployerProps) {
  const { user, loading: authLoading } = useAuth();
  const [category, setCategory] = useState<CategoryId>('logistik');
  const [jobTypeId, setJobTypeId] = useState<string | null>(null);
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [wage, setWage] = useState('');
  const [wageType, setWageType] = useState<WageType>('daily');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [nightShift, setNightShift] = useState(false); 
  const [needsTools, setNeedsTools] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const wageNum = Math.max(0, parseInt(wage.replace(/[^0-9]/g, ''), 10) || 0);
  const hoursNum = Math.max(0, parseInt(estimatedHours) || 0);
  const minWage = wageType === 'hourly' ? MIN_WAGE_HOURLY : MIN_WAGE_DAILY;
  const belowMin = wageNum > 0 && wageNum < minWage;
  const selectedCat = CATEGORY_MAP[category];

  const totalWage = calculateWage(wageNum, wageType, wageType === 'hourly' ? hoursNum : undefined);
  const fee = SERVICE_FEE_FLAT;
  const total = totalWage + fee;

  const fetchJobTypes = useCallback(async () => {
    const { data, error } = await supabase
      .from('job_types')
      .select('*')
      .eq('is_active', true)
      .eq('category', category)
      .order('sort_order', { ascending: true });
    if (!error && data) {
      setJobTypes(data as JobType[]);
      setJobTypeId(null);
    }
  }, [category]);

  const fetchJobs = useCallback(async () => {
    if (!user) return;
    setLoadingJobs(true);
    const { data, error } = await supabase
      .from('jobs')
      .select('*, job_type:job_types(name, description)')
      .eq('employer_id', user.id)
      .order('created_at', { ascending: false });
    if (!error && data) setJobs(data as Job[]);
    setLoadingJobs(false);
  }, [user]);

  useEffect(() => {
    fetchJobTypes();
  }, [fetchJobTypes]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!user) {
      onAuthClick('signup');
      return;
    }

    if (!title.trim()) return setError('Rincian pekerjaan wajib diisi.');
    if (!location.trim()) return setError('Lokasi pengerjaan wajib diisi.');
    if (wageNum < minWage)
      return setError(`Upah minimum ${wageType === 'hourly' ? 'per jam' : 'per hari'} adalah ${formatIDR(minWage)}.`);
    if (wageType === 'hourly' && hoursNum < 1)
      return setError('Perkiraan durasi jam wajib diisi untuk upah per jam.');

    setSubmitting(true);
    const { data, error } = await supabase
      .from('jobs')
      .insert({
        employer_id: user.id,
        category,
        job_type_id: jobTypeId,
        title: title.trim(),
        location: location.trim(),
        wage: totalWage,
        wage_type: wageType,
        estimated_hours: wageType === 'hourly' ? hoursNum : null,
        fee,
        fee_breakdown: { insurance: FEE_INSURANCE, tax: FEE_TAX, platform: FEE_PLATFORM },
        total,
        status: 'open',
      })
      .select('*, job_type:job_types(name, description)')
      .single();

    if (error) {
      setError(error.message);
      setSubmitting(false);
      return;
    }

    if (data) setJobs((prev) => [data as Job, ...prev]);
    setTitle('');
    setWage('');
    setEstimatedHours('');
    setSuccess(true);
    setSubmitting(false);
    setTimeout(() => setSuccess(false), 4000);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('jobs').delete().eq('id', id);
    if (!error) setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  return (
    <div className="bg-slate-50 pb-20 pt-8">
      <div className="container-app">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
            <Briefcase className="h-3.5 w-3.5" />
            Pemberi Kerja
          </div>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Pesan Tenaga Kerja Terampil
          </h1>
          <p className="mt-2 max-w-xl text-slate-500">
            Isi rincian pekerjaan dan lokasi proyek Anda. Pekerja terdekat akan menerima
            panggilan dan menghubungi Anda langsung.
          </p>
        </div>

        {!authLoading && !user && (
          <div className="mb-6 flex items-center gap-3 rounded-xl bg-primary-50 px-5 py-4 ring-1 ring-primary-200">
            <Lock className="h-5 w-5 shrink-0 text-primary-600" />
            <p className="text-sm text-primary-800">
              <button onClick={() => onAuthClick('signin')} className="font-bold underline underline-offset-2">
                Masuk
              </button>{' '}
              atau{' '}
              <button onClick={() => onAuthClick('signup')} className="font-bold underline underline-offset-2">
                daftar
              </button>{' '}
              untuk menyimpan dan mengelola pekerjaan Anda.
            </p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <form onSubmit={handleSubmit} className="card p-6 sm:p-8">
              <h2 className="font-display text-lg font-bold text-slate-900">
                1. Pilih Kategori Layanan
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {CATEGORIES.map((cat) => {
                  const active = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                        active
                          ? 'border-primary-500 bg-primary-50/50 ring-1 ring-primary-200'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${cat.gradient} text-white`}>
                        <cat.icon className="h-5 w-5" strokeWidth={2.5} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900">{cat.label}</p>
                        <p className="truncate text-xs text-slate-500">{cat.examples[0]}</p>
                      </div>
                      {active && <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-primary-600" />}
                    </button>
                  );
                })}
              </div>

              {/* Job type from database */}
              {jobTypes.length > 0 && (
                <div className="mt-4">
                  <label className="label">Jenis Pekerjaan Spesifik</label>
                  <div className="flex flex-wrap gap-2">
                    {jobTypes.map((jt) => (
                      <button
                        key={jt.id}
                        type="button"
                        onClick={() => setJobTypeId(jt.id === jobTypeId ? null : jt.id)}
                        className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                          jobTypeId === jt.id
                            ? 'bg-primary-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {jt.name}
                      </button>
                    ))}
                  </div>
                  {jobTypeId && (
                    <p className="mt-1.5 text-xs text-slate-500">
                      {jobTypes.find((jt) => jt.id === jobTypeId)?.description}
                    </p>
                  )}
                </div>
              )}

              <h2 className="mt-8 font-display text-lg font-bold text-slate-900">
                2. Rincian Pekerjaan
              </h2>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="label">Detail Pekerjaan</label>
                  <textarea
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    rows={3}
                    placeholder={selectedCat.examples[0]}
                    className="input resize-none"
                  />
                </div>
                <div>
                  <label className="label">Lokasi Pengerjaan / Alamat Proyek</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Contoh: Jl. Mangga Dua, Jakarta Pusat"
                      className="input pl-11"
                    />
                  </div>
                </div>

                {/* Wage type toggle */}
                <div>
                  <label className="label">Sistem Upah</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setWageType('daily')}
                      className={`flex-1 rounded-lg border-2 px-4 py-2.5 text-sm font-semibold transition ${
                        wageType === 'daily'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <Clock className="mr-1.5 inline h-4 w-4" />
                      Per Hari
                    </button>
                    <button
                      type="button"
                      onClick={() => setWageType('hourly')}
                      className={`flex-1 rounded-lg border-2 px-4 py-2.5 text-sm font-semibold transition ${
                        wageType === 'hourly'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <Clock className="mr-1.5 inline h-4 w-4" />
                      Per Jam
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">
                      Upah {wageType === 'hourly' ? 'per Jam' : 'per Hari'}{' '}
                      <span className="font-normal text-slate-400">
                        (min {formatIDR(minWage)})
                      </span>
                    </label>
                    <div className="relative">
                      <Wallet className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input
                        value={wage ? formatIDR(wageNum).replace('Rp ', '') : ''}
                        onChange={(e) => setWage(e.target.value.replace(/[^0-9]/g, ''))}
                        inputMode="numeric"
                        placeholder={wageType === 'hourly' ? '12000' : '75000'}
                        className={`input pl-11 ${belowMin ? 'ring-error-400 focus:ring-error-500' : ''}`}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                        /{wageType === 'hourly' ? 'jam' : 'hari'}
                      </span>
                    </div>
                    {belowMin && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-error-600">
                        <Info className="h-3.5 w-3.5" />
                        Upah di bawah minimum ({formatIDR(minWage)}).
                      </p>
                    )}
                  </div>
                  {wageType === 'hourly' && (
                    <div>
                      <label className="label">Perkiraan Durasi (jam)</label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input
                          value={estimatedHours}
                          onChange={(e) => setEstimatedHours(e.target.value.replace(/[^0-9]/g, ''))}
                          inputMode="numeric"
                          placeholder="4"
                          className="input pl-11"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                          jam
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <h2 className="mt-8 font-display text-lg font-bold text-slate-900">
                3. Kalkulasi Transparan
              </h2>
              <div className="mt-4 rounded-xl bg-slate-50 p-5 ring-1 ring-slate-200">
                {wageType === 'hourly' && hoursNum > 0 && (
                  <SummaryRow
                    label={`Upah ${formatIDR(wageNum)} x ${hoursNum} jam`}
                    value={formatIDR(totalWage)}
                  />
                )}
                {wageType === 'daily' && (
                  <SummaryRow label="Upah bersih pekerja" value={formatIDR(totalWage)} />
                )}
                <SummaryRow label="Biaya layanan (transparan, incl. asuransi & pajak)" value={formatIDR(fee)} muted />
                <div className="ml-4 mt-1 space-y-0.5">
                  <SummaryRow label="  Asuransi pekerja" value={formatIDR(FEE_INSURANCE)} muted small />
                  <SummaryRow label="  Pajak" value={formatIDR(FEE_TAX)} muted small />
                  <SummaryRow label="  Biaya platform" value={formatIDR(FEE_PLATFORM)} muted small />
                </div>
                <div className="my-3 border-t border-dashed border-slate-300" />
                <div className="flex items-center justify-between">
                  <span className="font-display text-base font-bold text-slate-900">Total Pembayaran</span>
                  <span className="font-display text-xl font-extrabold text-primary-700">{formatIDR(total)}</span>
                </div>
              </div>

              {error && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-error-50 px-4 py-3 text-sm font-semibold text-error-700 ring-1 ring-error-200">
                  <Info className="h-4 w-4" />
                  {error}
                </div>
              )}
              {success && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-success-50 px-4 py-3 text-sm font-semibold text-success-700 ring-1 ring-success-200 animate-fade-in">
                  <CheckCircle2 className="h-4 w-4" />
                  Pekerjaan dipublikasikan! Pekerja terdekat akan menerima panggilan.
                </div>
              )}

              <button type="submit" disabled={submitting} className="btn-primary mt-5 w-full">
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Publikasikan & Cari Pekerja
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2">
            <div className="card p-6">
              <h3 className="font-display text-base font-bold text-slate-900">Pekerjaan Aktif Anda</h3>
              <p className="mt-1 text-sm text-slate-500">{jobs.length} pekerjaan dipublikasikan</p>

              {!user ? (
                <div className="mt-6 rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
                  <Briefcase className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-sm text-slate-400">Masuk untuk melihat dan mengelola pekerjaan Anda.</p>
                </div>
              ) : loadingJobs ? (
                <div className="mt-6 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : jobs.length === 0 ? (
                <div className="mt-6 rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
                  <Briefcase className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-sm text-slate-400">Belum ada pekerjaan. Isi formulir untuk mulai.</p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {jobs.map((job) => (
                    <JobCard key={job.id} job={job} onDelete={handleDelete} />
                  ))}
                </div>
              )}
            </div>

            <div className="card mt-4 p-6">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-success-500" />
                <h3 className="font-display text-sm font-bold text-slate-900">Jaminan Aman</h3>
              </div>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success-500" />
                  Mitra pekerja tervalidasi KTP + foto
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success-500" />
                  Upah minimum wajar dilindungi sistem
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success-500" />
                  Biaya layanan flat Rp 15.000 (incl. asuransi & pajak)
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  muted = false,
  small = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
  small?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={`${small ? 'text-xs' : 'text-sm'} ${muted ? 'text-slate-500' : 'text-slate-700'}`}>
        {label}
      </span>
      <span className={`${small ? 'text-xs' : 'text-sm'} font-semibold ${muted ? 'text-slate-500' : 'text-slate-900'}`}>
        {value}
      </span>
    </div>
  );
}

function JobCard({ job, onDelete }: { job: Job; onDelete: (id: string) => void }) {
  const cat = CATEGORY_MAP[job.category];
  const waText = encodeURIComponent(
    `Halo, saya tertarik dengan pekerjaan "${job.title}" di ${job.location}. Apakah masih tersedia?`,
  );
  const waUrl = `https://wa.me/?text=${waText}`;
  const wageLabel = job.wage_type === 'hourly' && job.estimated_hours
    ? `${formatIDR(job.wage)} (${job.estimated_hours} jam)`
    : `${formatIDR(job.wage)}`;

  return (
    <div className="rounded-xl border border-slate-200 p-4 transition hover:shadow-soft animate-fade-in">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${cat.gradient} text-white`}>
            <cat.icon className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500">{cat.label}</span>
            {job.job_type?.name && (
              <p className="text-xs font-bold text-primary-600">{job.job_type.name}</p>
            )}
          </div>
        </div>
        <button onClick={() => onDelete(job.id)} className="text-slate-300 transition hover:text-error-500" aria-label="Hapus">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-2 text-sm font-bold text-slate-900">{job.title}</p>
      <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
        <MapPin className="h-3 w-3" />
        {job.location}
      </p>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm font-bold text-success-600">{wageLabel}</span>
        <span className="text-xs text-slate-400">{timeAgo(new Date(job.created_at))}</span>
      </div>
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-success-50 px-3 py-2 text-xs font-semibold text-success-700 transition hover:bg-success-100"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        Koordinasi via WhatsApp
        <ArrowRight className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
