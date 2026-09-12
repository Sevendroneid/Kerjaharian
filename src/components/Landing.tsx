import { calculateOrderPrice } from '../utils/pricingEngine';
import { ArrowRight, CheckCircle, Clock, MapPin, Search, Shield, Wrench, Truck, Sparkles, BriefcaseBusiness } from 'lucide-react';
import type { View } from '@/lib/types';

interface LandingProps { onNavigate: (view: View) => void; lang: 'id' | 'en'; }

const faqs = [
  ['Apakah pekerja harus punya CV?', 'Tidak. Cukup daftar dan lengkapi data yang diperlukan.'],
  ['Apakah harga bisa dinegosiasikan?', 'Tidak. Harga tampil sebelum order.'],
  ['Bagaimana pekerja mendapat order?', 'Order ditawarkan sesuai area dan ketersediaan.'],
  ['Apakah employer perlu verifikasi KTP?', 'Ya, untuk membantu menjaga keamanan.'],
  ['Berapa lama pekerja merespons?', 'Tergantung lokasi dan ketersediaan. Status tampil di platform.'],
];

const categories = [
  { title: 'Kebersihan', text: 'Bersih-bersih dan kebutuhan rumah atau usaha.', icon: Sparkles },
  { title: 'Logistik', text: 'Angkut, bongkar-muat, pindahan, dan helper.', icon: Truck },
  { title: 'Tukang', text: 'Renovasi ringan, perbaikan, dan pekerjaan teknis.', icon: Wrench },
  { title: 'Serabutan', text: 'Pekerjaan harian sesuai kebutuhan.', icon: BriefcaseBusiness },
];

