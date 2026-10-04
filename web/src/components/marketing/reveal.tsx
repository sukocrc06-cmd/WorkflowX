'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';

/** Fades children up when they scroll into view (once). Visible immediately with reduced motion or no IO. */
export function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current; if (!el) return;
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(true); return }
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setShown(true); io.disconnect() } }, { threshold: 0.12 });
    io.observe(el); return () => io.disconnect();
  }, []);
  return <div ref={ref} style={{ transitionDelay: `${delay}ms` }} className={cn('transition-[opacity,transform] duration-700 ease-[cubic-bezier(.16,1,.3,1)]', shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5', className)}>{children}</div>;
}
