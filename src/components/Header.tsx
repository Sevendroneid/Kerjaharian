import { useState, useEffect, useCallback } from 'react';
import { Menu, X, LogOut, User as UserIcon, Loader2 } from 'lucide-react';
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
          <button onClick={() => go('landing')} className="transition hover:opacity-80">
            <Logo />
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
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            ) : user ? (
              <div className="flex items-center gap-2">
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
              <>
                <button onClick={() => onAuthClick('signin')} className="btn-ghost">
                  Masuk
                </button>
                <button onClick={() => onAuthClick('signup')} className="btn-primary">
                  Daftar
                </button>
              </>
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
          <div className="border-t border-slate-200 py-3 md:hidden">
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
              <div className="mt-2 flex flex-col gap-2">
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
                      className="btn-ghost w-full text-error-600 hover:bg-error-50 hover:ring-error-200"
                    >
                      <LogOut className="h-4 w-4" />
                      Keluar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        onAuthClick('signin');
                        setMobileOpen(false);
                      }}
                      className="btn-ghost w-full"
                    >
                      Masuk
                    </button>
                    <button
                      onClick={() => {
                        onAuthClick('signup');
                        setMobileOpen(false);
                      }}
                      className="btn-primary w-full"
                    >
                      Daftar
                    </button>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
