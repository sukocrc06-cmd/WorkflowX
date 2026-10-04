/**
 * Project health from real data only. Without tasks or deadlines the honest answer
 * is 'nodata' — never an invented score.
 */
import type { AppState, Project } from '@/types/domain';
import { dayEnd, parseDay } from '@/lib/date';
import { freeUntil } from '@/features/calendar/capacity';
import { remainingHours, type PlanContext } from '@/features/planning/engine';

export type HealthKind = 'healthy' | 'risk' | 'delayed' | 'completed' | 'nodata';
export interface Health { kind: HealthKind; reason: 'all-done' | 'no-tasks' | 'project-late' | 'tasks-late' | 'no-deadline' | 'block-after-due' | 'short' | 'fits'; need?: number; free?: number; late?: number }
export function projectHealth(s: AppState, p: Project, now: Date, factor = 1): Health {
  const ts = s.tasks.filter(x => x.projectId === p.id), open = ts.filter(x => x.status !== 'done');
  if (p.status === 'done' || (ts.length && !open.length)) return { kind: 'completed', reason: 'all-done' };
  if (!ts.length) return { kind: 'nodata', reason: 'no-tasks' };
  const pEnd = p.deadline ? dayEnd(parseDay(p.deadline)) : null;
  if (pEnd !== null && pEnd < +now) return { kind: 'delayed', reason: 'project-late', late: open.length };
  const late = open.filter(x => x.due && +new Date(x.due) < +now);
  if (late.length) return { kind: 'delayed', reason: 'tasks-late', late: late.length };
  const dues = open.filter(x => x.due).map(x => +new Date(x.due));
  const horizon = pEnd ?? (dues.length ? Math.max(...dues) : null);
  if (horizon === null) return { kind: 'nodata', reason: 'no-deadline' };
  const afterDue = s.blocks.some(b => { const x = open.find(t => t.id === b.taskId); if (!x) return false; const lim = Math.min(x.due ? +new Date(x.due) : Infinity, pEnd ?? Infinity); return +new Date(b.end) > lim; });
  if (afterDue) return { kind: 'risk', reason: 'block-after-due' };
  const ctx: PlanContext = { state: s, now, factor };
  const need = open.filter(x => !x.assignee).reduce((h, x) => h + remainingHours(ctx, x), 0), free = freeUntil(s, new Date(horizon), now);
  if (need > free + 1e-9) return { kind: 'risk', reason: 'short', need, free };
  return { kind: 'healthy', reason: 'fits', need, free };
}
