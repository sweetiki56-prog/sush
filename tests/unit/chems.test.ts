// Chems, food and water: timed effects, addiction and withdrawal, a chem taken mid-fight.
import { describe, it, expect } from 'vitest';
import { boost, playerUnit } from '../../src/core/combat/build';
import { Game } from '../../src/core/Game';
import { DialogueRunner } from '../../src/core/DialogueRunner';
import { newState, plainCharacter } from '../../src/core/state';
import { CONTENT } from '../../src/content';

const MIN = 60_000;

function game(roll = 0.5, items: Record<string, number> = {}) {
  const g = new Game(CONTENT, () => roll, newState(plainCharacter(['guns', 'melee', 'sneak']), CONTENT));
  for (const [k, v] of Object.entries(items)) g.give(k, v);
  return g;
}

describe('chems', () => {
  it('a buff works for a while of play time, then wears off', () => {
    const g = game(0.99, { squint: 1 });
    const hit = g.mod('hit');
    expect(g.consume('squint')).toBe(true);
    expect(g.mod('hit')).toBe(hit + 15);
    expect(playerUnit(g, 0, 0).hit).toBe(hit + 15);
    g.tick(80_000);
    expect(g.mod('hit')).toBe(hit + 15);
    g.tick(20_000);
    expect(g.mod('hit')).toBe(hit);
    expect(g.state.log.at(-1)).toMatch(/действие прошло/);
  });

  it('an unlucky dose hooks you; withdrawal comes without a dose and passes by itself much later', () => {
    const g = game(0.01, { mirage: 2 });
    const ap = g.maxAp;
    g.consume('mirage');
    expect(g.maxAp).toBe(ap + 2);
    expect(Object.keys(g.body.hooked)).toEqual(['mirage']);
    g.tick(2 * MIN); // the effect is gone, no withdrawal yet
    expect(g.maxAp).toBe(ap);
    g.tick(MIN);
    expect(g.withdrawals()).toEqual(['mirage']);
    expect(g.maxAp).toBe(ap - 1);
    g.consume('mirage'); // a dose eases it
    expect(g.withdrawals()).toEqual([]);
    g.tick(20 * MIN);
    expect(g.body.hooked).toEqual({});
  });

  it('a cleanser clears every addiction; plain food heals and drinking a flask leaves the canteen', () => {
    const g = game(0.01, { bonebreaker: 1, cleanse: 1, dried_eel: 1 });
    g.consume('bonebreaker');
    g.tick(5 * MIN);
    expect(g.withdrawals()).toEqual(['bonebreaker']);
    g.consume('cleanse');
    expect(g.withdrawals()).toEqual([]);
    expect(g.consume('dried_eel')).toBe(false); // at full health: no point
    g.state.hp -= 20;
    expect(g.consume('dried_eel')).toBe(true);
    expect(g.state.hp).toBe(g.maxHp - 8);
    g.take('canteen');
    g.give('flask');
    g.state.hp -= 5;
    g.consume('flask');
    expect(g.count('canteen')).toBe(1);
    expect(g.consume('rush')).toBe(false); // fight-only stims wait for a fight
  });

  it('a chem taken in a fight works on the unit at once', () => {
    const g = game(0.99, { mirage: 1 });
    const u = playerUnit(g, 0, 0);
    const [ap, aim] = [u.ap, u.aim];
    g.consume('mirage', true);
    boost(u, CONTENT.items.mirage.buff!.mods);
    expect(u.ap).toBe(ap + 2);
    expect(u.aim).toBe(aim + 1);
    const cool = playerUnit(g, 0, 0);
    boost(cool, CONTENT.items.coolant.buff!.mods);
    expect(cool.res.fire).toBe(50);
  });

  it('the pump fills three flasks a day, one under the Trust seal', () => {
    const g = game();
    g.setFlag('pump_fixed');
    const draw = () => {
      const r = new DialogueRunner(g, CONTENT.dialogues.pump, 'pump');
      const i = r.options().findIndex((o) => o.label.includes('Наполнить'));
      if (i < 0) return false;
      r.choose(i);
      g.consume('flask'); // drink it to get the canteen back
      return true;
    };
    g.state.hp = 1;
    expect([draw(), draw(), draw(), draw()]).toEqual([true, true, true, false]);
    g.setFlag('water_drawn', 0);
    g.setFlag('well_sealed');
    expect([draw(), draw()]).toEqual([true, false]);
  });
});
