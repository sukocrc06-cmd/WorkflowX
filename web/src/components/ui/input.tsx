import * as React from 'react';
import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input type={type} data-slot="input"
      className={cn('flex h-10 w-full min-w-0 rounded-[10px] border border-input bg-card px-3 text-sm shadow-soft transition-[border-color,box-shadow] outline-none placeholder:text-muted-foreground/80 focus-visible:border-ring focus-visible:ring-[4px] focus-visible:ring-ring/25 aria-invalid:border-destructive aria-invalid:ring-destructive/20 disabled:opacity-50', className)}
      {...props} />
  );
}
export { Input };
