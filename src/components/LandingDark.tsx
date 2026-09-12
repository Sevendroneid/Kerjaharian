import { useState } from 'react';
import { ArrowRight, BriefcaseBusiness, Check, ChevronRight, Clock3, Leaf, Menu, Package, Search, ShieldCheck, Sparkles, Truck, UserRound, X, Wrench } from 'lucide-react';
import { Logo } from './Logo';
import type { View } from '@/lib/types';

interface LandingDarkProps { onNavigate: (view: View) => void; lang: 'id' | 'en'; }
type Service = { title: string; icon: typeof Package };

const fieldImages = [
  'https://images.pexels.com/photos/1216589/pexels-photo-1216589.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'https://images.pexels.com/photos/4481327/pexels-photo-4481327.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'https://images.pexels.com/photos/162553/keys-workshop-metalwork-hand-162553.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'https://images.pexels.com/photos/1268855/pexels-photo-1268855.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'https://images.pexels.com/photos/3846554/pexels-photo-3846554.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'https://images.pexels.com/photos/3862627/pexels-photo-3862627.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'https://images.pexels.com/photos/5691637/pexels-photo-5691637.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'https://images.pexels.com/photos/3769138/pexels-photo-3769138.jpeg?auto=compress&cs=tinysrgb&w=1400',
];

export function LandingDark({ onNavigate, lang }: LandingDarkProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const t = lang === 'id' ? {
    find: 'Cari Kerja', worker: 'Pesan Pekerja', today: 'Butuh tenaga hari ini?',
  } : {
    find: 'Find Work', worker: 'Hire a Worker', today: 'Need a worker today?',
  };
  const bg = 'bg-black';
  const panel = 'bg-[#202020]';

  return (
    <div className={`min-h-screen ${bg} text-white`}>
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <button onClick={() => onNavigate('landing')} aria-label="KerjaHarian home"><Logo /></button>
          <nav className="hidden md:flex items-center gap-7 text-sm text-white/75">
            <button onClick={() => onNavigate('landing')} className="hover:text-white">Home</button>
            <button onClick={() => onNavigate('worker')} className="hover:text-white">{t.find}</button>
            <button onClick={() => onNavigate('employer')} className="hover:text-white">{t.worker}</button>
          </nav>
          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-5 pt-8 pb-16">
          <div className="relative overflow-hidden rounded-3xl min-h-[540px]">
            <img src={fieldImages[0]} alt="Pekerja lapangan" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/20" />
            <div className="relative z-10 flex min-h-[540px] max-w-2xl flex-col justify-end p-7 md:p-12">
              <p className="mb-3 text-xs uppercase tracking-[0.22em] text-white/70">KerjaHarian</p>
              <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">Kerja hari ini.<br />Penghasilan hari ini.</h1>
              <p className="mt-5 max-w-xl text-base md:text-lg text-white/75">Temukan pekerjaan harian atau pekerja terdekat dengan proses yang sederhana.</p>
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
              <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight">Butuh tenaga hari ini?</h2>
              <p className="mt-5 max-w-lg text-white/65">Pesan tenaga kerja harian untuk kebutuhan yang nyata, dekat, dan mendesak.</p>
              <button onClick={() => onNavigate('employer')} className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-black">Pesan pekerja <ArrowRight size={16} /></button>
            </div>
            <div className="overflow-x-auto snap-x snap-mandatory scrollbar-hide">
              <div className="flex w-max gap-4 pb-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="snap-start w-[82vw] max-w-[520px] aspect-[4/3] overflow-hidden rounded-2xl shrink-0">
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
              <div><p className="text-xs uppercase tracking-[0.2em] text-orange-400">Pekerjaan</p><h2 className="mt-2 text-3xl md:text-4xl font-semibold">Cari kerja di dekatmu</h2></div>
              <button onClick={() => onNavigate('worker')} className="hidden sm:flex items-center gap-1 text-sm text-white/70">Lihat semua <ChevronRight size={16} /></button>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[['Logistik', Package, 5], ['Kebersihan', Leaf, 6], ['Tukang', Wrench, 7], ['Serabutan', BriefcaseBusiness, 2]].map(([title, Icon, imageIndex]) => {
                const I = Icon as typeof Package;
                return <button key={title as string} onClick={() => onNavigate('worker')} className="group overflow-hidden rounded-2xl text-left bg-[#202020] border border-white/10">
                  <div className="aspect-[4/3] overflow-hidden"><img src={fieldImages[imageIndex as number]} alt={title as string} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /></div>
                  <div className="flex items-center justify-between p-4"><span className="font-medium">{title as string}</span><I size={18} className="text-white/50" /></div>
                </button>;
              })}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <div className="flex gap-5 text-sm">
            <button onClick={() => onNavigate('worker')} className="text-white hover:text-white">{t.find}</button>
            <button onClick={() => onNavigate('employer')} className="text-white hover:text-white">{t.worker}</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
