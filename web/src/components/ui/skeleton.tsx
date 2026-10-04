import * as React from 'react';
import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="skeleton" aria-hidden="true"
    className={cn('animate-shimmer rounded-lg bg-[linear-gradient(100deg,var(--muted)_30%,color-mix(in_oklab,var(--muted)_30%,var(--card))_50%,var(--muted)_70%)] bg-[length:250%_100%]', className)} {...props} />;
}
export { Skeleton };
