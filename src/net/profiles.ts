// What this browser remembers for online play: the co-op character, the arena build and five presets.
import type { CharacterData } from '../core/character/defs';
import { validCharacter } from '../core/room/validate';
import { defaultLoadout, validLoadout, type Loadout } from '../core/room/loadout';
import { CONTENT } from '../content';

const COOP = 'rusty-well-coop-char';
const LOADOUT = 'rusty-well-loadout';
const PRESETS = 'rusty-well-presets';
export const PRESET_SLOTS = 5;

function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key: string, v: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* private mode: keep it for this visit only */
  }
}

export function coopCharacter(): CharacterData | null {
  return validCharacter(read(COOP), CONTENT.character);
}

export function saveCoopCharacter(c: CharacterData): void {
  write(COOP, c);
}

export function currentLoadout(): Loadout {
  return validLoadout(read(LOADOUT), CONTENT) ?? defaultLoadout();
}

export function saveLoadout(l: Loadout): void {
  write(LOADOUT, l);
}

export function presets(): (Loadout | null)[] {
  const raw = read(PRESETS);
  const list = Array.isArray(raw) ? raw : [];
  return Array.from({ length: PRESET_SLOTS }, (_, i) => validLoadout(list[i], CONTENT));
}

export function savePreset(i: number, l: Loadout): void {
  const list = presets();
  list[i] = l;
  write(PRESETS, list);
}
