import { ArrowRight, CheckCircle, Clock3, MapPin, Search, ShieldCheck, Star, Users } from 'lucide-react';
import type { View } from '@/lib/types';

interface LandingDarkProps { onNavigate: (view: View) => void; lang: 'id' | 'en'; }

const categories = [
  ['Angkut & Logistik', 'Cepat, dekat, siap jalan'],
  ['Bersih-bersih', 'Rumah, kantor, area usaha'],
  ['Pindahan', 'Bantu angkat dan pindah'],
  ['Potong Rumput', 'Kebun dan area luar'],
];

const jobs = [
  { title: 'Angkut Barang', price: 'Rp150.000', distance: '1,8 km', rating: '4,9', image: 'https://images.pexels.com/photos/13699204/pexels-photo-13699204.jpeg?auto=compress&cs=tinysrgb&w=900' },
  { title: 'Bersih-bersih', price: 'Rp120.000', distance: '2,4 km', rating: '4,8', image: 'https://images.pexels.com/photos/10151372/pexels-photo-10151372.jpeg?auto=compress&cs=tinysrgb&w=900' },
  { title: 'Pekerja Proyek', price: 'Rp200.000', distance: '3,1 km', rating: '4,9', image: 'https://images.pexels.com/photos/8173678/pexels-photo-8173678.jpeg?auto=compress&cs=tinysrgb&w=900' },
];

