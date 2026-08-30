import { useState, useCallback } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Landing } from '@/components/Landing';
import { Employer } from '@/components/Employer';
import { Worker } from '@/components/Worker';
import { AuthModal } from '@/components/AuthModal';
import type { View, CategoryId } from '@/lib/types';a

export default function App() {
  const [view, setView] = useState<View>('landing');
  const [authModal, setAuthModal] = useState<{ open: boolean; mode: 'signin' | 'signup' }>({
    open: false,
    mode: 'signin',
  });

  const navigate = useCallback((v: View) => {
    setView(v);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openAuth = useCallback((mode: 'signin' | 'signup') => {
    setAuthModal({ open: true, mode });
  }, []);

  const closeAuth = useCallback(() => {
    setAuthModal((prev) => ({ ...prev, open: false }));
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <Header view={view} onNavigate={navigate} onAuthClick={openAuth} />
      <main className="flex-1">
        {view === 'landing' && <Landing onNavigate={navigate} onAuthClick={openAuth} />}
        {view === 'employer' && <Employer onAuthClick={openAuth} />}
        {view === 'worker' && <Worker onAuthClick={openAuth} />}
      </main>
      <Footer onNavigate={navigate} />
      <AuthModal
        open={authModal.open}
        mode={authModal.mode}
        onClose={closeAuth}
        onModeChange={(mode) => setAuthModal({ open: true, mode })}
      />
    </div>
  );
}
