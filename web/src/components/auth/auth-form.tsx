'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircleIcon, LockIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Illustration } from '@/components/brand/illustration';
import { PasswordInput, StrengthMeter } from './password-input';
import { EMAIL_RX, pwProblem, pwStrength, resendConfirmation, sendReset, signIn, signInWithGoogle, signUp, updatePassword } from '@/lib/auth-client';
import { safeNext } from '@/lib/supabase/env';

type Kind = 'login' | 'signup' | 'forgot' | 'reset';
const COPY: Record<Kind, { h: string; p: string; btn: string; foot: [string, string, string] }> = {
  login: { h: 'Tekrar hoş geldin', p: 'Çalışma alanına giriş yap.', btn: 'Giriş yap', foot: ['Hesabın yok mu?', 'Kayıt ol', '/signup'] },
  signup: { h: 'Hesap oluştur', p: 'Birkaç saniyede çalışma alanını kur.', btn: 'Hesap oluştur', foot: ['Zaten hesabın var mı?', 'Giriş yap', '/login'] },
  forgot: { h: 'Şifreni sıfırla', p: 'E-posta adresini yaz; sıfırlama bağlantısı gönderelim.', btn: 'Bağlantı gönder', foot: ['Şifreni hatırladın mı?', 'Giriş yap', '/login'] },
  reset: { h: 'Yeni şifre belirle', p: 'Hesabın için yeni bir şifre seç.', btn: 'Şifreyi kaydet', foot: ['Vazgeç', 'Giriş sayfasına dön', '/login'] },
};
const GoogleG = () => (
  <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden="true"><path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h6a5.1 5.1 0 0 1-2.2 3.4v2.8h3.6c2.1-2 3.2-4.9 3.2-8.2z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.9A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7H2.1a11 11 0 0 0 0 10z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7l3.7 2.9C6.7 7.3 9.1 5.4 12 5.4z"/></svg>
);

