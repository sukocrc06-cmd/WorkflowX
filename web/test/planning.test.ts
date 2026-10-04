import { describe, expect, it } from 'vitest';
import { planMany, planOrder, planTask, type PlanContext } from '@/features/planning/engine';
import { applyPlan, rulesPlanner, validatePlan } from '@/features/planning/service';
import { HOUR } from '@/lib/date';
import { MON, state, task } from './fixtures';

const ctx = (s = state(), now = MON): PlanContext => ({ state: s, now, factor: 1 });
const h = (b: { start: string; end: string }) => (+new Date(b.end) - +new Date(b.start)) / HOUR;
const overlaps = (a: { start: string; end: string }, b: { start: string; end: string }) => +new Date(a.start) < +new Date(b.end) && +new Date(b.start) < +new Date(a.end);

describe('planning engine', () => {
  it('places the whole estimate inside working hours before the deadline', () => {
    const t = task({ estimate: 5, due: '2026-10-07T18:00' });
    const r = planTask(ctx(state({ tasks: [t] })), t);
    expect(r.unplaced).toBe(0);
    expect(r.blocks.reduce((s, b) => s + h(b), 0)).toBe(5);
    for (const b of r.blocks) {
      const s = new Date(b.start), e = new Date(b.end);
      expect(s.getHours()).toBeGreaterThanOrEqual(9);
      expect(e.getHours() + e.getMinutes() / 60).toBeLessThanOrEqual(18);
      expect(+e).toBeLessThanOrEqual(+new Date(t.due));
      expect(h(b)).toBeGreaterThanOrEqual(1);
    }
  });
  it('never overlaps events or existing blocks, and skips weekends', () => {
    const t = task({ estimate: 6, due: '2026-10-12T12:00' });
    const s = state({ tasks: [t], events: [{ id: 'e1', title: 'Toplantı', start: '2026-10-05T09:00', end: '2026-10-05T11:00', type: 'meeting', projectId: null, location: '', participants: '', desc: '', source: 'manual', uid: '', demo: false }] });
    const r = planTask(ctx(s), t);
    for (const b of r.blocks) {
      expect(overlaps(b, s.events[0]!)).toBe(false);
      expect([0, 6]).not.toContain(new Date(b.start).getDay());
    }
    for (let i = 0; i < r.blocks.length; i++) for (let j = i + 1; j < r.blocks.length; j++) expect(overlaps(r.blocks[i]!, r.blocks[j]!)).toBe(false);
  });
  it('respects the daily capacity and reports what does not fit', () => {
    const t = task({ estimate: 10, due: '2026-10-05T18:00' });
    const s = state({ tasks: [t] }); s.settings.maxDaily = 4;
    const r = planTask(ctx(s), t);
    expect(r.blocks.reduce((x, b) => x + h(b), 0)).toBe(4);
    expect(r.unplaced).toBe(6);
    expect(r.reason).toBe('cap');
  });
  it('reports a past deadline instead of scheduling after it', () => {
    const t = task({ estimate: 2, due: '2026-10-05T07:00' });
    expect(planTask(ctx(state({ tasks: [t] })), t)).toMatchObject({ blocks: [], unplaced: 2, reason: 'due' });
  });
  it('orders by deadline, then priority, pulling dependencies in front of dependants', () => {
    const a = task({ id: 'a', due: '2026-10-09T18:00' });
    const b = task({ id: 'b', due: '2026-10-06T18:00', deps: ['a'] });
    const c = task({ id: 'c', due: '2026-10-06T18:00', priority: 'urgent' });
    expect(planOrder([a, b, c]).map(x => x.id)).toEqual(['c', 'a', 'b']);
  });
  it('schedules a dependant after its dependency and explains why', () => {
    const a = task({ id: 'a', estimate: 3, due: '2026-10-08T18:00' });
    const b = task({ id: 'b', estimate: 2, due: '2026-10-09T18:00', deps: ['a'] });
    const { blocks } = planMany(ctx(state({ tasks: [a, b] })), [b, a]);
    const lastA = Math.max(...blocks.filter(x => x.taskId === 'a').map(x => +new Date(x.end)));
    const firstB = Math.min(...blocks.filter(x => x.taskId === 'b').map(x => +new Date(x.start)));
    expect(firstB).toBeGreaterThanOrEqual(lastA);
    const why = blocks.find(x => x.taskId === 'b')!.why;
    expect(why.dep).toBe(a.title);
    expect(why.rank).toBe(2);
  });
  it('applies the personal estimate factor', () => {
    const t = task({ estimate: 2, due: '2026-10-09T18:00' });
    const r = planTask({ ...ctx(state({ tasks: [t] })), factor: 1.5 }, t);
    expect(r.blocks.reduce((x, b) => x + h(b), 0)).toBe(3);
  });
});

describe('planning service', () => {
  it('produces a draft plan without touching state', async () => {
    const t = task({ estimate: 2, due: '2026-10-07T18:00' });
    const s = state({ tasks: [t] });
    const plan = await rulesPlanner.suggest(ctx(s), [t], null);
    expect(plan.blocks.length).toBeGreaterThan(0);
    expect(s.blocks).toHaveLength(0);
  });
  it('validatePlan drops blocks for unknown tasks and malformed times', () => {
    const s = state({ tasks: [task({ id: 'ok' })] });
    const why = planTask(ctx(s), s.tasks[0]!).blocks[0]!.why;
    const plan = { id: 'p', source: 'ai' as const, request: null, createdAt: '', taskIds: [], addedDeps: [], opts: {}, unplaced: [{ taskId: 'ghost', h: 1, reason: null, weekendHelps: false }],
      blocks: [{ id: '1', taskId: 'ok', start: '2026-10-05T10:00', end: '2026-10-05T11:00', why }, { id: '2', taskId: 'ghost', start: '2026-10-05T10:00', end: '2026-10-05T11:00', why }, { id: '3', taskId: 'ok', start: '<img>', end: '2026-10-05T11:00', why }, { id: '4', taskId: 'ok', start: '2026-10-05T12:00', end: '2026-10-05T11:00', why }] };
    const v = validatePlan(s, plan);
    expect(v.blocks.map(b => b.id)).toEqual(['1']);
    expect(v.unplaced).toHaveLength(0);
  });
  it('applyPlan skips blocks that collide with something added meanwhile', async () => {
    const t = task({ estimate: 1, due: '2026-10-05T18:00' });
    const s = state({ tasks: [t] });
    const plan = await rulesPlanner.suggest(ctx(s), [t], null);
    const b0 = plan.blocks[0]!;
    s.blocks.push({ id: 'x', taskId: t.id, start: b0.start, end: b0.end });
    const r = applyPlan(s, plan);
    expect(r.applied).toBe(0); expect(r.skipped).toBe(1);
  });
});
