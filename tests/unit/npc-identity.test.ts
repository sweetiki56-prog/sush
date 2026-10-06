import { describe, expect, it } from 'vitest';
import { npcIdentityForActor } from '../../src/core/room/NpcIdentity';
import type { MapData } from '../../src/world/MapData';

const actor = (id: string, dialogue: string, npcId?: string) => ({ id, dialogue, npcId, sheet: 'farmer', x: 1, y: 1, dir: 0 });
const map = (id: string, actors: ReturnType<typeof actor>[]) => ({ id, actors }) as MapData;

describe('physical NPC identity', () => {
  it('keeps two people with one generic talk and two town cats distinct', () => {
    const a = actor('guard_a', 'guard');
    const b = actor('guard_b', 'guard');
    const townCat = actor('town_cat', 'street_cat');
    const one = map('town_one', [a, b, townCat]);
    const two = map('town_two', [actor('town_cat', 'street_cat')]);
    expect(npcIdentityForActor(a, 'town_one', [one, two], 'guard')).toBe('town_one:guard_a');
    expect(npcIdentityForActor(b, 'town_one', [one, two], 'guard')).toBe('town_one:guard_b');
    expect(npcIdentityForActor(townCat, 'town_one', [one, two], 'street_cat')).toBe('town_one:town_cat');
    expect(npcIdentityForActor(two.actors[0], 'town_two', [one, two], 'street_cat')).toBe('town_two:town_cat');
  });

  it('uses authored aliases for alternate bodies of the same named person', () => {
    const original = actor('bugai', 'bugai');
    const clean = actor('bugai_clean', 'bugai', 'bugai');
    const town = map('three_pillars', [original, clean]);
    expect(npcIdentityForActor(original, 'three_pillars', [town], 'bugai')).toBe('bugai');
    expect(npcIdentityForActor(clean, 'three_pillars', [town], 'bugai')).toBe('bugai');
  });
});
