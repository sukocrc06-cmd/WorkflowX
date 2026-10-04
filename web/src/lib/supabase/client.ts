'use client';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseEnv } from './env';

let client: SupabaseClient | null = null;
/** Browser client (singleton). Returns null in local mode. */
export function supabaseBrowser(): SupabaseClient | null {
  if (!supabaseEnv) return null;
  client ??= createBrowserClient(supabaseEnv.url, supabaseEnv.key);
  return client;
}
