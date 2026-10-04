/**
 * Supabase settings come from .env.local (see .env.example). Both values are public by design:
 * the publishable key only allows what Row Level Security permits. Never put the secret key here.
 * When they are missing or malformed, the app runs in "local" mode: no sign-in, no protected routes.
 */
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
const key = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
const okUrl = /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(url) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d{2,5})?$/i.test(url);
const okKey = /^[A-Za-z0-9._-]{20,}$/.test(key) && !/^sb_secret_/.test(key);

export const supabaseEnv = okUrl && okKey ? { url, key } : null;
export const authEnabled = supabaseEnv !== null;
export const googleEnabled = authEnabled && process.env.NEXT_PUBLIC_AUTH_GOOGLE === '1';

/** Only same-app paths are allowed as post-login destinations (no //host, no schemes). */
export function safeNext(next: string | null | undefined, fallback = '/app'): string {
  if (!next) return fallback;
  return /^\/(?!\/)[A-Za-z0-9_\-/.?=&%]*$/.test(next) && !next.includes('..') ? next : fallback;
}
