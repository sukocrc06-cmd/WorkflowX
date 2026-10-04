import { cn } from '@/lib/utils';
/** Circular progress (0..1). Animates from empty on mount; respects reduced motion via globals. */
export function ProgressRing({ value, label, className, stroke = 7 }: { value: number; label: string; className?: string; stroke?: number }) {
  const R = 26, C = 2 * Math.PI * R, p = Math.max(0, Math.min(1, value || 0));
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={label} className={cn('size-16 -rotate-90', className)}>
      <circle cx="32" cy="32" r={R} fill="none" strokeWidth={stroke} className="stroke-muted" />
      <circle cx="32" cy="32" r={R} fill="none" strokeWidth={stroke} strokeLinecap="round" className="stroke-primary transition-[stroke-dashoffset] duration-1000 ease-[cubic-bezier(.16,1,.3,1)] motion-safe:animate-[ring_1s_cubic-bezier(.16,1,.3,1)_both]"
        style={{ strokeDasharray: C.toFixed(1), strokeDashoffset: (C * (1 - p)).toFixed(1), ['--full' as string]: C.toFixed(1) }} />
    </svg>
  );
}
