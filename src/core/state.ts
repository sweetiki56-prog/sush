// Fresh game state for a character: start HP, caps and kit (plus trait bonuses).
import { maxHp } from './character/Character';
import type { CharacterData } from './character/defs';
import { START_CAPS, START_ITEMS, type Content, type GameStateData } from './types';

export function newState(character: CharacterData, content: Content): GameStateData {
  const c = content.character;
  const traits = character.traits.map((t) => c.traits[t]?.mods ?? {});
  const items = { ...START_ITEMS };
  for (const m of traits) for (const [k, v] of Object.entries(m.items ?? {})) items[k] = (items[k] ?? 0) + v;
  return {
    version: 2,
    character: structuredClone(character),
    hp: maxHp(character, c),
    caps: START_CAPS + traits.reduce((s, m) => s + (m.caps ?? 0), 0),
    flags: {},
    items,
    equipped: { weapon: 'rifle', alt: 'knife' },
    quests: {},
    player: { x: 3, y: 26, dir: 1 },
    stats: { playMs: 0, checksPassed: 0, checksFailed: 0, kills: 0 },
    log: [],
  };
}

/** A plain level-1 wanderer (all attributes 5): used by tests and as a dev fallback. */
export function plainCharacter(tags: CharacterData['tags'] = ['lockpick', 'speech', 'repair']): CharacterData {
  return {
    name: 'Странник',
    look: 0,
    attrs: { str: 5, per: 5, end: 5, cha: 5, int: 5, agi: 5, luk: 5 },
    tags,
    traits: [],
    perks: [],
    level: 1,
    xp: 0,
    skillPoints: 0,
    perkPoints: 0,
    spent: {},
  };
}
