/** Wall-clock local date-time, e.g. "2026-10-02T17:00". Converted to timestamptz at the API boundary. */
export type LocalDateTime = string;
/** Local calendar date, e.g. "2026-10-02". */
export type LocalDate = string;
/** UTC instant, ISO-8601 (used for time logs and the running timer). */
export type IsoInstant = string;
export type Id = string;

export const TASK_STATUSES = ['inbox', 'todo', 'progress', 'blocked', 'done'] as const;
export const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export const EVENT_TYPES = ['meeting', 'focus', 'personal', 'event', 'milestone'] as const;
export const PROJECT_STATUSES = ['active', 'hold', 'done'] as const;
export const ROLES = ['owner', 'admin', 'manager', 'member', 'viewer'] as const;
export const RECUR_FREQS = ['daily', 'weekdays', 'weekly', 'monthly'] as const;
export type Role = (typeof ROLES)[number];
export type RecurFreq = (typeof RECUR_FREQS)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type EventType = (typeof EVENT_TYPES)[number];
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export const PRIORITY_WEIGHT: Record<Priority, number> = { low: 1, medium: 2, high: 3, urgent: 4 };

export interface TimeLog { start: IsoInstant; end: IsoInstant; manual: boolean }
export interface Subtask { id: Id; title: string; done: boolean }
/** 'me' = the workspace owner (the signed-in user in the backend phase). */
export interface Comment { id: Id; author: Id | 'me'; text: string; at: IsoInstant }
export interface RecurRule { freq: RecurFreq; interval: number; days?: number[]; monthDay?: number }

export interface Task {
  id: Id; title: string; desc: string;
  status: TaskStatus; priority: Priority;
  due: LocalDateTime | '';
  /** Earliest start; the planner never schedules before it. */
  start: LocalDateTime | '';
  /** Hours, 0–200, quarter-hour precision. 0 = not estimated. */
  estimate: number;
  projectId: Id | null;
  /** null = me / unassigned. Only "my" tasks are placed on my calendar. */
  assignee: Id | null;
  tags: string[];
  subtasks: Subtask[];
  recur: RecurRule | null;
  comments: Comment[];
  /** Tasks that must finish before this one. Acyclic. */
  deps: Id[];
  logs: TimeLog[];
  createdAt: LocalDateTime; completedAt: LocalDateTime | null; updatedAt: LocalDateTime | null;
  demo: boolean;
}
export interface Project {
  id: Id; name: string; desc: string; color: string;
  start: LocalDate | ''; deadline: LocalDate | '';
  status: ProjectStatus; archived: boolean; archivedAt: LocalDateTime | null;
  createdAt: LocalDateTime; demo: boolean;
}
export interface Member { id: Id; name: string; email: string; role: Exclude<Role, 'owner'>; /** hours per week */ capacity: number; demo: boolean }
export interface TemplateItem { title: string; estimate: number; priority: Priority; tags: string[]; subtasks: string[]; depIndex: number | null; recur: RecurRule | null }
export interface Template { id: Id; kind: 'task' | 'project'; name: string; desc: string; items: TemplateItem[] }
export type ActivityEntity = 'task' | 'project' | 'event' | 'workspace';
export interface ActivityEntry { id: Id; at: IsoInstant; entity: ActivityEntity; entityId: Id | ''; type: string; data: { label: string; note: string; changes: [string, string, string][] } }
export interface Workspace { id: 'personal'; kind: 'personal'; name: string }
export interface NotifySettings { deadline: boolean; project: boolean; conflict: boolean; suggestion: boolean }
export interface CalendarEvent {
  id: Id; title: string; start: LocalDateTime; end: LocalDateTime; type: EventType;
  projectId: Id | null; location: string; participants: string; desc: string;
  source: 'manual' | 'ics'; uid: string; demo: boolean;
}
/** A slice of a task's work placed on the calendar (TASK → FOCUS BLOCK). */
export interface ScheduleBlock { id: Id; taskId: Id; start: LocalDateTime; end: LocalDateTime }

export interface WorkSettings {
  workStart: number; workEnd: number;
  /** Maximum hours of booked time per working day. */
  maxDaily: number;
  /** 0 = Sunday … 6 = Saturday */
  workDays: number[];
  useFactor: boolean;
  notify: NotifySettings;
}
export interface Profile { name: string; role: string; tz: string }
export interface RunningTimer { taskId: Id; start: IsoInstant }
export type RoadmapState = 'todo' | 'proto' | 'done';

/** Product state — everything that is persisted. UI state lives elsewhere. */
export interface AppState {
  workspace: Workspace; profile: Profile; settings: WorkSettings;
  projects: Project[]; tasks: Task[]; events: CalendarEvent[]; blocks: ScheduleBlock[];
  members: Member[]; templates: Template[]; activity: ActivityEntry[]; notifRead: Record<string, true>;
  timer: RunningTimer | null; roadmap: Record<string, RoadmapState>; onboarded: boolean;
}

/* ---------- planning ---------- */
export type SlotReason = { kind: 'after'; label: string } | { kind: 'start' } | { kind: 'now' } | { kind: 'free' };
/** Structured explanation attached to every suggested block ("Why?"). */
export interface PlanWhy {
  due: LocalDateTime | null; rank: number; n: number; prio: Priority; dep: string | null;
  start: LocalDateTime | null;
  pass: 1 | 2; per: number; dayIdx: number; days: number;
  before: number; after: number; cap: number; slot: SlotReason; factor: number | null;
  /** Earlier days skipped because they were full (the "Why not Wednesday?" answer). */
  skipped: { d: LocalDate; load: number; cap: number }[];
  weekend: boolean;
}
export interface PlanBlock extends ScheduleBlock { why: PlanWhy }
/** due: deadline passed · window: start/dependency after deadline · nofree: no working day · outside: deadline outside working hours · full: every day full · cap: partly placed */
export type UnplacedReason = 'due' | 'window' | 'nofree' | 'outside' | 'full' | 'cap';
export interface Unplaced { taskId: Id; h: number; reason: UnplacedReason | null; weekendHelps: boolean }
export interface PlanOptions { weekend?: boolean }
export interface Plan {
  id: Id; source: 'rules' | 'ai'; request: string | null; createdAt: IsoInstant;
  taskIds: Id[]; addedDeps: Id[]; opts: PlanOptions; blocks: PlanBlock[]; unplaced: Unplaced[];
}

export function emptyState(): AppState {
  return {
    workspace: { id: 'personal', kind: 'personal', name: '' },
    profile: { name: '', role: '', tz: '' },
    settings: { workStart: 9, workEnd: 18, maxDaily: 6, workDays: [1, 2, 3, 4, 5], useFactor: false, notify: { deadline: true, project: true, conflict: true, suggestion: true } },
    projects: [], tasks: [], events: [], blocks: [], members: [], templates: [], activity: [], notifRead: {},
    timer: null, roadmap: {}, onboarded: false
  };
}
