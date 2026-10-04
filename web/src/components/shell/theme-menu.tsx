'use client';
import { useTheme } from 'next-themes';
import { MoonIcon, SunIcon, MonitorIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ACCENTS, useAccent, themeFade, type Accent } from '@/components/providers';

export function ThemeMenu() {
  const { theme, setTheme } = useTheme();
  const { accent, setAccent } = useAccent();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Tema ve vurgu rengi" className="group">
          <SunIcon className="dark:hidden transition-transform duration-500 group-hover:rotate-45" aria-hidden="true" />
          <MoonIcon className="hidden dark:block transition-transform duration-500 group-hover:-rotate-12" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Tema</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme ?? 'system'} onValueChange={v => { themeFade(); setTheme(v) }}>
          <DropdownMenuRadioItem value="system"><MonitorIcon aria-hidden="true" />Sistem</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light"><SunIcon aria-hidden="true" />Aydınlık</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark"><MoonIcon aria-hidden="true" />Karanlık</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Vurgu rengi</DropdownMenuLabel>
        <div role="radiogroup" aria-label="Vurgu rengi" className="grid grid-cols-8 gap-1 px-2 pt-1 pb-2">
          {ACCENTS.map(([k, label, hex]) => (
            <button key={k} type="button" role="radio" aria-checked={accent === k} aria-label={label} title={label} onClick={() => setAccent(k as Accent)}
              className="size-5 rounded-full outline-none transition-transform hover:scale-110 focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-checked:ring-2 aria-checked:ring-foreground aria-checked:ring-offset-2 aria-checked:ring-offset-popover"
              style={{ background: hex }} />
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
