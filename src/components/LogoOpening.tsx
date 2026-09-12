import { useEffect } from 'react';

interface LogoOpeningProps {
  onDone: () => void;
}

export function LogoOpening({ onDone }: LogoOpeningProps) {
  useEffect(() => {
    const doneTimer = window.setTimeout(onDone, 3000);
    return () => window.clearTimeout(doneTimer);
  }, [onDone]);

  return (
    <div
      aria-label="KerjaHarian"
      className="fixed inset-0 z-[200] grid place-items-center overflow-hidden bg-black animate-[openingFadeOut_400ms_ease-in-out_2600ms_forwards]"
    >
      <div className="animate-[openingLogoIn_1400ms_cubic-bezier(0.16,1,0.3,1)_forwards] scale-[0.08] opacity-0 whitespace-nowrap">
        <span className="font-display text-5xl font-extrabold tracking-tight text-white sm:text-6xl">
          Kerja<span className="text-[#f97316]">Harian</span>
        </span>
      </div>

      <style>{`
        @keyframes openingLogoIn {
          0% { opacity: 0; transform: scale(0.08); }
          70% { opacity: 1; transform: scale(1.04); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes openingFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
