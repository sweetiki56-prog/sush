// Arena builds: pick any attributes, level, skills, traits, perks, weapons, armor and a limited kit.
// The limits live in content/arena.json; the server checks every build with validLoadout().
import * as Ch from '../character/Character';
import { ATTRS, LOOKS, MAX_TRAITS, NAME_MAX, SKILLS, SKILL_MAX, XP_TABLE, type Attrs, type CharacterData, type SkillId } from '../character/defs';
import type { Content, GameStateData } from '../types';

export interface Loadout {
  name: string;
  look: number;
  attrs: Attrs;
  level: number;
  skills: Partial<Record<SkillId, number>>; // wanted values; never below what the attributes give
  traits: string[];
  perks: string[];
  weapons: string[]; // weapon ids (fists come free)
  armor: string | null;
  charms: string[]; // up to two
  items: Record<string, number>;
}

/** Weapons you can bring to the arena: guns and blades that come as items. */
export function arenaWeapons(content: Content): string[] {
  return Object.entries(content.weapons)
    .filter(([, w]) => w.item && !w.thrown && (w.skill === 'guns' || w.skill === 'melee'))
    .map(([id]) => id);
}

export function defaultLoadout(): Loadout {
  return {
    name: 'Боец',
    look: 0,
    attrs: { str: 6, per: 6, end: 6, cha: 3, int: 4, agi: 7, luk: 5 },
    level: 3,
    skills: { guns: 70, melee: 50 },
    traits: [],
    perks: [],
    weapons: ['rifle', 'machete'],
    armor: 'jacket',
    charms: [],
    items: { bandage: 2, tincan: 1 },
  };
}

const int = (v: unknown, lo: number, hi: number): number | null => (typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi ? v : null);

/** A clean copy of a build, or null when it breaks the arena rules. */
export function validLoadout(raw: unknown, content: Content): Loadout | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<Loadout>;
  const A = content.arena;
  const name = typeof r.name === 'string' ? r.name.trim().slice(0, NAME_MAX) : '';
  const look = int(r.look, 0, LOOKS - 1);
  const level = int(r.level, 1, A.maxLevel);
  if (!name || look === null || level === null || !r.attrs || typeof r.attrs !== 'object') return null;
  const attrs = {} as Attrs;
  for (const a of ATTRS) {
    const v = int(r.attrs[a], 1, 10);
    if (v === null) return null;
    attrs[a] = v;
  }
  const skills: Partial<Record<SkillId, number>> = {};
  for (const [k, v] of Object.entries(r.skills ?? {})) {
    const n = int(v, 0, SKILL_MAX);
    if (!SKILLS.includes(k as SkillId) || n === null) return null;
    skills[k as SkillId] = n;
  }
  const traits = Array.isArray(r.traits) ? [...new Set(r.traits)] : null;
  const perks = Array.isArray(r.perks) ? [...new Set(r.perks)] : null;
  if (!traits || !perks || traits.length > MAX_TRAITS || perks.length > level - 1) return null;
  if (traits.some((t) => !content.character.traits[t]) || perks.some((p) => !content.character.perks[p])) return null;
  const allowed = arenaWeapons(content);
  const weapons = Array.isArray(r.weapons) ? [...new Set(r.weapons)] : null;
  if (!weapons || weapons.length > A.weapons || weapons.some((w) => !allowed.includes(w))) return null;
  const armor = r.armor ?? null;
  if (armor !== null && !content.armor[armor]) return null;
  const charms = Array.isArray(r.charms) ? [...new Set(r.charms)] : []; // builds shared before charms had none
  if (charms.length > 2 || charms.some((c) => typeof c !== 'string' || !content.charms[c])) return null;
  const items: Record<string, number> = {};
  for (const [k, v] of Object.entries(r.items ?? {})) {
    const n = int(v, 0, A.items[k] ?? -1);
    if (n === null) return null;
    if (n) items[k] = n;
  }
  return { name, look, attrs, level, skills, traits, perks, weapons, armor, charms, items };
}

/** The character sheet a build describes: invested points lift skills to the wanted values. */
export function loadoutCharacter(l: Loadout, content: Content): CharacterData {
  const c: CharacterData = {
    name: l.name,
    look: l.look,
    attrs: { ...l.attrs },
    tags: [],
    traits: [...l.traits],
    perks: [...l.perks],
    level: l.level,
    xp: XP_TABLE[l.level],
    skillPoints: 0,
    perkPoints: 0,
    spent: {},
  };
  for (const s of SKILLS) {
    const base = Ch.skill(c, content.character, s);
    const want = l.skills[s] ?? base;
    if (want > base) c.spent[s] = want - base;
  }
  return c;
}

/** A fresh fighter for a round: full health, the chosen kit, ammo for every gun. */
export function loadoutState(l: Loadout, content: Content, at: { x: number; y: number; dir: number }): GameStateData {
  const character = loadoutCharacter(l, content);
  const items: Record<string, number> = {};
  for (const id of l.weapons) {
    const w = content.weapons[id];
    items[w.item!] = 1;
    if (w.ammo) items[w.ammo] = (items[w.ammo] ?? 0) + content.arena.ammoPerGun;
  }
  if (l.armor) items[l.armor] = 1;
  for (const c of l.charms) items[c] = 1;
  for (const [k, n] of Object.entries(l.items)) items[k] = (items[k] ?? 0) + n;
  return {
    version: 2,
    character,
    hp: Ch.maxHp(character, content.character),
    caps: 0,
    flags: {},
    items,
    equipped: { weapon: l.weapons[0] ?? '', alt: l.weapons[1] ?? '', charms: [...l.charms], ...(l.armor ? { armor: l.armor } : {}) },
    quests: {},
    player: { ...at },
    stats: { playMs: 0, checksPassed: 0, checksFailed: 0, kills: 0 },
    log: [],
  };
}

/** A short text code friends can paste to copy a build. */
export function encodeLoadout(l: Loadout): string {
  const bytes = new TextEncoder().encode(JSON.stringify(l));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeLoadout(code: string, content: Content): Loadout | null {
  try {
    const b64 = code.trim().replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
    const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
    return validLoadout(JSON.parse(new TextDecoder().decode(bytes)), content);
  } catch {
    return null;
  }
}
