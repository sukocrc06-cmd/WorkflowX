'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/app/empty-state';

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <EmptyState illo="search" title="Bu sayfa gösterilemedi" actions={<><Button onClick={reset}>Tekrar dene</Button><Button variant="secondary" asChild><Link href="/app">Genel bakışa dön</Link></Button></>}>
      Beklenmeyen bir sorun oluştu. Verilerin korunuyor.
    </EmptyState>
  );
}
