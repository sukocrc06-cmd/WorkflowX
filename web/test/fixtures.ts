import { emptyState, type AppState, type Task } from '@/types/domain';
let n = 0;
export function task(p: Partial<Task> = {}): Task {
  n++;
  return { id: p.id ?? `t${n}`, title: `Görev ${n}`, desc: '', status: 'todo', priority: 'medium', due: '', start: '', estimate: 2, projectId: null, assignee: null, tags: [], subtasks: [], recur: null, comments: [], deps: [], logs: [], createdAt: '2026-10-01T09:00', completedAt: null, updatedAt: null, demo: false, ...p };
}
export function state(p: Partial<AppState> = {}): AppState { return { ...emptyState(), ...p }; }
/** Monday 5 Oct 2026, 08:00 local */
export const MON = new Date(2026, 9, 5, 8, 0);
