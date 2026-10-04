import * as React from 'react';
import { cn } from '@/lib/utils';

/* Stable gradient per name — same 10 pairs as the prototype; white initials stay ≥ 4.5:1. */
const GRADIENTS = [['#5b5bd6', '#3730a3'], ['#0e7490', '#1e40af'], ['#15803d', '#0f766e'], ['#b45309', '#9a3412'], ['#be123c', '#86198f'],
  ['#7c3aed', '#4338ca'], ['#0369a1', '#0f766e'], ['#c2410c', '#be123c'], ['#4d7c0f', '#15803d'], ['#6d28d9', '#be185d']] as const;
export function initials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0] ?? '').slice(0, 2).join('').toLocaleUpperCase('tr-TR') || '?';
}
export function gradientFor(name: string) {
  let h = 0; for (const c of name) h = (h * 31 + (c.codePointAt(0) ?? 0)) >>> 0;
  const g = GRADIENTS[h % GRADIENTS.length]!; return `linear-gradient(135deg, ${g[0]}, ${g[1]})`;
}
function Avatar({ name, className, ...props }: React.ComponentProps<'span'> & { name: string }) {
  return <span data-slot="avatar" aria-hidden="true" style={{ backgroundImage: gradientFor(name || '?') }}
    className={cn('inline-grid size-8 shrink-0 place-items-center rounded-full text-[12px] font-semibold text-white [text-shadow:0_1px_1px_rgb(0_0_0/.18)]', className)} {...props}>{initials(name)}</span>;
}
export { Avatar };
