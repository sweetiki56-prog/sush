import { describe, it, expect } from 'vitest';
import { Combat, type CombatEnv } from '../../src/core/combat/Combat';
import { nextAction } from '../../src/core/combat/ai';
import { attackCost, hitChance, rollAttack, rollDamage } from '../../src/core/combat/rules';
import { barrelUnit, creatureUnit, playerUnit } from '../../src/core/combat/build';
import type { Combatant } from '../../src/core/combat/types';
import { Game } from '../../src/core/Game';
import { newState, plainCharacter } from '../../src/core/state';
import { fixedRng } from '../../src/core/rng';
import { lineOfSight } from '../../src/iso/LineOfSight';
import { CONTENT } from '../../src/content';

const W = CONTENT.weapons;
const scorp = (id: string, x: number, y: number) => creatureUnit(CONTENT.creatures.scorpion, id, x, y);
const big = (id: string, x: number, y: number) => creatureUnit(CONTENT.creatures.scorpion_big, id, x, y);

function game(rolls: number[] = [0.5], patch: Partial<ReturnType<typeof plainCharacter>> = {}) {
  const c = { ...plainCharacter(['guns', 'melee', 'sneak']), ...patch };
  return new Game(CONTENT, fixedRng(rolls), newState(c, CONTENT));
}

function env(rng: () => number, walls: string[] = [], ammo = { n: 12 }): CombatEnv {
  const solid = new Set(walls);
  return {
    width: 30,
    height: 30,
    rng,
    blocked: (x, y) => solid.has(`${x},${y}`),
    opaque: (x, y) => solid.has(`${x},${y}`),
    ammo: () => ammo.n,
    spendAmmo: () => void ammo.n--,
  };
}

function fight(units: Combatant[], rolls: number[], walls: string[] = [], ammo = { n: 12 }) {
  const c = new Combat(units, W, env(fixedRng(rolls), walls, ammo));
  c.start();
  return c;
}

describe('combat rules', () => {
  it('to-hit: skill plus bonuses, range penalty past aim, clamped', () => {
    const p = playerUnit(game(), 0, 0); // guns 45 (tag), aim 2 + 3 = 5
    const s = scorp('s', 0, 0);
    expect(hitChance(p, s, W.rifle, 5)).toBe(45);
    expect(hitChance(p, s, W.rifle, 10)).toBe(25);
    expect(hitChance(p, s, W.rifle, 15)).toBe(0); // out of range
    expect(hitChance(p, barrelUnit('b', 0, 0), W.rifle, 5)).toBe(55);
    expect(hitChance({ ...p, skills: { guns: 300, melee: 0 } }, s, W.rifle, 1)).toBe(95);
    expect(hitChance(p, s, W.knife, 2)).toBe(0);
  });

  it('damage: roll, melee bonus, crit doubles, DR cuts, at least 1', () => {
    const p = { ...playerUnit(game(), 0, 0), meleeDmg: 2 };
    expect(rollDamage(p, scorp('s', 0, 0), W.knife, false, () => 0)).toBe(6); // 4 + 2
    expect(rollDamage(p, scorp('s', 0, 0), W.knife, true, () => 0.999)).toBe(20); // (8 + 2) x 2
    expect(rollDamage(p, big('b', 0, 0), W.rifle, false, () => 0)).toBe(7); // 8 x 0.9
    expect(rollDamage(p, { ...scorp('s', 0, 0), dr: 99 }, W.fists, false, () => 0)).toBe(1);
  });

  it('attack rolls: crit under crit chance, fumbles at the top (earlier when jinxed)', () => {
    expect(rollAttack(60, 5, false, () => 0.03)).toMatchObject({ roll: 4, hit: true, crit: true });
    expect(rollAttack(60, 5, false, () => 0.96)).toMatchObject({ roll: 97, hit: false, fumble: false });
    expect(rollAttack(60, 5, true, () => 0.96)).toMatchObject({ roll: 97, hit: false, fumble: true });
    expect(rollAttack(60, 5, false, () => 0.99)).toMatchObject({ fumble: true });
  });

  it('AP cost honours perks and traits but never drops below 2', () => {
    const p = playerUnit(game(), 0, 0);
    expect(attackCost(p, W.rifle)).toBe(5);
    expect(attackCost({ ...p, attackAp: -2 }, W.rifle)).toBe(3);
    expect(attackCost({ ...p, attackAp: -5 }, W.knife)).toBe(2);
  });

  it('line of sight is blocked by walls between, not at the ends', () => {
    const blocked = (x: number, y: number) => x === 2 && y === 0;
    expect(lineOfSight(blocked, { x: 0, y: 0 }, { x: 4, y: 0 })).toBe(false);
    expect(lineOfSight(blocked, { x: 0, y: 0 }, { x: 2, y: 0 })).toBe(true);
    expect(lineOfSight(blocked, { x: 0, y: 1 }, { x: 4, y: 1 })).toBe(true);
  });
});

