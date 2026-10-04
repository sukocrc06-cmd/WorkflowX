/**
 * Natural quick-add:
 *   "Raporu yarın saat 15'e kadar bitir 2 saat"       → title "Raporu bitir", due tomorrow 15:00, 2 h
 *   "Web sitesi revizyonu cuma 4 saat yüksek"         → + trailing priority
 *   "Haftalık rapor her cuma 16:00 1sa #rapor @q4"    → + weekly recurrence, tag, project
 * Pure; the UI renders the result as labelled chips (text only — never as HTML) and refuses
 * to save while an @project is unknown, so a misread input is never stored silently.
 */
import type { Priority, Project, RecurRule, WorkSettings } from '@/types/domain';
import { addDays, startOfDay } from '@/lib/date';

export interface QuickResult {
  title: string; estimate: number; priority: Priority; prioritySet: boolean;
  tags: string[]; project: Project | null; projectMissing: string | null; due: Date | null; recur: RecurRule | null;
}
const DAYS: Record<string, number> = { pazartesi: 1, 'salı': 2, sali: 2, 'çarşamba': 3, carsamba: 3, 'perşembe': 4, persembe: 4, cumartesi: 6, cuma: 5, pazar: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0 };
const KEYS = Object.keys(DAYS).sort((a, b) => b.length - a.length).join('|');
/* The suffix list is closed on purpose: "Pazarlama" or "Sunum" must not become a weekday. */
const SUFFIX = "(?:['’]?(?:ya|ye|yı|yi|a|e|da|de|ta|te|dan|den|tan|ten|ki|dır|dir))?";
const DAY_RX = new RegExp(`\\s(${KEYS})${SUFFIX}(?=\\s)`, 'iu');
const WEEKLY_RX = new RegExp(`\\s(?:her|every)\\s((?:(?:${KEYS})${SUFFIX}(?:\\s*(?:,|ve|and)\\s*)?)+)(?=\\s)`, 'iu');
export const normalize = (s: string): string => s.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');
const prioOf = (w: string): Priority => { const q = normalize(w); return /acil|urg/.test(q) ? 'urgent' : /yuksek|high/.test(q) ? 'high' : /dusuk|low/.test(q) ? 'low' : 'medium'; };

