import { Star } from 'lucide-react';

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          style={{ width: size, height: size }}
          className={
            i <= Math.round(value)
              ? 'fill-accent-400 text-accent-400'
              : 'fill-slate-200 text-slate-200'
          }
        />
      ))}
    </div>
  );
}
