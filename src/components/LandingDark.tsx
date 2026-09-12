import { useState } from 'react';
import { ArrowRight, BriefcaseBusiness, Menu, Search, UserRound, X, Zap } from 'lucide-react';
import { Logo } from './Logo';
import type { View } from '@/lib/types';

interface LandingDarkProps { onNavigate: (view: View) => void; lang: 'id' | 'en'; }

type Service = { title: string; subtitle: string; icon: typeof BriefcaseBusiness };

const services: Service[] = [
  { title: 'Angkut & Logistik', subtitle: 'Angkut, bongkar muat, kirim barang', icon: BriefcaseBusiness },
  { title: 'Bersih-bersih', subtitle: 'Rumah, kantor, toko, area usaha', icon: Zap },
  { title: 'Pindahan', subtitle: 'Tenaga tambahan untuk pindahan', icon: BriefcaseBusiness },
  { title: 'Potong Rumput & Kebun', subtitle: 'Halaman, kebun, area luar', icon: Search },
];

export function LandingDark({ onNavigate, lang }: LandingDarkProps) {
  const id = lang === 'id';
  const [menuOpen, setMenuOpen] = useState(false);
  const go = (view: View) => { setMenuOpen(false); onNavigate(view); };

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <header className="sticky top-0 z-[80] border-b border-white/10 bg-[#050505]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="KerjaHarian">
            <Logo className="scale-90 origin-left" />
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => go('worker')} className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-white/70 hover:text-white sm:flex">
              <UserRound className="h-4 w-4" /> {id ? 'Cari Kerja' : 'Find Work'}
            </button>
            <button type="button" onClick={() => go('employer')} className="rounded-full bg-orange-500 px-3.5 py-2 text-xs font-bold text-white">
              {id ? 'Butuh Pekerja' : 'Hire Workers'}
            </button>
            <button type="button" onClick={() => setMenuOpen(v => !v)} aria-label="Menu" className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-white/75">
              {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="border-t border-white/10 bg-[#080808] px-4 sm:px-6">
            <div className="mx-auto flex max-w-6xl flex-col sm:flex-row sm:items-center sm:gap-6">
              <button type="button" onClick={() => go('employer')} className="border-b border-white/10 py-3 text-left text-sm font-semibold sm:border-0">Butuh Pekerja</button>
              <button type="button" onClick={() => go('worker')} className="border-b border-white/10 py-3 text-left text-sm font-semibold sm:border-0">Cari Kerja</button>
              <button type="button" onClick={() => go('help')} className="border-b border-white/10 py-3 text-left text-sm font-semibold sm:border-0">Pusat Bantuan</button>
              <button type="button" onClick={() => go('terms')} className="border-b border-white/10 py-3 text-left text-sm font-semibold sm:border-0">Syarat & Ketentuan</button>
              <button type="button" onClick={() => go('privacy')} className="py-3 text-left text-sm font-semibold">Kebijakan Privasi</button>
            </div>
          </nav>
        )}
      </header>

      <section>
        <div className="mx-auto max-w-6xl px-4 pb-7 pt-7 sm:px-6 sm:pb-9 sm:pt-9">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold leading-tight tracking-[-0.035em] sm:text-4xl">
              {id ? 'Butuh tenaga hari ini?' : 'Need a worker today?'}
            </h1>
            <p className="mt-1.5 text-sm leading-6 text-white/50">
              {id ? 'Pilih layanan dan pesan pekerja.' : 'Choose a service and book a worker.'}
            </p>
          </div>

          <button type="button" onClick={() => go('employer')} className="mt-5 flex w-full max-w-2xl items-center gap-3 rounded-2xl border border-white/10 bg-[#0d0d0d] px-4 py-3.5 text-left shadow-sm hover:border-white/20">
            <Search className="h-5 w-5 shrink-0 text-orange-500" />
            <span className="min-w-0 flex-1 truncate text-sm text-white/45">{id ? 'Cari layanan yang Anda butuhkan' : 'Find a service you need'}</span>
            <span className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-black">{id ? 'Mulai' : 'Start'}</span>
          </button>

          <div className="mt-3 flex max-w-2xl gap-2">
            <button type="button" onClick={() => go('employer')} className="flex flex-1 items-center justify-between rounded-2xl bg-orange-500 px-4 py-3 text-left text-black">
              <span className="text-sm font-bold">{id ? 'Pesan pekerja' : 'Book a worker'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => go('worker')} className="flex flex-1 items-center justify-between rounded-2xl border border-white/12 bg-[#0d0d0d] px-4 py-3 text-left">
              <span className="text-sm font-bold">{id ? 'Cari pekerjaan' : 'Find a job'}</span>
              <ArrowRight className="h-4 w-4 text-orange-500" />
            </button>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#090909]">
        <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-8">
          <h2 className="text-base font-bold">{id ? 'Layanan' : 'Services'}</h2>
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {services.map(({ title, subtitle, icon: Icon }) => (
              <button type="button" key={title} onClick={() => go('employer')} className="group min-h-28 rounded-2xl border border-white/10 bg-[#0b0b0b] p-4 text-left hover:border-orange-500/45">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-orange-500/10 text-orange-500"><Icon className="h-4 w-4" /></div>
                <div className="mt-3 flex items-start justify-between gap-2"><span className="text-sm font-semibold leading-5">{title}</span><ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500" /></div>
                <p className="mt-1.5 text-[11px] leading-4 text-white/38">{subtitle}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#050505]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo className="scale-90 origin-left" />
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-white/35">
            <button type="button" onClick={() => go('terms')}>Syarat & Ketentuan</button>
            <button type="button" onClick={() => go('privacy')}>Privasi</button>
            <button type="button" onClick={() => go('help')}>Bantuan</button>
            <span>© 2026 KerjaHarian</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
