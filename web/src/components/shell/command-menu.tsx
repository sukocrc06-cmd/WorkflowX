'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { MoonIcon, SunIcon, MonitorIcon, PaletteIcon, LogOutIcon, KeyboardIcon } from 'lucide-react';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Kbd } from '@/components/ui/kbd';
import { NAV, NAV_SECONDARY } from '@/config/nav';
import { ACCENTS, useAccent, themeFade, type Accent } from '@/components/providers';
import { useShell } from './app-shell';
import { signOut } from '@/lib/auth-client';
import { useIsMac } from '@/hooks/use-platform';

/* "G then X" navigation shortcuts — same keys as the prototype. */
const GO: Record<string, string> = { t: '/app/today', o: '/app', g: '/app/tasks', p: '/app/projects', c: '/app/calendar', l: '/app/planning', a: '/app/analytics', e: '/app/team', r: '/app/roadmap', s: '/app/settings' };
const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

export function CommandMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const { setAccent } = useAccent();
  const { user } = useShell();
  const mac = useIsMac();
  const [keys, setKeys] = React.useState(false);

  React.useEffect(() => {
    let g = 0;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); onOpenChange(!open); return }
      if (typing(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '?') { e.preventDefault(); setKeys(true); return }
      if (e.key === 'g') { g = Date.now(); return }
      const to = GO[e.key];
      if (to && Date.now() - g < 1200) { e.preventDefault(); g = 0; router.push(to) }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange, router]);

  const run = (fn: () => void) => { onOpenChange(false); fn() };
  const goKey = (href: string) => Object.entries(GO).find(([, v]) => v === href)?.[0];

  return (
    <>
      <CommandDialog open={open} onOpenChange={onOpenChange} title="Komut paleti" description="Bir sayfaya git ya da komut çalıştır">
        <CommandInput placeholder="Ne yapmak istiyorsun?" />
        <CommandList>
          <CommandEmpty>Sonuç yok.</CommandEmpty>
          <CommandGroup heading="Git">
            {[...NAV, ...NAV_SECONDARY].map(n => (
              <CommandItem key={n.key} value={`git ${n.label}`} onSelect={() => run(() => router.push(n.href))}>
                <n.icon />{n.label}{goKey(n.href) && <CommandShortcut>G {goKey(n.href)!.toUpperCase()}</CommandShortcut>}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Görünüm">
            <CommandItem value="tema sistem" onSelect={() => run(() => { themeFade(); setTheme('system') })}><MonitorIcon />Tema: Sistem</CommandItem>
            <CommandItem value="tema aydınlık açık light" onSelect={() => run(() => { themeFade(); setTheme('light') })}><SunIcon />Tema: Aydınlık</CommandItem>
            <CommandItem value="tema karanlık koyu dark" onSelect={() => run(() => { themeFade(); setTheme('dark') })}><MoonIcon />Tema: Karanlık</CommandItem>
            {ACCENTS.map(([k, label, hex]) => (
              <CommandItem key={k} value={`vurgu rengi ${label}`} onSelect={() => run(() => setAccent(k as Accent))}>
                <PaletteIcon style={{ color: hex }} />Vurgu rengi: {label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Diğer">
            <CommandItem value="klavye kısayolları" onSelect={() => run(() => setKeys(true))}><KeyboardIcon />Klavye kısayolları<CommandShortcut>?</CommandShortcut></CommandItem>
            {user && <CommandItem value="çıkış yap" onSelect={() => run(async () => { await signOut(); router.replace('/login'); router.refresh() })}><LogOutIcon />Çıkış yap</CommandItem>}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
      <Dialog open={keys} onOpenChange={setKeys}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Klavye kısayolları</DialogTitle><DialogDescription>Yazı alanı dışındayken çalışır.</DialogDescription></DialogHeader>
          <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-2.5 text-sm">
            <dt>Komut paleti</dt><dd><Kbd>{mac ? '⌘' : 'Ctrl'}</Kbd> <Kbd>K</Kbd></dd>
            <dt>Kısayolları göster</dt><dd><Kbd>?</Kbd></dd>
            {[...NAV, ...NAV_SECONDARY].filter(n => goKey(n.href)).map(n => <React.Fragment key={n.key}><dt>{n.label}</dt><dd><Kbd>G</Kbd> <Kbd>{goKey(n.href)!.toUpperCase()}</Kbd></dd></React.Fragment>)}
          </dl>
        </DialogContent>
      </Dialog>
    </>
  );
}
