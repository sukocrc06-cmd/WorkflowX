import { describe, expect, it } from 'vitest';
import { icsDate, icsDuration, importEvents, parseICS } from '@/features/calendar/ics';
import { MON } from './fixtures';

const cal = (...ev: string[]) => ['BEGIN:VCALENDAR', ...ev.flatMap(e => ['BEGIN:VEVENT', ...e.split('\n'), 'END:VEVENT']), 'END:VCALENDAR'].join('\r\n');

describe('ics', () => {
  it('converts UTC to local wall time (Europe/Istanbul = UTC+3)', () => {
    expect(icsDate('20261005T070000Z')!.date).toEqual(new Date(2026, 9, 5, 10, 0));
    expect(icsDate('20261005T070000')!.date).toEqual(new Date(2026, 9, 5, 7, 0));
    expect(icsDate('20261005')!.allDay).toBe(true);
  });
  it('parses durations and folded lines', () => {
    expect(icsDuration('PT1H30M')).toBe(90 * 60_000);
    expect(parseICS(cal('SUMMARY:Uzun\n  başlık\nDTSTART:20261005T090000'))[0]!.props.SUMMARY).toBe('Uzun başlık');
  });
  it('expands weekly RRULE, honours EXDATE, skips all-day and cancelled', () => {
    const r = importEvents(cal(
      'UID:w\nSUMMARY:Haftalık\nDTSTART:20261005T100000\nDTEND:20261005T110000\nRRULE:FREQ=WEEKLY;BYDAY=MO,WE;COUNT=4\nEXDATE:20261007T100000',
      'UID:a\nSUMMARY:Tatil\nDTSTART;VALUE=DATE:20261006',
      'UID:c\nSUMMARY:İptal\nSTATUS:CANCELLED\nDTSTART:20261006T100000'
    ), [], MON);
    expect(r.events.map(e => e.start)).toEqual(['2026-10-05T10:00', '2026-10-12T10:00', '2026-10-14T10:00']);
    expect(r.skipped).toBe(2);
    expect(r.events[0]!.end).toBe('2026-10-05T11:00');
  });
  it('de-duplicates on re-import', () => {
    const text = cal('UID:x\nSUMMARY:Tek\nDTSTART:20261006T100000\nDURATION:PT30M');
    const first = importEvents(text, [], MON);
    const again = importEvents(text, first.events, MON);
    expect(first.added).toBe(1); expect(again.added).toBe(0); expect(again.duplicates).toBe(1);
  });
  it('unescapes text and clamps absurd durations', () => {
    const r = importEvents(cal('UID:y\nSUMMARY:A\\, B\; C\nDTSTART:20261006T100000\nDTEND:20261010T100000'), [], MON);
    expect(r.events[0]!.title).toBe('A, B; C');
    expect(r.events[0]!.end).toBe('2026-10-07T10:00');
  });
});
