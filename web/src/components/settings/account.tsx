'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOutIcon, CheckIcon, LockIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { PasswordInput } from '@/components/auth/password-input';
import { Label } from '@/components/ui/label';
import { signOut, updatePassword, pwProblem } from '@/lib/auth-client';
import type { ShellUser } from '@/components/shell/app-shell';

export function AccountSettings({ user, authEnabled, verified }: { user: ShellUser | null; authEnabled: boolean; verified: boolean }) {
  const router = useRouter();
  const [err, setErr] = React.useState(''); const [ok, setOk] = React.useState(false); const [busy, setBusy] = React.useState(false);
  if (!authEnabled) return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground"><LockIcon className="size-5" aria-hidden="true" />
      <span className="flex-1">Hesap sistemi bu kurulumda bağlı değil (.env.local içinde Supabase ayarları yok). Uygulama hesapsız modda çalışıyor.</span></div>
  );
  if (!user) return <Button asChild><Link href="/login">Giriş yap</Link></Button>;
  const leave = async (all: boolean) => { await signOut(all); router.replace('/login'); router.refresh() };
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3"><Avatar name={user.name || user.email} className="size-11 text-sm" />
        <div className="min-w-0"><p className="truncate font-semibold">{user.name || 'Hesabın'}</p><p className="truncate text-sm text-muted-foreground">{user.email}</p></div></div>
      <dl className="divide-y rounded-xl border text-sm">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5"><dt className="text-muted-foreground">Giriş yöntemi</dt><dd>{user.provider === 'google' ? 'Google' : 'E-posta ve şifre'}</dd></div>
        <div className="flex items-center justify-between gap-3 px-4 py-2.5"><dt className="text-muted-foreground">E-posta</dt><dd>{verified ? <Badge variant="success"><CheckIcon />Doğrulandı</Badge> : <Badge variant="warning">Doğrulanmadı</Badge>}</dd></div>
      </dl>
      {user.provider !== 'google' && (
        <form className="space-y-3" noValidate onSubmit={async e => {
          e.preventDefault(); const f = e.currentTarget, fd = new FormData(f), pw = String(fd.get('password') ?? ''), pw2 = String(fd.get('password2') ?? '');
          const bad = pwProblem(pw) || (pw !== pw2 ? 'Şifreler aynı değil.' : ''); setOk(false); if (bad) { setErr(bad); return }
          setBusy(true); const r = await updatePassword(pw); setBusy(false); f.reset(); if (!r.ok) { setErr(r.msg); return } setErr(''); setOk(true);
        }}>
          <h3 className="text-[11px] font-semibold tracking-[.09em] text-muted-foreground uppercase">Şifreyi değiştir</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="npw">Yeni şifre</Label><PasswordInput id="npw" name="password" autoComplete="new-password" /></div>
            <div className="space-y-1.5"><Label htmlFor="npw2">Yeni şifre (tekrar)</Label><PasswordInput id="npw2" name="password2" autoComplete="new-password" /></div>
          </div>
          <p role="alert" className="min-h-0 text-sm text-destructive empty:hidden">{err}</p>
          {ok && <p role="status" className="text-sm text-success">Şifren güncellendi.</p>}
          <Button type="submit" variant="secondary" disabled={busy}>{busy ? 'Kaydediliyor…' : 'Şifreyi güncelle'}</Button>
        </form>
      )}
      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button variant="secondary" onClick={() => leave(false)}><LogOutIcon />Çıkış yap</Button>
        <Button variant="ghost" className="text-destructive" onClick={() => leave(true)}>Tüm cihazlardan çık</Button>
      </div>
    </div>
  );
}
