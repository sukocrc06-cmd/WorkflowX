/**
 * iCalendar (.ics) import: parse → expand recurrences (window −30…+90 days) → local events.
 * UTC times ("Z") are converted to the user's local wall time; floating times are kept.
 * All-day and cancelled events are skipped (they don't block working time).
 */
import type { CalendarEvent } from '@/types/domain';
import { DAY, HOUR, addDays, startOfDay, toLocal } from '@/lib/date';
import { newId } from '@/lib/ids';

export interface IcsEvent { props: Record<string, string>; tz: Record<string, string>; exdates: { v: string; tz: string }[] }
export const unescapeIcs = (v: string | undefined): string => String(v ?? '').replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim().slice(0, 200);

export function parseICS(text: string): IcsEvent[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n');
  const out: IcsEvent[] = []; let cur: IcsEvent | null = null;
  for (const raw of lines) {
    const ln = raw.trim();
    if (ln === 'BEGIN:VEVENT') { cur = { props: {}, tz: {}, exdates: [] }; continue; }
    if (ln === 'END:VEVENT') { if (cur) out.push(cur); cur = null; continue; }
    if (!cur) continue;
    const i = ln.indexOf(':'); if (i < 0) continue;
    const [nm = '', ...params] = ln.slice(0, i).split(';'), name = nm.toUpperCase(), val = ln.slice(i + 1);
    const tz = (params.find(p => /^TZID=/i.test(p)) ?? '').slice(5).replace(/^"|"$/g, '');
    if (name === 'EXDATE') cur.exdates.push(...val.split(',').map(v => ({ v, tz })));
    else if (!(name in cur.props)) { cur.props[name] = val; if (tz) cur.tz[name] = tz; }
  }
  return out;
}
/** UTC offset (ms) of an IANA zone at instant `ms`. Throws RangeError for unknown zones. */
export function tzOffset(ms: number, tz: string): number {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map(x => [x.type, x.value]));
  return Date.UTC(+p.year!, +p.month! - 1, +p.day!, +p.hour! % 24, +p.minute!, +p.second!) - ms;
}
/** Wall-clock time in `tz` → instant (two passes resolve DST). */
export function zonedToDate(y: number, mo: number, d: number, h: number, mi: number, s: number, tz: string): Date {
  const guess = Date.UTC(y, mo, d, h, mi, s);
  let t = guess - tzOffset(guess, tz); t = guess - tzOffset(t, tz);
  return new Date(t);
}
export interface IcsDate { date: Date; allDay: boolean; tzUnknown?: boolean }
/** Parses DATE / DATE-TIME. UTC ("Z") and TZID are converted to an instant; unknown zones fall back to local wall time. */
export function icsDate(v: string | undefined, tz?: string): IcsDate | null {
  const m = String(v ?? '').trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]) - 1, Number(m[3])];
  if (mo > 11 || d < 1 || d > 31) return null;
  if (!m[4]) { const x = new Date(y, mo, d); return x.getMonth() === mo ? { date: x, allDay: true } : null; }
  const h = Number(m[4]), mi = Number(m[5]), s = Number(m[6] ?? 0);
  if (h > 23 || mi > 59 || s > 59) return null;
  if (m[7]) return { date: new Date(Date.UTC(y, mo, d, h, mi, s)), allDay: false };
  if (tz) { try { return { date: zonedToDate(y, mo, d, h, mi, s, tz), allDay: false }; } catch { return { date: new Date(y, mo, d, h, mi, s), allDay: false, tzUnknown: true }; } }
  return { date: new Date(y, mo, d, h, mi, s), allDay: false };
}
export function icsDuration(v: string | undefined): number {
  const m = String(v ?? '').match(/^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!m) return 0;
  const n = (i: number) => Number(m[i] ?? 0);
  return (n(1) * 7 * 86400 + n(2) * 86400 + n(3) * 3600 + n(4) * 60 + n(5)) * 1000;
}
const BYDAY: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
export function expandRecurrence(start: Date, rrule: string | undefined, exdates: ReadonlySet<number>, now: Date): Date[] {
  const R: Record<string, string> = {};
  (rrule ?? '').split(';').forEach(p => { const [k, v] = p.split('='); if (k && v) R[k.toUpperCase()] = v; });
  const out: Date[] = [], winS = +addDays(startOfDay(now), -30), winE = +addDays(startOfDay(now), 90);
  const push = (d: Date) => { if (+d >= winS && +d <= winE && !exdates.has(+d)) out.push(new Date(d)); };
  if (!R.FREQ) { push(start); return out; }
  const iv = Math.max(1, Number(R.INTERVAL ?? 1)), count = R.COUNT ? Number(R.COUNT) : Infinity;
  const until = R.UNTIL ? icsDate(R.UNTIL)?.date ?? null : null;
  const stop = (d: Date) => (until !== null && d > until) || +d > winE;
  let n = 0;
  if (R.FREQ === 'DAILY') {
    for (let d = new Date(start), g = 0; n < count && g < 3000; d = addDays(d, iv), g++) { if (stop(d)) break; n++; push(d); }
  } else if (R.FREQ === 'WEEKLY') {
    const days = (R.BYDAY ? R.BYDAY.split(',').map(x => BYDAY[x.slice(-2)]).filter((x): x is number => x !== undefined) : [start.getDay()]).sort((a, b) => a - b);
    const ws = addDays(startOfDay(start), -start.getDay()); let done = false;
    for (let w = 0, g = 0; !done && n < count && g < 800; w += iv, g++) {
      for (const dd of days) {
        const d = addDays(ws, w * 7 + dd); d.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), 0);
        if (d < start) continue;
        if (stop(d) || n >= count) { done = true; break; }
        n++; push(d);
      }
    }
  } else if (R.FREQ === 'MONTHLY' || R.FREQ === 'YEARLY') {
    for (let i = 0, g = 0; n < count && g < 400; i += iv, g++) {
      const d = new Date(start);
      if (R.FREQ === 'MONTHLY') d.setMonth(start.getMonth() + i); else d.setFullYear(start.getFullYear() + i);
      if (stop(d)) break; n++; push(d);
    }
  } else push(start);
  return out;
}
export interface IcsImportResult { events: CalendarEvent[]; added: number; skipped: number; duplicates: number; invalid: number; unknownZone: number }
const MAX_EVENTS = 3000;
/** Converts .ics text to new events; `existing` is used for de-duplication (uid + start). */
export function importEvents(text: string, existing: readonly CalendarEvent[], now: Date, untitled = '(Başlıksız)'): IcsImportResult {
  const have = new Set(existing.filter(e => e.source === 'ics').map(e => `${e.uid}|${e.start}`));
  const events: CalendarEvent[] = []; let skipped = 0, duplicates = 0, invalid = 0, unknownZone = 0;
  for (const { props: e, tz, exdates } of parseICS(text)) {
    if (/CANCELLED/i.test(e.STATUS ?? '')) { skipped++; continue; }
    const s = icsDate(e.DTSTART, tz.DTSTART); if (!s) { invalid++; continue; } if (s.allDay) { skipped++; continue; } if (s.tzUnknown) unknownZone++;
    const endD = e.DTEND ? icsDate(e.DTEND, tz.DTEND ?? tz.DTSTART)?.date : undefined;
    let dur = endD ? +endD - +s.date : e.DURATION ? icsDuration(e.DURATION) : HOUR;
    if (!(dur > 0) || dur > DAY) dur = Math.min(Math.max(dur, 0) || HOUR, DAY);
    const ex = new Set(exdates.map(x => +(icsDate(x.v, x.tz || tz.DTSTART)?.date ?? 0)));
    for (const d of expandRecurrence(s.date, e.RRULE, ex, now)) {
      const start = toLocal(d), uid = (e.UID ?? '').slice(0, 200), k = `${uid}|${start}`;
      if (have.has(k)) { duplicates++; continue; }
      have.add(k);
      events.push({ id: newId(), uid, source: 'ics', title: unescapeIcs(e.SUMMARY) || untitled, start, end: toLocal(new Date(+d + dur)), type: 'meeting', location: unescapeIcs(e.LOCATION), participants: '', desc: '', projectId: null, demo: false });
      if (events.length >= MAX_EVENTS) return { events, added: events.length, skipped, duplicates, invalid, unknownZone };
    }
  }
  return { events, added: events.length, skipped, duplicates, invalid, unknownZone };
}
