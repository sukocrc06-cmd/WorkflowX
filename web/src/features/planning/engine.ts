/**
 * Deterministic, explainable scheduling engine.
 * Splits each task's remaining hours into free slots between `now` (or its start) and its
 * deadline while respecting working hours, events (incl. personal time), existing blocks,
 * the daily work capacity and dependencies. Every block carries a structured `why`,
 * including the days that were skipped because they were full.
 * Pure: everything it needs is passed in, so it runs identically in the browser, on the
 * server, in tests — and can validate plans proposed by a future AI provider.
 */
import { PRIORITY_WEIGHT, type AppState, type Id, type PlanBlock, type PlanOptions, type PlanWhy, type SlotReason, type Task, type Unplaced, type UnplacedReason } from '@/types/domain';
import { HOUR, addDays, dayKey, startOfDay, toLocal } from '@/lib/date';
import { newId } from '@/lib/ids';
import { dayLoad, isWorkDay } from '@/features/calendar/capacity';

export { dayLoad, isWorkDay };
export interface PlanContext {
  state: AppState;
  now: Date;
  /** Personal estimate factor (actual ÷ estimated). 1 = trust estimates. */
  factor: number;
}
interface Busy { a: number; b: number; label: string }
interface DraftBlock { taskId: Id; start: string; end: string }
export interface TaskPlan { blocks: PlanBlock[]; unplaced: number; reason: UnplacedReason | null; weekendHelps: boolean }

const SLOT = 30 * 60_000;
const NO_DUE_HORIZON_DAYS = 8;
export const FOCUS_MIN_HOURS = 2;

export const scheduledHours = (s: AppState, taskId: Id): number => s.blocks.filter(b => b.taskId === taskId).reduce((h, b) => h + (+new Date(b.end) - +new Date(b.start)) / HOUR, 0);
export const remainingHours = (ctx: PlanContext, t: Task): number => Math.max(0, Math.round(((t.estimate || 0) * ctx.factor - scheduledHours(ctx.state, t.id)) * 2) / 2);

/** Everything that occupies time: all timed events except milestones (personal time included), and blocks. */
export function busyItems(s: AppState, extra: readonly DraftBlock[] = []): Busy[] {
  const title = (id: Id) => s.tasks.find(x => x.id === id)?.title ?? '';
  return [
    ...s.events.filter(e => e.type !== 'milestone').map(e => ({ a: +new Date(e.start), b: +new Date(e.end), label: e.title })),
    ...[...s.blocks, ...extra].map(b => ({ a: +new Date(b.start), b: +new Date(b.end), label: title(b.taskId) }))
  ].sort((p, q) => p.a - q.a);
}

