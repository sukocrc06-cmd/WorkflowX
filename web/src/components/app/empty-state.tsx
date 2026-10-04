import * as React from 'react';
import { Illustration, type IlloName } from '@/components/brand/illustration';
import { cn } from '@/lib/utils';

export function EmptyState({ illo, title, children, actions, className }: { illo: IlloName; title: string; children?: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-10 text-center', className)}>
      <Illustration name={illo} className="h-[104px] w-[156px] drop-shadow-[0_8px_14px_color-mix(in_oklab,var(--primary)_12%,transparent)]" />
      <h3 className="mt-3 text-[17px] font-semibold tracking-tight">{title}</h3>
      {children && <div className="mt-1 max-w-[420px] text-sm text-muted-foreground">{children}</div>}
      {actions && <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
}
