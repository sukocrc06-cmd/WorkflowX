/**
 * Snapshot-based undo / redo. Every change is recorded as the state before it, so undo
 * restores exactly what was there. Generic over the state type; capped.
 */
export interface HistoryEntry<T> { id: number; label: string; before: T }
export class History<T> {
  private past: HistoryEntry<T>[] = [];
  private future: HistoryEntry<T>[] = [];
  private seq = 0;
  constructor(private readonly clone: (s: T) => T, private readonly max = 40) {}
  /** Applies `fn` to a copy of `state`; returns the new state and the entry id (null if unchanged). */
  commit(state: T, label: string, fn: (draft: T) => void, equals: (a: T, b: T) => boolean): { state: T; id: number | null } {
    const before = this.clone(state), draft = this.clone(state);
    fn(draft);
    if (equals(before, draft)) return { state, id: null };
    const id = ++this.seq;
    this.past.push({ id, label, before }); if (this.past.length > this.max) this.past.shift();
    this.future = [];
    return { state: draft, id };
  }
  undo(current: T): { state: T; label: string } | null {
    const h = this.past.pop(); if (!h) return null;
    this.future.push({ id: h.id, label: h.label, before: this.clone(current) });
    return { state: h.before, label: h.label };
  }
  redo(current: T): { state: T; label: string } | null {
    const h = this.future.pop(); if (!h) return null;
    this.past.push({ id: h.id, label: h.label, before: this.clone(current) });
    return { state: h.before, label: h.label };
  }
  /** True when `id` is still the latest change — an undo button bound to it is safe. */
  isLatest(id: number): boolean { return this.past[this.past.length - 1]?.id === id; }
  get canUndo(): boolean { return this.past.length > 0; }
  get canRedo(): boolean { return this.future.length > 0; }
}
