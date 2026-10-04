import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Logo({ href = '/', className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn('inline-flex items-center gap-2.5 rounded-lg text-[17px] font-bold tracking-tight text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40', className)} aria-label="WorkFlowX — Ana sayfa">
      <span aria-hidden="true" className="relative grid size-7 place-items-center rounded-lg bg-[linear-gradient(135deg,var(--foreground),color-mix(in_oklab,var(--foreground)_70%,var(--primary)))] text-[13px] text-background shadow-[0_2px_6px_-2px_var(--brand-glow)]">
        W<span className="absolute right-[5px] bottom-[5px] size-[5px] rounded-full bg-primary" />
      </span>
      <span>WorkFlow<span className="text-brand-ink">X</span></span>
    </Link>
  );
}
