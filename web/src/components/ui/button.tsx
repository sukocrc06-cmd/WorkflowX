import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-sm font-medium outline-none select-none transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-[cubic-bezier(.16,1,.3,1)] focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 active:scale-[.97] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-[0_1px_2px_rgb(16_17_22/.12),0_6px_16px_-6px_var(--brand-glow),inset_0_1px_0_rgb(255_255_255/.18)] bg-[linear-gradient(180deg,rgb(255_255_255/.14),transparent_60%)] hover:-translate-y-px hover:brightness-[.96] hover:shadow-[0_2px_4px_rgb(16_17_22/.14),0_10px_24px_-8px_var(--brand-glow)]',
        secondary: 'border bg-card text-foreground shadow-soft hover:-translate-y-px hover:bg-muted hover:shadow-card',
        outline: 'border bg-transparent hover:bg-muted',
        ghost: 'hover:bg-muted text-foreground',
        destructive: 'bg-destructive text-destructive-foreground hover:brightness-95',
        link: 'text-brand-ink underline-offset-4 hover:underline px-0',
      },
      size: {
        default: 'h-9 px-4',
        sm: 'h-8 rounded-lg px-3 text-[13px]',
        lg: 'h-11 rounded-xl px-5 text-[15px]',
        icon: 'size-9',
        'icon-sm': 'size-8 rounded-lg',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

type ButtonProps = React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean };

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
