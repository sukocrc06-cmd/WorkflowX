import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11.5px] font-medium [&_svg]:size-3', {
  variants: {
    variant: {
      default: 'border-transparent bg-muted text-muted-foreground',
      brand: 'border-transparent bg-brand-soft text-brand-ink',
      success: 'border-transparent bg-success-soft text-success',
      warning: 'border-transparent bg-warning-soft text-warning',
      danger: 'border-transparent bg-danger-soft text-destructive',
      outline: 'text-foreground',
      solid: 'border-transparent bg-foreground text-background font-semibold',
    },
  },
  defaultVariants: { variant: 'default' },
});

function Badge({ className, variant, ...props }: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}
export { Badge, badgeVariants };
