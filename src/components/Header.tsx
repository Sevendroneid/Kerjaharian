import { useState, useEffect, useCallback } from 'react';
import { Menu, X, LogOut, User as UserIcon, Loader2, MessageCircle, Shield, HelpCircle } from 'lucide-react';
import { Logo } from './Logo';
import { useAuth } from '@/lib/auth';
import type { View } from '@/lib/types';

interface HeaderProps {
  view: View;
  onNavigate: (view: View) => void;
  onAuthClick: (mode: 'signin' | 'signup') => void;
}

const NAV_ITEMS: { id: View; label: string }[] = [
  { id: 'landing', label: 'Beranda' },
  { id: 'employer', label: 'Pesan Tenaga Kerja' },
  { id: 'worker', label: 'Mitra Pekerja' },
];

export function Header({ view, onNavigate, onAuthClick }: HeaderProps) {
  const { user, profile, loading, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lang, setLang] = useState<'id' | 'en'>('id');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // Load i18n language preference
    const savedLang = (localStorage.getItem('kerjaharian_lang') as 'id' | 'en') || 'id';
    setLang(savedLang);

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleLanguage = () => {
    const newLang = lang === 'id' ? 'en' : 'id';
    setLang(newLang);
    localStorage.setItem('kerjaharian_lang', newLang);
    window.location.reload();
  };

  const go = useCallback(
    (v: View) => {
      onNavigate(v);
      setMobileOpen(false);
    },
    [onNavigate],
  );

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/85 backdrop-blur-xl shadow-soft ring-1 ring-slate-200/60'
          : 'bg-transparent'
      }`}
    >
      <div className="container-app">
        <div className="flex h-16 items-center justify-between">
          <button onClick={() => go('landing')} className="transition hover:opacity-80 flex items-center gap-2">
            <Logo />
            <span className="text-[10px] bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-semibold hidden sm:inline-block">
              Sevendroneid
            </span>
          </button>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => go(item.id)}
                className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-all ${
                  view === item.id
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {/* i18n Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="text-xs font-semibold px-2.5 py-1.5 border rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 transition"
              title="Ganti Bahasa / Change Language"
            >
              {lang === 'id' ? '🇮🇩 ID' : '🇬🇧 EN'}
            </button>

            {/* CS WhatsApp Button */}
            <a
              href="https://wa.me/6288289767019"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition shadow-sm"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              CS WA
            </a>

            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            ) : user ? (
              <div className="flex items-center gap-2 ml-2">
                <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2">
                  <div className="grid h-7 w-7 place-items-center rounded-full bg-primary-600 text-xs font-bold text-white">
                    {profile?.full_name?.charAt(0).toUpperCase() ?? 'U'}
                  </div>
                  <span className="text-sm font-semibold text-slate-700">
                    {profile?.full_name?.split(' ')[0] ?? 'Pengguna'}
                  </span>
                </div>
                <button
                  onClick={signOut}
                  className="grid h-10 w-10 place-items-center rounded-lg text-slate-500 ring-1 ring-slate-200 transition hover:bg-error-50 hover:text-error-500 hover:ring-error-200"
                  aria-label="Keluar"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 ml-2">
                <button onClick={() => onAuthClick('signin')} className="btn-ghost text-sm">
                  Masuk
                </button>
                <button onClick={() => onAuthClick('signup')} className="btn-primary text-sm">
                  Daftar
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="grid h-10 w-10 place-items-center rounded-lg text-slate-700 ring-1 ring-slate-200 md:hidden"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="border-t border-slate-200 py-3 md:hidden space-y-2">
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => go(item.id)}
                  className={`rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition ${
                    view === item.id
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                onClick={toggleLanguage}
                className="flex-1 text-xs font-semibold py-2 border rounded-lg bg-slate-50 text-center text-slate-700"
              >
                Bahasa: {lang === 'id' ? '🇮🇩 Indonesia' : '🇬🇧 English'}
              </button>
              <a
                href="https://wa.me/6288289767019"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 bg-green-600 text-white rounded-lg shadow-sm"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                CS 088289767019
              </a>
            </div>

            <div className="mt-2 flex flex-col gap-2 pt-2 border-t border-slate-100">
              {loading ? (
                <div className="flex justify-center py-2">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              ) : user ? (
                <>
                  <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2.5">
                    <UserIcon className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-semibold text-slate-700">
                      {profile?.full_name ?? 'Pengguna'}
                    </span>
                  </div>
                  <button
                    onClick={signOut}
                    className="btn-ghost w-full text-error-600 hover:bg-error-50 hover:ring-error-200 justify-center"
                  >
                    <LogOut className="h-4 w-4" />
                    Keluar
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      onAuthClick('signin');
                      setMobileOpen(false);
                    }}
                    className="btn-ghost w-full justify-center"
                  >
                    Masuk
                  </button>
                  <button
                    onClick={() => {
                      onAuthClick('signup');
                      setMobileOpen(false);
                    }}
                    className="btn-primary w-full justify-center"
                  >
                    Daftar
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
      }
        
