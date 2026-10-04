import type { AppState } from '@/types/domain';
import { sanitizeState, type SanitizeReport } from './validate';

/**
 * Persistence contract. The prototype uses LocalStorageAdapter; the backend phase
 * adds a SupabaseAdapter with the same shape — UI code only ever sees StorageService.
 */
export interface StorageAdapter {
  load(): Promise<string | null>;
  save(serialised: string): Promise<void>;
  keepCorrupt?(raw: string): Promise<void>;
  reset(): Promise<void>;
}
export type StorageErrorCode = 'unavailable' | 'corrupt' | 'quota';
export class StorageError extends Error {
  constructor(public readonly code: StorageErrorCode, options?: { cause?: unknown }) { super(code, options); this.name = 'StorageError'; }
}
export const SCHEMA_VERSION = 2;

export class StorageService {
  constructor(private readonly adapter: StorageAdapter) {}
  async load(): Promise<{ state: AppState | null; report: SanitizeReport | null }> {
    let raw: string | null;
    try { raw = await this.adapter.load(); } catch (cause) { throw new StorageError('unavailable', { cause }); }
    if (raw == null || raw === '') return { state: null, report: null };
    let data: unknown;
    try { data = JSON.parse(raw); } catch (cause) { await this.adapter.keepCorrupt?.(raw); throw new StorageError('corrupt', { cause }); }
    if (typeof data !== 'object' || data === null || Array.isArray(data)) { await this.adapter.keepCorrupt?.(raw); throw new StorageError('corrupt'); }
    return sanitizeState(data);
  }
  async save(state: AppState): Promise<void> {
    try { await this.adapter.save(JSON.stringify({ ...state, schema: SCHEMA_VERSION })); }
    catch (cause) { throw new StorageError('quota', { cause }); }
  }
  reset(): Promise<void> { return this.adapter.reset(); }
}

export class LocalStorageAdapter implements StorageAdapter {
  constructor(private readonly key = 'workflowx.v1', private readonly store: Storage = globalThis.localStorage) {}
  async load() { return this.store.getItem(this.key); }
  async save(s: string) { this.store.setItem(this.key, s); }
  async keepCorrupt(raw: string) { try { this.store.setItem(this.key + '.corrupt', raw); } catch { /* storage full — nothing else to do */ } }
  async reset() { this.store.removeItem(this.key); }
}
/** In-memory adapter for tests and server rendering (no browser storage on the server). */
export class MemoryAdapter implements StorageAdapter {
  constructor(public value: string | null = null) {}
  corrupt: string | null = null;
  async load() { return this.value; }
  async save(s: string) { this.value = s; }
  async keepCorrupt(raw: string) { this.corrupt = raw; }
  async reset() { this.value = null; }
}
