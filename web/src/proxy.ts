import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { supabaseEnv, safeNext } from '@/lib/supabase/env';

/**
 * Runs before every page: keeps the Supabase session cookie fresh and guards routes.
 * - /app/*        → requires a session (redirects to /login?next=…)
 * - /login, /signup while signed in → back into the app
 * Local mode (no Supabase settings) → everything is open, exactly like the prototype.
 */
export async function proxy(request: NextRequest) {
  if (!supabaseEnv) return NextResponse.next();
  let response = NextResponse.next({ request });
  const sb = createServerClient(supabaseEnv.url, supabaseEnv.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: list => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  let signedIn = false;
  try { const { data } = await sb.auth.getUser(); signedIn = !!data.user } catch { signedIn = false }

  const { pathname, search } = request.nextUrl;
  if (!signedIn && (pathname === '/app' || pathname.startsWith('/app/'))) {
    const to = request.nextUrl.clone(); to.pathname = '/login'; to.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(to);
  }
  if (signedIn && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL(safeNext(request.nextUrl.searchParams.get('next')), request.url));
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
