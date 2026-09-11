import { ChevronRight, Home } from 'lucide-react';
import type { View } from '@/lib/types';

const labels: Record<'id' | 'en', Partial<Record<View, string>>> = {
  id: { landing: 'Beranda', worker: 'Cari Kerja', employer: 'Cari Pekerja', help: 'Pusat Bantuan', privacy: 'Kebijakan Privasi', terms: 'Syarat & Ketentuan' },
  en: { landing: 'Home', worker: 'Find Work', employer: 'Find Workers', help: 'Help Center', privacy: 'Privacy Policy', terms: 'Terms & Conditions' },
};

export function Breadcrumbs({ view, onNavigate }: { view: View; onNavigate: (view: View) => void }) {
  if (view === 'landing') return null;
  const lang = typeof window !== 'undefined' && localStorage.getItem('kerjaharian_lang') === 'en' ? 'en' : 'id';
  const current = labels[lang][view];
  if (!current) return null;
  return <nav aria-label={lang === 'id' ? 'Navigasi breadcrumb' : 'Breadcrumb navigation'} className="container-app pt-4"><ol className="flex items-center gap-1 text-xs font-semibold text-slate-500"><li><button type="button" onClick={() => onNavigate('landing')} className="inline-flex items-center gap-1 hover:text-slate-900"><Home className="h-3.5 w-3.5" /> {labels[lang].landing}</button></li><li aria-hidden="true"><ChevronRight className="h-3.5 w-3.5" /></li><li aria-current="page" className="text-slate-800">{current}</li></ol></nav>;
}
