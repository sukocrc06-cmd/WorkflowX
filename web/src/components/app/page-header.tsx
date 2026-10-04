import * as React from 'react';
export function PageHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 motion-safe:animate-rise">
      <div className="min-w-0"><h1 className="text-[28px] leading-tight font-semibold tracking-[-0.04em] md:text-[30px]">{title}</h1>{description && <p className="mt-1 text-muted-foreground">{description}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
