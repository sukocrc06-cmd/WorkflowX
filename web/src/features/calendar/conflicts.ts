/**
 * Conflict engine: overlap detection plus the two automatic resolutions offered
 * in the UI — move to the next free slot, or split around what is already there.
 * Milestones are points in time and never conflict; personal time does.
 */
import type { AppState, Id } from '@/types/domain';
import { addDays, overlap, startOfDay } from '@/lib/date';
import { isWorkDay } from './capacity';

export interface Timed { kind: 'ev' | 'bl'; id: Id; a: number; b: number; label: string }
export function timedItems(s: AppState): Timed[] {
  return [
    ...s.events.filter(e => e.type !== 'milestone').map(e => ({ kind: 'ev' as const, id: e.id, a: +new Date(e.start), b: +new Date(e.end), label: e.title })),
    ...s.blocks.map(b => ({ kind: 'bl' as const, id: b.id, a: +new Date(b.start), b: +new Date(b.end), label: s.tasks.find(t => t.id === b.taskId)?.title ?? '' }))
  ];
}
export const conflictsWith = (s: AppState, a: number, b: number, excludeId?: Id): Timed[] =>
  timedItems(s).filter(x => x.id !== excludeId && overlap(x.a, x.b, a, b) > 0).sort((p, q) => p.a - q.a);
export function conflictPairs(s: AppState, from: Date, to: Date): [Timed, Timed][] {
  const its = timedItems(s).filter(x => overlap(x.a, x.b, +from, +to) > 0).sort((p, q) => p.a - q.a), out: [Timed, Timed][] = [];
  for (let i = 0; i < its.length; i++) for (let j = i + 1; j < its.length; j++) {
    const x = its[i]!, y = its[j]!;
    if (y.a >= x.b) break;
    if (overlap(x.a, x.b, y.a, y.b) > 0) out.push([x, y]);
  }
  return out;
}
const Q = 15 * 60_000;
/** First slot of `dur` ms at or after `from`, inside working hours, overlapping nothing but `excludeId`. */
export function nextFreeSlot(s: AppState, dur: number, from: Date, excludeId?: Id, days = 14): { a: number; b: number } | null {
  const busy = timedItems(s).filter(x => x.id !== excludeId).sort((p, q) => p.a - q.a);
  for (let d = startOfDay(from), i = 0; i < days; d = addDays(d, 1), i++) {
    if (!isWorkDay(s, d)) continue;
    const ws = new Date(d); ws.setHours(s.settings.workStart, 0, 0, 0);
    const we = new Date(d); we.setHours(s.settings.workEnd, 0, 0, 0);
    let cur = Math.max(+ws, Math.ceil(+from / Q) * Q);
    while (cur + dur <= +we) {
      const hit = busy.find(x => overlap(x.a, x.b, cur, cur + dur) > 0);
      if (!hit) return { a: cur, b: cur + dur };
      cur = Math.ceil(hit.b / Q) * Q;
    }
  }
  return null;
}
/** Parts of [a,b) not covered by `others`, keeping pieces of at least 15 minutes. */
export function splitAround(a: number, b: number, others: readonly { a: number; b: number }[]): [number, number][] {
  let segs: [number, number][] = [[a, b]];
  for (const o of others) segs = segs.flatMap(([x, y]): [number, number][] => o.b <= x || o.a >= y ? [[x, y]] : ([[x, Math.min(y, o.a)], [Math.max(x, o.b), y]] as [number, number][]).filter(([p, q]) => q - p > 0));
  return segs.filter(([x, y]) => y - x >= Q);
}
