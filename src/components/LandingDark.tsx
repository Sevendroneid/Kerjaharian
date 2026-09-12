import { useState } from 'react';
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  Clock3,
  Leaf,
  Menu,
  Package,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  UserRound,
  X,
  Wrench,
} from 'lucide-react';
import { Logo } from './Logo';
import type { View } from '@/lib/types';

interface LandingDarkProps { onNavigate: (view: View) => void; lang: 'id' | 'en'; }

type Service = { title: string; icon: typeof Package };

const services: Service[] = [
  { title: 'Logistik', icon: Truck },
  { title: 'Kebersihan', icon: Sparkles },
  { title: 'Tukang', icon: Wrench },
  { title: 'Serabutan', icon: BriefcaseBusiness },
  { title: 'Pindahan', icon: Package },
  { title: 'Kebun', icon: Leaf },
  { title: 'Event', icon: Clock3 },
  { title: 'Lainnya', icon: ChevronRight },
];

const fieldImages = [
  'https://images.unsplash.com/photo-1747673902815-cb0a04ef2cf3?auto=format&fit=crop&w=1400&q=82',
  'https://images.pexels.com/photos/13699204/pexels-photo-13699204.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'https://images.pexels.com/photos/4281613/pexels-photo-4281613.jpeg?auto=compress&cs=tinysrgb&w=1400',
];

