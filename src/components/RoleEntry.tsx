import { BriefcaseBusiness, HardHat, ArrowRight } from 'lucide-react';
import type { View } from '@/lib/types';

interface RoleEntryProps {
  onNavigate: (view: View) => void;
}

export function RoleEntry({ onNavigate }: RoleEntryProps) {
  return (
    <main className="min-h-[calc(100vh-72px)] bg-[#050505] px-4 py-8 text-white sm:px-6 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-136px)] max-w-5xl items-center justify-center">
        <section className="w-full">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-black uppercase tracking-[.22em] text-orange-500">KerjaHarian</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Mau mulai sebagai siapa?</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/55 sm:text-base">Pilih jalur Anda. Setelah memilih, Anda langsung masuk ke panel yang sesuai.</p>
          </div>

          <div className="mx-auto mt-8 grid max-w-4xl gap-4 md:grid-cols-2">
            <button type="button" onClick={() => onNavigate('employer')} className="group rounded-[2rem] border border-white/10 bg-[#111] p-6 text-left transition hover:-translate-y-1 hover:border-orange-500/60 hover:bg-[#151515] sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-white"><BriefcaseBusiness className="h-7 w-7" /></div>
                <ArrowRight className="h-5 w-5 text-white/30 transition group-hover:translate-x-1 group-hover:text-orange-500" />
              </div>
              <p className="mt-8 text-xs font-black uppercase tracking-[.16em] text-orange-500">Untuk yang membutuhkan tenaga</p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">Pemberi Kerja</h2>
              <p className="mt-3 text-sm leading-6 text-white/50">Cari pekerja harian, pilih pekerjaan, lihat harga, lalu buat order.</p>
              <span className="mt-7 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-black">Masuk Panel Pemberi Kerja <ArrowRight className="h-4 w-4" /></span>
            </button>

            <button type="button" onClick={() => onNavigate('worker')} className="group rounded-[2rem] border border-white/10 bg-[#111] p-6 text-left transition hover:-translate-y-1 hover:border-orange-500/60 hover:bg-[#151515] sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-orange-500"><HardHat className="h-7 w-7" /></div>
                <ArrowRight className="h-5 w-5 text-white/30 transition group-hover:translate-x-1 group-hover:text-orange-500" />
              </div>
              <p className="mt-8 text-xs font-black uppercase tracking-[.16em] text-orange-500">Untuk yang mencari pekerjaan</p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">Pekerja</h2>
              <p className="mt-3 text-sm leading-6 text-white/50">Lihat pekerjaan yang tersedia, aktifkan ketersediaan, dan terima order.</p>
              <span className="mt-7 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[.05] px-5 py-3 text-sm font-black">Masuk Panel Pekerja <ArrowRight className="h-4 w-4" /></span>
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
