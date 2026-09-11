interface LanguageSwitcherProps {
  lang: 'id' | 'en';
  onChange: (lang: 'id' | 'en') => void;
  mobile?: boolean;
}

export function LanguageSwitcher({ lang, onChange, mobile = false }: LanguageSwitcherProps) {
  return (
    <div
      className={`inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 ${mobile ? 'w-full' : ''}`}
      role="group"
      aria-label="Language / Bahasa"
    >
      <button
        type="button"
        onClick={() => onChange('id')}
        aria-pressed={lang === 'id'}
        className={`min-h-10 rounded-lg px-3 text-xs font-extrabold transition ${mobile ? 'flex-1' : ''} ${lang === 'id' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
      >
        🇮🇩 Indonesia
      </button>
      <button
        type="button"
        onClick={() => onChange('en')}
        aria-pressed={lang === 'en'}
        className={`min-h-10 rounded-lg px-3 text-xs font-extrabold transition ${mobile ? 'flex-1' : ''} ${lang === 'en' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
      >
        🇬🇧 English
      </button>
    </div>
  );
}