export function LandingDark({ onNavigate, lang }: LandingDarkProps) {
  const id = lang === 'id';
  const [menuOpen, setMenuOpen] = useState(false);
  const go = (view: View) => { setMenuOpen(false); onNavigate(view); };

  return (
    <main className="min-h-screen bg-[#FFF8F0] text-[#171717]">
      <header className="relative z-[80] border-b border-black/[0.07] bg-[#FFF8F0]">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="KerjaHarian" className="shrink-0">
            <Logo className="origin-left scale-90" />
          </button>
          <nav className="hidden items-center gap-7 lg:flex">
            <button type="button" onClick={() => go('worker')} className="text-sm font-semibold text-black/65 transition hover:text-black">{id ? 'Cari kerja' : 'Find work'}</button>
            <button type="button" onClick={() => go('employer')} className="text-sm font-semibold text-black/65 transition hover:text-black">{id ? 'Butuh pekerja' : 'Need workers'}</button>
            <button type="button" onClick={() => go('help')} className="text-sm font-semibold text-black/65 transition hover:text-black">{id ? 'Bantuan' : 'Help'}</button>
          </nav>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => go('worker')} className="hidden rounded-full px-4 py-2.5 text-sm font-bold text-black/70 hover:bg-black/5 sm:block">{id ? 'Cari kerja' : 'Find work'}</button>
            <button type="button" onClick={() => go('employer')} className="rounded-full bg-[#F97316] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#EA580C]">{id ? 'Pesan pekerja' : 'Book a worker'}</button>
            <button type="button" onClick={() => setMenuOpen(v => !v)} aria-label="Menu" className="grid h-10 w-10 place-items-center rounded-full text-black/70 hover:bg-black/5 lg:hidden">
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="border-t border-black/[0.07] bg-[#FFF8F0] px-5 py-3 lg:hidden">
            <div className="mx-auto flex max-w-7xl flex-col">
              <button type="button" onClick={() => go('worker')} className="border-b border-black/[0.06] py-3 text-left text-sm font-semibold">{id ? 'Cari kerja' : 'Find work'}</button>
              <button type="button" onClick={() => go('employer')} className="border-b border-black/[0.06] py-3 text-left text-sm font-semibold">{id ? 'Butuh pekerja' : 'Need workers'}</button>
              <button type="button" onClick={() => go('help')} className="py-3 text-left text-sm font-semibold">{id ? 'Bantuan' : 'Help'}</button>
            </div>
          </nav>
        )}
      </header>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        {/* 1. Hero */}
        <section className="relative overflow-hidden border-b border-black/[0.07] py-16 sm:py-24 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr] lg:gap-20">
            <div className="max-w-3xl">
              <p className="text-sm font-bold tracking-wide text-[#F97316]">KerjaHarian</p>
              <h1 className="mt-5 text-[48px] font-extrabold leading-[.98] tracking-[-0.055em] sm:text-[68px] lg:text-[82px]">
                {id ? <>Kerja hari ini.<br /><span className="text-[#F97316]">Lebih dekat.</span></> : <>Work today.<br /><span className="text-[#F97316]">Closer to you.</span></>}
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-black/60 sm:text-lg sm:leading-8">
                {id ? 'Temukan pekerjaan harian atau pekerja yang kamu butuhkan, dengan cara yang sederhana.' : 'Find daily work or the worker you need, simply.'}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button type="button" onClick={() => go('worker')} className="inline-flex items-center gap-2 rounded-full bg-[#F97316] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#EA580C]">
                  {id ? 'Saya cari kerja' : 'Find work'} <ArrowRight className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => go('employer')} className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white/60 px-6 py-3.5 text-sm font-bold text-black transition hover:bg-white">
                  {id ? 'Saya butuh pekerja' : 'I need a worker'} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="relative min-h-[300px] overflow-hidden rounded-[32px] bg-[#171717] sm:min-h-[400px] lg:min-h-[470px]">
              <img src={fieldImages[0]} alt="Pekerjaan lapangan" className="absolute inset-0 h-full w-full object-cover opacity-85" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">{id ? 'Pekerjaan nyata' : 'Real work'}</p>
                <p className="mt-2 max-w-sm text-2xl font-bold leading-tight text-white sm:text-3xl">{id ? 'Tenaga kerja harian, saat kamu membutuhkannya.' : 'Daily workers, when you need them.'}</p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Service discovery */}
        <section className="border-b border-black/[0.07] py-14 sm:py-20">
          <div className="flex items-end justify-between gap-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F97316]">{id ? 'Layanan' : 'Services'}</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">{id ? 'Pilih yang kamu butuhkan.' : 'Choose what you need.'}</h2>
            </div>
            <button type="button" onClick={() => go('employer')} className="hidden items-center gap-1 text-sm font-bold text-[#F97316] sm:flex">{id ? 'Lihat semua' : 'See all'} <ArrowRight className="h-4 w-4" /></button>
          </div>
          <div className="mt-9 grid grid-cols-4 gap-x-2 gap-y-8 sm:grid-cols-8 sm:gap-y-10">
            {services.map(({ title, icon: Icon }) => (
              <button type="button" key={title} onClick={() => go('employer')} className="group flex min-w-0 flex-col items-center gap-3 text-center">
                <span className="grid h-16 w-16 place-items-center rounded-[22px] bg-white text-[#F97316] shadow-sm ring-1 ring-black/[0.06] transition duration-200 group-hover:-translate-y-1 group-hover:shadow-md sm:h-[72px] sm:w-[72px]">
                  <Icon className="h-7 w-7" strokeWidth={1.7} />
                </span>
                <span className="text-xs font-bold text-black/70">{title}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 3. Worker */}
        <section className="border-b border-black/[0.07] py-14 sm:py-20">
          <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F97316]">{id ? 'Untuk pekerja' : 'For workers'}</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] sm:text-5xl">{id ? 'Cari kerja tanpa ribet.' : 'Find work without the hassle.'}</h2>
              <p className="mt-4 max-w-lg text-sm leading-7 text-black/55 sm:text-base">{id ? 'Lihat peluang kerja harian dan ambil pekerjaan yang sesuai dengan waktu serta kemampuanmu.' : 'See daily opportunities and take work that fits your time and skills.'}</p>
              <button type="button" onClick={() => go('worker')} className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#F97316]">{id ? 'Mulai cari kerja' : 'Start finding work'} <ArrowRight className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ['01', 'Tanpa CV', 'Mulai dari kebutuhan kerja harian.'],
                ['02', 'Lebih dekat', 'Peluang kerja disesuaikan area.'],
                ['03', 'Lebih jelas', 'Detail pekerjaan terlihat sebelum mengambilnya.'],
              ].map(([n, title, text]) => (
                <div key={n} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/[0.05] sm:p-6">
                  <span className="text-xs font-bold text-[#F97316]">{n}</span>
                  <h3 className="mt-7 text-base font-extrabold">{title}</h3>
                  <p className="mt-2 text-xs leading-5 text-black/50">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Employer */}
        <section className="border-b border-black/[0.07] py-14 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="overflow-hidden rounded-[28px] bg-black sm:mt-8">
                <img src={fieldImages[1]} alt="Tenaga kerja lapangan" className="h-[280px] w-full object-cover sm:h-[390px]" loading="lazy" />
              </div>
              <div className="overflow-hidden rounded-[28px] bg-black">
                <img src={fieldImages[2]} alt="Pekerjaan teknis" className="h-[280px] w-full object-cover sm:h-[390px]" loading="lazy" />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F97316]">{id ? 'Untuk pemberi kerja' : 'For employers'}</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] sm:text-5xl">{id ? 'Butuh tenaga hari ini?' : 'Need a worker today?'}</h2>
              <p className="mt-4 max-w-lg text-sm leading-7 text-black/55 sm:text-base">{id ? 'Pilih jenis pekerjaan, lihat harga, lalu mulai order tenaga kerja harian.' : 'Choose the work, see the price, then start a daily-worker order.'}</p>
              <div className="mt-7 space-y-3">
                {['Pilih layanan', 'Tentukan kebutuhan dan lokasi', 'Lihat harga sebelum order'].map((text) => (
                  <div key={text} className="flex items-center gap-3 text-sm font-semibold"><span className="grid h-7 w-7 place-items-center rounded-full bg-orange-100 text-[#F97316]"><Check className="h-4 w-4" /></span>{text}</div>
                ))}
              </div>
              <button type="button" onClick={() => go('employer')} className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#171717] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-black">{id ? 'Pesan pekerja' : 'Book a worker'} <ArrowRight className="h-4 w-4" /></button>
            </div>
          </div>
        </section>

        {/* 5. Work in the field */}
        <section className="border-b border-black/[0.07] py-14 sm:py-20">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F97316]">{id ? 'Pekerjaan sehari-hari' : 'Everyday work'}</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] sm:text-5xl">{id ? 'Dari angkut sampai perbaikan.' : 'From moving to fixing.'}</h2>
            <p className="mt-4 text-sm leading-7 text-black/55 sm:text-base">{id ? 'Satu tempat untuk berbagai kebutuhan tenaga kerja fisik.' : 'One place for everyday physical-work needs.'}</p>
          </div>
          <div className="mt-9 grid gap-3 sm:grid-cols-3">
            {[
              ['Logistik', 'Angkut, bongkar-muat, pindahan.', fieldImages[0]],
              ['Kebersihan', 'Bersih-bersih rumah atau usaha.', fieldImages[1]],
              ['Tukang', 'Perbaikan dan renovasi ringan.', fieldImages[2]],
            ].map(([title, text, image]) => (
              <button type="button" key={title} onClick={() => go('employer')} className="group overflow-hidden rounded-[28px] bg-white text-left shadow-sm ring-1 ring-black/[0.05]">
                <div className="relative h-64 overflow-hidden bg-black sm:h-72"><img src={image} alt={title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" /><div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" /><div className="absolute bottom-0 p-5 text-white"><h3 className="text-xl font-extrabold">{title}</h3><p className="mt-1 text-xs text-white/75">{text}</p></div></div>
              </button>
            ))}
          </div>
        </section>

        {/* 6. How it works */}
        <section className="border-b border-black/[0.07] py-14 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr] lg:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F97316]">{id ? 'Cara kerja' : 'How it works'}</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] sm:text-5xl">{id ? 'Sederhana dari awal.' : 'Simple from the start.'}</h2>
            </div>
            <div className="divide-y divide-black/[0.08] border-y border-black/[0.08]">
              {[
                ['01', 'Pilih kebutuhan', 'Cari pekerjaan atau pilih jenis tenaga kerja yang kamu butuhkan.'],
                ['02', 'Lihat detail', 'Area, pekerjaan, dan harga terlihat sebelum order dilanjutkan.'],
                ['03', 'Mulai pekerjaan', 'Ikuti status order sampai pekerjaan selesai.'],
              ].map(([n, title, text]) => (
                <div key={n} className="grid grid-cols-[52px_1fr] gap-4 py-6 sm:grid-cols-[72px_1fr] sm:py-8">
                  <span className="text-sm font-bold text-[#F97316]">{n}</span>
                  <div><h3 className="text-base font-extrabold sm:text-lg">{title}</h3><p className="mt-2 max-w-xl text-sm leading-6 text-black/50">{text}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 7. Trust and price */}
        <section className="border-b border-black/[0.07] py-14 sm:py-20">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              [ShieldCheck, 'Harga terlihat', 'Biaya tampil sebelum order.'],
              [Search, 'Pilihan jelas', 'Pilih layanan sesuai kebutuhan.'],
              [UserRound, 'Akun terverifikasi', 'Keamanan dan kepercayaan menjadi bagian dari alur layanan.'],
            ].map(([Icon, title, text]) => (
              <div key={title as string} className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-black/[0.05] sm:p-7">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-100 text-[#F97316]"><Icon className="h-5 w-5" /></span>
                <h3 className="mt-7 text-base font-extrabold">{title as string}</h3>
                <p className="mt-2 text-sm leading-6 text-black/50">{text as string}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 8. Main CTA */}
        <section className="py-14 sm:py-20">
          <div className="overflow-hidden rounded-[34px] bg-[#171717] px-6 py-12 text-white sm:px-10 sm:py-16 lg:px-14">
            <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-300">KerjaHarian</p>
                <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-[-0.04em] sm:text-6xl">{id ? 'Siap mulai hari ini?' : 'Ready to start today?'}</h2>
                <p className="mt-4 max-w-xl text-sm leading-7 text-white/55 sm:text-base">{id ? 'Cari pekerjaan atau temukan tenaga kerja untuk kebutuhanmu.' : 'Find work or find the worker you need.'}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => go('worker')} className="inline-flex items-center gap-2 rounded-full bg-[#F97316] px-6 py-3.5 text-sm font-bold text-white hover:bg-[#EA580C]">{id ? 'Cari kerja' : 'Find work'} <ArrowRight className="h-4 w-4" /></button>
                <button type="button" onClick={() => go('employer')} className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-black hover:bg-white/90">{id ? 'Pesan pekerja' : 'Book a worker'} <ArrowRight className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        </section>

        {/* 9. Footer */}
        <footer className="border-t border-black/[0.08] py-10 sm:py-12">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Logo className="origin-left scale-90" />
              <p className="mt-4 max-w-sm text-xs leading-5 text-black/40">{id ? 'Marketplace tenaga kerja harian untuk kebutuhan nyata sehari-hari.' : 'A daily-worker marketplace for everyday physical-work needs.'}</p>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-black/45">
              <button type="button" onClick={() => go('help')} className="hover:text-black">{id ? 'Bantuan' : 'Help'}</button>
              <button type="button" onClick={() => go('terms')} className="hover:text-black">{id ? 'Syarat & Ketentuan' : 'Terms'}</button>
              <button type="button" onClick={() => go('privacy')} className="hover:text-black">{id ? 'Privasi' : 'Privacy'}</button>
              <span>© 2026 KerjaHarian</span>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
