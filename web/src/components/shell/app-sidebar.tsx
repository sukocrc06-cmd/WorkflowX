'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PanelLeftIcon } from 'lucide-react';
import { NAV, NAV_SECONDARY, type NavItem } from '@/config/nav';
import { Logo } from '@/components/brand/logo';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const isActive = (path: string, href: string) => (href === '/app' ? path === '/app' : path === href || path.startsWith(href + '/'));

function Item({ item, collapsed, onNavigate }: { item: NavItem; collapsed: boolean; onNavigate?: (() => void) | undefined }) {
  const path = usePathname() ?? '';
  const on = isActive(path, item.href);
  const link = (
    <Link href={item.href} {...(onNavigate ? { onClick: onNavigate } : {})} aria-current={on ? 'page' : undefined}
      className={cn('group relative flex h-9 items-center gap-2.5 rounded-[10px] px-2.5 text-sm font-medium text-muted-foreground outline-none transition-[background-color,color,box-shadow] duration-200 hover:bg-muted/70 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40',
        on && 'bg-card text-foreground shadow-soft hover:bg-card', collapsed && 'justify-center px-0')}>
      {on && <span aria-hidden="true" className="absolute top-2 bottom-2 -left-3 w-[3px] rounded-full bg-primary motion-safe:animate-[pop_.42s_var(--ease-spring)]" />}
      <item.icon className={cn('size-[18px] shrink-0 transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:scale-110', on && 'text-primary')} aria-hidden="true" />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && item.phase && <Badge className="ml-auto h-5 px-1.5 text-[10px]" title={`Faz ${item.phase}'te bu uygulamaya taşınacak`}>F{item.phase}</Badge>}
    </Link>
  );
  if (!collapsed) return link;
  return <Tooltip><TooltipTrigger asChild>{link}</TooltipTrigger><TooltipContent side="right">{item.label}</TooltipContent></Tooltip>;
}

export function AppSidebar({ collapsed, onToggle, onNavigate, className }: { collapsed: boolean; onToggle?: () => void; onNavigate?: () => void; className?: string }) {
  return (
    <aside aria-label="Kenar çubuğu" className={cn('sticky top-0 h-dvh flex-col gap-1 border-r bg-sidebar px-3 py-4 transition-[width] duration-300 ease-[cubic-bezier(.16,1,.3,1)]', collapsed ? 'w-[68px]' : 'w-[248px]', className)}>
      <div className={cn('mb-3 flex items-center px-1.5', collapsed ? 'justify-center' : 'justify-between')}>
        {collapsed ? <Link href="/app" aria-label="Genel bakış" className="grid size-8 place-items-center rounded-lg bg-foreground text-sm font-bold text-background">W</Link> : <Logo href="/app" />}
      </div>
      <nav aria-label="Ana menü" className="flex flex-col gap-0.5">{NAV.map(i => <Item key={i.key} item={i} collapsed={collapsed} onNavigate={onNavigate} />)}</nav>
      <div className="mx-1 my-3 h-px bg-border" />
      <nav aria-label="Diğer" className="flex flex-col gap-0.5">{NAV_SECONDARY.map(i => <Item key={i.key} item={i} collapsed={collapsed} onNavigate={onNavigate} />)}</nav>
      <div className="flex-1" />
      {onToggle && (
        <button type="button" onClick={onToggle} aria-pressed={collapsed} aria-label={collapsed ? 'Kenar çubuğunu genişlet' : 'Kenar çubuğunu daralt'}
          className={cn('flex h-9 items-center gap-2.5 rounded-[10px] px-2.5 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40', collapsed && 'justify-center px-0')}>
          <PanelLeftIcon className="size-[18px]" aria-hidden="true" />{!collapsed && <span>Daralt</span>}
        </button>
      )}
    </aside>
  );
}
