import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  MapPin,
  ShieldCheck,
  Clock,
  Wallet,
  Star,
  Quote,
  CheckCircle2,
  Search,
  Zap,
} from 'lucide-react';
import { CATEGORIES, STATS, STEPS, TESTIMONIALS, SAMPLE_WORKERS } from '@/lib/data';
import type { View } from '@/lib/types';
import { useCountUp } from '@/lib/useCountUp';
import { Stars } from './Stars';
import { formatDistance } from '@/lib/format';

interface LandingProps {
  onNavigate: (view: View) => void;
  onAuthClick?: (mode: 'signin' | 'signup') => void;
}

export function Landing({ onNavigate, onAuthClick }: LandingProps) {
  return (
    <div className="overflow-hidden">
      <Hero onNavigate={onNavigate} onAuthClick={onAuthClick} />
      <StatsBar />
      <Categories onNavigate={onNavigate} />
      <HowItWorks />
      <WhyUs />
      <WorkersPreview onNavigate={onNavigate} />
      <Testimonials />
      <CTA onNavigate={onNavigate} onAuthClick={onAuthClick} />
    </div>
  );
}

function Hero({ onNavigate, onAuthClick }: LandingProps) {
  const [location, setLocation] = useState('Jakarta Selatan');
  const [query, setQuery] = useState('');

  return (
    <section className="relative isolate">
      {/* Background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary-50 via-white to-white" />
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-primary-200/40 blur-3xl" />
        <div className="absolute -right-24 top-32 h-80 w-80 rounded-full bg-accent-200/30 blur-3xl" />
      </div>

      <div className="container-app pt-12 pb-16 sm:pt-16 sm:pb-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left: Copy */}
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-primary-700 shadow-soft ring-1 ring-primary-100">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-success-400" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success-500" />
              </span>
              12.000+ mitra aktif di 34 kota
            </div>

            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Solusi Cepat{' '}
              <span className="relative whitespace-nowrap">
                <span className="relative z-10 bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                  Tenaga Kerja
                </span>
              </span>{' '}
              Terampil Terdekat
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              Pesan tenaga kerja harian terampil — tukang, jasa kebersihan, logistik, dan tenaga
              serabutan — yang siap mengerjakan proyek Anda di lokasi terdekat, hari ini juga.
            </p>

            {/* Search bar */}
            <div className="mt-7 max-w-lg">
              <div className="card flex flex-col gap-2 p-2 sm:flex-row sm:items-center">
                <div className="flex flex-1 items-center gap-2 px-2">
                  <Search className="h-5 w-5 shrink-0 text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Cari layanan: pasang keramik, cleaning..."
                    className="w-full bg-transparent py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
                <div className="hidden h-8 w-px bg-slate-200 sm:block" />
                <div className="flex items-center gap-2 px-2">
                  <MapPin className="h-5 w-5 shrink-0 text-primary-500" />
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Lokasi"
                    className="w-full bg-transparent py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none sm:w-32"
                  />
                </div>
                <button
                  onClick={() => onAuthClick?.('signup')}
                  className="btn-primary w-full sm:w-auto"
                >
                  Cari Pekerja
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-success-500" />
                Mitra tervalidasi KTP
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-primary-500" />
                Rata-rata &lt; 5 menit
              </span>
              <span className="flex items-center gap-1.5">
                <Wallet className="h-4 w-4 text-accent-500" />
                Upah transparan
              </span>
            </div>
          </div>

          {/* Right: Visual */}
          <HeroVisual onNavigate={onNavigate} />
        </div>
      </div>
    </section>
  );
}

