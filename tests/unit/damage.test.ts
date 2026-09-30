// Damage types, resistances, weapons made for one kind of foe, and what hits leave behind.
import { describe, it, expect } from 'vitest';
import { Combat } from '../../src/core/combat/Combat';
import { hitChance, resist, rollDamage, typeCut } from '../../src/core/combat/rules';
import { creatureUnit, playerUnit } from '../../src/core/combat/build';
import type { Combatant, WeaponDef } from '../../src/core/combat/types';
import { Game } from '../../src/core/Game';
import { newState, plainCharacter } from '../../src/core/state';
import { fixedRng } from '../../src/core/rng';
import { CONTENT } from '../../src/content';

const C = CONTENT.creatures;
const hero = () => playerUnit(new Game(CONTENT, fixedRng([0.5]), newState(plainCharacter(['guns', 'melee', 'sneak']), CONTENT)), 0, 0);
const spear: WeaponDef = { name: 'Жнецобой', skill: 'melee', ap: 4, dmg: [10, 10], range: 2, bane: { tag: 'scorpion', dmg: 2, hit: 15 } };
const torch: WeaponDef = { name: 'Факел', skill: 'melee', ap: 3, dmg: [10, 10], range: 1, type: 'fire', burn: { dmg: 4, turns: 2 } };
const hose: WeaponDef = { name: 'Шланг', skill: 'melee', ap: 3, dmg: [10, 10], range: 1, type: 'wet' };
const bat: WeaponDef = { name: 'Дубина', skill: 'melee', ap: 3, dmg: [5, 5], range: 1, stun: { chance: 100, ap: 3 } };
const flamer: WeaponDef = { name: 'Огнемёт', skill: 'guns', ap: 5, dmg: [10, 10], range: 5, type: 'fire', splash: 1 };

function arena(units: Combatant[], weapons: Record<string, WeaponDef>, rolls = [0.01]) {
  const c = new Combat(units, { ...CONTENT.weapons, ...weapons }, {
    width: 20,
    height: 20,
    rng: fixedRng(rolls),
    blocked: () => false,
    opaque: () => false,
    ammo: () => 99,
    spendAmmo: () => {},
  });
  c.start();
  return c;
}

describe('damage types', () => {
  it('scorpions burn easier and shrug off poison; only the salt-born mind fresh water', () => {
    const s = creatureUnit(C.scorpion, 's', 0, 0);
    expect(typeCut(10, s, 'fire')).toBe(13);
    expect(typeCut(10, s, 'poison')).toBe(0);
    expect(typeCut(10, s, 'wet')).toBe(0);
    expect(typeCut(10, { res: { wet: -100 } }, 'wet')).toBe(20);
    expect(resist(hero(), 'fire')).toBe(0);
    expect(typeCut(10, hero(), 'normal')).toBe(10);
  });

  it('a bane weapon hits its kind harder and surer', () => {
    const p = hero();
    const s = creatureUnit(C.scorpion, 's', 1, 0);
    const man = creatureUnit(C.collector, 'm', 1, 0);
    man.dt = 0;
    man.dr = 0;
    const rng = () => 0.5;
    expect(rollDamage(p, s, spear, false, rng)).toBe(2 * rollDamage(p, man, spear, false, rng));
    expect(hitChance(p, s, spear, 1) - hitChance(p, man, spear, 1)).toBe(15);
  });

  it('fire keeps burning at the start of the target’s turns; water puts it out', () => {
    const p = { ...hero(), seq: 99, ap: 10, maxAp: 10 };
    const s = { ...creatureUnit(C.scorpion, 's', 1, 0), hp: 50, maxHp: 50 };
    const c = arena([p, s], { torch, hose });
    p.weapons = ['torch', 'hose'];
    p.weapon = 'torch';
    const ev = c.attack('s');
    expect(ev.some((e) => e.t === 'burning')).toBe(true);
    expect(s.burn).toBe(2);
    const before = s.hp;
    const turn = c.endTurn(); // the scorpion's turn starts on fire
    expect(turn.some((e) => e.t === 'damage' && e.id === 's')).toBe(true);
    expect(s.hp).toBe(before - typeCut(4, s, 'fire'));
    expect(s.burn).toBe(1);
    s.burn = 2;
    c.endTurn();
    while (c.current.id !== p.id) c.endTurn();
    p.weapon = 'hose';
    p.ap = 10;
    c.attack('s');
    expect(s.burn).toBe(0);
  });

  it('a stun takes AP off the next turn', () => {
    const p = { ...hero(), seq: 99 };
    const s = { ...creatureUnit(C.scorpion, 's', 1, 0), hp: 50, maxHp: 50 };
    const c = arena([p, s], { bat });
    p.weapons = ['bat'];
    p.weapon = 'bat';
    expect(c.attack('s').some((e) => e.t === 'stunned')).toBe(true);
    c.endTurn();
    expect(c.current.id).toBe('s');
    expect(s.ap).toBe(s.maxAp - 3);
  });

  it('a flamer catches whoever stands next to its target', () => {
    const p = { ...hero(), seq: 99 };
    const a = { ...creatureUnit(C.scorpion, 'a', 3, 0), hp: 50, maxHp: 50 };
    const b = { ...creatureUnit(C.scorpion, 'b', 4, 0), hp: 50, maxHp: 50 };
    const far = { ...creatureUnit(C.scorpion, 'far', 8, 0), hp: 50, maxHp: 50 };
    const c = arena([p, a, b, far], { flamer });
    p.weapons = ['flamer'];
    p.weapon = 'flamer';
    c.attack('a');
    expect(a.hp).toBeLessThan(50);
    expect(b.hp).toBeLessThan(50);
    expect(far.hp).toBe(50);
  });

  it('people can be poisoned now; poison-proof hides cannot', () => {
    const p = { ...hero(), seq: 99 };
    const man = { ...creatureUnit(C.collector, 'm', 1, 0), hp: 50, maxHp: 50 };
    const knife: WeaponDef = { name: 'Нож', skill: 'melee', ap: 3, dmg: [4, 4], range: 1, poison: { dmg: 3, turns: 3 } };
    const c = arena([p, man], { knife }, [0.01, 0.99]);
    p.weapons = ['knife'];
    p.weapon = 'knife';
    c.attack('m');
    expect(man.poison).toBe(3);
    expect(man.poisonDmg).toBe(3);
  });
});
