import { useState } from 'react';
import { ArrowRight, BriefcaseBusiness, ChevronDown, CircleHelp, MapPin, Menu, Search, UserRound, X, Zap } from 'lucide-react';
import { Logo } from './Logo';
import type { View } from '@/lib/types';

interface LandingDarkProps { onNavigate: (view: View) => void; lang: 'id' | 'en'; }

type Service = { title: string; subtitle: string; icon: typeof BriefcaseBusiness };

const services: Service[] = [
  { title: 'Angkut & Logistik', subtitle: 'Angkut, bongkar muat, kirim barang', icon: BriefcaseBusiness },
  { title: 'Bersih-bersih', subtitle: 'Rumah, kantor, toko, area usaha', icon: Zap },
  { title: 'Pindahan', subtitle: 'Tenaga tambahan untuk pindahan', icon: MapPin },
  { title: 'Potong Rumput & Kebun', subtitle: 'Halaman, kebun, area luar', icon: Search },
];

const faqs = [
  ['Bagaimana cara pesan pekerja?', 'Pilih layanan, isi detail pekerjaan dan lokasi, lihat total final, lalu Order.'],
  ['Bagaimana cara mencari pekerjaan?', 'Masuk sebagai Pekerja, aktifkan Online, lalu lihat pekerjaan yang tersedia di sekitar Anda.'],
  ['Kapan harga terlihat?', 'Harga final terlihat sebelum Order sehingga saldo dapat dipastikan cukup terlebih dahulu.'],
  ['Apakah pekerja dan pemberi kerja berada pada order yang sama?', 'Ya. Satu pekerjaan menggunakan satu order dan satu state pekerjaan yang sama untuk kedua pihak.'],
];

