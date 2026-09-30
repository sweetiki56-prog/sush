import type { GameStateData } from './types';

const KEY = 'rusty-well-save-v2';
export type Slot = 'main' | 'auto';
const key = (slot: Slot) => `${KEY}:${slot}`;

export interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

function storage(): KV | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // private mode / blocked storage: play without saves
  }
}

export function saveGame(state: GameStateData, kv: KV | null = storage(), slot: Slot = 'main'): boolean {
  try {
    kv?.setItem(key(slot), JSON.stringify(state));
    return !!kv;
  } catch {
    return false;
  }
}

export function loadGame(kv: KV | null = storage(), slot: Slot = 'main'): GameStateData | null {
  try {
    const raw = kv?.getItem(key(slot));
    if (!raw) return null;
    const data = JSON.parse(raw) as GameStateData;
    return data && data.version === 2 ? data : null;
  } catch {
    return null;
  }
}

export function clearSave(kv: KV | null = storage()): void {
  try {
    kv?.removeItem(key('main'));
    kv?.removeItem(key('auto'));
  } catch {
    /* ignore */
  }
}