export function parseQuick(input: string, ctx: { projects: readonly Project[]; settings: Pick<WorkSettings, 'workEnd'>; now: Date }): QuickResult {
  const { now } = ctx;
  let s = ` ${input.slice(0, 500)} `;
  const r: QuickResult = { title: '', estimate: 0, priority: 'medium', prioritySet: false, tags: [], project: null, projectMissing: null, due: null, recur: null };
  s = s.replace(/\s(\d+(?:[.,]\d+)?)\s?(saat|sa|hours?|hrs?|h)(?=\s)/i, (_m, n: string) => { r.estimate += parseFloat(n.replace(',', '.')); return ' '; });
  s = s.replace(/\s(\d+)\s?(dakika|dk|mins?|m)(?=\s)/i, (_m, n: string) => { r.estimate += Number(n) / 60; return ' '; });
  s = s.replace(/\s!(acil|urgent|yüksek|yuksek|high|orta|medium|düşük|dusuk|low)(?=\s)/iu, (_m, p: string) => { r.priority = prioOf(p); r.prioritySet = true; return ' '; });
  if (!r.prioritySet) s = s.replace(/\s(acil|urgent|yüksek|yuksek|high|düşük|dusuk|low)(?:\s+(?:öncelik(?:li)?|oncelik(?:li)?|priority))?\s*$/iu, (_m, p: string) => { r.priority = prioOf(p); r.prioritySet = true; return ' '; });
  s = s.replace(/\s#([\p{L}\d_-]{1,40})/gu, (_m, g: string) => { if (r.tags.length < 10) r.tags.push(g); return ' '; });
  s = s.replace(/\s@([\p{L}\d_-]{1,60})/u, (_m, g: string) => {
    const q = normalize(g);
    r.project = ctx.projects.find(p => !p.archived && normalize(p.name).replace(/\s+/g, '').includes(q)) ?? null;
    if (!r.project) r.projectMissing = g;
    return ' ';
  });
  // recurrence first: "her pazartesi" contains a weekday
  s = s.replace(/\s(?:hafta\s?içi\s(?:her\s)?gün|her\s(?:hafta\s?içi|iş\sgünü)|every\sweekday|weekdays)(?=\s)/iu, () => { r.recur = { freq: 'weekdays', interval: 1 }; return ' '; });
  if (!r.recur) s = s.replace(/\s(?:her\s?gün|every\sday|daily)(?=\s)/iu, () => { r.recur = { freq: 'daily', interval: 1 }; return ' '; });
  if (!r.recur) s = s.replace(/\s(?:her\sayın|every\smonth\son(?:\sthe)?)\s(\d{1,2})(?:['’]?(?:i|ı|u|ü|si|sı|sü|su|nde|inde|ında|st|nd|rd|th))?(?=\s)/iu, (m, d: string) => { if (+d >= 1 && +d <= 31) { r.recur = { freq: 'monthly', interval: 1, monthDay: +d }; return ' '; } return m; });
  if (!r.recur) s = s.replace(WEEKLY_RX, (m, list: string) => {
    const days = [...list.toLocaleLowerCase('tr-TR').matchAll(new RegExp(KEYS, 'giu'))].map(x => DAYS[x[0]]).filter((d): d is number => d !== undefined);
    if (!days.length) return m; r.recur = { freq: 'weekly', interval: 1, days: [...new Set(days)] }; return ' ';
  });
  if (!r.recur) s = s.replace(/\s(?:her\shafta|every\sweek|weekly)(?=\s)/iu, () => { r.recur = { freq: 'weekly', interval: 1, days: [now.getDay()] }; return ' '; });
  if (!r.recur) s = s.replace(/\s(?:her\say|every\smonth|monthly)(?=\s)/iu, () => { r.recur = { freq: 'monthly', interval: 1, monthDay: now.getDate() }; return ' '; });
  // time: "15:00", "saat 15", "15'e kadar", "saat 15.30'da", "at 3pm"
  let hh: number | null = null, mm = 0, day: Date | null = null;
  const setT = (h: number, mi: number): boolean => { if (h < 24 && mi < 60) { hh = h; mm = mi; return true; } return false; };
  s = s.replace(/\s(?:saat\s|at\s|by\s)?(\d{1,2})[:.](\d{2})(?:['’][a-zçğıöşü]{1,3})?(?=\s)/iu, (m, h: string, mi: string) => (setT(+h, +mi) ? ' ' : m));
  if (hh === null) s = s.replace(/\s(?:at|by)\s(\d{1,2})\s?(am|pm)(?=\s)/i, (m, h: string, ap: string) => { let H = +h % 12; if (ap.toLowerCase() === 'pm') H += 12; return setT(H, 0) ? ' ' : m; });
  if (hh === null) s = s.replace(/\ssaat\s(\d{1,2})(?:['’][a-zçğıöşü]{1,3})?(?=\s)/iu, (m, h: string) => (setT(+h, 0) ? ' ' : m));
  if (hh === null) s = s.replace(/\s(\d{1,2})['’](?:e|a|ye|ya|te|ta|de|da)(?=\s)/iu, (m, h: string) => (setT(+h, 0) ? ' ' : m));
  const rel: [RegExp, number][] = [[/\s(bugün|bugun|today)(?:['’]?[a-zçğıöşü]{0,3})?(?=\s)/iu, 0], [/\s(yarın|yarin|tomorrow)(?:['’]?[a-zçğıöşü]{0,3})?(?=\s)/iu, 1], [/\s(haftaya|next\s+week)(?=\s)/iu, 7]];
  for (const [re, o] of rel) if (re.test(s)) { day = addDays(startOfDay(now), o); s = s.replace(re, ' '); break; }
  if (!day) s = s.replace(DAY_RX, (m, w: string) => {
    const target = DAYS[w.toLocaleLowerCase('tr-TR')];
    if (target === undefined) return m;
    day = addDays(startOfDay(now), (target - now.getDay() + 7) % 7); return ' ';
  });
  const H = hh as number | null;
  if (day || (H !== null && !r.recur)) {
    const d = day ? new Date(day) : startOfDay(now);
    if (H !== null) d.setHours(H, mm, 0, 0); else d.setHours(ctx.settings.workEnd, 0, 0, 0);
    if (d < now) d.setDate(d.getDate() + (day && H === null ? 7 : 1));
    r.due = d;
  }
  const rec = r.recur as RecurRule | null;
  if (rec && !r.due) {
    let d = new Date(now); d.setHours(H ?? ctx.settings.workEnd, H !== null ? mm : 0, 0, 0);
    const ok = (x: Date) => rec.freq === 'daily' || (rec.freq === 'weekdays' && x.getDay() % 6 !== 0) || (rec.freq === 'weekly' && (rec.days ?? []).includes(x.getDay())) || (rec.freq === 'monthly' && x.getDate() === rec.monthDay);
    for (let i = 0; i < 62 && (!ok(d) || d < now); i++) d = addDays(d, 1);
    if (ok(d) && d >= now) r.due = d;
  }
  if (r.due || r.recur) s = s.replace(/\s(?:kadar|until)(?=\s)/giu, ' ');
  r.title = s.replace(/\s+/g, ' ').trim().slice(0, 200);
  if (r.title) r.title = r.title.charAt(0).toLocaleUpperCase('tr-TR') + r.title.slice(1);
  r.estimate = Math.min(200, Math.round(r.estimate * 4) / 4);
  return r;
}
