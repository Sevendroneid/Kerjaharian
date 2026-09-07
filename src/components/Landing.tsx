import { calculateOrderPrice } from '../utils/pricingEngine';
import { Shield, Clock, MapPin, CheckCircle, ArrowRight, Search, Users, Sparkles } from 'lucide-react';
import type { View } from '@/lib/types';

interface LandingProps { onNavigate: (view: View) => void; lang: 'id' | 'en'; }

const faqs = [
  ['Apakah pekerja harus punya CV?', 'Tidak. Cukup daftar dan lengkapi data yang diperlukan.'],
  ['Apakah harga bisa dinegosiasikan?', 'Tidak. Harga tampil sebelum order.'],
  ['Bagaimana pekerja mendapat order?', 'Order ditawarkan sesuai area dan ketersediaan.'],
  ['Apakah employer perlu verifikasi KTP?', 'Ya, untuk membantu menjaga keamanan.'],
  ['Berapa lama pekerja merespons?', 'Tergantung lokasi dan ketersediaan. Status tampil di platform.'],
];

// Authentic Indonesian worker photography selected for KerjaHarian's visual direction.
// Sources are free-to-use under the respective Pexels/Unsplash licenses.
const workImages = [
  { src: 'https://images.unsplash.com/photo-1747673902815-cb0a04ef2cf3?auto=format&fit=crop&w=2200&q=82', title: 'Konstruksi', alt: 'Pekerja konstruksi bekerja di lokasi proyek di Jakarta, Indonesia' },
  { src: 'https://images.pexels.com/photos/13699204/pexels-photo-13699204.jpeg?auto=compress&cs=tinysrgb&w=1800', title: 'Pekerja Lapangan', alt: 'Pekerja lapangan di lokasi konstruksi di Jakarta, Indonesia' },
  { src: 'https://images.pexels.com/photos/8173678/pexels-photo-8173678.jpeg?auto=compress&cs=tinysrgb&w=1800', title: 'Pekerja Proyek', alt: 'Pekerja dengan rompi keselamatan dan helm di proyek konstruksi Indonesia' },
  { src: 'https://images.pexels.com/photos/12725400/pexels-photo-12725400.jpeg?auto=compress&cs=tinysrgb&w=1800', title: 'Kurir', alt: 'Kurir mengantarkan paket kepada pelanggan di Indonesia' },
  { src: 'https://images.pexels.com/photos/4281613/pexels-photo-4281613.jpeg?auto=compress&cs=tinysrgb&w=1800', title: 'Teknisi', alt: 'Teknisi bekerja di bengkel di Indonesia' },
  { src: 'https://images.pexels.com/photos/10151372/pexels-photo-10151372.jpeg?auto=compress&cs=tinysrgb&w=1800', title: 'Cleaning', alt: 'Pekerja kebersihan membersihkan area stasiun di Jakarta' },
];

