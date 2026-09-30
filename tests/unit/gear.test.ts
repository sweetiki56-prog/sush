import { describe, it, expect } from 'vitest';
import { Combat, type CombatEnv } from '../../src/core/combat/Combat';
import { nextAction } from '../../src/core/combat/ai';
import { armorCut, rollDamage } from '../../src/core/combat/rules';
import { creatureUnit, playerUnit } from '../../src/core/combat/build';
import type { Combatant } from '../../src/core/combat/types';
import { Game } from '../../src/core/Game';
import { newState, plainCharacter } from '../../src/core/state';
import { fixedRng } from '../../src/core/rng';
import { CONTENT } from '../../src/content';

const W = CONTENT.weapons;

function game(items: Record<string, number> = {}) {
  const g = new Game(CONTENT, fixedRng([0.5]), newState(plainCharacter(['guns', 'melee', 'sneak']), CONTENT));
  for (const [k, v] of Object.entries(items)) g.give(k, v);
  return g;
}

function env(rng: () => number, bag: Record<string, number> = { ammo: 30, tincan: 2 }): CombatEnv {
  return { width: 30, height: 30, rng, blocked: () => false, opaque: () => false, ammo: (it) => bag[it] ?? 0, spendAmmo: (it) => void (bag[it] = (bag[it] ?? 0) - 1) };
}

function person(id: string, x: number, y: number, team?: string, patch: Partial<Combatant> = {}): Combatant {
  return { ...playerUnit(game(), x, y, id), team, ...patch };
}

describe('armor', () => {
  it('threshold bites first, resistance takes a share, pierce ignores threshold', () => {
    expect(armorCut(10, { dt: 3, dr: 50 })).toBe(4); // (10 - 3) * 0.5 = 3.5 -> 4
    expect(armorCut(10, { dt: 3, dr: 50 }, 4)).toBe(5);
    expect(armorCut(2, { dt: 7, dr: 45 })).toBe(1); // never below 1
    const p = person('a', 0, 0);
    const tank = person('b', 1, 0, undefined, { dt: 5, dr: 40 });
    expect(rollDamage(p, tank, W.sparker, false, () => 0)).toBe(Math.round((9 - 1) * 0.6)); // pierce 4 of 5
  });

  it('worn armor goes into the combat unit and the sheet', () => {
    const g = game({ exo: 1 });
    const apBefore = g.maxAp;
    const sneakBefore = g.skill('sneak');
    expect(g.equip('armor', 'exo')).toBe(true);
    expect(g.maxAp).toBe(apBefore - 1);
    expect(g.skill('sneak')).toBe(Math.max(0, sneakBefore - 50));
    const u = playerUnit(g, 0, 0);
    expect(u).toMatchObject({ dt: 7, dr: 45, maxAp: apBefore - 1 });
    expect(g.equip('armor', 'vest')).toBe(false); // not in the bag
    g.equip('armor', null);
    expect(playerUnit(g, 0, 0).dt).toBe(0);
  });
});

describe('gear slots', () => {
  it('two weapons in hand go to the fight, not the whole bag; hands swap', () => {
    const g = game({ shotgun: 1, machete: 1 });
    expect(g.hands()).toEqual(['rifle', 'knife']);
    expect(playerUnit(g, 0, 0).weapons).toEqual(['rifle', 'knife', 'fists']);
    expect(g.equip('alt', 'shotgun')).toBe(true);
    expect(g.hands()).toEqual(['rifle', 'shotgun']);
    expect(g.equip('weapon', 'shotgun')).toBe(true); // from the other hand: they swap
    expect(g.hands()).toEqual(['shotgun', 'rifle']);
    expect(g.equip('alt', null)).toBe(true);
    expect(playerUnit(g, 0, 0).weapons).toEqual(['shotgun', 'fists']);
    expect(g.equip('weapon', 'bandage')).toBe(false);
    g.take('shotgun');
    expect(g.hands()).toEqual([]); // sold or handed over: the hand is empty
  });

  it('an old save without hand 2 picks another weapon from the bag; a fight swap leads with it', () => {
    const g = game();
    g.state.equipped = { weapon: 'rifle' };
    expect(g.hands()).toEqual(['rifle', 'knife']);
    g.setActive('knife');
    expect(g.state.equipped).toMatchObject({ weapon: 'knife', alt: 'rifle' });
    g.setActive('fists');
    expect(g.state.equipped).toMatchObject({ weapon: 'knife', alt: 'rifle' });
  });

  it('charms: two places, their mods reach skills, crit and resistances', () => {
    const g = game({ venom_ward: 1, lucky_nut: 1, jacket: 1 });
    const crit = g.crit;
    expect(g.equip('charm', 'venom_ward')).toBe(true);
    expect(g.equip('charm', 'lucky_nut')).toBe(true);
    expect(g.crit).toBe(crit + 5);
    expect(g.res.poison).toBe(50);
    const u = playerUnit(g, 0, 0);
    expect(u.res.poison).toBe(50);
    expect(u.crit).toBe(crit + 5);
    g.give('resin'); // not a charm
    expect(g.equip('charm', 'resin')).toBe(false);
    expect(g.equip('charm', 'venom_ward')).toBe(true); // off again
    expect(g.res.poison).toBeUndefined();
  });
});

