import { ArrowLeft } from 'lucide-react';
import type { View } from '@/lib/types';

export default function NotFoundPage({ onNavigate, lang = 'id' }: { onNavigate: (view: View) => void; lang?: 'id' | 'en' }) {
  const id = lang === 'id';
  return <main className="grid min-h-[60vh] place-items-center px-4 py-16"><div className="max-w-md text-center">
    <p className="text-6xl font-black text-slate-200">404</p>
    <h1 className="mt-4 text-2xl font-extrabold text-slate-950">{id ? 'Halaman tidak ditemukan' : 'Page not found'}</h1>
    <p className="mt-2 text-sm leading-6 text-slate-600">{id ? 'Sepertinya halaman yang kamu cari sudah pindah atau tidak tersedia. Tenang, kamu bisa kembali dan lanjut cari kerja atau pekerja.' : 'The page you are looking for may have moved or is no longer available. You can return and continue finding work or workers.'}</p>
    <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center"><button onClick={() => onNavigate('worker')} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white">{id ? 'Cari Kerja' : 'Find Work'}</button><button onClick={() => onNavigate('employer')} className="rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white">{id ? 'Cari Pekerja' : 'Find Workers'}</button></div>
    <button onClick={() => onNavigate('landing')} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" /> {id ? 'Kembali ke Beranda' : 'Back to Home'}</button>
  </div></main>;
}
