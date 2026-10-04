import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRightIcon, MapIcon } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { ProgressRing } from '@/components/app/progress-ring';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PENDING } from '@/config/nav';
import { ROADMAP, percent, statusOf } from '@/features/roadmap/data';
import { authEnabled } from '@/lib/supabase/env';
import { currentUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Genel Bakış' };

export default async function Overview() {
  const u = await currentUser();
  const name = String(u?.user_metadata?.full_name ?? u?.user_metadata?.name ?? '').split(' ')[0];
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar';
  const now = ROADMAP.find(p => p.now) ?? ROADMAP[0]!;
  const all = ROADMAP.flatMap(p => p.items);
  const nowPct = percent(now.items, authEnabled), allPct = percent(all, authEnabled);
  return (
    <>
      <PageHeader title={`${greet}${name ? `, ${name}` : ''}`} description="WorkFlowX üretim uygulaması · ekranlar fazlar hâlinde buraya taşınıyor." />
      <div className="grid gap-4 md:grid-cols-12">
        <Card className="relative overflow-hidden p-6 md:col-span-7 motion-safe:animate-rise bg-[radial-gradient(260px_160px_at_100%_0%,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_70%)]">
          <div className="flex items-center gap-5">
            <div className="relative shrink-0"><ProgressRing value={nowPct / 100} label={`Faz ${now.n} ilerlemesi`} className="size-20" /><b className="absolute inset-0 grid place-items-center text-[17px] tabular-nums">%{nowPct}</b></div>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[.09em] text-brand-ink uppercase"><span className="relative flex size-2"><span className="absolute inline-flex size-full rounded-full bg-success opacity-60 motion-safe:animate-ping" /><span className="relative inline-flex size-2 rounded-full bg-success" /></span>Şu anki faz</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">Faz {now.n} · {now.tr}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{now.items.filter(i => statusOf(i, authEnabled) === 'done').length} / {now.items.length} madde tamamlandı{authEnabled ? '' : ' · Supabase bağlanınca giriş maddeleri tamamlanır'}</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" className="mt-5" asChild><Link href="/app/roadmap"><MapIcon />Yol haritasını aç<ArrowRightIcon className="transition-transform group-hover:translate-x-0.5" /></Link></Button>
        </Card>
        <Card className="flex flex-col justify-between p-6 md:col-span-5 motion-safe:animate-rise [animation-delay:60ms]">
          <div><p className="text-xs text-muted-foreground">Genel ilerleme</p><p className="mt-1 text-[34px] leading-none font-semibold tracking-[-0.04em] tabular-nums">%{allPct}</p></div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width] duration-1000" style={{ width: `${allPct}%` }} /></div>
          <p className="mt-3 text-xs text-muted-foreground">{all.filter(i => statusOf(i, authEnabled) === 'done').length} tamamlandı · {all.filter(i => statusOf(i, authEnabled) === 'proto').length} prototipte · {all.length} madde</p>
        </Card>
      </div>
      <h2 className="mt-10 mb-3 text-[11px] font-semibold tracking-[.09em] text-muted-foreground uppercase">Taşınacak ekranlar</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PENDING.map((n, i) => (
          <Link key={n.key} href={n.href} style={{ animationDelay: `${80 + i * 40}ms` }}
            className="group rounded-2xl border bg-card p-4 shadow-soft outline-none transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-[3px] hover:border-[color-mix(in_oklab,var(--primary)_30%,var(--border))] hover:shadow-card focus-visible:ring-[3px] focus-visible:ring-ring/40 motion-safe:animate-rise">
            <div className="flex items-center justify-between"><span className="grid size-9 place-items-center rounded-[10px] bg-brand-soft text-brand-ink transition-transform duration-300 ease-[var(--ease-spring)] group-hover:scale-110 group-hover:-rotate-6"><n.icon className="size-[18px]" aria-hidden="true" /></span><Badge>Faz {n.phase}</Badge></div>
            <p className="mt-3 font-semibold">{n.label}</p><p className="mt-0.5 text-[13px] text-muted-foreground">{n.blurb}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
