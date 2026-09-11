import { useEffect, useState } from 'react';
import { Logo } from './Logo';

interface LogoOpeningProps {
  onDone: () => void;
}

export function LogoOpening({ onDone }: LogoOpeningProps) {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');

  useEffect(() => {
    const enterTimer = window.setTimeout(() => setPhase('hold'), 900);
    const exitTimer = window.setTimeout(() => setPhase('exit'), 3000);
    const doneTimer = window.setTimeout(onDone, 3650);
    return () => {
      window.clearTimeout(enterTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div
      aria-label="KerjaHarian"
      className={`fixed inset-0 z-[200] grid place-items-center overflow-hidden bg-[#050505] transition-opacity duration-650 ease-in-out ${phase === 'exit' ? 'opacity-0' : 'opacity-100'}`}
    >
      <div
        className={`relative transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
          phase === 'enter'
            ? 'scale-[0.08] opacity-0'
            : phase === 'hold'
              ? 'scale-100 opacity-100'
              : 'scale-[1.12] opacity-0'
        }`}
      >
        <Logo className="scale-[1.35]" />
      </div>
    </div>
  );
}
