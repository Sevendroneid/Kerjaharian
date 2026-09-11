import { useEffect } from 'react';
import { Logo } from './Logo';

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
      className="fixed inset-0 z-[200] grid place-items-center overflow-hidden bg-[#050505] animate-[fadeOut_500ms_ease-in-out_2500ms_forwards]"
    >
      <div className="animate-[logoFlyIn_1400ms_cubic-bezier(0.16,1,0.3,1)_forwards] opacity-0 scale-[0.08]">
        <Logo className="scale-[1.35]" />
      </div>
      <style>{`
        @keyframes logoFlyIn {
          0% { opacity: 0; transform: scale(0.08); }
          70% { opacity: 1; transform: scale(1.04); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; pointer-events: none; }
        }
      `}</style>
    </div>
  );
}
