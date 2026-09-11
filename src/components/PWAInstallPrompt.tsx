import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isAndroid() {
  return /android/i.test(navigator.userAgent);
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setOpen(true);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setOpen(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    // iOS/Android do not always expose beforeinstallprompt, so keep a compact hint available.
    if (isIOS() || isAndroid()) setOpen(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  if (!open || isStandalone()) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setInstalling(false);
    setOpen(false);
  };

  const ios = isIOS();
  const android = isAndroid();

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] flex justify-center p-2 sm:bottom-4 sm:left-auto sm:right-4 sm:w-[min(100%-2rem,420px)] sm:p-0">
      <div className="relative w-full rounded-2xl bg-white px-3 py-2.5 shadow-xl ring-1 ring-slate-200 sm:px-3.5 sm:py-3">
        <button
          type="button"
          aria-label="Tutup"
          onClick={() => setOpen(false)}
          className="absolute right-1.5 top-1.5 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X size={15} />
        </button>

        <div className="flex items-center gap-2.5 pr-6">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-900 text-amber-400">
            <Download size={18} strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold text-slate-900">Pasang KerjaHarian</p>
            <p className="truncate text-[11px] leading-4 text-slate-500">Akses lebih cepat dari layar utama.</p>
          </div>

          {deferredPrompt ? (
            <button
              type="button"
              onClick={handleInstall}
              disabled={installing}
              className="shrink-0 rounded-xl bg-slate-900 px-3 py-2 text-xs font-extrabold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {installing ? 'Memasang…' : 'Pasang'}
            </button>
          ) : ios ? (
            <span className="shrink-0 rounded-xl bg-slate-100 px-2.5 py-2 text-[11px] font-bold text-slate-600">
              <Share className="mr-1 inline-block" size={13} />Bagikan → Layar Utama
            </span>
          ) : android ? (
            <span className="shrink-0 rounded-xl bg-slate-100 px-2.5 py-2 text-[11px] font-bold text-slate-600">
              Menu ⋮ → Install app
            </span>
          ) : (
            <button type="button" onClick={() => setOpen(false)} className="shrink-0 px-2 py-1 text-[11px] font-bold text-slate-400">
              Nanti
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
