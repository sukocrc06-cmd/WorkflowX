import { describe, expect, it } from 'vitest';
import { conflictPairs, conflictsWith, nextFreeSlot, splitAround } from '@/features/calendar/conflicts';
import { dayCapacity, dayLoad } from '@/features/calendar/capacity';
import { nextAfter, nextOccurrence } from '@/features/tasks/recurrence';
import { projectHealth } from '@/features/projects/health';
import { can } from '@/features/team/permissions';
import { History } from '@/lib/history';
import { planMany, planTask, type PlanContext } from '@/features/planning/engine';
import { parseQuick } from '@/features/tasks/quickParse';
import { sanitizeState } from '@/lib/validate';
import type { AppState, CalendarEvent } from '@/types/domain';
import { MON, state, task } from './fixtures';

const E = (id: string, start: string, end: string, type: CalendarEvent['type'] = 'meeting'): CalendarEvent => ({ id, title: id, start, end, type, projectId: null, location: '', participants: '', desc: '', source: 'manual', uid: '', demo: false });
const ctx = (s: AppState, now = MON): PlanContext => ({ state: s, now, factor: 1 });

describe('capacity model', () => {
  it('personal time and milestones do not use work capacity', () => {
    const s = state({ events: [E('m', '2026-10-05T10:00', '2026-10-05T12:00'), E('p', '2026-10-05T13:00', '2026-10-05T15:00', 'personal'), E('ms', '2026-10-05T17:00', '2026-10-05T17:30', 'milestone')] });
    expect(dayLoad(s, new Date(2026, 9, 5))).toBe(2);
    const c = dayCapacity(s, new Date(2026, 9, 5), MON);
    expect(c).toMatchObject({ work: true, available: 6, planned: 2, free: 4, over: false });
  });
  it('overload and days off', () => {
    const s = state({ events: [E('m', '2026-10-05T09:00', '2026-10-05T17:00')] });
    expect(dayCapacity(s, new Date(2026, 9, 5), MON)).toMatchObject({ over: true, overBy: 2 });
    expect(dayCapacity(s, new Date(2026, 9, 4), MON)).toMatchObject({ work: false, available: 0 });
  });
  it('today only counts the working hours that are left', () => {
    const at = new Date(2026, 9, 5, 16, 0);
    expect(dayCapacity(state(), at, at).remaining).toBe(2);
  });
});

describe('conflict engine', () => {
  const s = state({ events: [E('a', '2026-10-05T10:00', '2026-10-05T11:30'), E('b', '2026-10-05T10:30', '2026-10-05T11:30'), E('ms', '2026-10-05T10:45', '2026-10-05T11:15', 'milestone')] });
  it('detects overlapping pairs and ignores milestones', () => {
    const pairs = conflictPairs(s, new Date(2026, 9, 5), new Date(2026, 9, 6));
    expect(pairs.map(([x, y]) => [x.id, y.id])).toEqual([['a', 'b']]);
    expect(conflictsWith(s, +new Date('2026-10-05T11:00'), +new Date('2026-10-05T12:00')).map(x => x.id)).toEqual(['a', 'b']);
  });
  it('move: first free slot of the same length in working hours', () => {
    const slot = nextFreeSlot(s, 60 * 60_000, new Date('2026-10-05T10:30'), 'b')!;
    expect(new Date(slot.a)).toEqual(new Date('2026-10-05T11:30'));
  });
  it('split: keeps only the non-overlapping part', () => {
    const segs = splitAround(+new Date('2026-10-05T09:00'), +new Date('2026-10-05T10:30'), [{ a: +new Date('2026-10-05T10:00'), b: +new Date('2026-10-05T11:30') }]);
    expect(segs.map(([a, b]) => [new Date(a).getHours(), new Date(b).getHours()])).toEqual([[9, 10]]);
    expect(splitAround(0, 10 * 60_000, [])).toEqual([]);
  });
});

