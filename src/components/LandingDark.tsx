import { useState } from 'react';
import { ArrowRight, BriefcaseBusiness, Check, ChevronRight, Clock3, Leaf, Menu, Package, Search, ShieldCheck, Sparkles, Truck, UserRound, X, Wrench } from 'lucide-react';
import { Logo } from './Logo';
import type { View } from '@/lib/types';

interface LandingDarkProps { onNavigate: (view: View) => void; lang: 'id' | 'en'; }
type Service = { title: string; icon: typeof Package };
const services: Service[] = [
  { title: 'Logistik', icon: Truck }, { title: 'Kebersihan', icon: Sparkles }, { title: 'Tukang', icon: Wrench }, { title: 'Serabutan', icon: BriefcaseBusiness },
  { title: 'Pindahan', icon: Package }, { title: 'Kebun', icon: Leaf }, { title: 'Event', icon: Clock3 }, { title: 'Lainnya', icon: ChevronRight },
];
const fieldImages = [
  'https://images.unsplash.com/photo-1747673902815-cb0a04ef2cf3?auto=format&fit=crop&w=1400&q=82',
  'https://images.pexels.com/photos/13699204/pexels-photo-13699204.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'https://images.pexels.com/photos/4281613/pexels-photo-4281613.jpeg?auto=compress&cs=tinysrgb&w=1400',
];
const bg = 'bg-[#202020]';
const panel = 'bg-[#2A2A2A]';
const line = 'border-white/[0.10]';
const muted = 'text-white/60';
const orange = 'text-[#F97316]';