export function AuthForm({ kind, authEnabled, google, hasSession = true }: { kind: Kind; authEnabled: boolean; google: boolean; hasSession?: boolean }) {
  const c = COPY[kind];
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [top, setTop] = React.useState(params.get('error') ? 'Bağlantının süresi dolmuş ya da geçersiz. Yeni bir bağlantı iste.' : '');
  const [unconfirmed, setUnconfirmed] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState<null | { kind: 'confirm' | 'sent'; email: string }>(null);
  const [pw, setPw] = React.useState('');
  const [cool, setCool] = React.useState(0);
  React.useEffect(() => { if (!cool) return; const t = setTimeout(() => setCool(c => c - 1), 1000); return () => clearTimeout(t) }, [cool]);

  if (kind === 'reset' && authEnabled && !hasSession) return (
    <div className="text-center"><Illustration name="search" className="mx-auto h-[100px] w-[150px]" /><h1 className="mt-2 text-2xl font-semibold tracking-tight">Bağlantı geçersiz</h1>
      <p className="mt-1 text-muted-foreground">Şifre sıfırlama bağlantısının süresi dolmuş ya da daha önce kullanılmış olabilir.</p>
      <Button size="lg" className="mt-6 w-full" asChild><Link href="/forgot-password">Yeni bağlantı iste</Link></Button></div>
  );
  if (done) return (
    <div className="text-center"><Illustration name="inbox" className="mx-auto h-[100px] w-[150px]" />
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{done.kind === 'confirm' ? 'E-postanı kontrol et' : 'Bağlantı gönderildi'}</h1>
      <p className="mt-1 text-muted-foreground">{done.kind === 'confirm' ? <><b className="text-foreground">{done.email}</b> adresine bir doğrulama bağlantısı gönderdik. Bağlantıya tıkladığında hesabın açılır.</> : <><b className="text-foreground">{done.email}</b> adresine kayıtlı bir hesap varsa birkaç dakika içinde şifre sıfırlama bağlantısı gelecek.</>}</p>
      <p className="mt-3 text-xs text-muted-foreground">Gelmediyse spam klasörüne bak.</p>
      {done.kind === 'confirm' && <Button variant="secondary" className="mt-5 w-full" disabled={cool > 0} onClick={async () => { const r = await resendConfirmation(done.email); if (r.ok) setCool(60) }}>{cool ? `${cool} sn sonra tekrar gönderebilirsin` : 'Bağlantıyı tekrar gönder'}</Button>}
      <p className="mt-5 text-sm"><Link className="underline underline-offset-4" href="/login">Giriş sayfasına dön</Link></p></div>
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = e.currentTarget, fd = new FormData(f);
    const email = String(fd.get('email') ?? '').trim().toLowerCase(), name = String(fd.get('name') ?? '').trim().slice(0, 120), pass = String(fd.get('password') ?? ''), pass2 = String(fd.get('password2') ?? '');
    const er: Record<string, string> = {};
    if (f.elements.namedItem('email') && !EMAIL_RX.test(email)) er.email = 'Geçerli bir e-posta adresi gir.';
    if (f.elements.namedItem('name') && !name) er.name = 'Adını yaz.';
    if (f.elements.namedItem('password')) { const p = kind === 'login' ? (pass ? '' : 'Şifreni yaz.') : pwProblem(pass); if (p) er.password = p }
    if (f.elements.namedItem('password2') && pass2 !== pass) er.password2 = 'Şifreler aynı değil.';
    if (f.elements.namedItem('terms') && !(f.elements.namedItem('terms') as HTMLInputElement).checked) er.terms = 'Devam etmek için onaylaman gerekiyor.';
    setErrors(er); setTop(''); setUnconfirmed('');
    if (Object.keys(er).length) { (f.querySelector('[aria-invalid="true"]') as HTMLElement | null)?.focus(); return }
    if (!authEnabled) { router.push('/app'); return }
    setBusy(true);
    const clear = () => { ['password', 'password2'].forEach(n => { const i = f.elements.namedItem(n) as HTMLInputElement | null; if (i) i.value = '' }); setPw('') };
    try {
      if (kind === 'login') { const r = await signIn(email, pass); clear(); if (r.ok) { router.replace(next); router.refresh(); return } setTop(r.msg); if (r.unconfirmed) setUnconfirmed(email); return }
      if (kind === 'signup') { const r = await signUp(name, email, pass); clear(); if (!r.ok) { setTop(r.msg); return } if (r.confirm) { setDone({ kind: 'confirm', email }); return } router.replace('/app'); router.refresh(); return }
      if (kind === 'forgot') { const r = await sendReset(email); if (!r.ok) { setTop(r.msg); return } setDone({ kind: 'sent', email }); return }
      const r = await updatePassword(pass); clear(); if (!r.ok) { setTop(r.msg); return } router.replace('/app'); router.refresh();
    } finally { setBusy(false) }
  }

  const field = (n: string, l: string, type: 'email' | 'text' | 'password', ac: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`au-${n}`}>{l}</Label>
      {type === 'password'
        ? <PasswordInput id={`au-${n}`} name={n} autoComplete={ac} aria-invalid={!!errors[n]} aria-describedby={`au-${n}-e${kind !== 'login' && n === 'password' ? ' pw-meter' : ''}`} onChange={n === 'password' ? e => setPw(e.target.value) : undefined} />
        : <Input id={`au-${n}`} name={n} type={type} autoComplete={ac} aria-invalid={!!errors[n]} aria-describedby={`au-${n}-e`} {...(type === 'email' ? { inputMode: 'email' as const, autoCapitalize: 'off', spellCheck: false, maxLength: 254 } : { maxLength: 120 })} />}
      <p id={`au-${n}-e`} className="text-xs text-destructive empty:hidden">{errors[n] ?? ''}</p>
      {kind !== 'login' && n === 'password' && <StrengthMeter value={pw ? pwStrength(pw) : 0} problem={pw ? pwProblem(pw) : ''} />}
    </div>
  );

  return (
    <>
      <h1 className="text-[26px] font-semibold tracking-[-0.035em]">{c.h}</h1>
      <p className="mt-1 mb-5 text-muted-foreground">{c.p}</p>
      {!authEnabled && <div role="note" className="mb-5 flex gap-2 rounded-xl border bg-brand-soft p-3 text-[13px]"><LockIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span>Hesap sistemi henüz bağlanmadı. <code>.env.local</code> dosyasına Supabase ayarları girilince gerçek hesaplar açılır. Şimdilik hesapsız devam edebilirsin.</span></div>}
      {google && (kind === 'login' || kind === 'signup') && <>
        <Button type="button" variant="secondary" size="lg" className="w-full font-semibold" disabled={busy} onClick={async () => { setBusy(true); const r = await signInWithGoogle(next); if (!r.ok) { setTop(r.msg); setBusy(false) } }}><GoogleG />Google ile devam et</Button>
        <div className="my-4 flex items-center gap-3 text-xs tracking-[.08em] text-muted-foreground uppercase before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">veya</div>
      </>}
      <form noValidate onSubmit={onSubmit} className="space-y-4">
        {kind === 'signup' && field('name', 'Ad soyad', 'text', 'name')}
        {kind !== 'reset' && field('email', 'E-posta', 'email', kind === 'login' ? 'username' : 'email')}
        {kind !== 'forgot' && field('password', kind === 'reset' ? 'Yeni şifre' : 'Şifre', 'password', kind === 'login' ? 'current-password' : 'new-password')}
        {kind === 'reset' && field('password2', 'Yeni şifre (tekrar)', 'password', 'new-password')}
        {kind === 'signup' && <div><label className="flex cursor-pointer items-start gap-2 text-[13px]"><input type="checkbox" name="terms" className="mt-0.5 accent-[var(--primary)]" aria-invalid={!!errors.terms} aria-describedby="au-terms-e" /><span><Link href="/legal/terms" className="underline underline-offset-2">Kullanım koşulları</Link> ve <Link href="/legal/privacy" className="underline underline-offset-2">Gizlilik</Link> metinlerini okudum.</span></label><p id="au-terms-e" className="mt-1 text-xs text-destructive empty:hidden">{errors.terms ?? ''}</p></div>}
        {kind === 'login' && <div className="-mt-1 text-right text-[13px]"><Link href="/forgot-password" className="underline-offset-4 hover:underline">Şifremi unuttum</Link></div>}
        {top && <p role="alert" className="flex gap-2 rounded-xl bg-danger-soft px-3 py-2 text-[13px] text-destructive"><AlertCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span>{top}{unconfirmed && <> <button type="button" className="font-medium underline underline-offset-2" disabled={cool > 0} onClick={async () => { const r = await resendConfirmation(unconfirmed); if (r.ok) setCool(60) }}>{cool ? `${cool} sn` : 'Doğrulama e-postasını tekrar gönder'}</button></>}</span></p>}
        <Button type="submit" size="lg" className="w-full" disabled={busy} aria-busy={busy}>{busy ? 'Lütfen bekle…' : c.btn}</Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted-foreground">{c.foot[0]} <Link href={c.foot[2]} className="font-medium text-foreground underline-offset-4 hover:underline">{c.foot[1]}</Link></p>
      {!authEnabled && <p className="mt-2 text-center text-sm"><Link href="/app" className="font-medium underline-offset-4 hover:underline">Hesapsız devam et →</Link></p>}
    </>
  );
}
