import { describe, expect, it } from 'vitest';
import { icsDate, importEvents } from '@/features/calendar/ics';
import { dayCapacity, dayLoad } from '@/features/calendar/capacity';
import { planTask, FOCUS_MIN_HOURS, type PlanContext } from '@/features/planning/engine';
import { dayEnd } from '@/lib/date';
import { parseQuick } from '@/features/tasks/quickParse';
import type { AppState, CalendarEvent } from '@/types/domain';
import { MON, state, task } from './fixtures';

const E = (id: string, start: string, end: string): CalendarEvent => ({ id, title: id, start, end, type: 'meeting', projectId: null, location: '', participants: '', desc: '', source: 'manual', uid: '', demo: false });
const ctx = (s: AppState): PlanContext => ({ state: s, now: MON, factor: 1 });
const cal = (...ev: string[]) => ['BEGIN:VCALENDAR', ...ev.flatMap(e => ['BEGIN:VEVENT', ...e.split('\n'), 'END:VEVENT']), 'END:VCALENDAR'].join('\r\n');

describe('ICS time zones (TZID)', () => {
  it('converts a New York wall time to Istanbul local time', () => {
    // 5 Oct 2026 10:00 EDT (UTC-4) = 14:00 UTC = 17:00 Istanbul (UTC+3)
    expect(icsDate('20261005T100000', 'America/New_York')!.date).toEqual(new Date(2026, 9, 5, 17, 0));
  });
  it('handles the DST change in the source zone', () => {
    // 2 Nov 2026 10:00 EST (UTC-5, after DST ended on 1 Nov) = 15:00 UTC = 18:00 Istanbul
    expect(icsDate('20261102T100000', 'America/New_York')!.date).toEqual(new Date(2026, 10, 2, 18, 0));
  });
  it('unknown zones fall back to local time and are reported; invalid dates are rejected', () => {
    const r = importEvents(cal('UID:a\nSUMMARY:A\nDTSTART;TZID=Turkey Standard Time:20261006T100000\nDTEND;TZID=Turkey Standard Time:20261006T110000',
      'UID:b\nSUMMARY:B\nDTSTART:20261399T100000', 'UID:c\nSUMMARY:C\nDTSTART;TZID=Europe/London:20261007T090000\nDTEND;TZID=Europe/London:20261007T100000'), [], MON);
    expect(r.unknownZone).toBe(1); expect(r.invalid).toBe(1);
    expect(r.events.map(e => e.start)).toEqual(['2026-10-06T10:00', '2026-10-07T11:00']);
  });
});

describe('DST-safe day boundaries', () => {
  it('dayEnd is the next calendar midnight, whatever the day length', () => {
    const d = new Date(2026, 9, 5);
    expect(new Date(dayEnd(d))).toEqual(new Date(2026, 9, 6));
  });
  it('an event late on a day is counted on that day', () => {
    const s = state({ events: [E('late', '2026-10-05T22:00', '2026-10-05T23:30')] });
    expect(dayLoad(s, new Date(2026, 9, 5))).toBe(1.5);
    expect(dayCapacity(s, new Date(2026, 9, 6), MON).planned).toBe(0);
  });
});

describe('planner focus chunks', () => {
  it('prefers blocks of at least 2 h over thin daily slices', () => {
    const s = state({ tasks: [task({ id: 'a', estimate: 3, due: '2026-10-09T18:00' })] });
    const b = planTask(ctx(s), s.tasks[0]!).blocks;
    const hours = b.map(x => (+new Date(x.end) - +new Date(x.start)) / 3_600_000);
    expect(FOCUS_MIN_HOURS).toBe(2);
    expect(hours[0]).toBe(2); expect(hours.reduce((a, h) => a + h, 0)).toBe(3); expect(b.length).toBe(2);
  });
});

describe('quick add title', () => {
  it('capitalises the first letter (Turkish locale)', () => {
    expect(parseQuick('ıslak imza cuma', { projects: [], settings: { workEnd: 18 }, now: MON }).title).toBe('Islak imza');
    expect(parseQuick('müşteri sunumu cuma 3 saat yüksek', { projects: [], settings: { workEnd: 18 }, now: MON })).toMatchObject({ title: 'Müşteri sunumu', estimate: 3, priority: 'high' });
  });
});
