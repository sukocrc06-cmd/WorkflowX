export const ID_RX = /^[A-Za-z0-9_-]{1,64}$/;
export const isSafeId = (v: unknown): v is string => typeof v === 'string' && ID_RX.test(v);
export const newId = (): string =>
  typeof globalThis.crypto?.randomUUID === 'function' ? globalThis.crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