export function Landing({ onNavigate, lang }: LandingProps) {
  const id = lang === 'id';
  const samplePricing = calculateOrderPrice({ wageAmount: 250000, nightShift: true, needsTools: true });

  return (
    <main className="min-h-screen bg-[#FFF8F0] text-primary-800">
      <section className="px-4 pb-14 pt-8 sm:pb-20 sm:pt-12">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-4xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-accent-600">KerjaHarian</p>
            <h1 className="mt-4 max-w-3xl text-5xl font-extrabold leading-[1.02] tracking-[-0.05em] text-primary-900 sm:text-7xl">
              {id ? <>Kerja <span className="text-accent-500">hari ini.</span><br />Lebih dekat.</> : <>Work <span className="text-accent-500">today.</span><br />Closer to you.</>}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-primary-500 sm:text-lg">
              {id ? 'Cari kerja harian atau temukan pekerja terdekat.' : 'Find daily work or nearby workers.'}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button onClick={() => onNavigate('worker')} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent-500 px-6 py-3 text-sm font-extrabold text-white hover:bg-accent-600">
                {id ? 'Saya Cari Kerja' : 'Find Work'} <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={() => onNavigate('employer')} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary-200 bg-white px-6 py-3 text-sm font-extrabold text-primary-800 hover:border-primary-300">
                {id ? 'Saya Cari Pekerja' : 'Find Workers'} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-primary-500">
              <span><CheckCircle className="mr-1.5 inline h-4 w-4 text-success-600" />Harga jelas</span>
              <span><CheckCircle className="mr-1.5 inline h-4 w-4 text-success-600" />Mudah digunakan</span>
              <span><CheckCircle className="mr-1.5 inline h-4 w-4 text-success-600" />Lebih aman</span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-orange-100 px-4 py-5">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 rounded-2xl bg-white p-2.5 shadow-sm sm:flex-row sm:items-center">
          <div className="flex min-h-12 flex-1 items-center gap-3 rounded-xl bg-[#FFF8F0] px-4">
            <Search className="h-5 w-5 text-accent-500" />
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-primary-400">{id ? 'Cari' : 'Find'}</p>
              <p className="text-sm font-bold text-primary-800">{id ? 'Pekerjaan atau tenaga kerja' : 'Work or workers'}</p>
            </div>
          </div>
          <button onClick={() => onNavigate('worker')} className="min-h-12 rounded-xl px-4 text-sm font-extrabold text-primary-700 hover:bg-primary-50">
            <MapPin className="mr-2 inline h-4 w-4 text-accent-500" />{id ? 'Di sekitar saya' : 'Near me'}
          </button>
          <button onClick={() => onNavigate('worker')} className="min-h-12 rounded-xl bg-primary-900 px-6 text-sm font-extrabold text-white hover:bg-primary-800">
            {id ? 'Cari' : 'Search'}
          </button>
        </div>
      </section>

      <section className="px-4 py-10 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-extrabold uppercase tracking-wider text-accent-600">{id ? 'Pekerjaan' : 'Work'}</p>
          <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-primary-900">{id ? 'Cari sesuai kebutuhan.' : 'Find what you need.'}</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map(({ title, text, icon: Icon }) => (
              <button key={title} onClick={() => onNavigate('worker')} className="group rounded-2xl border border-orange-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-100 text-accent-600"><Icon className="h-5 w-5" /></div>
                <h3 className="mt-5 text-base font-extrabold text-primary-900">{title}</h3>
                <p className="mt-1 text-sm leading-5 text-primary-500">{text}</p>
                <ArrowRight className="mt-4 h-4 w-4 text-primary-300 transition group-hover:translate-x-1 group-hover:text-accent-500" />
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-extrabold uppercase tracking-wider text-accent-600">KerjaHarian</p>
          <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-primary-900">{id ? 'Jelas. Mudah. Aman.' : 'Clear. Simple. Safer.'}</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {[
              [CheckCircle, 'Harga jelas', 'Biaya terlihat sebelum order.'],
              [Clock, 'Mudah digunakan', 'Cari, pilih, dan mulai dalam beberapa langkah.'],
              [Shield, 'Lebih aman', 'Informasi dan status membantu menjaga kepercayaan.'],
            ].map(([Icon, title, text]) => (
              <div key={title as string} className="rounded-2xl border border-orange-100 bg-white p-6">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-100 text-accent-600"><Icon className="h-5 w-5" /></div>
                <h3 className="mt-5 text-base font-extrabold text-primary-900">{title as string}</h3>
                <p className="mt-1 text-sm leading-6 text-primary-500">{text as string}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-extrabold uppercase tracking-wider text-accent-600">{id ? 'Di lapangan' : 'In the field'}</p>
          <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-primary-900">{id ? 'Untuk pekerjaan nyata.' : 'For real work.'}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {['Konstruksi', 'Lapangan', 'Teknisi'].map((title, index) => (
              <article key={title} className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
                <div className="h-44 overflow-hidden bg-orange-100">
                  <img src={[
                    'https://images.unsplash.com/photo-1747673902815-cb0a04ef2cf3?auto=format&fit=crop&w=1200&q=80',
                    'https://images.pexels.com/photos/13699204/pexels-photo-13699204.jpeg?auto=compress&cs=tinysrgb&w=1200',
                    'https://images.pexels.com/photos/4281613/pexels-photo-4281613.jpeg?auto=compress&cs=tinysrgb&w=1200',
                  ][index]} alt={title} className="h-full w-full object-cover" loading="lazy" />
                </div>
                <div className="p-4"><h3 className="text-sm font-extrabold text-primary-900">{title}</h3><p className="mt-1 text-sm text-primary-500">{id ? 'Cari atau pesan tenaga kerja sesuai kebutuhan.' : 'Find or request workers for your needs.'}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:py-14">
        <div className="mx-auto max-w-6xl rounded-3xl bg-primary-900 px-6 py-8 text-white sm:px-9">
          <p className="text-xs font-extrabold uppercase tracking-wider text-orange-200">{id ? 'Cara kerja' : 'How it works'}</p>
          <h2 className="mt-1 text-3xl font-extrabold">{id ? 'Tiga langkah sederhana.' : 'Three simple steps.'}</h2>
          <div className="mt-8 grid gap-7 sm:grid-cols-3">
            {[
              ['01', 'Pilih', 'Pilih pekerjaan atau kebutuhan pekerja.'],
              ['02', 'Order', 'Lihat detail dan harga sebelum melanjutkan.'],
              ['03', 'Selesai', 'Pantau proses sampai pekerjaan selesai.'],
            ].map(([n, title, text]) => <div key={n}><span className="text-sm font-extrabold text-accent-300">{n}</span><h3 className="mt-2 text-lg font-extrabold">{title}</h3><p className="mt-1 text-sm leading-6 text-stone-300">{text}</p></div>)}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:py-14">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-accent-600">{id ? 'Harga' : 'Pricing'}</p>
            <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-primary-900">{id ? 'Tahu biayanya sebelum order.' : 'Know the cost before you order.'}</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-primary-500">{id ? 'Harga tampil sebelum Anda melanjutkan.' : 'The price is shown before you continue.'}</p>
          </div>
          <div className="w-full rounded-2xl border border-orange-100 bg-white p-5 shadow-sm sm:w-[380px]">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-accent-700">Contoh harga</p>
            <p className="mt-4 text-sm font-extrabold text-primary-900">Tukang Renovasi — Shift Malam + Alat</p>
            <div className="mt-3 space-y-2 rounded-xl bg-[#FFF8F0] p-4 text-xs text-primary-500">
              <div className="flex justify-between"><span>Upah dasar</span><span>Rp {samplePricing.wageAmount.toLocaleString('id-ID')}</span></div>
              {samplePricing.nightShiftAdd > 0 && <div className="flex justify-between"><span>Shift malam</span><span>+ Rp {samplePricing.nightShiftAdd.toLocaleString('id-ID')}</span></div>}
              {samplePricing.toolAllowance > 0 && <div className="flex justify-between"><span>Alat</span><span>+ Rp {samplePricing.toolAllowance.toLocaleString('id-ID')}</span></div>}
              <div className="flex justify-between"><span>Biaya layanan</span><span>+ Rp {samplePricing.platformFee.toLocaleString('id-ID')}</span></div>
              <div className="flex justify-between"><span>Perlindungan</span><span>+ Rp {samplePricing.insurance.microInsurance.toLocaleString('id-ID')}</span></div>
              <div className="flex justify-between border-t border-orange-100 pt-3 text-sm font-extrabold text-primary-900"><span>Total</span><span className="text-accent-600">Rp {samplePricing.totalPrice.toLocaleString('id-ID')}</span></div>
            </div>
            <button onClick={() => onNavigate('employer')} className="mt-4 w-full rounded-xl bg-accent-500 py-3 text-xs font-extrabold text-white hover:bg-accent-600">{id ? 'Pesan Pekerja' : 'Request Worker'}</button>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:py-14">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-extrabold uppercase tracking-wider text-accent-600">FAQ</p>
          <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-primary-900">{id ? 'Pertanyaan yang sering ditanyakan.' : 'Frequently asked questions.'}</h2>
          <div className="mt-6 divide-y divide-orange-100 rounded-2xl border border-orange-100 bg-white">
            {faqs.map(([q, a]) => <details key={q} className="group p-5"><summary className="cursor-pointer list-none pr-6 text-sm font-extrabold text-primary-900">{q}<span className="float-right text-accent-500">+</span></summary><p className="mt-3 max-w-2xl text-sm leading-6 text-primary-500">{a}</p></details>)}
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 pt-10 sm:pb-28 sm:pt-14">
        <div className="mx-auto max-w-6xl rounded-3xl border border-orange-100 bg-white px-6 py-10 text-center shadow-sm sm:px-10">
          <h2 className="text-3xl font-extrabold tracking-tight text-primary-900 sm:text-4xl">{id ? 'Mulai sekarang.' : 'Start now.'}</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-primary-500">{id ? 'Cari pekerjaan harian atau temukan pekerja yang Anda butuhkan.' : 'Find daily work or the worker you need.'}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button onClick={() => onNavigate('worker')} className="rounded-xl bg-accent-500 px-6 py-3 text-sm font-extrabold text-white hover:bg-accent-600">{id ? 'Cari Kerja' : 'Find Work'}</button>
            <button onClick={() => onNavigate('employer')} className="rounded-xl border border-primary-200 bg-white px-6 py-3 text-sm font-extrabold text-primary-800 hover:border-primary-300">{id ? 'Cari Pekerja' : 'Find Workers'}</button>
          </div>
        </div>
      </section>
    </main>
  );
}
