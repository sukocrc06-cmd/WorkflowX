'use client';
import { supabaseBrowser } from '@/lib/supabase/client';
import { supabaseEnv } from '@/lib/supabase/env';

/**
 * Browser-side auth actions. Each returns { ok, msg? } with friendly Turkish messages that never
 * reveal whether an email is registered. Redirect-based flows land on /auth/callback (PKCE).
 */
export type AuthResult = { ok: true; confirm?: boolean } | { ok: false; msg: string; unconfirmed?: boolean };

export function authError(e: unknown): string {
  const o = (e ?? {}) as { message?: string; code?: string; status?: number };
  const m = `${o.message ?? ''} ${o.code ?? ''}`;
  if (e instanceof TypeError || /fetch|network|Failed to/i.test(m)) return 'Bağlantı kurulamadı. İnternet bağlantını kontrol edip tekrar dene.';
  if (o.status === 429 || /rate limit|too many|over_.*rate_limit/i.test(m)) return 'Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar dene.';
  if (/invalid login|invalid_credentials/i.test(m)) return 'E-posta veya şifre hatalı.';
  if (/email not confirmed|email_not_confirmed/i.test(m)) return 'Önce e-posta adresini doğrulaman gerekiyor. Gelen kutunu kontrol et.';
  if (/already registered|user_already_exists/i.test(m)) return 'Bu e-posta ile bir hesap zaten var. Giriş yapmayı dene.';
  if (/weak|password should|weak_password/i.test(m)) return 'Şifre çok zayıf. En az 8 karakter; harf ve rakam kullan.';
  if (/same_password|should be different/i.test(m)) return 'Yeni şifre eskisinden farklı olmalı.';
  if (/expired|invalid.*(link|token|code)|otp_expired|flow_state/i.test(m)) return 'Bağlantının süresi dolmuş ya da geçersiz. Yeni bir bağlantı iste.';
  if (/provider is not enabled|unsupported provider/i.test(m)) return 'Bu giriş yöntemi Supabase projesinde henüz açılmamış.';
  return 'İşlem tamamlanamadı. Lütfen tekrar dene.';
}
const cb = (next: string) => `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
const client = () => { const c = supabaseBrowser(); if (!c) throw new Error('not configured'); return c };

export async function signIn(email: string, password: string): Promise<AuthResult> {
  try { const { error } = await client().auth.signInWithPassword({ email, password }); if (error) throw error; return { ok: true } }
  catch (e) { return { ok: false, msg: authError(e), unconfirmed: /not confirmed/i.test(String((e as Error)?.message)) } }
}
export async function signUp(name: string, email: string, password: string): Promise<AuthResult> {
  try { const { data, error } = await client().auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo: cb('/app') } }); if (error) throw error; return data.session ? { ok: true } : { ok: true, confirm: true } }
  catch (e) { return { ok: false, msg: authError(e) } }
}
export async function signInWithGoogle(next = '/app'): Promise<AuthResult> {
  try { const { error } = await client().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: cb(next) } }); if (error) throw error; return { ok: true } }
  catch (e) { return { ok: false, msg: authError(e) } }
}
export async function sendReset(email: string): Promise<AuthResult> {
  try { const { error } = await client().auth.resetPasswordForEmail(email, { redirectTo: cb('/reset-password') }); if (error && error.status === 429) throw error; return { ok: true } }
  catch (e) { return { ok: false, msg: authError(e) } }
}
export async function resendConfirmation(email: string): Promise<AuthResult> {
  try { const { error } = await client().auth.resend({ type: 'signup', email, options: { emailRedirectTo: cb('/app') } }); if (error) throw error; return { ok: true } }
  catch (e) { return { ok: false, msg: authError(e) } }
}
export async function updatePassword(password: string): Promise<AuthResult> {
  try { const { error } = await client().auth.updateUser({ password }); if (error) throw error; return { ok: true } }
  catch (e) { return { ok: false, msg: authError(e) } }
}
export async function signOut(everywhere = false) {
  try { await supabaseBrowser()?.auth.signOut({ scope: everywhere ? 'global' : 'local' }) } catch { /* already signed out */ }
}
export const isConfigured = () => supabaseEnv !== null;

export function pwProblem(p: string): string {
  if (p.length < 8) return 'Şifre en az 8 karakter olmalı.';
  if (p.length > 72) return 'Şifre en fazla 72 karakter olabilir.';
  if (!/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(p) || !/\d/.test(p)) return 'Şifrede en az bir harf ve bir rakam olmalı.';
  return '';
}
export function pwStrength(p: string): number {
  let s = 0; if (p.length >= 8) s++; if (p.length >= 12) s++; if (/[a-zçğıöşü]/.test(p) && /[A-ZÇĞİÖŞÜ]/.test(p)) s++; if (/\d/.test(p)) s++; if (/[^A-Za-z0-9ÇĞİÖŞÜçğıöşü]/.test(p)) s++;
  return pwProblem(p) ? Math.min(1, s) : Math.min(4, s);
}
export const EMAIL_RX = /^[^\s@<>"']{1,64}@[^\s@<>"']{1,190}\.[A-Za-z]{2,24}$/;
