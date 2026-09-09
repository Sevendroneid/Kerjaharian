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

    // iOS never exposes beforeinstallprompt, so show the native-install instructions directly.
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
    <div className="fixed inset-x-0 bottom-0 z-[100] flex justify-center p-3 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[390px] sm:p-0">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl ring-1 ring-slate-200">
        <button
          type="button"
          aria-label="Tutup"
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-4 pr-7">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-slate-900 text-amber-400 shadow-sm">
            <Download size={26} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600">KerjaHarian</p>
            <h2 className="mt-1 text-lg font-extrabold text-slate-900">Pasang aplikasi KerjaHarian</h2>
            <p className="mt-1 text-sm leading-5 text-slate-500">Lebih cepat dibuka dari layar utama, tanpa perlu mencari website lagi.</p>
          </div>
        </div>

        {deferredPrompt ? (
          <button
            type="button"
            onClick={handleInstall}
            disabled={installing}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3.5 text-sm font-extrabold text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-60"
          >
            <Download size={18} />
            {installing ? 'Memasang…' : 'Pasang KerjaHarian'}
          </button>
        ) : ios ? (
          <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-extrabold text-slate-900">Cara pasang di iPhone/iPad</p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 leading-5">
              <li>Tekan tombol <Share className="mx-1 inline-block" size={16} /> <b>Bagikan</b> di Safari.</li>
              <li>Pilih <b>Tambahkan ke Layar Utama</b>.</li>
              <li>Tekan <b>Tambah</b>.</li>
            </ol>
          </div>
        ) : android ? (
          <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-extrabold text-slate-900">Jika tombol instal belum muncul</p>
            <p className="mt-1 leading-5">Di Chrome, buka menu <b>⋮</b> lalu pilih <b>Install app</b> atau <b>Tambahkan ke layar utama</b>.</p>
          </div>
        ) : (
          <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-5 text-slate-600">Buka KerjaHarian di Chrome atau Safari pada perangkat Android/iPhone untuk memasangnya sebagai aplikasi.</p>
        )}

        <button type="button" onClick={() => setOpen(false)} className="mt-3 w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600">
          Nanti saja
        </button>
      </div>
    </div>
  );
}
