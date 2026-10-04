/**
 * One capacity model for every screen.
 *  available = daily capacity on a working day, 0 on a day off
 *  planned   = booked WORK: meetings, events, focus events and task blocks
 *              (personal time and milestones block slots but do not use work capacity)
 *  free      = max(0, available − planned) · over = planned > available
 *  remaining = today: free limited to what is left of today's working hours
 */
import type { AppState, EventType, ScheduleBlock } from '@/types/domain';
import { HOUR, addDays, dayEnd, dayKey, overlap, startOfDay } from '@/lib/date';

export const WORK_EVENTS: ReadonlySet<EventType> = new Set(['meeting', 'focus', 'event']);
type Span = Pick<ScheduleBlock, 'start' | 'end'>;
export const isWorkDay = (s: AppState, d: Date | number): boolean => s.settings.workDays.includes(new Date(d).getDay());

export function dayLoad(s: AppState, day: Date, extra: readonly Span[] = []): number {
  const a = +startOfDay(day), b = dayEnd(day);
  const items: Span[] = [...s.events.filter(e => WORK_EVENTS.has(e.type)), ...s.blocks, ...extra];
  return items.reduce((h, x) => h + overlap(+new Date(x.start), +new Date(x.end), a, b), 0) / HOUR;
}
export interface DayCapacity { day: Date; work: boolean; available: number; planned: number; free: number; remaining: number; over: boolean; overBy: number }
export function dayCapacity(s: AppState, day: Date, now: Date, extra: readonly Span[] = []): DayCapacity {
  const d = startOfDay(day), work = isWorkDay(s, d);
  const available = work ? s.settings.maxDaily : 0, planned = dayLoad(s, d, extra), free = Math.max(0, available - planned);
  let remaining = free;
  if (dayKey(d) === dayKey(now)) { const end = new Date(d); end.setHours(s.settings.workEnd, 0, 0, 0); remaining = Math.min(free, Math.max(0, (+end - +now) / HOUR)); }
  else if (+d < +startOfDay(now)) remaining = 0;
  return { day: d, work, available, planned, free, remaining, over: planned > available + 1e-9, overBy: Math.max(0, planned - available) };
}
/** Free work capacity from `now` up to and including the day of `until`. */
export function freeUntil(s: AppState, until: Date, now: Date): number {
  let free = 0;
  for (let d = startOfDay(now); +d <= +until; d = addDays(d, 1)) free += dayCapacity(s, d, now).remaining;
  return free;
}
