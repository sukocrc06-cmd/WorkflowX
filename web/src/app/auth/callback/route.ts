import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { safeNext } from '@/lib/supabase/env';

/* OAuth (Google) and e-mail links land here with ?code=… (PKCE). The code is exchanged for a session
   cookie, then the user continues to a validated in-app path. Failures go back to /login with a notice. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl, code = url.searchParams.get('code'), next = safeNext(url.searchParams.get('next'));
  const sb = await supabaseServer();
  if (sb && code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }
  return NextResponse.redirect(new URL('/login?error=link', request.url));
}
