import { EVENT_TYPES, PRIORITIES, PROJECT_STATUSES, RECUR_FREQS, ROLES, TASK_STATUSES, emptyState, type ActivityEntity, type AppState, type CalendarEvent, type Comment, type EventType, type Id, type Member, type Project, type RecurRule, type RoadmapState, type ScheduleBlock, type Subtask, type Task, type Template, type TimeLog } from '@/types/domain';
import { isIsoInstant, isLocalDate, isLocalDateTime, toLocal } from './date';
import { isSafeId, newId } from './ids';

export const DEFAULT_COLOR = '#6366f1';
const COLOR_RX = /^#[0-9a-fA-F]{6}$/;
export const EMAIL_RX = /^[^\s@<>"']{1,64}@[^\s@<>"']{1,190}\.[A-Za-z]{2,24}$/;
const NOTIF_ID_RX = /^[a-z]{2,10}:[A-Za-z0-9_:.\-]{1,160}$/;
export interface SanitizeReport { fixed: number; dropped: number }

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
const records = (v: unknown): Rec[] => (Array.isArray(v) ? v.filter(isRec) : []);
const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '');
const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === 'string' && (list as readonly string[]).includes(v);
const clamp = (v: unknown, min: number, max: number, def: number): number => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def; };

/**
 * Rebuilds a clean AppState from untrusted input (browser storage, imported backup, future API).
 * Unknown fields are dropped; ids, enums, dates, numbers and colours are validated; dangling
 * references are cleared; dependency cycles are cut. Never throws.
 */