describe('recurrence', () => {
  const fri = new Date(2026, 9, 9, 16, 0);
  it('weekly on chosen days, Monday-first weeks', () => {
    expect(nextOccurrence({ freq: 'weekly', interval: 1, days: [1, 5] }, fri)).toEqual(new Date(2026, 9, 12, 16, 0));
    expect(nextOccurrence({ freq: 'weekly', interval: 2, days: [5] }, fri)).toEqual(new Date(2026, 9, 23, 16, 0));
  });
  it('weekdays skip the weekend; monthly clamps to month length', () => {
    expect(nextOccurrence({ freq: 'weekdays', interval: 1 }, fri)).toEqual(new Date(2026, 9, 12, 16, 0));
    expect(nextOccurrence({ freq: 'monthly', interval: 1, monthDay: 31 }, new Date(2026, 0, 31, 9, 0))).toEqual(new Date(2026, 1, 28, 9, 0));
  });
  it('never creates an already-late copy', () => {
    expect(+nextAfter({ freq: 'daily', interval: 1 }, new Date(2026, 8, 1, 9, 0), MON)).toBeGreaterThan(+MON);
  });
});

describe('project health (real data only)', () => {
  const p = { id: 'p', name: 'P', desc: '', color: '#6366f1', start: '', deadline: '2026-10-09', status: 'active' as const, archived: false, archivedAt: null, createdAt: '2026-10-01T09:00', demo: false };
  it('nodata without tasks or deadlines', () => {
    expect(projectHealth(state({ projects: [p] }), p, MON).kind).toBe('nodata');
    const q = { ...p, deadline: '' as const };
    expect(projectHealth(state({ projects: [q], tasks: [task({ projectId: 'p' })] }), q, MON).reason).toBe('no-deadline');
  });
  it('healthy when work fits, risk when it does not, delayed when late, completed when done', () => {
    expect(projectHealth(state({ projects: [p], tasks: [task({ projectId: 'p', estimate: 4 })] }), p, MON).kind).toBe('healthy');
    expect(projectHealth(state({ projects: [p], tasks: [task({ projectId: 'p', estimate: 60 })] }), p, MON)).toMatchObject({ kind: 'risk', reason: 'short' });
    expect(projectHealth(state({ projects: [p], tasks: [task({ projectId: 'p', due: '2026-10-02T17:00' })] }), p, MON).kind).toBe('delayed');
    expect(projectHealth(state({ projects: [p], tasks: [task({ projectId: 'p', status: 'done' })] }), p, MON).kind).toBe('completed');
  });
});

describe('planning scenarios', () => {
  it('explains a skipped full day and respects the start date', () => {
    const s = state({ events: [E('f', '2026-10-05T09:00', '2026-10-05T15:00')], tasks: [task({ id: 'a', estimate: 2, due: '2026-10-07T17:00' })] });
    const b = planTask(ctx(s), s.tasks[0]!).blocks[0]!;
    expect(b.start.startsWith('2026-10-06')).toBe(true);
    expect(b.why.skipped[0]).toMatchObject({ d: '2026-10-05', load: 6 });
    const s2 = state({ tasks: [task({ id: 'b', estimate: 2, start: '2026-10-07T00:00', due: '2026-10-09T17:00' })] });
    expect(planTask(ctx(s2), s2.tasks[0]!).blocks.every(x => x.start >= '2026-10-07')).toBe(true);
  });
  it('reasons: full / outside / due; weekend offered and used only when allowed', () => {
    const full = state({ events: [E('x', '2026-10-05T09:00', '2026-10-05T18:00'), E('y', '2026-10-06T09:00', '2026-10-06T18:00')], tasks: [task({ id: 'a', due: '2026-10-06T17:00' })] });
    expect(planTask(ctx(full), full.tasks[0]!).reason).toBe('full');
    const outside = state({ tasks: [task({ id: 'a', start: '2026-10-06T00:00', due: '2026-10-06T08:00' })] });
    expect(planTask(ctx(outside), outside.tasks[0]!).reason).toBe('outside');
    const late = state({ tasks: [task({ id: 'a', due: '2026-10-01T08:00' })] });
    expect(planTask(ctx(late), late.tasks[0]!).reason).toBe('due');
    const wk = state({ tasks: [task({ id: 'a', estimate: 12, due: '2026-10-13T17:00' })] }); wk.settings.maxDaily = 1;
    const r1 = planMany(ctx(wk), wk.tasks);
    expect(r1.unplaced[0]?.weekendHelps).toBe(true);
    expect(r1.blocks.every(b => new Date(b.start).getDay() % 6 !== 0)).toBe(true);
    expect(planMany(ctx(wk), wk.tasks, { weekend: true }).blocks.some(b => new Date(b.start).getDay() % 6 === 0)).toBe(true);
  });
  it('personal time blocks slots but not capacity', () => {
    const s = state({ events: [E('p', '2026-10-05T09:00', '2026-10-05T12:00', 'personal')], tasks: [task({ id: 'a', estimate: 6, due: '2026-10-05T18:00' })] });
    const r = planTask(ctx(s), s.tasks[0]!);
    expect(r.blocks.every(b => b.start >= '2026-10-05T12:00')).toBe(true);
    expect(r.blocks.reduce((h, b) => h + (+new Date(b.end) - +new Date(b.start)) / 3_600_000, 0)).toBe(6);
  });
});

