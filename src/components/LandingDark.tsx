import { useState } from 'react';
import { ArrowRight, BriefcaseBusiness, ChevronRight, Leaf, Menu, Package, Wrench, X } from 'lucide-react';
import { Logo } from './Logo';
import type { View } from '@/lib/types';

interface LandingDarkProps { onNavigate: (view: View) => void; lang: 'id' | 'en'; }

const fieldImages = [
  'https://images.pexels.com/photos/1216589/pexels-photo-1216589.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'https://images.pexels.com/photos/4481327/pexels-photo-4481327.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'https://images.pexels.com/photos/162553/keys-workshop-metalwork-hand-162553.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'https://images.pexels.com/photos/1268855/pexels-photo-1268855.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'https://images.pexels.com/photos/3846554/pexels-photo-3846554.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'https://images.pexels.com/photos/3862627/pexels-photo-3862627.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'https://images.pexels.com/photos/5691637/pexels-photo-5691637.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'https://images.pexels.com/photos/3769138/pexels-photo-3769138.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'https://images.pexels.com/photos/4482900/pexels-photo-4482900.jpeg?auto=compress&cs=tinysrgb&w=1400',
];

export function LandingDark({ onNavigate, lang }: LandingDarkProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const t = lang === 'id'
    ? { find: 'Cari Kerja', worker: 'Pesan Pekerja', today: 'Butuh tenaga hari ini?' }
    : { find: 'Find Work', worker: 'Hire a Worker', today: 'Need a worker today?' };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <button onClick={() => onNavigate('landing')} aria-label="KerjaHarian home"><Logo /></button>
          <nav className="hidden items-center gap-7 text-sm text-white/75 md:flex">
            <button onClick={() => onNavigate('landing')} className="hover:text-white">Home</button>
            <button onClick={() => onNavigate('worker')} className="hover:text-white">{t.find}</button>
            <button onClick={() => onNavigate('employer')} className="hover:text-white">{t.worker}</button>
          </nav>
          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-5 pb-16 pt-8">
          <div className="relative min-h-[540px] overflow-hidden rounded-3xl">
            <img src={fieldImages[0]} alt="Pekerja lapangan" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/20" />
            <div className="relative z-10 flex min-h-[540px] max-w-2xl flex-col justify-end p-7 md:p-12">
              <p className="mb-3 text-xs uppercase tracking-[0.22em] text-white/70">KerjaHarian</p>
              <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">Kerja hari ini.<br />Penghasilan hari ini.</h1>
              <p className="mt-5 max-w-xl text-base text-white/75 md:text-lg">Temukan pekerjaan harian atau pekerja terdekat dengan proses yang sederhana.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <button onClick={() => onNavigate('worker')} className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black">{t.find}</button>
                <button onClick={() => onNavigate('employer')} className="rounded-full bg-orange-500 px-6 py-3 text-sm font-medium text-white">{t.worker}</button>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-orange-400">Untuk pemberi kerja</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">{t.today}</h2>
              <p className="mt-5 max-w-lg text-white/65">Pesan tenaga kerja harian untuk kebutuhan yang nyata, dekat, dan mendesak.</p>
              <button onClick={() => onNavigate('employer')} className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-black">Pesan pekerja <ArrowRight size={16} /></button>
            </div>
            <div className="overflow-x-auto snap-x snap-mandatory scrollbar-hide">
              <div className="flex w-max gap-4 pb-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-[82vw] max-w-[520px] shrink-0 snap-start overflow-hidden rounded-2xl aspect-[4/3]">
                    <img src={fieldImages[i]} alt="Pekerja KerjaHarian" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-7xl px-5">
            <div className="flex items-end justify-between gap-5">
              <div><p className="text-xs uppercase tracking-[0.2em] text-orange-400">Pekerjaan</p><h2 className="mt-2 text-3xl font-semibold md:text-4xl">Cari kerja di dekatmu</h2></div>
              <button onClick={() => onNavigate('worker')} className="hidden items-center gap-1 text-sm text-white/70 sm:flex">Lihat semua <ChevronRight size={16} /></button>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[['Logistik', Package, 5], ['Kebersihan', Leaf, 6], ['Tukang', Wrench, 7], ['Serabutan', BriefcaseBusiness, 8]].map(([title, Icon, imageIndex]) => {
                const I = Icon as typeof Package;
                return <button key={title as string} onClick={() => onNavigate('worker')} className="group overflow-hidden rounded-2xl border border-white/10 bg-[#202020] text-left">
                  <div className="aspect-[4/3] overflow-hidden"><img src={fieldImages[imageIndex as number]} alt={title as string} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /></div>
                  <div className="flex items-center justify-between p-4"><span className="font-medium">{title as string}</span><I size={18} className="text-white/50" /></div>
                </button>;
              })}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-black py-10 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <div className="flex gap-5 text-sm font-medium">
            <button onClick={() => onNavigate('worker')} className="!text-white opacity-100 hover:!text-white">{t.find}</button>
            <button onClick={() => onNavigate('employer')} className="!text-white opacity-100 hover:!text-white">{t.worker}</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