export function sanitizeState(raw: unknown, now: Date = new Date()): { state: AppState; report: SanitizeReport } {
  const rep: SanitizeReport = { fixed: 0, dropped: 0 };
  const src: Rec = isRec(raw) ? raw : {};
  const out = emptyState();
  const idMap = new Map<string, Id>();
  const cleanId = (id: unknown): Id => { if (isSafeId(id)) return id; const n = newId(); rep.fixed++; if (id != null) idMap.set(String(id), n); return n; };
  const created = (v: unknown) => (isLocalDateTime(v) ? v : toLocal(now));

  const pr = isRec(src.profile) ? src.profile : {};
  out.profile = { name: str(pr.name, 120).trim(), role: str(pr.role, 120).trim(), tz: str(pr.tz, 64) };
  const se = isRec(src.settings) ? src.settings : {};
  const ws = Math.round(clamp(se.workStart, 0, 23, 9)), we0 = Math.round(clamp(se.workEnd, 1, 24, 18)), we = we0 > ws ? we0 : Math.min(24, ws + 8);
  const days = [...new Set(Array.isArray(se.workDays) ? se.workDays.map(Number).filter(d => Number.isInteger(d) && d >= 0 && d <= 6) : [])];
  if (!days.length && se.workDays) rep.fixed++;
  const nt = isRec(se.notify) ? se.notify : {};
  out.settings = { workStart: ws, workEnd: we, maxDaily: Math.min(clamp(se.maxDaily, 0.5, 16, 6), we - ws), workDays: days.length ? days : [1, 2, 3, 4, 5], useFactor: se.useFactor === true,
    notify: { deadline: nt.deadline !== false, project: nt.project !== false, conflict: nt.conflict !== false, suggestion: nt.suggestion !== false } };
  const wsp = isRec(src.workspace) ? src.workspace : {};
  out.workspace = { id: 'personal', kind: 'personal', name: str(wsp.name, 120).trim() };

  for (const m of records(src.members).slice(0, 200)) {
    const name = str(m.name, 120).trim(); if (!name) { rep.dropped++; continue; }
    const role = oneOf(ROLES, m.role) && m.role !== 'owner' ? m.role : (m.role !== undefined && rep.fixed++, 'member' as const);
    const member: Member = { id: m.id === 'me' ? (rep.fixed++, newId()) : cleanId(m.id), name, email: typeof m.email === 'string' && EMAIL_RX.test(m.email) ? m.email : '', role, capacity: Math.round(clamp(m.capacity, 0, 80, 30) * 2) / 2, demo: m.demo === true };
    out.members.push(member);
  }
  const memberIds = new Set(out.members.map(m => m.id));
  const memberRef = (id: unknown): Id | null => { if (id == null || id === '' || id === 'me') return null; const k = idMap.get(String(id)) ?? String(id); if (memberIds.has(k)) return k; rep.fixed++; return null; };
  out.onboarded = src.onboarded === true;

  for (const p of records(src.projects)) {
    const name = str(p.name, 120).trim(); if (!name) { rep.dropped++; continue; }
    const color = typeof p.color === 'string' && COLOR_RX.test(p.color) ? p.color : (rep.fixed++, DEFAULT_COLOR);
    const project: Project = { id: cleanId(p.id), name, desc: str(p.desc, 5000), color, start: isLocalDate(p.start) ? p.start : '', deadline: isLocalDate(p.deadline) ? p.deadline : '', status: oneOf(PROJECT_STATUSES, p.status) ? p.status : 'active', archived: p.archived === true, archivedAt: p.archived === true && isLocalDateTime(p.archivedAt) ? p.archivedAt : null, createdAt: created(p.createdAt), demo: p.demo === true };
    out.projects.push(project);
  }
  const projIds = new Set(out.projects.map(p => p.id));
  const projRef = (id: unknown): Id | null => { if (id == null || id === '') return null; const k = idMap.get(String(id)) ?? String(id); if (projIds.has(k)) return k; rep.fixed++; return null; };

  const rawDeps = new Map<Id, string[]>();
  for (const x of records(src.tasks)) {
    const title = str(x.title, 200).trim(); if (!title) { rep.dropped++; continue; }
    const logs: TimeLog[] = records(x.logs).filter(l => isIsoInstant(l.start) && isIsoInstant(l.end) && Date.parse(String(l.end)) > Date.parse(String(l.start))).map(l => ({ start: String(l.start), end: String(l.end), manual: l.manual === true }));
    const task: Task = {
      id: cleanId(x.id), title, desc: str(x.desc, 10000),
      status: oneOf(TASK_STATUSES, x.status) ? x.status : (rep.fixed++, 'todo'),
      priority: oneOf(PRIORITIES, x.priority) ? x.priority : (rep.fixed++, 'medium'),
      due: isLocalDateTime(x.due) ? x.due : (x.due ? (rep.fixed++, '') : ''),
      start: isLocalDateTime(x.start) ? x.start : (x.start ? (rep.fixed++, '') : ''),
      assignee: memberRef(x.assignee),
      subtasks: records(x.subtasks).slice(0, 50).map((st): Subtask => ({ id: isSafeId(st.id) ? st.id : newId(), title: str(st.title, 200).trim(), done: st.done === true })).filter(st => st.title),
      recur: cleanRecur(x.recur),
      comments: records(x.comments).slice(-200).filter(c => isIsoInstant(c.at) && str(c.text, 2000).trim()).map((c): Comment => ({ id: isSafeId(c.id) ? c.id : newId(), author: c.author === 'me' ? 'me' : (memberRef(c.author) ?? 'me'), text: str(c.text, 2000).trim(), at: String(c.at) })),
      estimate: Math.round(clamp(x.estimate, 0, 200, 0) * 4) / 4,
      projectId: projRef(x.projectId),
      tags: (Array.isArray(x.tags) ? x.tags : []).filter((g): g is string => typeof g === 'string' && g.trim() !== '').map(g => g.trim().slice(0, 40)).slice(0, 10),
      deps: [], logs, createdAt: created(x.createdAt), completedAt: isLocalDateTime(x.completedAt) ? x.completedAt : null, updatedAt: isLocalDateTime(x.updatedAt) ? x.updatedAt : null, demo: x.demo === true
    };
    rawDeps.set(task.id, Array.isArray(x.deps) ? x.deps.map(String) : []);
    out.tasks.push(task);
  }
  const taskIds = new Set(out.tasks.map(x => x.id));
  const taskRef = (id: unknown): Id | null => { const k = idMap.get(String(id)) ?? String(id); return taskIds.has(k) ? k : null; };
  for (const x of out.tasks) {
    const before = rawDeps.get(x.id) ?? [];
    x.deps = [...new Set(before.map(taskRef).filter((d): d is Id => d !== null && d !== x.id))];
    if (x.deps.length !== before.length) rep.fixed++;
  }
  rep.fixed += breakCycles(out.tasks);
  for (const x of out.tasks) if (x.start && x.due && +new Date(x.start) > +new Date(x.due)) { x.start = ''; rep.fixed++; }

  for (const e of records(src.events)) {
    const title = str(e.title, 200).trim();
    if (!title || !isLocalDateTime(e.start) || !isLocalDateTime(e.end) || +new Date(e.end) <= +new Date(e.start)) { rep.dropped++; continue; }
    let type: EventType = 'meeting';
    if (e.type === 'work') type = 'focus'; else if (oneOf(EVENT_TYPES, e.type)) type = e.type; else rep.fixed++;
    const ev: CalendarEvent = { id: cleanId(e.id), title, start: e.start, end: e.end, type, projectId: projRef(e.projectId), location: str(e.location, 300), participants: str(e.participants, 500), desc: str(e.desc, 5000), source: e.source === 'ics' ? 'ics' : 'manual', uid: str(e.uid, 256), demo: e.demo === true };
    out.events.push(ev);
  }
  for (const b of records(src.blocks)) {
    const taskId = taskRef(b.taskId);
    if (!taskId || !isLocalDateTime(b.start) || !isLocalDateTime(b.end) || +new Date(b.end) <= +new Date(b.start)) { rep.dropped++; continue; }
    const block: ScheduleBlock = { id: cleanId(b.id), taskId, start: b.start, end: b.end };
    out.blocks.push(block);
  }
  const tm = isRec(src.timer) ? src.timer : null;
  const tmTask = tm ? taskRef(tm.taskId) : null;
  if (tm && tmTask && isIsoInstant(tm.start) && Date.parse(String(tm.start)) <= +now) out.timer = { taskId: tmTask, start: String(tm.start) };
  else if (src.timer) rep.fixed++;
  for (const tp of records(src.templates).slice(0, 100)) {
    const name = str(tp.name, 120).trim(); if (!name || (tp.kind !== 'task' && tp.kind !== 'project')) { rep.dropped++; continue; }
    const items = records(tp.items).slice(0, 40).map((it, i) => ({ title: str(it.title, 200).trim(), estimate: Math.round(clamp(it.estimate, 0, 200, 0) * 4) / 4, priority: oneOf(PRIORITIES, it.priority) ? it.priority : 'medium' as const,
      tags: strings(it.tags, 10, 40), subtasks: strings(it.subtasks, 50, 200), depIndex: Number.isInteger(it.depIndex) && (it.depIndex as number) >= 0 && (it.depIndex as number) < i ? it.depIndex as number : null, recur: cleanRecur(it.recur) })).filter(it => it.title);
    if (!items.length) { rep.dropped++; continue; }
    const t: Template = { id: cleanId(tp.id), kind: tp.kind, name, desc: str(tp.desc, 500), items };
    out.templates.push(t);
  }
  const ENT: readonly ActivityEntity[] = ['task', 'project', 'event', 'workspace'];
  for (const a of records(src.activity).slice(-1000)) {
    if (!isIsoInstant(a.at) || typeof a.type !== 'string' || !/^[a-z_]{1,24}$/.test(a.type) || !oneOf(ENT, a.entity)) continue;
    const d = isRec(a.data) ? a.data : {};
    const changes = (Array.isArray(d.changes) ? d.changes : []).filter((c): c is unknown[] => Array.isArray(c) && c.length === 3).slice(0, 12).map(c => [str(String(c[0] ?? ''), 120), str(String(c[1] ?? ''), 120), str(String(c[2] ?? ''), 120)] as [string, string, string]);
    out.activity.push({ id: isSafeId(a.id) ? a.id : newId(), at: String(a.at), entity: a.entity, entityId: isSafeId(a.entityId) ? (idMap.get(a.entityId) ?? a.entityId) : '', type: a.type, data: { label: str(d.label, 200), note: str(d.note, 200), changes } });
  }
  if (isRec(src.notifRead)) for (const k of Object.keys(src.notifRead).slice(-500)) if (NOTIF_ID_RX.test(k) && src.notifRead[k] === true) out.notifRead[k] = true;
  if (isRec(src.roadmap)) for (const [k, v] of Object.entries(src.roadmap)) if (isSafeId(k) && oneOf(['todo', 'proto', 'done'] as const, v)) out.roadmap[k] = v as RoadmapState;
  return { state: out, report: rep };
}

