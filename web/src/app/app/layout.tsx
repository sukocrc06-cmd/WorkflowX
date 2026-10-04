export const dynamic = 'force-dynamic';
import { AppShell, type ShellUser } from '@/components/shell/app-shell';
import { currentUser } from '@/lib/supabase/server';
import { authEnabled } from '@/lib/supabase/env';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await currentUser();
  const user: ShellUser | null = u ? {
    name: String(u.user_metadata?.full_name ?? u.user_metadata?.name ?? '').slice(0, 120),
    email: u.email ?? '',
    provider: String(u.app_metadata?.provider ?? 'email'),
  } : null;
  return <AppShell user={user} authEnabled={authEnabled}>{children}</AppShell>;
}