export function LandingDark({ onNavigate, lang }: LandingDarkProps) {
  const id = lang === 'id';
  const [menuOpen, setMenuOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const go = (view: View) => { setMenuOpen(false); onNavigate(view); };

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <header className="sticky top-0 z-[80] border-b border-white/10 bg-[#050505]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="KerjaHarian">
            <Logo className="[&_span]:text-white [&_.text-slate-400]:text-white/50" />
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => go('worker')} className="hidden items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-black sm:flex">
              <UserRound className="h-4 w-4" /> {id ? 'Cari Kerja' : 'Find Work'}
            </button>
            <button type="button" onClick={() => go('employer')} className="rounded-full bg-orange-500 px-4 py-2 text-xs font-black text-white">
              {id ? 'Butuh Pekerja' : 'Hire Workers'}
            </button>
            <button type="button" onClick={() => setMenuOpen(v => !v)} aria-label="Menu" className="grid h-10 w-10 place-items-center rounded-full border border-white/15">
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="border-t border-white/10 bg-[#080808] px-4 py-2 sm:px-6">
            <div className="mx-auto flex max-w-6xl flex-col">
              <button type="button" onClick={() => go('employer')} className="border-b border-white/10 py-4 text-left text-sm font-bold">Butuh Pekerja</button>
              <button type="button" onClick={() => go('worker')} className="border-b border-white/10 py-4 text-left text-sm font-bold">Cari Kerja</button>
              <button type="button" onClick={() => go('help')} className="border-b border-white/10 py-4 text-left text-sm font-bold">Pusat Bantuan</button>
              <button type="button" onClick={() => go('terms')} className="border-b border-white/10 py-4 text-left text-sm font-bold">Syarat & Ketentuan</button>
              <button type="button" onClick={() => go('privacy')} className="py-4 text-left text-sm font-bold">Kebijakan Privasi</button>
            </div>
          </nav>
        )}
      </header>

      <section className="border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 pb-14 pt-14 sm:px-6 sm:pb-20 sm:pt-20">
          <div className="max-w-4xl">
            <p className="text-xs font-black uppercase tracking-[.24em] text-orange-500">KERJAHARIAN</p>
            <h1 className="mt-5 text-5xl font-black leading-[.94] tracking-[-.055em] sm:text-7xl lg:text-8xl">
              {id ? <>Butuh tenaga?<br /><span className="text-orange-500">Dapatkan sekarang.</span></> : <>Need workers?<br /><span className="text-orange-500">Get them now.</span></>}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-white/55 sm:text-lg">
              {id ? 'Marketplace on-demand untuk pekerjaan fisik harian. Pilih kebutuhan, lihat harga, Order, dan biarkan sistem mencari pekerja terdekat.' : 'On-demand marketplace for everyday physical work. Choose a service, see the price, order, and let the system find nearby workers.'}
            </p>
          </div>

          <div className="mt-10 grid max-w-3xl gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => go('employer')} className="group flex min-h-16 items-center justify-between rounded-2xl bg-orange-500 px-5 text-left text-black transition hover:bg-orange-400">
              <span><span className="block text-xs font-black uppercase tracking-wider opacity-70">Employer / Mitra</span><span className="mt-1 block text-lg font-black">{id ? 'Pesan Pekerja' : 'Book a Worker'}</span></span>
              <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
            </button>
            <button type="button" onClick={() => go('worker')} className="group flex min-h-16 items-center justify-between rounded-2xl border border-white/15 bg-[#0c0c0c] px-5 text-left transition hover:border-orange-500/50">
              <span><span className="block text-xs font-black uppercase tracking-wider text-orange-500">Pekerja</span><span className="mt-1 block text-lg font-black">{id ? 'Cari Pekerjaan' : 'Find a Job'}</span></span>
              <ArrowRight className="h-5 w-5 text-orange-500 transition group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#090909]">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0d0d0d] px-4 py-4">
            <Search className="h-5 w-5 shrink-0 text-orange-500" />
            <span className="text-sm text-white/45">{id ? 'Apa yang Anda butuhkan hari ini?' : 'What do you need today?'}</span>
            <button type="button" onClick={() => go('employer')} className="ml-auto rounded-xl bg-white px-4 py-2 text-xs font-black text-black">{id ? 'Mulai' : 'Start'}</button>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex items-end justify-between gap-4">
            <div><p className="text-xs font-black uppercase tracking-[.2em] text-orange-500">Layanan</p><h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{id ? 'Pilih pekerjaan.' : 'Choose a service.'}</h2></div>
            <button type="button" onClick={() => go('employer')} className="hidden items-center gap-1 text-sm font-black text-orange-500 sm:flex">{id ? 'Lihat semua' : 'View all'} <ArrowRight className="h-4 w-4" /></button>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {services.map(({ title, subtitle, icon: Icon }) => (
              <button type="button" key={title} onClick={() => go('employer')} className="group min-h-40 rounded-2xl border border-white/10 bg-[#0b0b0b] p-5 text-left transition hover:-translate-y-0.5 hover:border-orange-500/50">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500/10 text-orange-500"><Icon className="h-5 w-5" /></div>
                <div className="mt-5 flex items-start justify-between gap-2"><span className="font-black leading-5">{title}</span><ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-orange-500 transition group-hover:translate-x-1" /></div>
                <p className="mt-2 text-xs leading-5 text-white/40">{subtitle}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#090909]">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-5"><MapPin className="h-5 w-5 text-orange-500" /><p className="mt-4 font-black">{id ? 'Dekat' : 'Nearby'}</p><p className="mt-2 text-sm leading-6 text-white/40">{id ? 'Pekerjaan dan pekerja dicari berdasarkan lokasi dan radius.' : 'Jobs and workers are matched by location and radius.'}</p></div>
            <div className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-5"><Zap className="h-5 w-5 text-orange-500" /><p className="mt-4 font-black">On-demand</p><p className="mt-2 text-sm leading-6 text-white/40">{id ? 'Order saat dibutuhkan. Sistem dispatch mencari pekerja yang tersedia.' : 'Order when needed. Dispatch finds available workers.'}</p></div>
            <div className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-5"><BriefcaseBusiness className="h-5 w-5 text-orange-500" /><p className="mt-4 font-black">{id ? 'Satu order' : 'One order'}</p><p className="mt-2 text-sm leading-6 text-white/40">{id ? 'Employer dan Pekerja mengikuti order dan status pekerjaan yang sama.' : 'Employer and Worker follow the same order and job state.'}</p></div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex items-center gap-3"><CircleHelp className="h-5 w-5 text-orange-500" /><h2 className="text-2xl font-black">{id ? 'Bantuan' : 'Help'}</h2></div>
          <div className="mt-6 divide-y divide-white/10 rounded-2xl border border-white/10 bg-[#0b0b0b]">
            {faqs.map(([question, answer], index) => (
              <div key={question}>
                <button type="button" onClick={() => setFaqOpen(faqOpen === index ? null : index)} className="flex w-full items-center justify-between gap-5 px-5 py-5 text-left text-sm font-bold">
                  <span>{question}</span><ChevronDown className={`h-4 w-4 shrink-0 text-orange-500 transition ${faqOpen === index ? 'rotate-180' : ''}`} />
                </button>
                {faqOpen === index && <p className="px-5 pb-5 text-sm leading-6 text-white/45">{answer}</p>}
              </div>
            ))}
          </div>
          <button type="button" onClick={() => go('help')} className="mt-5 text-sm font-black text-orange-500">{id ? 'Buka Pusat Bantuan' : 'Open Help Center'} <ArrowRight className="ml-1 inline h-4 w-4" /></button>
        </div>
      </section>

      <footer className="bg-[#050505]">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div><Logo className="[&_span]:text-white [&_.text-slate-400]:text-white/50" /><p className="mt-3 text-xs text-white/35">Marketplace tenaga kerja harian on-demand.</p></div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/35"><button type="button" onClick={() => go('terms')}>Syarat & Ketentuan</button><button type="button" onClick={() => go('privacy')}>Privasi</button><button type="button" onClick={() => go('help')}>Bantuan</button><span>© 2026 KerjaHarian</span></div>
        </div>
      </footer>
    </main>
  );
}
