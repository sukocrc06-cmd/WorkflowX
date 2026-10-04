import { Skeleton } from '@/components/ui/skeleton';
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Yükleniyor">
      <Skeleton className="mb-2 h-8 w-56" /><Skeleton className="mb-8 h-4 w-80 max-w-full" />
      <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
    </div>
  );
}