const strings = (v: unknown, n: number, max: number): string[] => (Array.isArray(v) ? v : []).filter((g): g is string => typeof g === 'string').map(g => g.trim().slice(0, max)).filter(Boolean).slice(0, n);
export function cleanRecur(r: unknown): RecurRule | null {
  if (!isRec(r) || !oneOf(RECUR_FREQS, r.freq)) return null;
  const o: RecurRule = { freq: r.freq, interval: Math.round(clamp(r.interval, 1, 30, 1)) };
  if (r.freq === 'weekly') { const d = [...new Set((Array.isArray(r.days) ? r.days : []).map(Number).filter(x => Number.isInteger(x) && x >= 0 && x <= 6))]; o.days = d.length ? d : [1]; }
  if (r.freq === 'monthly') o.monthDay = Math.round(clamp(r.monthDay, 1, 31, 1));
  return o;
}
/** Removes dependency edges that close a cycle (depth-first). Returns the number removed. */
export function breakCycles(tasks: Task[]): number {
  const byId = new Map(tasks.map(x => [x.id, x]));
  const mark = new Map<Id, 1 | 2>(); let removed = 0;
  const visit = (x: Task): void => {
    mark.set(x.id, 1);
    x.deps = x.deps.filter(d => { const s = mark.get(d); if (s === 1) { removed++; return false; } const t = byId.get(d); if (!s && t) visit(t); return true; });
    mark.set(x.id, 2);
  };
  for (const x of tasks) if (!mark.get(x.id)) visit(x);
  return removed;
}
/** Would making `taskId` depend on `depId` create a cycle? */
export function createsCycle(tasks: readonly Task[], taskId: Id, depId: Id): boolean {
  const byId = new Map(tasks.map(x => [x.id, x]));
  const seen = new Set<Id>(); const stack: Id[] = [depId];
  while (stack.length) { const id = stack.pop() as Id; if (id === taskId) return true; if (seen.has(id)) continue; seen.add(id); stack.push(...(byId.get(id)?.deps ?? [])); }
  return false;
}
