import { describe, expect, it } from 'vitest';
import { createsCycle, sanitizeState, DEFAULT_COLOR } from '@/lib/validate';
import { MemoryAdapter, StorageError, StorageService } from '@/lib/storage';
import { escapeHtml } from '@/lib/html';
import { task } from './fixtures';

describe('sanitizeState', () => {
  it('neutralises hostile ids and colours from imported data', () => {
    const { state, report } = sanitizeState({
      projects: [{ id: '"><img src=x onerror=alert(1)>', name: 'P', color: 'red;background:url(x)' }],
      tasks: [{ id: 'ok', title: 'T', projectId: '"><img src=x onerror=alert(1)>' }]
    });
    const p = state.projects[0]!;
    expect(p.id).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
    expect(p.color).toBe(DEFAULT_COLOR);
    expect(state.tasks[0]!.projectId).toBe(p.id);
    expect(report.fixed).toBeGreaterThan(0);
  });
  it('drops dangling references and invalid enums/dates', () => {
    const { state } = sanitizeState({
      tasks: [{ id: 'a', title: 'A', status: 'hacked', priority: 'x', due: 'yarın', deps: ['ghost'], projectId: 'nope' }],
      blocks: [{ id: 'b', taskId: 'ghost', start: '2026-10-05T10:00', end: '2026-10-05T11:00' }]
    });
    const t = state.tasks[0]!;
    expect(t.status).toBe('todo'); expect(t.priority).toBe('medium'); expect(t.due).toBe('');
    expect(t.deps).toEqual([]); expect(t.projectId).toBeNull();
    expect(state.blocks).toHaveLength(0);
  });
  it('cuts dependency cycles', () => {
    const { state } = sanitizeState({ tasks: [{ id: 'a', title: 'A', deps: ['b'] }, { id: 'b', title: 'B', deps: ['a'] }] });
    expect(state.tasks.flatMap(t => t.deps)).toHaveLength(1);
  });
  it('never throws on garbage', () => {
    for (const g of [null, 42, 'x', [], { tasks: 'no' }, { settings: { workStart: 99, workEnd: -1 } }]) expect(() => sanitizeState(g)).not.toThrow();
    const s = sanitizeState({ settings: { workStart: 20, workEnd: 8, maxDaily: 99 } }).state.settings;
    expect(s.workEnd).toBeGreaterThan(s.workStart); expect(s.maxDaily).toBeLessThanOrEqual(s.workEnd - s.workStart);
  });
  it('createsCycle detects indirect cycles', () => {
    const tasks = [task({ id: 'a', deps: ['b'] }), task({ id: 'b', deps: ['c'] }), task({ id: 'c' })];
    expect(createsCycle(tasks, 'c', 'a')).toBe(true);
    expect(createsCycle(tasks, 'a', 'c')).toBe(false);
  });
  it('escapeHtml covers all five characters', () => {
    expect(escapeHtml(`<a href="x" onclick='y'>&</a>`)).toBe('&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;');
  });
});

describe('StorageService', () => {
  it('round-trips and stamps the schema version', async () => {
    const a = new MemoryAdapter(), s = new StorageService(a);
    const { state } = sanitizeState({ tasks: [{ id: 'a', title: 'A' }] });
    await s.save(state);
    expect(JSON.parse(a.value!).schema).toBe(2);
    expect((await s.load()).state!.tasks[0]!.title).toBe('A');
  });
  it('keeps a copy of corrupt data and reports it', async () => {
    const a = new MemoryAdapter('{not json'), s = new StorageService(a);
    await expect(s.load()).rejects.toBeInstanceOf(StorageError);
    expect(a.corrupt).toBe('{not json');
  });
  it('empty storage means first run', async () => {
    expect((await new StorageService(new MemoryAdapter()).load()).state).toBeNull();
  });
});
