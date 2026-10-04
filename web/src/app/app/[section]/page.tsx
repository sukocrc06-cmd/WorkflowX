import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MapIcon } from 'lucide-react';
import { PENDING } from '@/config/nav';
import { PageHeader } from '@/components/app/page-header';
import { EmptyState } from '@/components/app/empty-state';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const dynamicParams = false;
export function generateStaticParams() { return PENDING.map(n => ({ section: n.key })) }
const find = (s: string) => PENDING.find(n => n.key === s);

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const n = find((await params).section); return { title: n?.label ?? 'Bulunamadı' };
}

/* Screens that still live in the prototype get an honest placeholder — no fake data. */
export default async function Section({ params }: { params: Promise<{ section: string }> }) {
  const n = find((await params).section); if (!n) notFound();
  return (
    <>
      <PageHeader title={n.label} description={n.blurb} actions={<Badge variant="brand">Faz {n.phase}</Badge>} />
      <Card className="motion-safe:animate-rise">
        <EmptyState illo={n.illo} title={`${n.label}, Faz ${n.phase} kapsamında buraya taşınacak`}
          actions={<Button variant="secondary" asChild><Link href="/app/roadmap"><MapIcon />Yol haritasında gör</Link></Button>}>
          Bu ekran şu an prototipte (<code className="rounded bg-muted px-1 text-xs">index.html</code>) tam çalışıyor. Faz 1&apos;de üretim uygulamasının kabuğu ve tasarım sistemi kuruldu; ekranlar sırayla taşınacak.
        </EmptyState>
      </Card>
    </>
  );
}
