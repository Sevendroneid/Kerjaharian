import { useEffect, useState } from 'react';
import { Logo } from './Logo';

interface LogoOpeningProps {
  onDone: () => void;
}

export function LogoOpening({ onDone }: LogoOpeningProps) {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');

  useEffect(() => {
    const holdTimer = window.setTimeout(() => setPhase('hold'), 650);
    const exitTimer = window.setTimeout(() => setPhase('exit'), 1550);
    const doneTimer = window.setTimeout(onDone, 2150);
    return () => {
      window.clearTimeout(holdTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div
      aria-label="KerjaHarian"
      className={`fixed inset-0 z-[200] grid place-items-center overflow-hidden bg-[#050505] transition-opacity duration-500 ${phase === 'exit' ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,106,0,0.12),transparent_34%)]" />
      <div
        className={`relative flex flex-col items-center transition-all duration-700 ease-out ${phase === 'enter' ? 'scale-90 opacity-0' : phase === 'hold' ? 'scale-100 opacity-100' : 'scale-[1.03] opacity-0'}`}
      >
        <div className="rounded-2xl bg-white p-3 shadow-[0_0_70px_rgba(255,106,0,0.18)]">
          <Logo className="scale-[1.18]" />
        </div>
        <div className="mt-7 h-px w-28 overflow-hidden bg-white/10">
          <div className={`h-full bg-accent-500 transition-all duration-700 ease-out ${phase === 'enter' ? 'w-0' : phase === 'hold' ? 'w-full' : 'w-full'}`} />
        </div>
        <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.34em] text-white/45">Cari. Pesan. Selesai.</p>
      </div>
    </div>
  );
}
