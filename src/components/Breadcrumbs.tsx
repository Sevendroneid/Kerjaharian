import { ChevronRight, Home } from 'lucide-react';
import type { View } from '@/lib/types';

const labels: Partial<Record<View, string>> = {
  landing: 'Beranda',
  worker: 'Cari Kerja',
  employer: 'Cari Pekerja',
  help: 'Pusat Bantuan',
  privacy: 'Kebijakan Privasi',
  terms: 'Syarat & Ketentuan',
};

export function Breadcrumbs({ view, onNavigate }: { view: View; onNavigate: (view: View) => void }) {
  if (view === 'landing' || !labels[view]) return null;
  return (
    <nav aria-label="Breadcrumb" className="container-app pt-4">
      <ol className="flex items-center gap-1 text-xs font-semibold text-slate-500">
        <li><button type="button" onClick={() => onNavigate('landing')} className="inline-flex items-center gap-1 hover:text-slate-900"><Home className="h-3.5 w-3.5" /> Beranda</button></li>
        <li aria-hidden="true"><ChevronRight className="h-3.5 w-3.5" /></li>
        <li aria-current="page" className="text-slate-800">{labels[view]}</li>
      </ol>
    </nav>
  );
}
