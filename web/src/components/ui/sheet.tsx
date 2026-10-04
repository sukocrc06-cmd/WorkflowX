'use client';
import * as React from 'react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetTitle = SheetPrimitive.Title;
const SheetDescription = SheetPrimitive.Description;

function SheetContent({ className, children, side = 'left', ...props }: React.ComponentProps<typeof SheetPrimitive.Content> & { side?: 'left' | 'right' | 'bottom' }) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
      <SheetPrimitive.Content data-slot="sheet-content"
        className={cn('fixed z-50 flex flex-col gap-2 bg-background shadow-pop duration-300 ease-[cubic-bezier(.16,1,.3,1)] data-[state=open]:animate-in data-[state=closed]:animate-out',
          side === 'left' && 'inset-y-0 left-0 w-[min(300px,86vw)] border-r data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left',
          side === 'right' && 'inset-y-0 right-0 w-[min(340px,90vw)] border-l data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right',
          side === 'bottom' && 'inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl border-t data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom', className)} {...props}>
        {children}
        <SheetPrimitive.Close className="absolute top-3 right-3 grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40">
          <XIcon className="size-4" /><span className="sr-only">Kapat</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}
export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetTitle, SheetDescription };
