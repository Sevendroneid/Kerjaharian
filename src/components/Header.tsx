import { useState, useEffect, useCallback, useMemo } from 'react';
import { Menu, X, LogOut, Loader2, MessageCircle } from 'lucide-react';
import { Logo } from './Logo';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useAuth } from '@/lib/auth';
import { useSiteContent } from '@/lib/siteContent';
import type { View } from '@/lib/types';

interface HeaderProps { view: View; onNavigate: (view: View) => void; onAuthClick: (mode: 'signin' | 'signup') => void; lang: 'id' | 'en'; onLangChange: (lang: 'id' | 'en') => void; }
const NAV_ITEMS_ID: { id: View; label: string }[] = [{ id: 'landing', label: 'Beranda' }, { id: 'employer', label: 'Pesan Tenaga Kerja' }, { id: 'worker', label: 'Mitra Pekerja' }];
const NAV_ITEMS_EN: { id: View; label: string }[] = [{ id: 'landing', label: 'Home' }, { id: 'employer', label: 'Hire Workers' }, { id: 'worker', label: 'Worker Network' }];

export function Header({ view, onNavigate, onAuthClick, lang, onLangChange }: HeaderProps) {
  const { user, profile, loading, signOut } = useAuth();
  const text = useSiteContent(lang);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = useMemo(() => lang === 'id' ? NAV_ITEMS_ID : NAV_ITEMS_EN, [lang]);
  useEffect(() => { const f = () => setScrolled(window.scrollY > 8); f(); window.addEventListener('scroll', f, { passive: true }); return () => window.removeEventListener('scroll', f); }, []);
  const go = useCallback((v: View) => { onNavigate(v); setMobileOpen(false); }, [onNavigate]);
  const wa = text('contact.whatsapp', '6288289767019');
  const labels = lang === 'id' ? { user: 'Pengguna', signIn: 'Masuk', signUp: 'Daftar', logout: 'Keluar', open: 'Buka menu', close: 'Tutup menu' } : { user: 'User', signIn: 'Sign In', signUp: 'Sign Up', logout: 'Log out', open: 'Open menu', close: 'Close menu' };

  return <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/85 backdrop-blur-xl shadow-soft ring-1 ring-slate-200/60' : 'bg-transparent'}`}>
    <div className="container-app"><div className="flex h-16 items-center justify-between">
      <button onClick={() => go('landing')} className="flex items-center gap-2 transition hover:opacity-80"><Logo /><span className="hidden rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-800 sm:inline-block">{text('site.badge', 'KerjaHarian')}</span></button>
      <nav className="hidden items-center gap-1 md:flex">{navItems.map(item => <button key={item.id} onClick={() => go(item.id)} className={`rounded-lg px-3.5 py-2 text-sm font-semibold ${view === item.id ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>{text(item.id === 'landing' ? 'nav.home' : item.id === 'employer' ? 'nav.employer' : 'nav.worker', item.label)}</button>)}</nav>
      <div className="hidden items-center gap-2 md:flex"><LanguageSwitcher lang={lang} onChange={onLangChange} /><a href={`https://wa.me/${wa.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white"><MessageCircle className="h-3.5 w-3.5" />{text('nav.cs', lang === 'id' ? 'CS WA' : 'CS Chat')}</a>{loading ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : user ? <div className="ml-2 flex items-center gap-2"><div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2"><div className="grid h-7 w-7 place-items-center rounded-full bg-primary-600 text-xs font-bold text-white">{profile?.full_name?.charAt(0).toUpperCase() ?? 'U'}</div><span className="text-sm font-semibold text-slate-700">{profile?.full_name?.split(' ')[0] ?? labels.user}</span></div><button onClick={signOut} className="grid h-10 w-10 place-items-center rounded-lg text-slate-500 ring-1 ring-slate-200 hover:bg-error-50 hover:text-error-500" aria-label={labels.logout}><LogOut className="h-4 w-4" /></button></div> : <div className="ml-2 flex gap-2"><button onClick={() => onAuthClick('signin')} className="btn-ghost text-sm">{labels.signIn}</button><button onClick={() => onAuthClick('signup')} className="btn-primary text-sm">{labels.signUp}</button></div>}</div>
      <button onClick={() => setMobileOpen(o => !o)} className="grid h-10 w-10 place-items-center rounded-lg text-slate-700 ring-1 ring-slate-200 md:hidden" aria-label={mobileOpen ? labels.close : labels.open}>{mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
    </div>
    {mobileOpen && <div className="space-y-2 border-t border-slate-200 py-3 md:hidden"><nav className="flex flex-col gap-1">{navItems.map(item => <button key={item.id} onClick={() => go(item.id)} className="rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-600 hover:bg-slate-100">{text(item.id === 'landing' ? 'nav.home' : item.id === 'employer' ? 'nav.employer' : 'nav.worker', item.label)}</button>)}</nav><div className="border-t border-slate-100 pt-2"><LanguageSwitcher lang={lang} onChange={onLangChange} mobile /></div><div><a href={`https://wa.me/${wa.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-green-600 py-2 text-xs font-semibold text-white"><MessageCircle className="h-3.5 w-3.5" />{text('nav.cs', lang === 'id' ? 'CS' : 'Chat')}</a></div>{user && <button onClick={signOut} className="btn-ghost w-full justify-center text-error-600"><LogOut className="h-4 w-4" />{labels.logout}</button>}</div>}
    </div></div>
  </header>;
}