function HeroVisual({ onNavigate }: LandingProps) {
  return (
    <div className="relative animate-fade-up [animation-delay:120ms]">
      <div className="relative mx-auto max-w-md">
        {/* Radar card */}
        <div className="card relative overflow-hidden p-6 shadow-pop">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Radar Kerja Real-Time
              </p>
              <p className="mt-1 font-display text-lg font-bold text-slate-900">
                Pekerja Terdekat
              </p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-success-50 px-2.5 py-1 text-xs font-semibold text-success-700">
              <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
              Online
            </div>
          </div>

          {/* Radar */}
          <div className="relative mx-auto mt-4 h-48 w-48">
            <div className="absolute inset-0 rounded-full bg-primary-50" />
            <div className="absolute inset-[15%] rounded-full bg-primary-100/70" />
            <div className="absolute inset-[32%] rounded-full bg-primary-200/60" />
            <div className="absolute inset-[48%] rounded-full bg-primary-300/50" />
            {/* sweep */}
            <div className="absolute inset-0 animate-radar-sweep rounded-full">
              <div className="absolute left-1/2 top-1/2 h-1/2 w-1/2 origin-left bg-gradient-to-r from-primary-400/40 to-transparent" />
            </div>
            {/* center */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="relative">
                <span className="absolute inset-0 animate-pulse-ring rounded-full bg-primary-500" />
                <span className="relative block h-3 w-3 rounded-full bg-primary-600 ring-4 ring-white" />
              </div>
            </div>
            {/* dots */}
            {[
              { top: '22%', left: '60%', d: 0 },
              { top: '65%', left: '30%', d: 0.6 },
              { top: '40%', left: '78%', d: 1.2 },
              { top: '72%', left: '68%', d: 1.8 },
            ].map((dot, i) => (
              <span
                key={i}
                style={{ top: dot.top, left: dot.left, animationDelay: `${dot.d}s` }}
                className="absolute h-2.5 w-2.5 animate-pulse-ring rounded-full bg-accent-500"
              />
            ))}
          </div>

          {/* Incoming order */}
          <div className="mt-4 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <span className="chip bg-accent-100 text-accent-700">Panggilan Masuk</span>
              <span className="text-xs font-semibold text-slate-500">2.1 km</span>
            </div>
            <p className="mt-2 text-sm font-bold text-slate-900">Pasang keramik lantai 40m²</p>
            <p className="text-xs text-slate-500">Bpk. Suryanto • Bekasi</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm font-bold text-success-600">Rp 320.000</span>
              <button
                onClick={() => onNavigate('worker')}
                className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-700"
              >
                Lihat Detail
              </button>
            </div>
          </div>
        </div>

        {/* Floating cards */}
        <div className="absolute -left-4 top-20 hidden animate-fade-up rounded-xl bg-white p-3 shadow-pop ring-1 ring-slate-200 sm:flex [animation-delay:300ms]">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-success-100 text-success-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Tervalidasi KTP</p>
              <p className="text-[10px] text-slate-500">Identitas terverifikasi</p>
            </div>
          </div>
        </div>

        <div className="absolute -right-4 bottom-16 hidden animate-fade-up rounded-xl bg-white p-3 shadow-pop ring-1 ring-slate-200 sm:flex [animation-delay:400ms]">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent-100 text-accent-600">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Pesanan Kilat</p>
              <p className="text-[10px] text-slate-500">Tersambung &lt; 5 menit</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsBar() {
  return (
    <section className="border-y border-slate-200 bg-white">
      <div className="container-app py-8">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {STATS.map((s, i) => (
            <StatItem key={i} value={s.value} label={s.label} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const numeric = parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
  const count = useCountUp(numeric, 1400, visible);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => e.isIntersecting && setVisible(true),
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const display = value.includes('>')
    ? value
    : value.replace(/[0-9.]+/, visible ? count.toFixed(value.includes('.') ? 1 : 0) : '0');

  return (
    <div ref={ref} className="text-center">
      <p className="font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">
        {display}
      </p>
      <p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">{label}</p>
    </div>
  );
}

function Categories({ onNavigate }: LandingProps) {
  return (
    <section className="py-16 sm:py-24">
      <div className="container-app">
        <SectionHeading
          eyebrow="Kategori Layanan"
          title="Pilih layanan sesuai kebutuhan Anda"
          subtitle="Empat kategori utama yang mencakup kebutuhan harian rumah, kantor, dan proyek."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((cat, i) => (
            <button
              key={cat.id}
              onClick={() => onNavigate('employer')}
              style={{ animationDelay: `${i * 80}ms` }}
              className="card group relative overflow-hidden p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-pop animate-fade-up"
            >
              <div
                className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${cat.gradient} text-white shadow-soft`}
              >
                <cat.icon className="h-6 w-6" strokeWidth={2.5} />
              </div>
              <h3 className="mt-4 font-display text-base font-bold text-slate-900">
                {cat.label}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                {cat.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {cat.examples.slice(0, 2).map((ex) => (
                  <span key={ex} className="chip bg-slate-100 text-slate-600">
                    {ex}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-primary-600 opacity-0 transition-opacity group-hover:opacity-100">
                Pesan sekarang
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="bg-slate-50 py-16 sm:py-24">
      <div className="container-app">
        <SectionHeading
          eyebrow="Cara Kerja"
          title="Empat langkah, pekerja datang"
          subtitle="Dari memilih kategori hingga koordinasi lapangan — semuanya cepat dan transparan."
        />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <div
              key={i}
              style={{ animationDelay: `${i * 100}ms` }}
              className="relative animate-fade-up"
            >
              <div className="card h-full p-6">
                <div className="flex items-center gap-3">
                  <span className="font-display text-3xl font-extrabold text-primary-200">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
                <h3 className="mt-4 font-display text-base font-bold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                  {step.description}
                </p>
              </div>
              {i < STEPS.length - 1 && (
                <ArrowRight className="absolute -right-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 text-slate-300 lg:block" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyUs() {
  const features = [
    {
      icon: ShieldCheck,
      title: 'Mitra Tervalidasi KTP',
      desc: 'Setiap mitra pekerja wajib melalui verifikasi identitas (KYC) sebelum bisa menerima pesanan.',
      color: 'text-success-600 bg-success-50',
    },
    {
      icon: Wallet,
      title: 'Upah Transparan',
      desc: 'Biaya layanan flat Rp 15.000 (termasuk asuransi & pajak). Kalkulasi upah dan total ditampilkan terbuka.',
      color: 'text-accent-600 bg-accent-50',
    },
    {
      icon: Clock,
      title: 'Kilat & Real-Time',
      desc: 'Radar kerja menampilkan pekerja terdekat yang online, siap mengerjakan hari ini.',
      color: 'text-primary-600 bg-primary-50',
    },
    {
      icon: MapPin,
      title: 'Jangkauan Nasional',
      desc: 'Layanan tersedia di 34 kota di seluruh Indonesia, dengan pencarian berbasis GPS.',
      color: 'text-slate-700 bg-slate-100',
    },
  ];

  return (
    <section className="py-16 sm:py-24">
      <div className="container-app">
        <SectionHeading
          eyebrow="Mengapa KerjaHarian"
          title="Platform yang menghormati profesi"
          subtitle="Kami menjaga martabat tenaga kerja terampil dengan standar upah minimum wajar dan verifikasi keamanan."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <div
              key={i}
              style={{ animationDelay: `${i * 80}ms` }}
              className="card p-6 animate-fade-up"
            >
              <div className={`grid h-12 w-12 place-items-center rounded-xl ${f.color}`}>
                <f.icon className="h-6 w-6" strokeWidth={2.5} />
              </div>
              <h3 className="mt-4 font-display text-base font-bold text-slate-900">
                {f.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WorkersPreview({ onNavigate }: LandingProps) {
  return (
    <section className="bg-primary-950 py-16 sm:py-24">
      <div className="container-app">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary-300">
              Mitra Pekerja Terdekat
            </p>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Pekerja terampil, siap mengerjakan
            </h2>
          </div>
          <button
            onClick={() => onNavigate('worker')}
            className="btn bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20"
          >
            Lihat Radar Kerja
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SAMPLE_WORKERS.slice(0, 6).map((w, i) => (
            <div
              key={w.id}
              style={{ animationDelay: `${i * 70}ms` }}
              className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 backdrop-blur transition hover:bg-white/10 animate-fade-up"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-bold text-white">
                  {w.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-bold text-white">{w.name}</p>
                    {w.verified && <ShieldCheck className="h-4 w-4 shrink-0 text-success-400" />}
                  </div>
                  <p className="text-xs text-slate-400">{formatDistance(w.distanceMeters)} dari Anda</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <Stars value={w.rating} />
                <span className="text-xs font-semibold text-slate-300">
                  {w.jobsDone} pekerjaan selesai
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="py-16 sm:py-24">
      <div className="container-app">
        <SectionHeading
          eyebrow="Kata Mereka"
          title="Dipercaya pemberi kerja dan mitra"
          subtitle="Ribuan pekerjaan harian telah dikerjakan dengan aman dan transparan."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={i}
              style={{ animationDelay: `${i * 100}ms` }}
              className="card relative p-6 animate-fade-up"
            >
              <Quote className="absolute right-5 top-5 h-8 w-8 text-slate-100" />
              <Stars value={t.rating} size={16} />
              <p className="mt-3 text-sm leading-relaxed text-slate-700">"{t.quote}"</p>
              <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA({ onNavigate, onAuthClick }: LandingProps) {
  return (
    <section className="py-16 sm:py-24">
      <div className="container-app">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-700 to-primary-950 px-6 py-14 text-center shadow-pop sm:px-12 sm:py-20">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute -left-10 top-0 h-40 w-40 rounded-full bg-accent-400 blur-3xl" />
            <div className="absolute -right-10 bottom-0 h-48 w-48 rounded-full bg-primary-300 blur-3xl" />
          </div>
          <div className="relative">
            <Star className="mx-auto h-10 w-10 fill-accent-400 text-accent-400" />
            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Siap mengerjakan proyek Anda hari ini?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-primary-100">
              Pesan tenaga kerja terampil terdekat dalam hitungan menit. Atau bergabung sebagai
              mitra pekerja dan mulai terima panggilan kerja.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                onClick={() => onAuthClick?.('signup')}
                className="btn-accent w-full sm:w-auto"
              >
                Pesan Tenaga Kerja
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => onAuthClick?.('signup')}
                className="btn bg-white/10 text-white ring-1 ring-white/30 hover:bg-white/20 w-full sm:w-auto"
              >
                Jadi Mitra Pekerja
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-bold uppercase tracking-wider text-primary-600">{eyebrow}</p>
      <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
        {title}
      </h2>
      <p className="mt-3 text-base leading-relaxed text-slate-500">{subtitle}</p>
    </div>
  );
}
