import type { Metadata } from 'next';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppearanceSettings } from '@/components/settings/appearance';
import { AccountSettings } from '@/components/settings/account';
import { currentUser } from '@/lib/supabase/server';
import { authEnabled } from '@/lib/supabase/env';

export const metadata: Metadata = { title: 'Ayarlar' };

export default async function Settings() {
  const u = await currentUser();
  const user = u ? { name: String(u.user_metadata?.full_name ?? u.user_metadata?.name ?? ''), email: u.email ?? '', provider: String(u.app_metadata?.provider ?? 'email') } : null;
  return (
    <>
      <PageHeader title="Ayarlar" description="Görünüm ve hesap. Çalışma saatleri, bildirimler ve veri ayarları ekranlarla birlikte taşınacak." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="motion-safe:animate-rise"><CardHeader><CardTitle>Görünüm</CardTitle></CardHeader><CardContent><AppearanceSettings /></CardContent></Card>
        <Card className="motion-safe:animate-rise [animation-delay:60ms]"><CardHeader><CardTitle>Hesap</CardTitle></CardHeader><CardContent><AccountSettings user={user} authEnabled={authEnabled} verified={!!u?.email_confirmed_at} /></CardContent></Card>
      </div>
    </>
  );
}