export function LandingDark({ onNavigate, lang }: LandingDarkProps) {
  const id = lang === 'id';
  return (
    <main className="min-h-screen bg-[#050505] pb-24 text-white">
      <section className="border-b border-white/10 bg-[#050505]">
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 sm:pb-24 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[1.08fr_.92fr]">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-white/70">
                <span className="h-2 w-2 rounded-full bg-orange-500" /> {id ? 'Marketplace tenaga kerja on-demand' : 'On-demand labor marketplace'}
              </div>
              <h1 className="max-w-3xl text-5xl font-black leading-[.95] tracking-[-.055em] sm:text-7xl">
                {id ? <>BUTUH TENAGA<br /><span className="text-orange-500">KERJA HARI INI?</span></> : <>NEED WORKERS<br /><span className="text-orange-500">TODAY?</span></>}
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-white/60 sm:text-lg">
                {id ? 'Cari pekerja terdekat. Lihat harga. Pesan. Selesai.' : 'Find nearby workers. See the price. Book. Done.'}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button onClick={() => onNavigate('employer')} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 px-7 py-3.5 text-sm font-black text-white shadow-[0_12px_32px_rgba(249,115,22,.22)] transition hover:-translate-y-0.5 hover:bg-orange-400">
                  {id ? 'Cari Pekerja' : 'Find Workers'} <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={() => onNavigate('worker')} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-7 py-3.5 text-sm font-bold text-white transition hover:bg-white/[0.08]">
                  {id ? 'Cari Kerja' : 'Find Work'}
                </button>
              </div>
              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-white/50">
                <span className="inline-flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-orange-500" /> Harga jelas</span>
                <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-orange-500" /> Lebih aman</span>
                <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4 text-orange-500" /> On-demand</span>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#111] p-2 shadow-2xl">
              <img src="https://images.unsplash.com/photo-1747673902815-cb0a04ef2cf3?auto=format&fit=crop&w=1400&q=82" alt="Pekerja lapangan" className="h-[380px] w-full rounded-[1.5rem] object-cover opacity-90 sm:h-[500px]" />
              <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/10 bg-black/85 p-4 backdrop-blur-xl">
                <div className="flex items-center justify-between gap-4">
                  <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-orange-500">KerjaHarian</p><p className="mt-1 text-sm font-bold">{id ? 'Pekerjaan nyata. Langsung jalan.' : 'Real work. Ready to go.'}</p></div>
                  <div className="rounded-xl bg-orange-500 p-3"><Users className="h-5 w-5" /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-white/10 bg-[#111] p-2 shadow-xl">
          <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
            <div className="flex min-h-14 items-center gap-3 rounded-xl bg-white/[0.04] px-4">
              <Search className="h-5 w-5 text-orange-500" />
              <div><p className="text-[10px] font-black uppercase tracking-wider text-white/40">{id ? 'Cari' : 'Search'}</p><p className="text-sm font-semibold text-white/70">{id ? 'Apa pekerjaan yang Anda butuhkan?' : 'What service do you need?'}</p></div>
            </div>
            <button onClick={() => onNavigate('employer')} className="min-h-14 rounded-xl px-5 text-sm font-bold text-white/70 hover:bg-white/[0.05]"><MapPin className="mr-2 inline h-4 w-4 text-orange-500" />{id ? 'Di sekitar saya' : 'Near me'}</button>
            <button onClick={() => onNavigate('employer')} className="min-h-14 rounded-xl bg-orange-500 px-7 text-sm font-black text-white hover:bg-orange-400">{id ? 'Cari' : 'Search'}</button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10 pt-4 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between"><div><p className="text-xs font-black uppercase tracking-[.16em] text-orange-500">Kategori</p><h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{id ? 'Pilih pekerjaan yang Anda butuhkan.' : 'Choose what you need.'}</h2></div></div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {categories.map(([title, sub], i) => <button key={title} onClick={() => onNavigate('employer')} className="group rounded-2xl border border-white/10 bg-[#111] p-5 text-left transition hover:-translate-y-0.5 hover:border-orange-500/50 hover:bg-[#151515]"><div className="mb-8 text-xs font-black text-white/30">0{i + 1}</div><h3 className="text-base font-black">{title}</h3><p className="mt-1 text-xs leading-5 text-white/45">{sub}</p><ArrowRight className="mt-5 h-4 w-4 text-orange-500 transition group-hover:translate-x-1" /></button>)}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between"><div><p className="text-xs font-black uppercase tracking-[.16em] text-orange-500">{id ? 'Terdekat' : 'Nearby'}</p><h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{id ? 'Pekerjaan yang siap dipesan.' : 'Jobs ready to book.'}</h2></div><button onClick={() => onNavigate('employer')} className="hidden items-center gap-2 text-sm font-bold text-white/60 hover:text-white sm:flex">{id ? 'Lihat semua' : 'View all'} <ArrowRight className="h-4 w-4" /></button></div>
        <div className="grid gap-4 md:grid-cols-3">
          {jobs.map(job => <article key={job.title} className="overflow-hidden rounded-2xl border border-white/10 bg-[#111] transition hover:-translate-y-0.5 hover:border-white/20">
            <div className="relative"><img src={job.image} alt={job.title} className="h-52 w-full object-cover" /><span className="absolute left-3 top-3 rounded-full bg-black/75 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur">Tersedia</span></div>
            <div className="p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="text-base font-black">{job.title}</h3><p className="mt-1 text-xs text-white/45"><MapPin className="mr-1 inline h-3.5 w-3.5" />{job.distance}</p></div><div className="flex items-center gap-1 text-xs font-bold"><Star className="h-3.5 w-3.5 fill-orange-500 text-orange-500" />{job.rating}</div></div><div className="mt-5 flex items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wider text-white/35">Harga</p><p className="mt-1 text-lg font-black text-white">{job.price}</p></div><button onClick={() => onNavigate('employer')} className="rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-black text-white hover:bg-orange-400">{id ? 'PESAN SEKARANG' : 'BOOK NOW'}</button></div></div>
          </article>)}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]"><div className="rounded-[2rem] bg-orange-500 p-7 text-white sm:p-9"><p className="text-xs font-black uppercase tracking-[.16em] text-white/70">Cara kerja</p><h2 className="mt-3 max-w-lg text-3xl font-black tracking-tight sm:text-4xl">{id ? 'Cari. Pesan. Selesai.' : 'Find. Book. Done.'}</h2><div className="mt-8 grid gap-5 sm:grid-cols-3"><div><b className="text-sm">01 · Pilih</b><p className="mt-1 text-xs leading-5 text-white/75">Pilih kategori dan pekerjaan.</p></div><div><b className="text-sm">02 · Order</b><p className="mt-1 text-xs leading-5 text-white/75">Harga tampil sebelum order.</p></div><div><b className="text-sm">03 · Selesai</b><p className="mt-1 text-xs leading-5 text-white/75">Pantau pekerjaan sampai selesai.</p></div></div></div><div className="rounded-[2rem] border border-white/10 bg-[#111] p-7 sm:p-9"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5"><ShieldCheck className="h-6 w-6 text-orange-500" /></div><h3 className="mt-5 text-xl font-black">{id ? 'Dibuat untuk transaksi nyata.' : 'Built for real transactions.'}</h3><p className="mt-3 text-sm leading-6 text-white/50">{id ? 'Harga jelas, lokasi terlihat, status tersedia, dan proses dibuat sesingkat mungkin.' : 'Clear pricing, visible location, availability, and a deliberately short transaction flow.'}</p><button onClick={() => onNavigate('employer')} className="mt-6 flex items-center gap-2 text-sm font-black text-orange-500 hover:text-orange-400">{id ? 'Mulai sekarang' : 'Start now'} <ArrowRight className="h-4 w-4" /></button></div></div></section>

      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8"><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-5"><CheckCircle className="h-5 w-5 text-orange-500" /><p className="mt-4 text-sm font-black">{id ? 'Harga transparan' : 'Transparent pricing'}</p></div><div className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-5"><MapPin className="h-5 w-5 text-orange-500" /><p className="mt-4 text-sm font-black">{id ? 'Pekerja lebih dekat' : 'Workers nearby'}</p></div><div className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-5"><Clock3 className="h-5 w-5 text-orange-500" /><p className="mt-4 text-sm font-black">{id ? 'Untuk kebutuhan hari ini' : 'For today’s needs'}</p></div></div></section>
    </main>
  );
}