describe('combat flow', () => {
  it('orders turns by sequence; the player wins ties', () => {
    const p = { ...playerUnit(game(), 0, 0), seq: 8 };
    const c = fight([scorp('a', 5, 5), p, big('b', 6, 6)], [0.5]);
    expect(c.turnOrder.map((u) => u.id)).toEqual(['b', 'player', 'a']);
    expect(c.current.id).toBe('b');
  });

  it('moving costs 1 AP per tile and stops when AP runs out', () => {
    const p = playerUnit(game(), 0, 0);
    const c = fight([p, scorp('s', 20, 20)], [0.5]);
    const path = Array.from({ length: 10 }, (_, i) => ({ x: i + 1, y: 0 }));
    const ev = c.move(path);
    expect(ev[0]).toMatchObject({ t: 'move' });
    expect(p).toMatchObject({ x: 7, y: 0, ap: 0 });
    expect(c.move([{ x: 8, y: 0 }])).toEqual([]);
  });

  it('shooting spends AP and ammo; refuses when blind, broke or out of rounds', () => {
    const ammo = { n: 1 };
    const p = playerUnit(game(), 0, 0);
    const c = fight([p, big('s', 3, 0)], [0.0, 0.0], ['9,9'], ammo);
    const ev = c.attack('s');
    expect(ev[0]).toMatchObject({ t: 'attack', hit: true });
    expect(p.ap).toBe(2);
    expect(ammo.n).toBe(0);
    p.ap = 7;
    expect(c.attack('s')).toEqual([{ t: 'log', text: 'Нет патронов.' }]);
    const blind = fight([playerUnit(game(), 0, 0), scorp('s', 4, 0)], [0], ['2,0']);
    expect(blind.attack('s')).toEqual([{ t: 'log', text: 'Не видно цели.' }]);
  });

  it('killing the last foe is a victory', () => {
    const p = playerUnit(game(), 0, 0);
    const s = { ...scorp('s', 2, 0), hp: 1 };
    const c = fight([p, s], [0.0, 0.0]);
    const ev = c.attack('s');
    expect(ev.map((e) => e.t)).toEqual(['attack', 'damage', 'death']);
    expect(c.endTurn()).toEqual([{ t: 'end', outcome: 'victory' }]);
  });

  it('a hit barrel explodes and hurts everyone around, chaining', () => {
    const p = playerUnit(game(), 0, 0);
    const c = fight([p, barrelUnit('b1', 6, 0), barrelUnit('b2', 8, 0), scorp('s', 9, 0), big('far', 20, 0)], [0.0, 0.0, 0.99, 0.99]);
    const ev = c.attack('b1');
    expect(ev.filter((e) => e.t === 'explode').map((e) => (e as { id: string }).id)).toEqual(['b1', 'b2']);
    expect(c.unit('s')!.dead).toBe(true);
    expect(c.unit('far')!.hp).toBe(CONTENT.creatures.scorpion_big.hp);
  });

  it('stings poison unless saved; poison ticks at turn start', () => {
    const p = { ...playerUnit(game(), 0, 0), poisonSave: 0, seq: 1 };
    const s = { ...scorp('s', 1, 0), weapon: 'sting' };
    const c = fight([p, s], [0.0, 0.0, 0.5]);
    expect(c.current.id).toBe('s');
    const ev = c.attack('player');
    expect(ev.some((e) => e.t === 'poisoned')).toBe(true);
    const hp = p.hp;
    const turn = c.endTurn();
    expect(turn[0]).toEqual({ t: 'turn', id: 'player' });
    expect(p.hp).toBe(hp - 2);
    expect(p.poison).toBe(2);
    const immune = { ...playerUnit(game(), 0, 0), poisonSave: 100, seq: 1 };
    const c2 = fight([immune, { ...scorp('s', 1, 0), weapon: 'sting' }], [0.0, 0.0, 0.99]);
    expect(c2.attack('player').some((e) => e.t === 'poisoned')).toBe(false);
  });

  it('a fumble ends the turn', () => {
    const p = playerUnit(game(), 0, 0);
    const c = fight([p, scorp('s', 3, 0)], [0.995]);
    const ev = c.attack('s');
    expect(ev[0]).toMatchObject({ fumble: true });
    expect(p.ap).toBe(0);
  });

  it('far away and out of sight once the other side had its turn: escape', () => {
    const p = playerUnit(game(), 0, 0);
    const c = fight([p, scorp('s', 15, 0)], [0.5], ['1,0', '1,1', '0,1']);
    expect(c.endTurn().at(-1)).toEqual({ t: 'turn', id: 's' }); // a fight never ends before it began
    c.endTurn(); // the scorpion's turn: back to us, round 2
    expect(c.endTurn().at(-1)).toEqual({ t: 'end', outcome: 'escape' });
  });

  it('bandages heal for item AP', () => {
    const p = { ...playerUnit(game(), 0, 0), hp: 10 };
    const c = fight([p, scorp('s', 9, 9)], [0.5]);
    expect(c.heal(12)).toEqual([{ t: 'heal', id: 'player', amount: 12, hp: 22 }]);
    expect(p.ap).toBe(p.maxAp - 2);
  });
});