export function planTask(ctx: PlanContext, task: Task, extra: readonly DraftBlock[] = [], rank = { rank: 1, n: 1 }, opts: PlanOptions = {}): TaskPlan {
  const { state: s, now } = ctx;
  const need = remainingHours(ctx, task);
  if (need <= 0) return { blocks: [], unplaced: 0, reason: null, weekendHelps: false };
  const st = s.settings, work = (d: Date) => !!opts.weekend || isWorkDay(s, d);
  let from = Math.ceil(+now / SLOT) * SLOT;
  let startNote: string | null = null;
  if (task.start && +new Date(task.start) > from) { from = Math.ceil(+new Date(task.start) / SLOT) * SLOT; startNote = task.start; }
  let depTitle: string | null = null;
  for (const did of task.deps) {
    const dt = s.tasks.find(x => x.id === did); if (!dt || dt.status === 'done') continue;
    const ends = [...s.blocks, ...extra].filter(b => b.taskId === did).map(b => +new Date(b.end));
    if (ends.length) { const m = Math.max(...ends); if (m > from) { from = m; depTitle = dt.title; } }
  }
  const due = task.due ? new Date(task.due) : addDays(startOfDay(now), NO_DUE_HORIZON_DAYS);
  if (+due <= from) return { blocks: [], unplaced: need, reason: +due <= +now ? 'due' : 'window', weekendHelps: false };

  const days: { d: Date; a: number; b: number; cap: number; ws: number }[] = [];
  const skipped: { d: Date; why: 'off' | 'hours' | 'full'; load?: number }[] = [];
  let hadWorkDay = false;
  for (let d = startOfDay(from); +d <= +due; d = addDays(d, 1)) {
    if (!work(d)) { skipped.push({ d, why: 'off' }); continue; }
    hadWorkDay = true;
    const ws = new Date(d); ws.setHours(st.workStart, 0, 0, 0);
    const we = new Date(d); we.setHours(st.workEnd, 0, 0, 0);
    const a = Math.max(+ws, from), b = Math.min(+we, +due);
    if (b - a < SLOT) { skipped.push({ d, why: 'hours' }); continue; }
    const load = dayLoad(s, d, extra), cap = st.maxDaily - load;
    if (cap < 0.5) { skipped.push({ d, why: 'full', load }); continue; }
    days.push({ d, a, b, cap, ws: +ws });
  }
  const offDays = skipped.some(x => x.why === 'off');
  if (!days.length) return { blocks: [], unplaced: need, reason: skipped.some(x => x.why === 'full') ? 'full' : hadWorkDay ? 'outside' : 'nofree', weekendHelps: !opts.weekend && offDays };

  let left = need; const out: PlanBlock[] = [];
  /* Prefer focus chunks of at least 2 h (fewer context switches), then spread the rest evenly. */
  const per = Math.min(need, Math.max(FOCUS_MIN_HOURS, Math.ceil((need / days.length) * 2) / 2));
  const placeIn = (day: (typeof days)[number], amount: number, pass: 1 | 2, idx: number): number => {
    const want = Math.floor(amount * 2) / 2; if (want < 0.5) return 0;
    const busy = busyItems(s, [...extra, ...out]);
    let placed = 0, cursor = day.a, lastHit: Busy | null = null;
    while (cursor < day.b && placed < want) {
      const hit = busy.find(x => x.a < cursor + SLOT && x.b > cursor);
      if (hit) { cursor = Math.ceil(hit.b / SLOT) * SLOT; lastHit = hit; continue; }
      const nextBusy = busy.find(x => x.a >= cursor);
      const freeEnd = Math.min(day.b, nextBusy ? nextBusy.a : Infinity);
      const len = Math.min(freeEnd - cursor, (want - placed) * HOUR);
      // avoid slivers: a block is at least 1 h unless less than 1 h is left
      if (len >= SLOT && len >= Math.min(HOUR, (want - placed) * HOUR)) {
        const L = Math.floor(len / SLOT) * SLOT, before = dayLoad(s, day.d, [...extra, ...out]);
        const slot: SlotReason = lastHit && Math.ceil(lastHit.b / SLOT) * SLOT === cursor ? { kind: 'after', label: lastHit.label } : cursor === day.ws ? { kind: 'start' } : cursor === from && !depTitle ? { kind: 'now' } : { kind: 'free' };
        const why: PlanWhy = { due: task.due || null, rank: rank.rank, n: rank.n, prio: task.priority, dep: depTitle, start: startNote, pass, per, dayIdx: idx + 1, days: days.length, before, after: before + L / HOUR, cap: st.maxDaily, slot, factor: ctx.factor !== 1 ? ctx.factor : null,
          skipped: skipped.filter(x => +x.d < +day.d && x.why === 'full').slice(-3).map(x => ({ d: dayKey(x.d), load: x.load ?? 0, cap: st.maxDaily })), weekend: !!opts.weekend && !isWorkDay(s, day.d) };
        out.push({ id: newId(), taskId: task.id, start: toLocal(new Date(cursor)), end: toLocal(new Date(cursor + L)), why });
        placed += L / HOUR; cursor += L; lastHit = null;
      } else { const nb = busy.find(x => x.a >= cursor); cursor = freeEnd; lastHit = nb && nb.a === freeEnd ? nb : null; }
    }
    day.cap -= placed; return placed;
  };
  days.forEach((day, i) => { if (left > 0) left -= placeIn(day, Math.min(per, day.cap, left), 1, i); });
  days.forEach((day, i) => { if (left > 0) left -= placeIn(day, Math.min(day.cap, left), 2, i); });
  return { blocks: out, unplaced: Math.max(0, Math.round(left * 10) / 10), reason: left > 0 ? 'cap' : null, weekendHelps: left > 0 && offDays && !opts.weekend };
}

/** Earliest deadline first, then priority; dependencies are placed before dependants. */
export function planOrder(tasks: readonly Task[], all: readonly Task[] = tasks): Task[] {
  const byId = new Map(all.map(x => [x.id, x]));
  const byDue = [...tasks].sort((x, y) => (x.due ? +new Date(x.due) : Infinity) - (y.due ? +new Date(y.due) : Infinity) || PRIORITY_WEIGHT[y.priority] - PRIORITY_WEIGHT[x.priority]);
  const inSet = new Set(byDue.map(x => x.id)), out: Task[] = [], seen = new Set<Id>();
  const visit = (x: Task): void => { if (seen.has(x.id)) return; seen.add(x.id); for (const d of x.deps) { const t = byId.get(d); if (t && inSet.has(d)) visit(t); } out.push(x); };
  byDue.forEach(visit);
  return out;
}

export function planMany(ctx: PlanContext, tasks: readonly Task[], opts: PlanOptions = {}): { blocks: PlanBlock[]; unplaced: Unplaced[] } {
  const all: PlanBlock[] = [], unplaced: Unplaced[] = [];
  const order = planOrder(tasks, ctx.state.tasks);
  order.forEach((x, i) => {
    const r = planTask(ctx, x, all, { rank: i + 1, n: order.length }, opts);
    all.push(...r.blocks);
    if (r.unplaced > 0) unplaced.push({ taskId: x.id, h: r.unplaced, reason: r.reason, weekendHelps: r.weekendHelps });
  });
  return { blocks: all, unplaced };
}
/** Open dependencies (assigned to me, still needing time) that must be planned with `tasks`. */
export function withDependencies(ctx: PlanContext, tasks: readonly Task[]): { all: Task[]; added: Id[] } {
  const set = new Map(tasks.map(x => [x.id, x])), added: Id[] = [];
  const pull = (x: Task): void => { for (const id of x.deps) { const d = ctx.state.tasks.find(t => t.id === id); if (d && d.status !== 'done' && !d.assignee && !set.has(d.id) && remainingHours(ctx, d) > 0) { set.set(d.id, d); added.push(d.id); pull(d); } } };
  tasks.forEach(pull);
  return { all: [...set.values()], added };
}