export function Landing({ onNavigate, lang }: LandingProps) {
  const samplePricing = calculateOrderPrice({ wageAmount: 250000, nightShift: true, needsTools: true });
  const id = lang === 'id';

  return <div className="min-h-screen bg-[#FFF8F0] pb-24 text-primary-800">
    <section className="relative overflow-hidden px-4 pb-14 pt-5 sm:pb-20 sm:pt-8">
      <div className="pointer-events-none absolute -right-32 top-10 h-80 w-80 rounded-full bg-accent-200/40 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -left-40 bottom-0 h-72 w-72 rounded-full bg-orange-100/60 blur-3xl" aria-hidden="true" />
      <div className="relative mx-auto max-w-6xl">
        <div className="grid items-center gap-10 lg:grid-cols-[1.02fr_.98fr] lg:gap-14">
          <div className="order-2 space-y-6 lg:order-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/75 px-3 py-1.5 text-xs font-extrabold text-accent-700 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-accent-500" /> {id ? 'Platform kerja harian Indonesia' : 'Indonesia daily work platform'}
            </div>
            <h1 className="max-w-2xl text-5xl font-extrabold leading-[0.98] tracking-[-0.045em] text-primary-900 sm:text-7xl">
              {id ? <>Kerja <span className="text-accent-500">hari ini.</span><br />Lebih dekat.</> : <>Work <span className="text-accent-500">today.</span><br />Closer to you.</>}
            </h1>
            <p className="max-w-xl text-base leading-7 text-primary-500 sm:text-lg">
              {id ? 'Cari kerja harian atau temukan pekerja terdekat.' : 'Find daily work or nearby workers.'}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button onClick={() => onNavigate('worker')} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-accent-500 px-7 py-3.5 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(244,123,32,0.22)] transition hover:-translate-y-0.5 hover:bg-accent-600">
                {id ? 'Saya Cari Kerja' : 'Find Work'} <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={() => onNavigate('employer')} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-primary-200 bg-white px-7 py-3.5 text-sm font-extrabold text-primary-800 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-300">
                {id ? 'Saya Cari Pekerja' : 'Find Workers'} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1 text-xs font-semibold text-primary-500">
              <span className="inline-flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-success-600" /> Harga jelas</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-success-600" /> Mudah digunakan</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-success-600" /> Lebih aman</span>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <div className="relative mx-auto max-w-xl overflow-hidden rounded-[2rem] bg-primary-900 p-2 shadow-[0_24px_60px_rgba(41,37,36,0.16)]">
              <img src={workImages[0].src} alt={workImages[0].alt} className="h-[350px] w-full rounded-[1.6rem] object-cover sm:h-[450px]" loading="eager" fetchPriority="high" />
              <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/20 bg-white/95 p-4 shadow-lg backdrop-blur">
                <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-wider text-accent-600">KerjaHarian</p><p className="mt-1 text-sm font-extrabold text-primary-900">{id ? 'Pekerjaan harian. Lebih dekat.' : 'Daily work. Closer to you.'}</p></div><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-100 text-accent-600"><Sparkles className="h-5 w-5" /></div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-6xl px-4 pb-14 sm:pb-20">
      <div className="grid gap-3 rounded-[1.75rem] border border-orange-100 bg-white p-3 shadow-[0_10px_30px_rgba(41,37,36,0.06)] sm:grid-cols-[1fr_auto_auto] sm:p-4">
        <div className="flex items-center gap-3 rounded-2xl bg-[#FFF8F0] px-4 py-3"><Search className="h-5 w-5 text-accent-500" /><div><p className="text-[10px] font-extrabold uppercase tracking-wider text-primary-400">{id ? 'Cari pekerjaan' : 'Find work'}</p><p className="text-sm font-bold text-primary-800">{id ? 'Apa yang Anda cari?' : 'What are you looking for?'}</p></div></div>
        <button onClick={() => onNavigate('worker')} className="rounded-2xl px-5 py-3 text-sm font-extrabold text-primary-700 hover:bg-primary-50"><MapPin className="mr-2 inline h-4 w-4 text-accent-500" />{id ? 'Di sekitar saya' : 'Near me'}</button>
        <button onClick={() => onNavigate('worker')} className="rounded-2xl bg-primary-900 px-6 py-3 text-sm font-extrabold text-white hover:bg-primary-800">{id ? 'Cari' : 'Search'}</button>
      </div>
    </section>

    <section className="mx-auto max-w-6xl px-4 pb-14 sm:pb-20">
      <div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-wider text-accent-600">Kenapa KerjaHarian</p><h2 className="mt-1 text-3xl font-extrabold tracking-tight text-primary-900">Jelas. Mudah. Aman.</h2></div></div>
      <div className="grid gap-4 md:grid-cols-3">
        {[['Harga jelas', 'Biaya terlihat sebelum order.', CheckCircle], ['Mudah digunakan', 'Pesan dalam beberapa langkah.', Clock], ['Lebih aman', 'Verifikasi membantu menjaga kepercayaan.', Shield]].map(([title, text, Icon]) => <div key={title as string} className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm"><div className="mb-5 grid h-11 w-11 place-items-center rounded-2xl bg-orange-100 text-accent-600"><Icon className="h-5 w-5" /></div><h3 className="text-lg font-extrabold text-primary-900">{title as string}</h3><p className="mt-2 text-sm leading-6 text-primary-500">{text as string}</p></div>)}
      </div>
    </section>

    <section className="mx-auto max-w-6xl px-4 pb-14 sm:pb-20">
      <div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-wider text-accent-600">Pekerjaan</p><h2 className="mt-1 text-3xl font-extrabold tracking-tight text-primary-900">Kerja nyata di Indonesia.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-primary-500">Dari proyek konstruksi sampai pengantaran dan kebersihan, KerjaHarian dibuat untuk kebutuhan kerja yang benar-benar terjadi setiap hari.</p></div></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workImages.map((image, index) => <article key={image.title} className="group overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-sm">
          <div className="relative overflow-hidden"><img src={image.src} alt={image.alt} className="h-56 w-full object-cover transition duration-500 group-hover:scale-[1.03]" loading={index < 3 ? 'lazy' : 'lazy'} /><div className="absolute left-3 top-3 rounded-full bg-primary-900/85 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-white backdrop-blur">{image.title}</div></div>
          <div className="p-5"><h3 className="text-base font-extrabold text-primary-900">{image.title}</h3><p className="mt-1 text-sm leading-5 text-primary-500">Cari atau pesan tenaga kerja sesuai kebutuhan.</p></div>
        </article>)}
      </div>
    </section>

    <section className="mx-auto max-w-6xl px-4 pb-14 sm:pb-20"><div className="grid gap-5 lg:grid-cols-[1fr_.85fr] lg:items-start"><div className="rounded-[2rem] bg-primary-900 p-7 text-white sm:p-9"><div className="mb-6 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent-500"><Users className="h-5 w-5" /></div><div><p className="text-xs font-bold uppercase tracking-wider text-orange-200">Cara kerja</p><h2 className="text-2xl font-extrabold">Tiga langkah.</h2></div></div><div className="grid gap-6 sm:grid-cols-3"><div><b className="text-accent-300">01 · Pilih</b><p className="mt-2 text-sm leading-6 text-stone-300">Pilih pekerjaan.</p></div><div><b className="text-accent-300">02 · Order</b><p className="mt-2 text-sm leading-6 text-stone-300">Lihat detail dan harga.</p></div><div><b className="text-accent-300">03 · Selesai</b><p className="mt-2 text-sm leading-6 text-stone-300">Pantau sampai selesai.</p></div></div></div><div className="rounded-[2rem] border border-orange-100 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><span className="rounded-lg bg-orange-100 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-accent-700">Contoh harga</span><span className="text-xs font-bold text-success-600">Jelas</span></div><h3 className="mt-4 text-base font-extrabold text-primary-900">Tukang Renovasi — Shift Malam + Alat</h3><div className="mt-4 space-y-2 rounded-2xl bg-[#FFF8F0] p-4 text-xs text-primary-500"><div className="flex justify-between"><span>Upah dasar</span><span>Rp {samplePricing.wageAmount.toLocaleString('id-ID')}</span></div>{samplePricing.nightShiftAdd > 0 && <div className="flex justify-between"><span>Shift malam</span><span>+ Rp {samplePricing.nightShiftAdd.toLocaleString('id-ID')}</span></div>}{samplePricing.toolAllowance > 0 && <div className="flex justify-between"><span>Alat</span><span>+ Rp {samplePricing.toolAllowance.toLocaleString('id-ID')}</span></div>}<div className="flex justify-between"><span>Biaya platform</span><span>+ Rp {samplePricing.platformFee.toLocaleString('id-ID')}</span></div><div className="flex justify-between"><span>Asuransi</span><span>+ Rp {samplePricing.insurance.microInsurance.toLocaleString('id-ID')}</span></div><div className="flex justify-between border-t border-orange-100 pt-3 text-sm font-extrabold text-primary-900"><span>Total</span><span className="text-accent-600">Rp {samplePricing.totalPrice.toLocaleString('id-ID')}</span></div></div><button onClick={() => onNavigate('employer')} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent-500 py-3 text-xs font-extrabold text-white hover:bg-accent-600">Pesan Pekerja <ArrowRight className="h-3.5 w-3.5" /></button></div></div></section>

    <section className="mx-auto max-w-4xl px-4"><div className="rounded-[2rem] border border-orange-100 bg-white p-6 shadow-sm sm:p-8"><h2 className="text-2xl font-extrabold text-primary-900">Pertanyaan umum</h2><div className="mt-5 space-y-2">{faqs.map(([q,a]) => <details key={q} className="rounded-2xl border border-orange-100 px-4 py-3.5"><summary className="cursor-pointer text-sm font-extrabold text-primary-800">{q}</summary><p className="mt-2 text-sm leading-6 text-primary-500">{a}</p></details>)}</div><button onClick={() => onNavigate('help')} className="mt-5 text-sm font-extrabold text-accent-700 hover:underline">Bantuan →</button></div></section>

    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-orange-100 bg-[#FFF8F0]/95 p-2 shadow-2xl backdrop-blur sm:hidden">
      <div className="mx-auto grid max-w-md grid-cols-2 gap-2">
        <button onClick={() => onNavigate('worker')} className="rounded-xl bg-accent-500 px-4 py-3 text-xs font-extrabold text-white">Saya Cari Kerja</button>
        <button onClick={() => onNavigate('employer')} className="rounded-xl bg-primary-900 px-4 py-3 text-xs font-extrabold text-white">Saya Cari Pekerja</button>
      </div>
    </div>
  </div>;
}
