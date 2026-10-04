/**
 * PlanningService — the only planning entry point the UI uses.
 * Today: the deterministic engine. AI phase: an AiPlanner implements the same interface;
 * its output is always passed through validatePlan() and shown as a draft that the user
 * must explicitly apply. Nothing here writes to the calendar.
 */
import type { AppState, Id, Plan, PlanBlock, Task } from '@/types/domain';
import { HOUR, isLocalDateTime } from '@/lib/date';
import { newId } from '@/lib/ids';
import { planMany, withDependencies, type PlanContext } from './engine';
import type { PlanOptions } from '@/types/domain';

export interface Planner {
  readonly source: Plan['source'];
  suggest(ctx: PlanContext, tasks: readonly Task[], request: string | null, opts?: PlanOptions): Promise<Plan>;
}
export const rulesPlanner: Planner = {
  source: 'rules',
  async suggest(ctx, tasks, request, opts = {}) {
    const { all, added } = withDependencies(ctx, tasks);
    const r = planMany(ctx, all, opts);
    return validatePlan(ctx.state, { id: newId(), source: 'rules', request, createdAt: new Date().toISOString(), taskIds: all.map(t => t.id), addedDeps: added, opts, ...r });
  }
};
const MAX_BLOCK = 12 * HOUR;
/** Defensive check for any plan, whoever produced it (engine today, LLM tomorrow). */
export function validatePlan(state: AppState, plan: Plan): Plan {
  const exists = (id: Id) => state.tasks.some(t => t.id === id);
  const okBlock = (b: PlanBlock) => exists(b.taskId) && isLocalDateTime(b.start) && isLocalDateTime(b.end) && +new Date(b.end) > +new Date(b.start) && +new Date(b.end) - +new Date(b.start) <= MAX_BLOCK;
  return { ...plan, blocks: plan.blocks.filter(okBlock), unplaced: plan.unplaced.filter(u => exists(u.taskId)) };
}
/** Applying = copying validated blocks that still don't collide with anything. Returns the new state. */
export function applyPlan(state: AppState, plan: Plan): { state: AppState; applied: number; skipped: number } {
  const busy = [...state.events.filter(e => e.type !== 'milestone'), ...state.blocks].map(x => [+new Date(x.start), +new Date(x.end)] as const);
  const fresh = validatePlan(state, plan).blocks.filter(b => !busy.some(([a, e]) => Math.min(e, +new Date(b.end)) > Math.max(a, +new Date(b.start))));
  const blocks = [...state.blocks, ...fresh.map(b => ({ id: newId(), taskId: b.taskId, start: b.start, end: b.end }))];
  return { state: { ...state, blocks }, applied: fresh.length, skipped: plan.blocks.length - fresh.length };
}
