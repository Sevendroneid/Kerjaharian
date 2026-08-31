import { useState, useCallback, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Landing } from '@/components/Landing';
import { Employer } from '@/components/Employer';
import { Worker } from '@/components/Worker';
import { AuthModal } from '@/components/AuthModal';
import AdminRoute from '@/components/AdminRoute';
import AdminPricingReview from '@/components/AdminPricingReview';
import type { View, CategoryId } from '@/lib/types';

export default function App() {
  const [view, setView] = useState<View>('landing');
  const [authModal, setAuthModal] = useState<{ open: boolean; mode: 'signin' | 'signup' }>({
    open: false,
    mode: 'signin',
  });

  const [pendingCategory, setPendingCategory] = useState<CategoryId | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === 'true') {
      setView('admin');
    }
  }, []);

  const navigate = useCallback((v: View, category?: CategoryId) => {
    setView(v);
    setPendingCategory(category ?? null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openAuth = useCallback((mode: 'signin' | 'signup') => {
    setAuthModal({ open: true, mode });
  }, []);

  const closeAuth = useCallback(() => {
    setAuthModal((prev) => ({ ...prev, open: false }));
  }, []);

  if (view === 'admin') {
    return (
      <AdminRoute>
        <AdminPricingReview />
      </AdminRoute>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header view={view} onNavigate={navigate} onAuthClick={openAuth} />
      <main className="flex-1">
        {view === 'landing' && <Landing onNavigate={navigate} onAuthClick={openAuth} />}
        {view === 'employer' && <Employer onAuthClick={openAuth} initialCategory={pendingCategory} />}
        {view === 'worker' && <Worker onAuthClick={openAuth} />}
      </main>
      <Footer onNavigate={navigate} />
      <AuthModal open={authModal.open} onClose={closeAuth} />
    </div>
  );
}
