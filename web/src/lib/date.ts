import type { LocalDate, LocalDateTime } from '@/types/domain';

export const HOUR = 3_600_000;
export const DAY = 86_400_000;
const pad = (n: number): string => String(n).padStart(2, '0');

/** Date → "YYYY-MM-DDTHH:mm" in the device's local time (wall clock). */
export function toLocal(d: Date): LocalDateTime {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
/** Parse a local date-time string as LOCAL time. */
export const fromLocal = (s: LocalDateTime): Date => new Date(s);
/**
 * Date-only strings must be read as local midnight.
 * `new Date('2026-10-02')` is UTC and shows the previous day west of Greenwich.
 */
export const parseDay = (s: string): Date => new Date(String(s).slice(0, 10) + 'T00:00');
export const dayKey = (d: Date | string): LocalDate => toLocal(new Date(d)).slice(0, 10);
export function startOfDay(d: Date | number): Date { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
/** Calendar-day arithmetic (DST-safe: keeps the wall-clock time). */
export function addDays(d: Date | number, n: number): Date { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
/** Monday-based week start. */
/** End of the calendar day (exclusive). DST days are 23 or 25 hours long — never add a fixed 24 h. */
export const dayEnd = (d: Date | number): number => +addDays(startOfDay(d), 1);
export function startOfWeek(d: Date): Date { const x = startOfDay(d); return addDays(x, -((x.getDay() + 6) % 7)); }
export const overlap = (a1: number, a2: number, b1: number, b2: number): number => Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));

const LOCAL_RX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const DAY_RX = /^\d{4}-\d{2}-\d{2}$/;
export const isLocalDateTime = (v: unknown): v is LocalDateTime => typeof v === 'string' && LOCAL_RX.test(v) && !Number.isNaN(+new Date(v));
export const isLocalDate = (v: unknown): v is LocalDate => typeof v === 'string' && DAY_RX.test(v) && !Number.isNaN(+parseDay(v));
export const isIsoInstant = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v));
