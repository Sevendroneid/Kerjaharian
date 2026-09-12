export function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`} aria-label="KerjaHarian">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#111] ring-1 ring-white/10 shadow-soft" aria-hidden="true">
        <span className="font-display text-lg font-black tracking-[-0.08em] leading-none">
          <span className="text-white">K</span><span className="text-accent-500">H</span>
        </span>
      </div>
      <div className="leading-none whitespace-nowrap">
        <span className="font-display text-lg font-extrabold tracking-[-0.035em] text-white">
          Kerja<span className="text-accent-500">Harian</span>
        </span>
      </div>
    </div>
  );
}
