import { HardHat } from 'lucide-react';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-primary-900 text-white shadow-soft">
        <HardHat className="h-5 w-5" strokeWidth={2.5} />
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-accent-500 ring-2 ring-white" />
      </div>
      <div className="leading-none">
        <span className="font-display text-lg font-extrabold tracking-tight text-primary-900">
          Kerja<span className="text-accent-500">Harian</span>
        </span>
        <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Tenaga Kerja Terampil
        </span>
      </div>
    </div>
  );
}
