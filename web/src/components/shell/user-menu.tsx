'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOutIcon, SettingsIcon, LogInIcon } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useShell } from './app-shell';
import { signOut } from '@/lib/auth-client';

export function UserMenu() {
  const { user, authEnabled } = useShell();
  const router = useRouter();
  const name = user?.name || user?.email || 'Misafir';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none ring-offset-2 ring-offset-background transition-transform active:scale-95 focus-visible:ring-[3px] focus-visible:ring-ring/50" aria-label="Hesap menüsü">
        <Avatar name={name} className="shadow-[0_0_0_2px_var(--card),0_0_0_3px_var(--border)]" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="normal-case tracking-normal">
          <span className="block truncate text-sm font-semibold text-foreground">{user?.name || (user ? 'Hesabın' : 'Hesapsız mod')}</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">{user?.email || (authEnabled ? '' : 'Veriler bu cihazda')}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link href="/app/settings"><SettingsIcon />Ayarlar</Link></DropdownMenuItem>
        {user ? (
          <DropdownMenuItem onSelect={async () => { await signOut(); router.replace('/login'); router.refresh() }}><LogOutIcon />Çıkış yap</DropdownMenuItem>
        ) : authEnabled ? (
          <DropdownMenuItem asChild><Link href="/login"><LogInIcon />Giriş yap</Link></DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
