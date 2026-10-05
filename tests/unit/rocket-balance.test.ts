import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../src/content';
import { premadeGame, toLevel, placedBattle } from './sim';
import { TOWNS } from './rooms';

describe('Sanctuary rewards', () => {
  it('keeps the Fang below the Chapter V machete and the collar below combat charms', () => {
    const fang = CONTENT.weapons.rocket_fang;
    const machete = CONTENT.weapons.machete;
    expect(fang.ap).toBe(machete.ap);
    expect(fang.dmg[0]).toBeLessThan(machete.dmg[0]);
    expect(fang.dmg[1]).toBeLessThan(machete.dmg[1]);
    expect(CONTENT.charms.rocket_collar.attrs?.per).toBe(1);
    expect(CONTENT.charms.rocket_collar.ap ?? 0).toBe(0);
    expect(CONTENT.items.rocket_water.value).toBe(0);
  });

  it('does not outperform the machete in seeded checkpoint fights', () => {
    const wins: Record<string, number> = { rocket_fang: 0, machete: 0 };
    for (const weapon of ['rocket_fang', 'machete'] as const)
      for (let seed = 1; seed <= 40; seed++) {
        const g = toLevel(premadeGame('Механик', seed), 6);
        g.state.items = { [weapon]: 1 };
        g.equip('weapon', weapon);
        if (placedBattle(g, TOWNS.rocket_outpost, [11, 20], [['rocket_guard', 11, 18]]) === 'victory') wins[weapon]++;
      }
    expect(wins.machete).toBeGreaterThan(0);
    expect(wins.rocket_fang).toBeLessThanOrEqual(wins.machete);
  }, 180_000);
});
