import { HardHat, MapPin, Phone, Shield, MessageCircle } from 'lucide-react';
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
              PT Kerja Harian Indonesia (Sevendroneid)
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
              <li className="text-slate-500">Jasa Kebersihan & Drone</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">Perusahaan & Legal</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <button onClick={() => onNavigate('landing')} className="transition hover:text-white text-left">
                  Tentang Kami
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('privacy' as View)} className="transition hover:text-white text-left">
                  Kebijakan Privasi (UU PDP)
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('terms' as View)} className="transition hover:text-white text-left">
                  Syarat & Ketentuan
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('help' as View)} className="transition hover:text-white text-left">
                  Pusat Bantuan
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">Kontak Resmi CS</h4>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 text-primary-300 flex-shrink-0" />
                <span>Jakarta, Indonesia</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-primary-300 flex-shrink-0" />
                <span>+62 882-8976-7019</span>
              </li>
              <li>
                <a
                  href="https://wa.me/6288289767019"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-2 rounded-lg font-semibold transition shadow-sm mt-1"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Chat WhatsApp CS
                </a>
              </li>
              <li className="flex items-center gap-2.5 pt-1">
                <Shield className="h-4 w-4 text-primary-300 flex-shrink-0" />
                <span className="text-xs">Terdaftar DJKI Kemenkumham RI</span>
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
