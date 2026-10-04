import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import { supabaseEnv } from './env';

/** Server client bound to the request cookies (Server Components, Route Handlers, Server Actions). */
export async function supabaseServer() {
  if (!supabaseEnv) return null;
  const store = await cookies();
  return createServerClient(supabaseEnv.url, supabaseEnv.key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: list => { try { list.forEach(({ name, value, options }) => store.set(name, value, options)) } catch { /* called from a Server Component: the proxy refreshes cookies */ } },
    },
  });
}

/** The signed-in user (validated with Supabase), or null. Never throws. */
export async function currentUser(): Promise<User | null> {
  try { const sb = await supabaseServer(); if (!sb) return null; const { data } = await sb.auth.getUser(); return data.user ?? null }
  catch { return null }
}
