/** Recurring tasks: next occurrence keeps the time of day; weeks start on Monday. */
import type { RecurRule } from '@/types/domain';
import { addDays, startOfDay } from '@/lib/date';

const monIdx = (d: number) => (d + 6) % 7;
export function nextOccurrence(rule: RecurRule, from: Date): Date {
  const f = new Date(from), iv = Math.max(1, rule.interval || 1);
  const keep = (d: Date) => { d.setHours(f.getHours(), f.getMinutes(), 0, 0); return d; };
  switch (rule.freq) {
    case 'daily': return keep(addDays(f, iv));
    case 'weekdays': { let d = addDays(f, 1); while (d.getDay() === 0 || d.getDay() === 6) d = addDays(d, 1); return keep(d); }
    case 'weekly': {
      const days = (rule.days?.length ? rule.days : [f.getDay()]).slice().sort((a, b) => monIdx(a) - monIdx(b));
      const wd = monIdx(f.getDay()), later = days.find(d => monIdx(d) > wd);
      if (later !== undefined) return keep(addDays(f, monIdx(later) - wd));
      return keep(addDays(addDays(startOfDay(f), -wd), 7 * iv + monIdx(days[0]!)));
    }
    case 'monthly': {
      const md = rule.monthDay ?? f.getDate(), y = f.getFullYear(), m = f.getMonth() + iv;
      return keep(new Date(y, m, Math.min(md, new Date(y, m + 1, 0).getDate())));
    }
  }
}
/** First occurrence strictly after `now`, starting from `anchor` (never creates an already-late copy). */
export function nextAfter(rule: RecurRule, anchor: Date, now: Date): Date {
  let d = nextOccurrence(rule, anchor), guard = 0;
  while (+d < +now && guard++ < 400) d = nextOccurrence(rule, d);
  return d;
}
