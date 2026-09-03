import { useState, useCallback, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Landing } from '@/components/Landing';
import { Employer } from '@/components/Employer';
import { Worker } from '@/components/Worker';
import { AuthModal } from '@/components/AuthModal';
import AdminRoute from '@/components/AdminRoute';
import AdminPricingReview from '@/components/AdminPricingReview';
import AdminKycReview from '@/components/AdminKycReview';
import KycGate from '@/components/KycGate';
import { JobTimer } from '@/components/JobTimer';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { I18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import type { View, CategoryId } from '@/lib/types';

export default function App() {
  const [view, setView] = useState<View>('landing');
  const [lang, setLang] = useState<'id' | 'en'>(() => (localStorage.getItem('kerjaharian_lang') as 'id' | 'en') || 'id');
  const [authModal, setAuthModal] = useState<{ open: boolean; mode: 'signin' | 'signup' }>({ open: false, mode: 'signin' });
  const [pendingCategory, setPendingCategory] = useState<CategoryId | null>(null);
  const { user, profile, loading: authLoading } = useAuth();
  const i18n = new I18n(lang);
  useEffect(() => { const params = new URLSearchParams(window.location.search); if (params.get('admin') === 'true') setView('admin'); }, []);
  useEffect(() => { if (authLoading || !user || !profile?.full_name) return; if (profile.role === 'admin') { setView('admin'); return; } if (profile.role === 'employer') setView('employer'); else if (profile.role === 'worker') setView('worker'); }, [authLoading, user, profile?.full_name, profile?.role]);
  useEffect(() => { if (!authLoading && user && !profile?.full_name) setAuthModal((prev) => ({ ...prev, open: true, mode: 'signup' })); }, [authLoading, user, profile?.full_name]);
  const navigate = useCallback((v: View, category?: CategoryId) => { setView(v); setPendingCategory(category ?? null); window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);
  const openAuth = useCallback((mode: 'signin' | 'signup') => setAuthModal({ open: true, mode }), []);
  const closeAuth = useCallback(() => setAuthModal((prev) => ({ ...prev, open: false })), []);
  const handleLangChange = useCallback((newLang: 'id' | 'en') => { setLang(newLang); localStorage.setItem('kerjaharian_lang', newLang); }, []);
  if (view === 'admin') return <AppErrorBoundary><AdminRoute><div className="space-y-6"><AdminKycReview /><AdminPricingReview /></div></AdminRoute></AppErrorBoundary>;
  const protectedDashboard = view === 'employer' || view === 'worker';
  return <AppErrorBoundary><div className="flex min-h-screen flex-col"><Header view={view} onNavigate={navigate} onAuthClick={openAuth} lang={lang} onLangChange={handleLangChange} /><main className="flex-1">{view === 'landing' && <Landing onNavigate={navigate} lang={lang} />}{protectedDashboard ? <KycGate><div>{view === 'employer' ? <Employer onAuthClick={openAuth} initialCategory={pendingCategory} lang={lang} i18n={i18n} /> : <Worker onAuthClick={openAuth} />} {view === 'employer' && <JobTimer role="employer" lang={lang} />} {view === 'worker' && <JobTimer role="worker" lang={lang} />}</div></KycGate> : null}</main><Footer onNavigate={navigate} /><AuthModal open={authModal.open} onClose={closeAuth} /></div></AppErrorBoundary>;
}
