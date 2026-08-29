import { HardHat, MapPin, Phone, Shield } from 'lucide-react';
import { Logo } from './Logo';
import type { View } from '@/lib/types';

interface FooterProps {
  onNavigate: (view: View) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="bg-primary-950 text-slate-300">
      <div className="container-app py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
              <Logo className="[&_span]:text-white [&_.text-slate-400]:text-slate-400" />
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
              Platform on-demand kilat yang menghubungkan pemberi kerja dengan tenaga kerja
              harian terampil terdekat di seluruh Indonesia.
            </p>
            <p className="mt-4 text-xs font-semibold text-slate-500">
              PT Kerja Harian Indonesia
            </p>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">Layanan</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <button onClick={() => onNavigate('employer')} className="transition hover:text-white">
                  Pesan Tenaga Kerja
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('worker')} className="transition hover:text-white">
                  Jadi Mitra Pekerja
                </button>
              </li>
              <li className="text-slate-500">Logistik & Pindahan</li>
              <li className="text-slate-500">Tukang & Renovasi</li>
              <li className="text-slate-500">Jasa Kebersihan</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">Perusahaan</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li className="transition hover:text-white cursor-pointer">Tentang Kami</li>
              <li className="transition hover:text-white cursor-pointer">Kebijakan Privasi</li>
              <li className="transition hover:text-white cursor-pointer">Syarat & Ketentuan</li>
              <li className="transition hover:text-white cursor-pointer">Pusat Bantuan</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">Kontak</h4>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 text-primary-300" />
                <span>Jakarta, Indonesia</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-primary-300" />
                <span>+62 21 5000 000</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Shield className="h-4 w-4 text-primary-300" />
                <span>Terdaftar DJKI Kemenkumham RI</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row">
          <p>© 2026 PT Kerja Harian Indonesia. Semua hak dilindungi.</p>
          <div className="flex items-center gap-1.5">
            <HardHat className="h-3.5 w-3.5 text-primary-400" />
            <span>Solusi Cepat Tenaga Kerja Terampil Terdekat</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
