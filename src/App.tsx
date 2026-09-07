import { useState, useCallback, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Landing } from '@/components/Landing';
import { Employer } from '@/components/Employer';
import { Worker } from '@/components/Worker';
import { AuthModal } from '@/components/AuthModal';
import AdminLogin from '@/components/AdminLogin';
import AdminRoute from '@/components/AdminRoute';
import AdminDashboard from '@/components/AdminDashboard';
import KycGate from '@/components/KycGate';
import { JobTimer } from '@/components/JobTimer';
import { WorkerDispatchPanel, EmployerDispatchWatcher } from '@/components/OnDemandDispatch';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { I18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import type { View, CategoryId } from '@/lib/types';

const SECRET_PATH = '/rahasia';
const ADMIN_PREVIEW_PARAM = 'admin-preview';

export default function App() {
  const [view, setView] = useState<View>('landing');
  const [lang, setLang] = useState<'id' | 'en'>(() => (localStorage.getItem('kerjaharian_lang') as 'id' | 'en') || 'id');
  const [authModal, setAuthModal] = useState<{ open: boolean; mode: 'signin' | 'signup' }>({ open: false, mode: 'signin' });
  const isSecretAdminPath = window.location.pathname === SECRET_PATH;
  const [adminPreview] = useState(() => isSecretAdminPath || new URLSearchParams(window.location.search).get(ADMIN_PREVIEW_PARAM) === '1');
  const [pendingCategory, setPendingCategory] = useState<CategoryId | null>(null);
  const { user, profile, loading: authLoading } = useAuth();
  const i18n = new I18n(lang);

  const navigate = useCallback((v: View, category?: CategoryId) => {
    setView(v);
    setPendingCategory(category ?? null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  const openAuth = useCallback((mode: 'signin' | 'signup') => setAuthModal({ open: true, mode }), []);
  const closeAuth = useCallback(() => setAuthModal((prev) => ({ ...prev, open: false })), []);
  const handleLangChange = useCallback((newLang: 'id' | 'en') => { setLang(newLang); localStorage.setItem('kerjaharian_lang', newLang); }, []);

  useEffect(() => {
    if (adminPreview) return;
    if (authLoading || !user || !profile) return;
    if (profile.role === 'admin') {
      setView('admin');
      setAuthModal((prev) => ({ ...prev, open: false }));
      return;
    }
    if (!profile.full_name) {
      setAuthModal((prev) => ({ ...prev, open: true, mode: 'signup' }));
      return;
    }
    if (profile.role === 'employer') setView('employer');
    else if (profile.role === 'worker') setView('worker');
  }, [adminPreview, authLoading, user, profile]);

  if (adminPreview) {
    if (authLoading || (user && !profile)) return <div className="min-h-screen bg-slate-50 grid place-items-center text-sm font-semibold text-slate-600">Memverifikasi sesi Admin...</div>;
    if (!user) return <AppErrorBoundary><AdminLogin onClose={() => { window.location.href = '/'; }} onSuccess={() => { window.location.replace(SECRET_PATH); }} /></AppErrorBoundary>;
    if (profile.role !== 'admin') return <AppErrorBoundary><div className="min-h-screen bg-slate-50 grid place-items-center p-6"><div className="max-w-md rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200"><h1 className="text-lg font-extrabold">Akses Admin ditolak</h1><p className="mt-2 text-sm text-slate-500">Akun ini bukan akun Administrator KerjaHarian.</p><button onClick={() => { window.location.href = '/'; }} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">Kembali</button></div></div></AppErrorBoundary>;
    return <AppErrorBoundary><AdminDashboard onNavigate={navigate} /></AppErrorBoundary>;
  }

  if (view === 'admin') return <AppErrorBoundary><AdminRoute><AdminDashboard onNavigate={navigate} /></AdminRoute></AppErrorBoundary>;

  const protectedDashboard = view === 'employer' || view === 'worker';
  return <AppErrorBoundary><div className="flex min-h-screen flex-col">
    <Header view={view} onNavigate={navigate} onAuthClick={openAuth} lang={lang} onLangChange={handleLangChange} />
    <main className="flex-1">
      {view === 'landing' && <Landing onNavigate={navigate} lang={lang} />}
      {protectedDashboard ? <KycGate><div>{view === 'worker' && <WorkerDispatchPanel />} {view === 'employer' && <EmployerDispatchWatcher />} {view === 'employer' ? <Employer onAuthClick={openAuth} initialCategory={pendingCategory} lang={lang} i18n={i18n} /> : <Worker onAuthClick={openAuth} />} {view === 'employer' && <JobTimer role="employer" lang={lang} />} {view === 'worker' && <JobTimer role="worker" />}</div></KycGate> : null}
    </main>
    <Footer onNavigate={navigate} />
    <AuthModal open={authModal.open} onClose={closeAuth} />
  </div></AppErrorBoundary>;
}
