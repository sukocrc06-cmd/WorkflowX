import { describe, expect, it } from 'vitest';
import { parseQuick } from '@/features/tasks/quickParse';
import { MON } from './fixtures';

const projects = [{ id: 'p1', name: 'Q4 Kampanya' }] as never;
const ctx = { projects, settings: { workEnd: 18 }, now: MON };

describe('parseQuick', () => {
  it('understands all tokens', () => {
    const r = parseQuick('Rapor yarın 15:00 3sa !yüksek #pazarlama @q4', ctx);
    expect(r).toMatchObject({ title: 'Rapor', estimate: 3, priority: 'high', prioritySet: true, tags: ['pazarlama'] });
    expect(r.project?.id).toBe('p1');
    expect(r.due).toEqual(new Date(2026, 9, 6, 15, 0));
  });
  it('weekday names resolve to the next occurrence at end of work day', () => {
    const r = parseQuick('Sunum cuma 45dk', ctx);
    expect(r.title).toBe('Sunum'); expect(r.estimate).toBe(0.75);
    expect(r.due).toEqual(new Date(2026, 9, 9, 18, 0));
  });
  it('flags an unknown project and keeps plain text as the title', () => {
    const r = parseQuick('Fatura @yok', ctx);
    expect(r.project).toBeNull(); expect(r.projectMissing).toBe('yok'); expect(r.title).toBe('Fatura');
  });
  it('keeps markup as plain text (rendering is escaped elsewhere)', () => {
    expect(parseQuick('<img src=x onerror=alert(1)>', ctx).title).toBe('<img src=x onerror=alert(1)>');
  });
  it('a time earlier than now rolls to tomorrow', () => {
    expect(parseQuick('Ara 07:30', ctx).due).toEqual(new Date(2026, 9, 6, 7, 30));
  });
});
describe('parseQuick weekday false positives', () => {
  it('words that merely start with a weekday stay in the title', () => {
    for (const w of ['Sunum hazırla', 'Pazarlama raporu', 'Monitör siparişi', 'Cumartesiler'])
      expect(parseQuick(w, ctx)).toMatchObject({ title: w, due: null });
  });
  it('Turkish case suffixes still work', () => {
    expect(parseQuick('Toplantı cumaya', ctx).due).toEqual(new Date(2026, 9, 9, 18, 0));
    expect(parseQuick("Rapor pazartesi'ye", ctx).due).toEqual(new Date(2026, 9, 5, 18, 0));
  });
});