describe('monster AI', () => {
  it('closes in, then strikes with the strongest affordable weapon', () => {
    const p = { ...playerUnit(game(), 0, 0), seq: 1 };
    const s = big('s', 3, 0); // 6 AP
    const c = fight([p, s], [0.5]);
    const a = nextAction(c, s);
    expect(a.kind).toBe('move');
    c.move((a as { path: { x: number; y: number }[] }).path);
    expect(Math.max(Math.abs(s.x), Math.abs(s.y))).toBe(1);
    expect(nextAction(c, s)).toEqual({ kind: 'attack', target: 'player', weapon: 'sting' }); // 4 AP left: sting hits harder
    c.attack('player');
    expect(nextAction(c, s)).toEqual({ kind: 'end' }); // 0 AP
    const small = scorp('m', 3, 0); // 5 AP: 2 to close in, 3 left
    const c3 = fight([{ ...playerUnit(game(), 0, 0), seq: 1 }, small], [0.5]);
    c3.move((nextAction(c3, small) as { path: { x: number; y: number }[] }).path);
    expect(nextAction(c3, small)).toEqual({ kind: 'attack', target: 'player', weapon: 'claw' }); // sting (4) unaffordable
    const far = scorp('f', 5, 0);
    const c2 = fight([{ ...playerUnit(game(), 0, 0), seq: 1 }, far], [0.5]);
    c2.move((nextAction(c2, far) as { path: { x: number; y: number }[] }).path);
    expect(nextAction(c2, far)).toEqual({ kind: 'end' }); // 1 AP left, adjacent, nothing affordable
  });

  it('flees when badly hurt', () => {
    const p = { ...playerUnit(game(), 0, 0), seq: 1 };
    const s = { ...scorp('s', 2, 0), hp: 2 };
    const c = fight([p, s], [0.5]);
    const a = nextAction(c, s);
    expect(a.kind).toBe('move');
    expect(s.fleeing).toBe(true);
    c.move((a as { path: { x: number; y: number }[] }).path);
    expect(s.x).toBeGreaterThan(2);
  });

  it('an ally under AI goes for the foes, never the players; the fight is won when only our side stands', () => {
    const p = playerUnit(game(), 0, 0);
    const guard = { ...creatureUnit(CONTENT.creatures.caravan_guard, 'guard', 5, 5), team: 'player' };
    const s = scorp('s', 7, 5);
    const c = fight([p, guard, s], [0.5]);
    expect(nextAction(c, guard)).toMatchObject({ kind: 'attack', target: 's' });
    // the scorpion takes whoever is nearest on our side: the guard
    const a = nextAction(c, s);
    expect(a.kind === 'attack' ? a.target : a.kind === 'move' ? 'move' : 'end').not.toBe('end');
    s.dead = true;
    expect(c.checkOutcome()).toEqual([{ t: 'end', outcome: 'victory' }]);
  });
});
