// Player preferences, stored apart from the save so a new game keeps them.
import type { KV } from './SaveSystem';
import type { Locale } from '../i18n/content';

export interface Settings {
  /** Display preference only. The room and saves remain language-independent. */
  language: Locale;
  muted: boolean;
  volume: number; // 0..1
  music: number; // 0..1, on top of the volume
  textSpeed: number; // index into TEXT_SPEEDS
  grain: boolean; // film grain + vignette on the world camera
  zoom: number; // default world zoom
  combatFast: boolean;
}

export const TEXT_SPEEDS = [
  { name: 'Медленно', chars: 1 },
  { name: 'Обычно', chars: 3 },
  { name: 'Быстро', chars: 6 },
  { name: 'Сразу', chars: 10_000 },
];

const KEY = 'rusty-well-settings';
// a phone gets the lighter look by default: no film grain (it costs a full-screen pass every frame)
const COARSE = typeof globalThis.matchMedia === 'function' && globalThis.matchMedia('(pointer: coarse)').matches;
const DEFAULTS: Settings = { language: 'en', muted: false, volume: 0.7, music: 0.6, textSpeed: 1, grain: !COARSE, zoom: 2, combatFast: false };

function storage(): KV | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

let current: Settings | null = null;

export function settings(kv: KV | null = storage()): Settings {
  if (current) return current;
  let saved: Partial<Settings> = {};
  try {
    saved = JSON.parse(kv?.getItem(KEY) ?? '{}') as Partial<Settings>;
  } catch {
    /* corrupt: use defaults */
  }
  current = { ...DEFAULTS, ...saved };
  if (!['ru', 'en'].includes(current.language)) current.language = DEFAULTS.language;
  return current;
}

export function updateSettings(patch: Partial<Settings>, kv: KV | null = storage()): Settings {
  current = { ...settings(kv), ...patch };
  try {
    kv?.setItem(KEY, JSON.stringify(current));
  } catch {
    /* play without persisted settings */
  }
  return current;
}

/** Test hook: forget the cached settings. */
export function resetSettingsCache(): void {
  current = null;
}
