/** Escape text for insertion into HTML. React escapes automatically; this is for non-React sinks (e-mail, .ics export…). */
export function escapeHtml(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}
