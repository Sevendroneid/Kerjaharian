import { calculateOrderPrice } from '../utils/pricingEngine';
import { Shield, Clock, MapPin, CheckCircle, ArrowRight } from 'lucide-react';
import type { View } from '@/lib/types';

interface LandingProps { onNavigate: (view: View) => void; lang: 'id' | 'en'; }

const faqs = [['Apakah pekerja harus punya CV?', 'Tidak. Daftar dengan nomor WhatsApp dan lengkapi data yang diperlukan.'], ['Apakah harga pekerjaan bisa dinegosiasikan?', 'Tidak. Harga ditentukan berdasarkan jenis pekerjaan yang tersedia sehingga biaya dapat diketahui sebelum order.'], ['Bagaimana pekerja mendapatkan order?', 'Pekerja menerima informasi pekerjaan sesuai ketersediaan dan area layanan. Tawaran order dapat diterima atau ditolak sesuai ketentuan.'], ['Apakah employer perlu verifikasi KTP?', 'Ya. Verifikasi identitas membantu menjaga keamanan dan kepercayaan di platform.'], ['Berapa lama pekerja merespons?', 'Waktu respons berbeda menurut lokasi, jenis pekerjaan, dan ketersediaan pekerja. Status order ditampilkan di platform.']];

const workImages = [
  { src: 'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?auto=format&fit=crop&w=900&q=80', title: 'Pekerjaan Lapangan', alt: 'Pekerja melakukan pekerjaan lapangan' },
  { src: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80', title: 'Bantuan Operasional', alt: 'Pekerja melakukan pekerjaan operasional' },
  { src: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=80', title: 'Kerja Tim', alt: 'Tim berdiskusi sebelum bekerja' },
];

export function Landing({ onNavigate, lang }: LandingProps) {
  const samplePricing = calculateOrderPrice({ wageAmount: 250000, nightShift: true, needsTools: true });
  return <div className="space-y-12 pb-24">
    <section className="relative overflow-hidden bg-primary-950 px-4 py-14 text-white sm:py-20">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent-500/20 blur-3xl" aria-hidden="true" />
      <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-accent-500/10 blur-3xl" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_.95fr]">
        <div className="space-y-6">
          <span className="inline-flex rounded-full border border-accent-400/30 bg-accent-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-300">{lang === 'id' ? 'Platform Kerja Harian Indonesia' : 'Indonesia Daily Work Platform'}</span>
          <h1 className="max-w-2xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">{lang === 'id' ? <>Butuh kerja <span className="text-accent-400">hari ini?</span><br />Atau butuh pekerja?</> : <>Need work <span className="text-accent-400">today?</span><br />Or need a worker?</>}</h1>
          <p className="max-w-xl text-sm leading-6 text-stone-300 sm:text-base">{lang === 'id' ? 'KerjaHarian menghubungkan pekerja harian dengan pemberi kerja melalui proses yang sederhana, harga yang jelas, dan pembayaran online.' : 'KerjaHarian connects daily workers and employers with a simple process, clear pricing, and online payment.'}</p>
          <div className="flex flex-col gap-3 pt-1 sm:flex-row">
            <button onClick={() => onNavigate('worker')} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3 text-sm font-extrabold text-white shadow-card transition hover:bg-accent-600">Saya Cari Kerja <ArrowRight className="h-4 w-4" /></button>
            <button onClick={() => onNavigate('employer')} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-extrabold text-white transition hover:bg-white/10">Saya Cari Pekerja <ArrowRight className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="relative hidden overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-2 shadow-card lg:block">
          <img src={workImages[0].src} alt={workImages[0].alt} className="h-[390px] w-full rounded-[1.25rem] object-cover" loading="eager" />
          <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/10 bg-primary-950/85 p-4 backdrop-blur-sm"><p className="text-xs font-bold uppercase tracking-wider text-accent-300">KerjaHarian</p><p className="mt-1 text-sm font-bold">{lang === 'id' ? 'Kesempatan kerja yang nyata, dekat, dan jelas.' : 'Real work opportunities, nearby and clear.'}</p></div>
        </div>
      </div>
    </section>

    <section className="mx-auto grid max-w-6xl grid-cols-1 gap-5 px-4 sm:grid-cols-3">
      <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"><CheckCircle className="h-5 w-5 text-accent-500"/><h2 className="font-bold text-primary-900">Harga Jelas</h2><p className="text-xs leading-relaxed text-stone-600">Harga mengikuti jenis pekerjaan. Tidak perlu tawar-menawar manual.</p></div>
      <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"><Clock className="h-5 w-5 text-accent-500"/><h2 className="font-bold text-primary-900">Proses Sederhana</h2><p className="text-xs leading-relaxed text-stone-600">Masuk menggunakan WhatsApp dan ikuti langkah yang ditampilkan di layar.</p></div>
      <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"><Shield className="h-5 w-5 text-accent-500"/><h2 className="font-bold text-primary-900">Lebih Aman</h2><p className="text-xs leading-relaxed text-stone-600">Employer melalui proses verifikasi identitas dan pembayaran diproses melalui kanal resmi.</p></div>
    </section>

    <section className="mx-auto max-w-6xl px-4"><div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-accent-600">Kerja yang nyata</p><h2 className="mt-1 text-2xl font-extrabold tracking-tight text-primary-900">Untuk berbagai kebutuhan harian</h2></div><span className="hidden text-xs font-semibold text-stone-500 sm:block">Mobile-first · Sederhana · Terpercaya</span></div><div className="grid gap-5 sm:grid-cols-3">{workImages.map((image) => <article key={image.title} className="group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"><img src={image.src} alt={image.alt} className="h-48 w-full object-cover transition duration-300 group-hover:scale-[1.02]" loading="lazy"/><div className="p-4"><h3 className="font-bold text-primary-900">{image.title}</h3><p className="mt-1 text-xs leading-5 text-stone-600">Temukan atau pesan tenaga kerja sesuai kebutuhan.</p></div></article>)}</div></section>

    <section className="mx-auto max-w-xl px-4"><div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-md"><div className="flex items-center justify-between"><span className="rounded-md bg-accent-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-accent-700">Contoh Kalkulasi</span><span className="text-xs font-semibold text-emerald-600">Harga transparan</span></div><h2 className="font-bold text-primary-900 text-sm">Tukang Renovasi — Shift Malam + Alat</h2><div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-3.5 text-xs text-stone-600"><div className="flex justify-between"><span>Upah dasar</span><span>Rp {samplePricing.wageAmount.toLocaleString('id-ID')}</span></div>{samplePricing.nightShiftAdd > 0 && <div className="flex justify-between"><span>Shift malam</span><span>+ Rp {samplePricing.nightShiftAdd.toLocaleString('id-ID')}</span></div>}{samplePricing.toolAllowance > 0 && <div className="flex justify-between"><span>Alat</span><span>+ Rp {samplePricing.toolAllowance.toLocaleString('id-ID')}</span></div>}<div className="flex justify-between"><span>Biaya platform</span><span>+ Rp {samplePricing.platformFee.toLocaleString('id-ID')}</span></div><div className="flex justify-between"><span>Asuransi</span><span>+ Rp {samplePricing.insurance.microInsurance.toLocaleString('id-ID')}</span></div><div className="flex justify-between border-t border-stone-200 pt-2 text-sm font-bold text-primary-900"><span>Total</span><span className="text-accent-600">Rp {samplePricing.totalPrice.toLocaleString('id-ID')}</span></div></div><button onClick={() => onNavigate('employer')} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-900 py-2.5 text-xs font-bold text-white transition hover:bg-primary-800">Mulai Pesan Pekerja <ArrowRight className="h-3.5 w-3.5" /></button></div></section>

    <section className="mx-auto max-w-4xl px-4"><div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"><div className="mb-5 flex items-center gap-2"><MapPin className="h-5 w-5 text-accent-500"/><h2 className="text-xl font-extrabold text-primary-900">Cara kerja KerjaHarian</h2></div><div className="grid gap-5 sm:grid-cols-3"><div><b>1. Pilih</b><p className="mt-1 text-sm text-stone-600">Pilih kebutuhan kerja atau pekerjaan yang tersedia.</p></div><div><b>2. Order</b><p className="mt-1 text-sm text-stone-600">Lihat detail dan harga sebelum melanjutkan.</p></div><div><b>3. Selesaikan</b><p className="mt-1 text-sm text-stone-600">Ikuti status order sampai pekerjaan selesai.</p></div></div></div></section>

    <section className="mx-auto max-w-4xl px-4"><div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-extrabold text-primary-900">Pertanyaan yang sering ditanyakan</h2><div className="mt-4 space-y-2">{faqs.map(([q,a]) => <details key={q} className="rounded-xl border border-stone-200 p-4"><summary className="cursor-pointer font-bold text-primary-900">{q}</summary><p className="mt-2 text-sm leading-6 text-stone-600">{a}</p></details>)}</div><button onClick={() => onNavigate('help')} className="mt-5 text-sm font-bold text-accent-700 hover:underline">Lihat semua bantuan →</button></div></section>

    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 p-2 shadow-2xl backdrop-blur sm:hidden"><div className="mx-auto flex max-w-lg gap-2"><button onClick={() => onNavigate('worker')} className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-primary-900 py-3 text-xs font-extrabold text-white">🔎 Cari Kerja</button><button onClick={() => onNavigate('employer')} className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-accent-500 py-3 text-xs font-extrabold text-white">👷 Cari Pekerja</button></div></div>
  </div>;
}