describe('quick parse — natural Turkish', () => {
  const c = { projects: [], settings: { workEnd: 18 }, now: MON };
  it('“Raporu yarın saat 15’e kadar bitir 2 saat”', () => {
    expect(parseQuick("Raporu yarın saat 15'e kadar bitir 2 saat", c)).toMatchObject({ title: 'Raporu bitir', estimate: 2, due: new Date(2026, 9, 6, 15, 0) });
  });
  it('“Web sitesi revizyonu cuma 4 saat yüksek”', () => {
    expect(parseQuick('Web sitesi revizyonu cuma 4 saat yüksek', c)).toMatchObject({ title: 'Web sitesi revizyonu', estimate: 4, priority: 'high', due: new Date(2026, 9, 9, 18, 0) });
    expect(parseQuick('Yüksek lisans başvurusu', c).prioritySet).toBe(false);
  });
  it('recurrence phrases', () => {
    expect(parseQuick('Haftalık rapor her cuma 16:00', c)).toMatchObject({ title: 'Haftalık rapor', recur: { freq: 'weekly', days: [5] }, due: new Date(2026, 9, 9, 16, 0) });
    expect(parseQuick('Stand-up hafta içi her gün 09:30', c).recur).toMatchObject({ freq: 'weekdays' });
    expect(parseQuick("Kira her ayın 1'i", c).recur).toMatchObject({ freq: 'monthly', monthDay: 1 });
  });
});

describe('permissions, history, sanitize of new fields', () => {
  it('role matrix', () => {
    expect(can('owner', 'billing.manage')).toBe(true);
    expect(can('admin', 'billing.manage')).toBe(false);
    expect(can('viewer', 'tasks.edit')).toBe(false);
    expect(can('member', 'time.track')).toBe(true);
  });
  it('undo / redo restore exact snapshots; isLatest guards stale undo buttons', () => {
    const h = new History<{ n: number }>(x => ({ ...x }));
    const eq = (a: { n: number }, b: { n: number }) => a.n === b.n;
    let s = { n: 1 };
    const r1 = h.commit(s, 'inc', d => { d.n++; }, eq); s = r1.state;
    const r2 = h.commit(s, 'inc', d => { d.n++; }, eq); s = r2.state;
    expect(h.isLatest(r1.id!)).toBe(false);
    s = h.undo(s)!.state; expect(s.n).toBe(2);
    s = h.redo(s)!.state; expect(s.n).toBe(3);
    expect(h.commit(s, 'noop', () => {}, eq).id).toBeNull();
  });
  it('sanitizes members, subtasks, recurrence, comments and hostile values', () => {
    const { state: s } = sanitizeState({
      members: [{ id: 'me', name: 'X', role: 'owner', email: 'bad"@x.com' }, { id: 'm2', name: '<b>Y</b>', role: 'viewer', capacity: 500 }],
      tasks: [{ id: 't', title: 'T', assignee: 'ghost', start: '2026-10-09T09:00', due: '2026-10-08T09:00', recur: { freq: 'weekly', days: [9] }, subtasks: [{ title: '' }, { title: 'ok', done: 'yes' }], comments: [{ text: 'hi', at: 'nope' }, { text: 'ok', at: '2026-10-01T09:00:00Z', author: 'ghost' }] }]
    });
    expect(s.members[0]!.id).not.toBe('me'); expect(s.members[0]!.role).toBe('member'); expect(s.members[0]!.email).toBe('');
    expect(s.members[1]).toMatchObject({ name: '<b>Y</b>', role: 'viewer', capacity: 80 });
    const t = s.tasks[0]!;
    expect(t).toMatchObject({ assignee: null, start: '', recur: { freq: 'weekly', days: [1] } });
    expect(t.subtasks).toEqual([{ id: expect.any(String), title: 'ok', done: false }]);
    expect(t.comments).toHaveLength(1); expect(t.comments[0]!.author).toBe('me');
  });
});
