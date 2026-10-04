import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth/auth-form';
import { authEnabled } from '@/lib/supabase/env';
import { currentUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Yeni şifre' };
/* Reached from the reset e-mail via /auth/callback, which has already exchanged the code for a session. */
export default async function Page() {
  const u = await currentUser();
  return <Suspense><AuthForm kind="reset" authEnabled={authEnabled} google={false} hasSession={!!u} /></Suspense>;
}
