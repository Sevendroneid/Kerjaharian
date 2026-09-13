import { useState } from 'react';
import type { View } from '@/lib/types';
import { LandingDark } from '@/components/LandingDark';

interface RoleEntryProps {
  onNavigate: (view: View) => void;
}

export function RoleEntry({ onNavigate }: RoleEntryProps) {
  const [lang, setLang] = useState<'id' | 'en'>(() => (localStorage.getItem('kerjaharian_lang') as 'id' | 'en') || 'id');
  const handleLangChange = (newLang: 'id' | 'en') => {
    setLang(newLang);
    localStorage.setItem('kerjaharian_lang', newLang);
    window.dispatchEvent(new CustomEvent('kerjaharian:language', { detail: newLang }));
  };
  return <LandingDark onNavigate={onNavigate} lang={lang} onLangChange={handleLangChange} />;
}