export function LandingDark({ onNavigate, lang }: LandingDarkProps) {
  const id = lang === 'id';
  const [menuOpen, setMenuOpen] = useState(false);
  const go = (view: View) => { setMenuOpen(false); onNavigate(view); };
  return (
    <main className={`min-h-screen ${bg} text-white`}>
      <header className={`relative z-[80] border-b ${line} ${bg}`}>
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="KerjaHarian" className="shrink-0"><Logo className="origin-left scale-90" /></button>
          <nav className="hidden items-center gap-8 lg:flex">
            <button onClick={() => go('worker')} className="text-sm font-medium text-white/70 hover:text-white">{id ? 'Cari kerja' : 'Find work'}</button>
            <button onClick={() => go('employer')} className="text-sm font-medium text-white/70 hover:text-white">{id ? 'Butuh pekerja' : 'Need workers'}</button>
            <button onClick={() => go('help')} className="text-sm font-medium text-white/70 hover:text-white">{id ? 'Bantuan' : 'Help'}</button>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={() => go('worker')} className="hidden px-4 py-2.5 text-sm font-semibold text-white/75 hover:text-white sm:block">{id ? 'Cari kerja' : 'Find work'}</button>
            <button onClick={() => go('employer')} className="rounded-full bg-[#F97316] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#EA580C]">{id ? 'Pesan pekerja' : 'Book a worker'}</button>
            <button onClick={() => setMenuOpen(v => !v)} aria-label="Menu" className="grid h-10 w-10 place-items-center rounded-full text-white/80 hover:bg-white/10 lg:hidden">{menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          </div>
        </div>
        {menuOpen && <nav className={`border-t ${line} ${bg} px-5 py-3 lg:hidden`}><div className="mx-auto flex max-w-7xl flex-col">
          <button onClick={() => go('worker')} className={`border-b ${line} py-3 text-left text-sm font-semibold`}>{id ? 'Cari kerja' : 'Find work'}</button>
          <button onClick={() => go('employer')} className={`border-b ${line} py-3 text-left text-sm font-semibold`}>{id ? 'Butuh pekerja' : 'Need workers'}</button>
          <button onClick={() => go('help')} className="py-3 text-left text-sm font-semibold">{id ? 'Bantuan' : 'Help'}</button>
        </div></nav>}
      </header>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        {/* 1. Hero */}
        <section className={`border-b ${line} py-14 sm:py-20 lg:py-24`}>
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
            <div className="max-w-2xl">
              <p className={`text-xs font-bold uppercase tracking-[0.18em] ${orange}`}>KerjaHarian</p>
              <h1 className="mt-4 text-[44px] font-semibold leading-[1.02] tracking-[-0.045em] sm:text-[60px] lg:text-[72px]">{id ? <>Kerja hari ini.<br />Lebih dekat.</> : <>Work today.<br />Closer to you.</>}</h1>
              <p className={`mt-5 max-w-lg text-base leading-7 ${muted}`}>{id ? 'Temukan pekerjaan harian atau pekerja yang kamu butuhkan, dengan cara yang sederhana.' : 'Find daily work or the worker you need, simply.'}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <button onClick={() => go('worker')} className="inline-flex items-center gap-2 rounded-full bg-[#F97316] px-5 py-3 text-sm font-bold text-white hover:bg-[#EA580C]">{id ? 'Saya cari kerja' : 'Find work'} <ArrowRight className="h-4 w-4" /></button>
                <button onClick={() => go('employer')} className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm font-bold text-white hover:bg-white/10">{id ? 'Saya butuh pekerja' : 'I need a worker'} <ArrowRight className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="relative min-h-[300px] overflow-hidden rounded-[28px] bg-black sm:min-h-[390px] lg:min-h-[450px]">
              <img src={fieldImages[0]} alt="Pekerjaan lapangan" className="absolute inset-0 h-full w-full object-cover opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.18em] text-white/55">{id ? 'Pekerjaan nyata' : 'Real work'}</p><p className="mt-2 max-w-sm text-2xl font-semibold leading-tight text-white sm:text-3xl">{id ? 'Tenaga kerja harian, saat kamu membutuhkannya.' : 'Daily workers, when you need them.'}</p></div>
            </div>
          </div>
        </section>

        {/* 2. Service discovery */}
        <section className={`border-b ${line} py-12 sm:py-16`}>
          <div className="flex items-end justify-between gap-5"><div><p className={`text-xs font-bold uppercase tracking-[0.16em] ${orange}`}>{id ? 'Layanan' : 'Services'}</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{id ? 'Pilih yang kamu butuhkan.' : 'Choose what you need.'}</h2></div><button onClick={() => go('employer')} className="hidden items-center gap-1 text-sm font-semibold text-[#F97316] sm:flex">{id ? 'Lihat semua' : 'See all'} <ArrowRight className="h-4 w-4" /></button></div>
          <div className="mt-8 grid grid-cols-4 gap-y-8 sm:grid-cols-8">
            {services.map(({ title, icon: Icon }) => <button key={title} onClick={() => go('employer')} className="group flex flex-col items-center gap-3 text-center"><span className={`grid h-16 w-16 place-items-center rounded-[20px] ${panel} ${orange} ring-1 ring-white/[0.07] transition group-hover:-translate-y-1 group-hover:bg-[#303030] sm:h-[68px] sm:w-[68px]`}><Icon className="h-6 w-6" strokeWidth={1.7} /></span><span className="text-xs font-medium text-white/70">{title}</span></button>)}
          </div>
        </section>

        {/* 3. Worker */}
        <section className={`border-b ${line} py-12 sm:py-16`}><div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center"><div><p className={`text-xs font-bold uppercase tracking-[0.16em] ${orange}`}>{id ? 'Untuk pekerja' : 'For workers'}</p><h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">{id ? 'Cari kerja tanpa ribet.' : 'Find work without the hassle.'}</h2><p className={`mt-4 max-w-lg text-sm leading-7 ${muted} sm:text-base`}>{id ? 'Lihat peluang kerja harian dan ambil pekerjaan yang sesuai dengan waktu serta kemampuanmu.' : 'See daily opportunities and take work that fits your time and skills.'}</p><button onClick={() => go('worker')} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#F97316]">{id ? 'Mulai cari kerja' : 'Start finding work'} <ArrowRight className="h-4 w-4" /></button></div><div className="grid gap-3 sm:grid-cols-3">{[['01','Tanpa CV','Mulai dari kebutuhan kerja harian.'],['02','Lebih dekat','Peluang kerja disesuaikan area.'],['03','Lebih jelas','Detail pekerjaan terlihat sebelum mengambilnya.']].map(([n,title,text]) => <div key={n} className={`rounded-[24px] ${panel} p-5 ring-1 ring-white/[0.07] sm:p-6`}><span className={`text-xs font-bold ${orange}`}>{n}</span><h3 className="mt-7 text-base font-semibold">{title}</h3><p className={`mt-2 text-xs leading-5 ${muted}`}>{text}</p></div>)}</div></div></section>

        {/* 4. Employer */}
        <section className={`border-b ${line} py-12 sm:py-16`}><div className="grid gap-10 lg:grid-cols-[1.05fr_.95fr] lg:items-center"><div className="grid grid-cols-2 gap-3 sm:gap-4"><div className="overflow-hidden rounded-[26px] bg-black sm:mt-8"><img src={fieldImages[1]} alt="Tenaga kerja lapangan" className="h-[270px] w-full object-cover sm:h-[370px]" loading="lazy" /></div><div className="overflow-hidden rounded-[26px] bg-black"><img src={fieldImages[2]} alt="Pekerjaan teknis" className="h-[270px] w-full object-cover sm:h-[370px]" loading="lazy" /></div></div><div><p className={`text-xs font-bold uppercase tracking-[0.16em] ${orange}`}>{id ? 'Untuk pemberi kerja' : 'For employers'}</p><h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">{id ? 'Butuh tenaga hari ini?' : 'Need a worker today?'}</h2><p className={`mt-4 max-w-lg text-sm leading-7 ${muted} sm:text-base`}>{id ? 'Pilih jenis pekerjaan, lihat harga, lalu mulai order tenaga kerja harian.' : 'Choose the work, see the price, then start a daily-worker order.'}</p><div className="mt-6 space-y-3">{['Pilih layanan','Tentukan kebutuhan dan lokasi','Lihat harga sebelum order'].map(text => <div key={text} className="flex items-center gap-3 text-sm font-medium"><span className={`grid h-7 w-7 place-items-center rounded-full ${panel} ${orange}`}><Check className="h-4 w-4" /></span>{text}</div>)}</div><button onClick={() => go('employer')} className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-[#202020] hover:bg-white/90">{id ? 'Pesan pekerja' : 'Book a worker'} <ArrowRight className="h-4 w-4" /></button></div></div></section>

        {/* 5. Work */}
        <section className={`border-b ${line} py-12 sm:py-16`}><div className="max-w-3xl"><p className={`text-xs font-bold uppercase tracking-[0.16em] ${orange}`}>{id ? 'Pekerjaan sehari-hari' : 'Everyday work'}</p><h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">{id ? 'Dari angkut sampai perbaikan.' : 'From moving to fixing.'}</h2><p className={`mt-4 text-sm leading-7 ${muted} sm:text-base`}>{id ? 'Satu tempat untuk berbagai kebutuhan tenaga kerja fisik.' : 'One place for everyday physical-work needs.'}</p></div><div className="mt-8 grid gap-3 sm:grid-cols-3">{[['Logistik','Angkut, bongkar-muat, pindahan.',fieldImages[0]],['Kebersihan','Bersih-bersih rumah atau usaha.',fieldImages[1]],['Tukang','Perbaikan dan renovasi ringan.',fieldImages[2]]].map(([title,text,image]) => <button key={title} onClick={() => go('employer')} className={`group overflow-hidden rounded-[26px] ${panel} text-left ring-1 ring-white/[0.07]`}><div className="relative h-64 overflow-hidden bg-black sm:h-72"><img src={image} alt={title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" /><div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" /><div className="absolute bottom-0 p-5 text-white"><h3 className="text-xl font-semibold">{title}</h3><p className="mt-1 text-xs text-white/70">{text}</p></div></div></button>)}</div></section>

        {/* 6. How it works */}
        <section className={`border-b ${line} py-12 sm:py-16`}><div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr] lg:items-start"><div><p className={`text-xs font-bold uppercase tracking-[0.16em] ${orange}`}>{id ? 'Cara kerja' : 'How it works'}</p><h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">{id ? 'Sederhana dari awal.' : 'Simple from the start.'}</h2></div><div className={`divide-y ${line} border-y ${line}`}>{[['01','Pilih kebutuhan','Cari pekerjaan atau pilih jenis tenaga kerja yang kamu butuhkan.'],['02','Lihat detail','Area, pekerjaan, dan harga terlihat sebelum order dilanjutkan.'],['03','Mulai pekerjaan','Ikuti status order sampai pekerjaan selesai.']].map(([n,title,text]) => <div key={n} className="grid grid-cols-[52px_1fr] gap-4 py-6 sm:grid-cols-[72px_1fr] sm:py-8"><span className={`text-sm font-bold ${orange}`}>{n}</span><div><h3 className="text-base font-semibold sm:text-lg">{title}</h3><p className={`mt-2 max-w-xl text-sm leading-6 ${muted}`}>{text}</p></div></div>)}</div></div></section>

        {/* 7. Trust */}
        <section className={`border-b ${line} py-12 sm:py-16`}><div className="grid gap-3 sm:grid-cols-3">{[[ShieldCheck,'Harga terlihat','Biaya tampil sebelum order.'],[Search,'Pilihan jelas','Pilih layanan sesuai kebutuhan.'],[UserRound,'Akun terverifikasi','Keamanan dan kepercayaan menjadi bagian dari alur layanan.']].map(([Icon,title,text]) => <div key={title as string} className={`rounded-[26px] ${panel} p-6 ring-1 ring-white/[0.07] sm:p-7`}><span className={`grid h-11 w-11 place-items-center rounded-2xl bg-[#202020] ${orange}`}><Icon className="h-5 w-5" /></span><h3 className="mt-6 text-base font-semibold">{title as string}</h3><p className={`mt-2 text-sm leading-6 ${muted}`}>{text as string}</p></div>)}</div></section>

        {/* 8. CTA */}
        <section className="py-12 sm:py-16"><div className="rounded-[30px] bg-[#151515] px-6 py-11 ring-1 ring-white/[0.08] sm:px-10 sm:py-14 lg:px-14"><div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end"><div className="max-w-2xl"><p className={`text-xs font-bold uppercase tracking-[0.18em] ${orange}`}>KerjaHarian</p><h2 className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-6xl">{id ? 'Siap mulai hari ini?' : 'Ready to start today?'}</h2><p className={`mt-4 max-w-xl text-sm leading-7 ${muted} sm:text-base`}>{id ? 'Cari pekerjaan atau temukan tenaga kerja untuk kebutuhanmu.' : 'Find work or find the worker you need.'}</p></div><div className="flex flex-wrap gap-3"><button onClick={() => go('worker')} className="inline-flex items-center gap-2 rounded-full bg-[#F97316] px-5 py-3 text-sm font-bold text-white hover:bg-[#EA580C]">{id ? 'Cari kerja' : 'Find work'} <ArrowRight className="h-4 w-4" /></button><button onClick={() => go('employer')} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-[#202020] hover:bg-white/90">{id ? 'Pesan pekerja' : 'Book a worker'} <ArrowRight className="h-4 w-4" /></button></div></div></div></section>

        {/* 9. Footer */}
        <footer className={`border-t ${line} py-10 sm:py-12`}><div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between"><div><Logo className="origin-left scale-90" /><p className={`mt-4 max-w-sm text-xs leading-5 ${muted}`}>{id ? 'Marketplace tenaga kerja harian untuk kebutuhan nyata sehari-hari.' : 'A daily-worker marketplace for everyday physical-work needs.'}</p></div><div className="flex flex-wrap gap-x-6 gap-y-3 text-xs font-medium text-white/45"><button onClick={() => go('help')} className="hover:text-white">{id ? 'Bantuan' : 'Help'}</button><button onClick={() => go('terms')} className="hover:text-white">{id ? 'Syarat & Ketentuan' : 'Terms'}</button><button onClick={() => go('privacy')} className="hover:text-white">{id ? 'Privasi' : 'Privacy'}</button><span>© 2026 KerjaHarian</span></div></div></footer>
      </div>
    </main>
  );
}
