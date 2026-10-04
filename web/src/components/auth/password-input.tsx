'use client';
import * as React from 'react';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function PasswordInput(props: Omit<React.ComponentProps<'input'>, 'type'>) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? 'text' : 'password'} maxLength={72} className="pr-11" />
      <button type="button" onClick={() => setShow(s => !s)} aria-pressed={show} aria-label={show ? 'Şifreyi gizle' : 'Şifreyi göster'}
        className="absolute top-1/2 right-1 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40">
        {show ? <EyeOffIcon className="size-4" aria-hidden="true" /> : <EyeIcon className="size-4" aria-hidden="true" />}
      </button>
    </div>
  );
}

export function StrengthMeter({ value, problem }: { value: number; problem: string }) {
  const color = ['', 'bg-destructive', 'bg-warning', 'bg-primary', 'bg-success'][value] ?? '';
  return (
    <div id="pw-meter" aria-live="polite" className="mt-1.5">
      <div className="grid grid-cols-4 gap-1">{[1, 2, 3, 4].map(i => <i key={i} className={`h-1 rounded-full transition-colors ${i <= value ? color : 'bg-muted'}`} />)}</div>
      <p className="mt-1 text-[11.5px] text-muted-foreground">{problem || ['En az 8 karakter, harf ve rakam', 'Zayıf', 'Orta', 'İyi', 'Güçlü'][value]}</p>
    </div>
  );
}
