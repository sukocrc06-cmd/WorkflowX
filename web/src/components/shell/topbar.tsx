'use client';
import { MenuIcon, SearchIcon, BellIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { ThemeMenu } from './theme-menu';
import { UserMenu } from './user-menu';
import { useShell } from './app-shell';
import { useIsMac } from '@/hooks/use-platform';

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { openCommand } = useShell();
  const mac = useIsMac();
  return (
    <header className="sticky top-0 z-30 flex h-[60px] items-center gap-2 border-b border-border/70 bg-background/75 px-3 backdrop-blur-xl backdrop-saturate-150 md:px-8">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenu} aria-label="Menüyü aç"><MenuIcon /></Button>
      <button type="button" onClick={openCommand}
        className="group flex h-9 min-w-0 flex-1 items-center gap-2 rounded-[10px] border bg-card px-3 text-sm text-muted-foreground shadow-soft outline-none transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-card focus-visible:ring-[3px] focus-visible:ring-ring/40 md:max-w-[340px]">
        <SearchIcon className="size-4 shrink-0 transition-transform group-hover:scale-110" aria-hidden="true" />
        <span className="truncate"><span className="sm:hidden">Ara…</span><span className="hidden sm:inline">Ara veya komut çalıştır…</span></span>
        <Kbd className="ml-auto hidden sm:inline-flex">{mac ? '⌘ K' : 'Ctrl K'}</Kbd>
      </button>
      <div className="flex-1" />
      <Button variant="ghost" size="icon" aria-label="Bildirimler (Faz 3)" title="Bildirimler Faz 3'te taşınacak" className="group hidden sm:inline-flex">
        <BellIcon className="origin-top transition-transform group-hover:animate-[bell_.8s_var(--ease-out-expo)]" aria-hidden="true" />
      </Button>
      <ThemeMenu />
      <UserMenu />
    </header>
  );
}
