import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

const DOCS = {
  privacy: ['Gizlilik', 'WorkFlowX yalnızca hizmeti sunmak için gereken verileri işler. Hesap verilerin Supabase üzerinde, satır düzeyi güvenlik (RLS) ile yalnızca sana açık tutulur.', 'Yayından önce bu sayfa KVKK ve GDPR uyumlu tam gizlilik politikasıyla değiştirilecek.'],
  terms: ['Kullanım koşulları', 'WorkFlowX şu an geliştirme aşamasındadır ve “olduğu gibi” sunulur.', 'Yayından önce bu sayfa hukuki olarak incelenmiş kullanım koşullarıyla değiştirilecek.'],
} as const;
type Doc = keyof typeof DOCS;
export const dynamicParams = false;
export function generateStaticParams() { return Object.keys(DOCS).map(doc => ({ doc })) }
export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }): Promise<Metadata> { const d = DOCS[(await params).doc as Doc]; return { title: d ? d[0] : 'Bulunamadı' } }

export default async function Legal({ params }: { params: Promise<{ doc: string }> }) {
  const d = DOCS[(await params).doc as Doc]; if (!d) notFound();
  return (
    <article className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Ana sayfa</Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{d[0]}</h1>
      <p className="mt-4 text-lg text-muted-foreground">{d[1]}</p>
      <p className="mt-6 rounded-xl border bg-brand-soft p-4 text-sm">{d[2]}</p>
    </article>
  );
}
