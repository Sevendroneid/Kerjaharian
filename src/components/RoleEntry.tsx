import type { View } from '@/lib/types';
import { LandingDark } from '@/components/LandingDark';

interface RoleEntryProps {
  onNavigate: (view: View) => void;
}

export function RoleEntry({ onNavigate }: RoleEntryProps) {
  const lang = (localStorage.getItem('kerjaharian_lang') as 'id' | 'en') || 'id';
  return <LandingDark onNavigate={onNavigate} lang={lang} />;
}
