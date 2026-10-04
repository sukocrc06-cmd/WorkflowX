import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/app/empty-state';

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <EmptyState illo="search" title="Sayfa bulunamadı" actions={<><Button asChild><Link href="/app">Uygulamaya dön</Link></Button><Button variant="secondary" asChild><Link href="/">Ana sayfa</Link></Button></>}>
        Aradığın sayfa taşınmış ya da hiç var olmamış olabilir.
      </EmptyState>
    </main>
  );
}
