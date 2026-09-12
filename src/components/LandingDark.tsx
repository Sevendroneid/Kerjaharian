import { useState } from 'react';
import {
  ArrowRight,
  BriefcaseBusiness,
  ChevronRight,
  Clock3,
  Leaf,
  Menu,
  Package,
  Search,
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

export function LandingDark({ onNavigate, lang }: LandingDarkProps) {
  const id = lang === 'id';
  const [menuOpen, setMenuOpen] = useState(false);
  const go = (view: View) => { setMenuOpen(false); onNavigate(view); };

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[#171717]">
      <header className="sticky top-0 z-[80] border-b border-black/[0.06] bg-[#f7f7f5]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="KerjaHarian" className="shrink-0">
            <Logo className="scale-90 origin-left" />
          </button>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => go('worker')} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-black/65 hover:text-black">
              <UserRound className="h-4 w-4" /> {id ? 'Cari kerja' : 'Find work'}
            </button>
            <button type="button" onClick={() => setMenuOpen(v => !v)} aria-label="Menu" className="grid h-9 w-9 place-items-center rounded-full text-black/70 hover:bg-black/5">
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="border-t border-black/[0.06] bg-[#f7f7f5] px-4 shadow-sm sm:px-6">
            <div className="mx-auto flex max-w-5xl flex-col sm:flex-row sm:items-center sm:gap-7">
              <button type="button" onClick={() => go('employer')} className="border-b border-black/[0.06] py-3 text-left text-sm font-semibold sm:border-0">{id ? 'Butuh pekerja' : 'Need workers'}</button>
              <button type="button" onClick={() => go('worker')} className="border-b border-black/[0.06] py-3 text-left text-sm font-semibold sm:border-0">{id ? 'Cari kerja' : 'Find work'}</button>
              <button type="button" onClick={() => go('help')} className="border-b border-black/[0.06] py-3 text-left text-sm font-semibold sm:border-0">{id ? 'Bantuan' : 'Help'}</button>
              <button type="button" onClick={() => go('terms')} className="border-b border-black/[0.06] py-3 text-left text-sm font-semibold sm:border-0">{id ? 'Syarat & Ketentuan' : 'Terms'}</button>
              <button type="button" onClick={() => go('privacy')} className="py-3 text-left text-sm font-semibold">{id ? 'Privasi' : 'Privacy'}</button>
            </div>
          </nav>
        )}
      </header>

      <div className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
        <section className="pt-5 sm:pt-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-black/45">{id ? 'Selamat datang di KerjaHarian' : 'Welcome to KerjaHarian'}</p>
              <h1 className="mt-1 text-xl font-bold tracking-[-0.035em] sm:text-2xl">{id ? 'Mau pesan apa hari ini?' : 'What do you need today?'}</h1>
            </div>
            <button type="button" onClick={() => go('worker')} aria-label={id ? 'Cari kerja' : 'Find work'} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-black/70 shadow-sm ring-1 ring-black/[0.05]">
              <UserRound className="h-5 w-5" />
            </button>
          </div>

          <button type="button" onClick={() => go('employer')} className="mt-4 flex h-12 w-full items-center gap-3 rounded-2xl border border-black/[0.07] bg-white px-4 text-left shadow-sm hover:border-black/15">
            <Search className="h-5 w-5 shrink-0 text-black/40" />
            <span className="flex-1 truncate text-sm text-black/45">{id ? 'Cari layanan yang kamu butuhkan' : 'Search for a service'}</span>
            <ChevronRight className="h-4 w-4 text-black/30" />
          </button>
        </section>

        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">{id ? 'Layanan' : 'Services'}</h2>
            <button type="button" onClick={() => go('employer')} className="text-xs font-semibold text-orange-600">{id ? 'Lihat semua' : 'See all'}</button>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-x-2 gap-y-5 sm:grid-cols-8">
            {services.map(({ title, icon: Icon }) => (
              <button type="button" key={title} onClick={() => go('employer')} className="group flex min-w-0 flex-col items-center gap-2 text-center">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-orange-600 shadow-sm ring-1 ring-black/[0.05] transition-transform group-hover:-translate-y-0.5 sm:h-16 sm:w-16">
                  <Icon className="h-6 w-6" strokeWidth={1.8} />
                </span>
                <span className="text-[11px] font-semibold leading-4 text-black/75">{title}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-7 rounded-2xl bg-[#171717] px-5 py-5 text-white sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-500 text-white"><BriefcaseBusiness className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{id ? 'Butuh pekerja hari ini?' : 'Need a worker today?'}</p>
              <p className="mt-0.5 text-xs text-white/55">{id ? 'Pilih layanan dan mulai pesanan.' : 'Choose a service and start an order.'}</p>
            </div>
            <button type="button" onClick={() => go('employer')} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-black">
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-bold">{id ? 'Untuk kamu' : 'For you'}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => go('worker')} className="flex items-center gap-3 rounded-2xl border border-black/[0.07] bg-white p-4 text-left shadow-sm">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-black/[0.04] text-black/70"><UserRound className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{id ? 'Cari pekerjaan' : 'Find work'}</span><span className="mt-0.5 block text-xs text-black/45">{id ? 'Lihat pekerjaan harian yang tersedia.' : 'Find available daily work.'}</span></span>
              <ChevronRight className="h-4 w-4 text-black/30" />
            </button>
            <button type="button" onClick={() => go('employer')} className="flex items-center gap-3 rounded-2xl border border-black/[0.07] bg-white p-4 text-left shadow-sm">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-500/10 text-orange-600"><BriefcaseBusiness className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{id ? 'Pesan pekerja' : 'Book a worker'}</span><span className="mt-0.5 block text-xs text-black/45">{id ? 'Mulai order tenaga harian.' : 'Start a daily-worker order.'}</span></span>
              <ChevronRight className="h-4 w-4 text-black/30" />
            </button>
          </div>
        </section>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-[70] border-t border-black/[0.07] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto grid h-16 max-w-5xl grid-cols-3 px-4 sm:px-6">
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex flex-col items-center justify-center gap-1 text-orange-600">
            <Sparkles className="h-5 w-5" /><span className="text-[10px] font-bold">{id ? 'Beranda' : 'Home'}</span>
          </button>
          <button type="button" onClick={() => go('worker')} className="flex flex-col items-center justify-center gap-1 text-black/45 hover:text-black">
            <UserRound className="h-5 w-5" /><span className="text-[10px] font-semibold">{id ? 'Cari kerja' : 'Find work'}</span>
          </button>
          <button type="button" onClick={() => go('employer')} className="flex flex-col items-center justify-center gap-1 text-black/45 hover:text-black">
            <Package className="h-5 w-5" /><span className="text-[10px] font-semibold">{id ? 'Pesan' : 'Book'}</span>
          </button>
        </div>
      </nav>

      <footer className="hidden border-t border-black/[0.06] bg-[#f7f7f5] sm:block">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-7">
          <Logo className="scale-90 origin-left" />
          <div className="flex flex-wrap gap-5 text-[11px] text-black/40">
            <button type="button" onClick={() => go('terms')}>{id ? 'Syarat & Ketentuan' : 'Terms'}</button>
            <button type="button" onClick={() => go('privacy')}>{id ? 'Privasi' : 'Privacy'}</button>
            <button type="button" onClick={() => go('help')}>{id ? 'Bantuan' : 'Help'}</button>
            <span>© 2026 KerjaHarian</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