describe('arena weapons', () => {
  it('a burst fires three rounds, each a little worse, and spends three rounds of ammo', () => {
    const bag = { ammo: 10 };
    const a = person('a', 0, 0, 'a', { weapons: ['rattler'], weapon: 'rattler', skills: { guns: 60, melee: 0 } });
    const b = person('b', 3, 0, 'b', { hp: 200, maxHp: 200 });
    const c = new Combat([a, b], W, env(fixedRng([0.5]), bag));
    c.start();
    const shots = c.attack('b').filter((e) => e.t === 'attack');
    expect(shots).toHaveLength(3);
    expect(shots.map((s) => (s.t === 'attack' ? s.chance : 0))).toEqual([60, 50, 40]);
    expect(bag.ammo).toBe(7);
  });

  it('a grenade lands on its tile (or scatters on a miss) and hurts everyone around', () => {
    const bag = { tincan: 1 };
    const a = person('a', 0, 0, 'a', { skills: { guns: 90, melee: 0 } });
    const b = person('b', 6, 0, 'b');
    const d = person('d', 7, 1, 'd');
    const c = new Combat([a, b, d], W, env(fixedRng([0.1, 0.5]), bag));
    c.start();
    const ev = c.throwAt('tincan', { x: 6, y: 0 });
    expect(ev[0]).toMatchObject({ t: 'throw', x: 6, y: 0, hit: true });
    expect(ev.some((e) => e.t === 'explode')).toBe(true);
    expect(ev.filter((e) => e.t === 'damage').map((e) => (e.t === 'damage' ? e.id : ''))).toEqual(['b', 'd']);
    expect(bag.tincan).toBe(0);
    expect(c.throwAt('tincan', { x: 6, y: 0 })).toEqual([{ t: 'log', text: 'Нечего бросать.' }]);
  });

  it('stims: extra AP now, resistance that wears off after three turns', () => {
    const a = person('a', 0, 0, 'a', { seq: 20 });
    const b = person('b', 9, 9, 'b');
    const c = new Combat([a, b], W, env(fixedRng([0.5])));
    c.start();
    const ap = a.ap;
    c.consume('rush', { ap: 3 });
    expect(a.ap).toBe(ap - 2 + 3);
    const dr = a.dr;
    c.consume('hardbrew', { dr: 25, turns: 3 });
    expect(a.dr).toBe(dr + 25);
    for (let n = 0; n < 6; n++) c.endTurn(); // a, b, a, b, a, b ... three turns of a start
    expect(a.dr).toBe(dr);
    expect(a.buff).toBeNull();
  });
});

describe('free-for-all', () => {
  it('ends when one team is left and names the winner', () => {
    const a = person('a', 0, 0, 'a', { seq: 20 });
    const b = person('b', 1, 0, 'b', { hp: 1 });
    const d = person('d', 5, 5, 'd', { hp: 1 });
    const c = new Combat([a, b, d], W, env(fixedRng([0.0])));
    c.start();
    b.dead = true;
    expect(c.checkOutcome()).toEqual([]);
    d.dead = true;
    expect(c.checkOutcome()).toEqual([{ t: 'end', outcome: 'victory' }]);
    expect(c.winner).toBe('a');
  });

  it('people on one team cannot hurt each other; monsters go for the nearest person', () => {
    const a = person('a', 0, 0);
    const b = person('b', 1, 0);
    const s = creatureUnit(CONTENT.creatures.scorpion, 's', 10, 1);
    const c = new Combat([s, a, b], W, env(fixedRng([0.5])));
    c.start();
    expect(c.preview(a, b).reason).toBe('Цель недоступна.');
    const act = nextAction(c, s);
    expect(act.kind).toBe('move');
    if (act.kind === 'move') expect(act.path.at(-1)!.x).toBeGreaterThan(1); // toward b, the nearer one
  });
});
