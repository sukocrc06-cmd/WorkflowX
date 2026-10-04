'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MenuIcon } from 'lucide-react';
import { NAV, MOBILE_NAV } from '@/config/nav';
import { isActive } from './app-sidebar';
import { cn } from '@/lib/utils';

export function MobileTabBar({ onMore }: { onMore: () => void }) {
  const path = usePathname() ?? '';
  const items = MOBILE_NAV.map(k => NAV.find(n => n.key === k)!);
  const cls = 'flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10.5px] font-medium text-muted-foreground transition-[color,transform] active:scale-90 outline-none focus-visible:text-foreground';
  return (
    <nav aria-label="Mobil menü" className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background/85 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden">
      {items.map(i => { const on = isActive(path, i.href); return (
        <Link key={i.key} href={i.href} aria-current={on ? 'page' : undefined} className={cn(cls, on && 'text-foreground')}>
          <i.icon className={cn('size-5', on && 'text-primary')} aria-hidden="true" />{i.label}
        </Link>); })}
      <button type="button" onClick={onMore} className={cls}><MenuIcon className="size-5" aria-hidden="true" />Daha</button>
    </nav>
  );
}
