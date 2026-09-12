import { useState } from 'react';
import { ArrowRight, BriefcaseBusiness, ChevronRight, Leaf, Menu, Package, ShieldCheck, Sparkles, Users, Wrench, X } from 'lucide-react';
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

const categories = [
  ['Logistik', Package, 5], ['Kebersihan', Leaf, 6], ['Tukang', Wrench, 7], ['Serabutan', BriefcaseBusiness, 8],
] as const;

export function LandingDark({ onNavigate, lang }: LandingDarkProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const id = lang === 'id';
  const t = id
    ? { find: 'Cari Kerja', worker: 'Pesan Pekerja', today: 'Butuh tenaga hari ini?', categories: 'Pekerjaan yang tersedia', how: 'Sesederhana itu', trusted: 'Dibangun untuk kerja harian', ready: 'Siap mulai hari ini?' }
    : { find: 'Find Work', worker: 'Hire a Worker', today: 'Need a worker today?', categories: 'Available work', how: 'That simple', trusted: 'Built for daily work', ready: 'Ready to start today?' };
  const go = (view: View) => { setMenuOpen(false); onNavigate(view); };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* 1 — Navigation */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <button onClick={() => go('landing')} aria-label="KerjaHarian home"><Logo /></button>
          <nav className="hidden items-center gap-7 text-sm text-white/75 md:flex">
            <button onClick={() => go('landing')} className="hover:text-white">Home</button>
            <button onClick={() => go('worker')} className="hover:text-white">{t.find}</button>
            <button onClick={() => go('employer')} className="hover:text-white">{t.worker}</button>
          </nav>
          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">{menuOpen ? <X /> : <Menu />}</button>
        </div>
        {menuOpen && <div className="border-t border-white/10 px-5 py-4 md:hidden"><div className="flex flex-col gap-4 text-sm"><button onClick={() => go('landing')} className="text-left">Home</button><button onClick={() => go('worker')} className="text-left">{t.find}</button><button onClick={() => go('employer')} className="text-left">{t.worker}</button></div></div>}
      </header>

      <main>
        {/* 2 — Hero */}
        <section className="mx-auto max-w-7xl px-5 py-8 md:py-12">
          <div className="relative min-h-[440px] overflow-hidden rounded-[28px]">
            <img src={fieldImages[0]} alt="Pekerja lapangan" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/15" />
            <div className="relative z-10 flex min-h-[440px] max-w-xl flex-col justify-end p-7 md:p-10">
              <p className="mb-3 text-[11px] uppercase tracking-[0.22em] text-white/65">KerjaHarian</p>
              <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">{id ? <>Kerja hari ini.<br />Penghasilan hari ini.</> : <>Work today.<br />Earn today.</>}</h1>
              <p className="mt-4 max-w-lg text-sm leading-6 text-white/70 md:text-base">{id ? 'Temukan pekerjaan harian atau pekerja terdekat dengan proses yang sederhana.' : 'Find daily work or nearby workers through a simple, practical flow.'}</p>
              <div className="mt-6 flex flex-wrap gap-3"><button onClick={() => go('worker')} className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black">{t.find}</button><button onClick={() => go('employer')} className="rounded-full bg-orange-500 px-5 py-2.5 text-sm font-medium text-white">{t.worker}</button></div>
            </div>
          </div>
        </section>

        {/* 3 — Employer */}
        <section className="border-y border-white/10 py-16 md:py-20">
          <div className="mx-auto grid max-w-7xl gap-9 px-5 md:grid-cols-2 md:items-center">
            <div><p className="text-[11px] uppercase tracking-[0.2em] text-orange-400">Untuk pemberi kerja</p><h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">{t.today}</h2><p className="mt-4 max-w-lg text-sm leading-6 text-white/60">{id ? 'Pesan tenaga kerja harian untuk kebutuhan yang nyata, dekat, dan mendesak.' : 'Book daily workers for real, nearby and urgent needs.'}</p><button onClick={() => go('employer')} className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black">{t.worker}<ArrowRight size={15} /></button></div>
            <div className="overflow-x-auto snap-x snap-mandatory scrollbar-hide"><div className="flex w-max gap-4 pb-2">{[1,2,3,4].map((i) => <div key={i} className="aspect-[4/3] w-[78vw] max-w-[480px] shrink-0 snap-start overflow-hidden rounded-2xl"><img src={fieldImages[i]} alt="Pekerja KerjaHarian" className="h-full w-full object-cover" /></div>)}</div></div>
          </div>
        </section>

        {/* 4 — Categories */}
        <section className="py-16 md:py-20"><div className="mx-auto max-w-7xl px-5"><div className="flex items-end justify-between gap-5"><div><p className="text-[11px] uppercase tracking-[0.2em] text-orange-400">{t.categories}</p><h2 className="mt-2 text-2xl font-semibold md:text-3xl">{id ? 'Cari kerja di dekatmu' : 'Find work near you'}</h2></div><button onClick={() => go('worker')} className="hidden items-center gap-1 text-sm text-white/60 sm:flex">{id ? 'Lihat semua' : 'View all'} <ChevronRight size={15} /></button></div><div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{categories.map(([title, Icon, imageIndex]) => <button key={title} onClick={() => go('worker')} className="group overflow-hidden rounded-2xl border border-white/10 bg-[#202020] text-left"><div className="aspect-[4/3] overflow-hidden"><img src={fieldImages[imageIndex]} alt={title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /></div><div className="flex items-center justify-between p-3.5"><span className="text-sm font-medium">{title}</span><Icon size={17} className="text-white/45" /></div></button>)}</div></div></section>

        {/* 5 — How it works */}
        <section className="border-y border-white/10 py-16 md:py-20"><div className="mx-auto max-w-7xl px-5"><div className="max-w-xl"><p className="text-[11px] uppercase tracking-[0.2em] text-orange-400">{t.how}</p><h2 className="mt-2 text-2xl font-semibold md:text-3xl">{id ? 'Dari kebutuhan sampai selesai, tanpa rumit.' : 'From request to completion, without the complexity.'}</h2></div><div className="mt-9 grid gap-8 md:grid-cols-3"><div><span className="text-3xl font-light text-white/35">01</span><h3 className="mt-3 text-base font-medium">{id ? 'Pilih kebutuhan' : 'Choose a need'}</h3><p className="mt-2 text-sm leading-6 text-white/55">{id ? 'Pilih pekerjaan atau tenaga yang sesuai.' : 'Choose the work or worker you need.'}</p></div><div><span className="text-3xl font-light text-white/35">02</span><h3 className="mt-3 text-base font-medium">{id ? 'Tentukan waktu & lokasi' : 'Set time & location'}</h3><p className="mt-2 text-sm leading-6 text-white/55">{id ? 'Detail pekerjaan dibuat jelas sejak awal.' : 'Keep job details clear from the start.'}</p></div><div><span className="text-3xl font-light text-white/35">03</span><h3 className="mt-3 text-base font-medium">{id ? 'Kerjakan' : 'Get it done'}</h3><p className="mt-2 text-sm leading-6 text-white/55">{id ? 'Status pekerjaan mengikuti alur yang terukur.' : 'Job status follows a measurable flow.'}</p></div></div></div></section>

        {/* 6 — Worker */}
        <section className="py-16 md:py-20"><div className="mx-auto grid max-w-7xl gap-8 px-5 md:grid-cols-[1fr_1.2fr] md:items-center"><div><p className="text-[11px] uppercase tracking-[0.2em] text-orange-400">Untuk pekerja</p><h2 className="mt-2 text-2xl font-semibold md:text-3xl">{id ? 'Kerja dekat. Mulai cepat.' : 'Work nearby. Start quickly.'}</h2><p className="mt-4 max-w-lg text-sm leading-6 text-white/60">{id ? 'Tidak perlu CV panjang. Temukan pekerjaan harian yang sesuai dengan kemampuan dan lokasi.' : 'No long CV. Find daily work that fits your skills and location.'}</p><button onClick={() => go('worker')} className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium hover:bg-white hover:text-black">{t.find}<ArrowRight size={15} /></button></div><div className="relative overflow-hidden rounded-2xl aspect-[16/9]"><img src={fieldImages[5]} alt="Pekerja harian" className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" /><div className="absolute bottom-4 left-4 flex items-center gap-2 text-sm"><Users size={16} /> {id ? 'Peluang kerja harian' : 'Daily work opportunities'}</div></div></div></section>

        {/* 7 — Trust */}
        <section className="border-y border-white/10 py-16 md:py-20"><div className="mx-auto max-w-7xl px-5"><div className="max-w-xl"><p className="text-[11px] uppercase tracking-[0.2em] text-orange-400">{t.trusted}</p><h2 className="mt-2 text-2xl font-semibold md:text-3xl">{id ? 'Sederhana di depan, aman di belakang.' : 'Simple in front, protected behind the scenes.'}</h2></div><div className="mt-9 grid gap-4 sm:grid-cols-3"><div className="rounded-xl border border-white/10 p-5"><ShieldCheck size={20} className="text-orange-400" /><h3 className="mt-4 text-sm font-medium">{id ? 'Verifikasi' : 'Verification'}</h3><p className="mt-2 text-sm leading-6 text-white/55">{id ? 'Identitas dan akses mengikuti aturan platform.' : 'Identity and access follow platform rules.'}</p></div><div className="rounded-xl border border-white/10 p-5"><Sparkles size={20} className="text-orange-400" /><h3 className="mt-4 text-sm font-medium">{id ? 'Harga jelas' : 'Clear pricing'}</h3><p className="mt-2 text-sm leading-6 text-white/55">{id ? 'Harga katalog menjadi dasar transaksi.' : 'Catalog pricing forms the transaction basis.'}</p></div><div className="rounded-xl border border-white/10 p-5"><Users size={20} className="text-orange-400" /><h3 className="mt-4 text-sm font-medium">{id ? 'Alur terukur' : 'Measured flow'}</h3><p className="mt-2 text-sm leading-6 text-white/55">{id ? 'Status pekerjaan dapat dipantau dari awal sampai selesai.' : 'Job status can be followed from start to completion.'}</p></div></div></div></section>

        {/* 8 — CTA */}
        <section className="py-16 md:py-20"><div className="mx-auto max-w-7xl px-5"><div className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-[#202020] px-6 py-8 md:flex-row md:items-center md:justify-between md:px-8"><div><p className="text-[11px] uppercase tracking-[0.2em] text-orange-400">KerjaHarian</p><h2 className="mt-2 text-2xl font-semibold">{t.ready}</h2><p className="mt-2 text-sm text-white/55">{id ? 'Pilih jalur yang Anda butuhkan.' : 'Choose the path you need.'}</p></div><div className="flex flex-wrap gap-3"><button onClick={() => go('worker')} className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black">{t.find}</button><button onClick={() => go('employer')} className="rounded-full bg-orange-500 px-5 py-2.5 text-sm font-medium text-white">{t.worker}</button></div></div></div></section>
      </main>

      {/* 9 — Footer */}
      <footer className="border-t border-white/10 bg-black py-10 text-white"><div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 sm:flex-row sm:items-center sm:justify-between"><Logo /><div className="flex gap-5 text-sm font-medium"><button onClick={() => go('worker')} className="!text-white opacity-100 hover:!text-white">{t.find}</button><button onClick={() => go('employer')} className="!text-white opacity-100 hover:!text-white">{t.worker}</button></div></div></footer>
    </div>
  );
}
