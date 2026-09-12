import { useState } from 'react';
import { ArrowRight, BriefcaseBusiness, Menu, UserRound, X, Zap } from 'lucide-react';
import { Logo } from './Logo';
import type { View } from '@/lib/types';

interface LandingDarkProps { onNavigate: (view: View) => void; lang: 'id' | 'en'; }

type Service = { title: string; subtitle: string; icon: typeof BriefcaseBusiness };

const services: Service[] = [
  { title: 'Angkut & Logistik', subtitle: 'Angkut, bongkar muat, kirim barang', icon: BriefcaseBusiness },
  { title: 'Bersih-bersih', subtitle: 'Rumah, kantor, toko, area usaha', icon: Zap },
  { title: 'Pindahan', subtitle: 'Tenaga tambahan untuk pindahan', icon: BriefcaseBusiness },
  { title: 'Potong Rumput & Kebun', subtitle: 'Halaman, kebun, area luar', icon: Zap },
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
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => go('worker')} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-white/70 hover:text-white">
              <UserRound className="h-4 w-4" /> {id ? 'Cari Kerja' : 'Find Work'}
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

      <section className="mx-auto max-w-6xl px-4 pb-8 pt-8 sm:px-6 sm:pb-10 sm:pt-10">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-500">KerjaHarian</p>
          <h1 className="mt-2 text-3xl font-bold leading-[1.08] tracking-[-0.04em] sm:text-5xl">
            {id ? 'Tenaga kerja harian, saat Anda butuhkan.' : 'Daily workers, when you need them.'}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/55 sm:text-base">
            {id ? 'Pilih layanan. Pesan pekerja. Selesai.' : 'Choose a service. Book a worker. Done.'}
          </p>
        </div>

        <button type="button" onClick={() => go('employer')} className="mt-6 flex w-full max-w-3xl items-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-left text-black transition-transform hover:-translate-y-0.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-orange-500 text-white">
            <ArrowRight className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">{id ? 'Pesan pekerja' : 'Book a worker'}</span>
            <span className="block truncate text-xs text-black/50">{id ? 'Mulai dari layanan yang Anda butuhkan' : 'Start with the service you need'}</span>
          </span>
          <ArrowRight className="h-4 w-4 text-black/55" />
        </button>
      </section>

      <section className="border-y border-white/10 bg-[#090909]">
        <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold tracking-[-0.02em]">{id ? 'Mau pesan apa?' : 'What do you need?'}</h2>
              <p className="mt-1 text-xs text-white/40">{id ? 'Pilih layanan untuk mulai.' : 'Choose a service to start.'}</p>
            </div>
            <button type="button" onClick={() => go('employer')} className="text-xs font-semibold text-orange-500">{id ? 'Lihat semua' : 'See all'}</button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {services.map(({ title, subtitle, icon: Icon }) => (
              <button type="button" key={title} onClick={() => go('employer')} className="group min-h-32 rounded-2xl border border-white/10 bg-[#0c0c0c] p-4 text-left transition-colors hover:border-orange-500/45">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500/10 text-orange-500"><Icon className="h-5 w-5" /></div>
                <div className="mt-3 flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold leading-5">{title}</span>
                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/25 transition-colors group-hover:text-orange-500" />
                </div>
                <p className="mt-1.5 text-[11px] leading-4 text-white/38">{subtitle}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-8">
        <button type="button" onClick={() => go('worker')} className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-[#090909] px-4 py-4 text-left hover:border-white/20">
          <span>
            <span className="block text-sm font-bold">{id ? 'Cari pekerjaan harian?' : 'Looking for daily work?'}</span>
            <span className="mt-1 block text-xs text-white/40">{id ? 'Masuk sebagai pekerja dan lihat pekerjaan yang tersedia.' : 'Enter as a worker and find available jobs.'}</span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-orange-500" />
        </button>
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
