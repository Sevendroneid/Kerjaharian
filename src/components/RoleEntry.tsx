import type { View } from '@/lib/types';
import { LandingDark } from '@/components/LandingDark';

interface RoleEntryProps {
  onNavigate: (view: View) => void;
  lang: 'id' | 'en';
  onLangChange: (lang: 'id' | 'en') => void;
}

export function RoleEntry({ onNavigate, lang, onLangChange }: RoleEntryProps) {
  return <LandingDark onNavigate={onNavigate} lang={lang} onLangChange={onLangChange} />;
}
