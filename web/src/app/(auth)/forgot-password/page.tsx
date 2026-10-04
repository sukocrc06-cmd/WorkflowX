import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth/auth-form';
import { authEnabled, googleEnabled } from '@/lib/supabase/env';

export const metadata: Metadata = { title: 'Şifreni sıfırla' };
export default function Page() {
  return <Suspense><AuthForm kind="forgot" authEnabled={authEnabled} google={googleEnabled} /></Suspense>;
}
