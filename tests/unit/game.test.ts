import { describe, it, expect } from 'vitest';
import { Game } from '../../src/core/Game';
import { fixedRng } from '../../src/core/rng';
import { checkChance, rollCheck } from '../../src/core/SkillCheck';
import { saveGame, loadGame, type KV } from '../../src/core/SaveSystem';
import { CONTENT } from '../../src/content';

const memKV = (): KV => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};

describe('SkillCheck', () => {
  it('clamps chance to 5..95', () => {
    expect(checkChance(200)).toBe(95);
    expect(checkChance(-50)).toBe(5);
    expect(checkChance(45, 10)).toBe(55);
  });
  it('rolls d100 under the chance', () => {
    expect(rollCheck(50, 0, () => 0.49).success).toBe(true); // roll 50
    expect(rollCheck(50, 0, () => 0.5).success).toBe(false); // roll 51
  });
});

describe('Game', () => {
  it('evaluates conditions', () => {
    const g = new Game(CONTENT);
    expect(g.test({ flag: 'x' })).toBe(false);
    g.setFlag('x', 3);
    expect(g.test({ flag: 'x', gte: 3 })).toBe(true);
    expect(g.test({ flag: 'x', lt: 3 })).toBe(false);
    expect(g.test({ flag: 'missing', lt: 2 })).toBe(true);
    expect(g.test({ item: 'canteen' })).toBe(true);
    expect(g.test({ caps: 13 })).toBe(false);
  });

  it('moves quests forward only', () => {
    const g = new Game(CONTENT);
    expect(g.setStage('water', 'get_valve')).toBe(true);
    expect(g.setStage('water', 'find_station')).toBe(false);
    expect(g.stage('water')).toBe('get_valve');
    expect(g.journal('water').map((j) => j.done)).toEqual([true, true, false]);
  });

  it('applies effects and never drops hp below 1', () => {
    const g = new Game(CONTENT);
    g.apply([{ type: 'caps', amount: -100 }, { type: 'hp', amount: -100 }, { type: 'give', item: 'key' }, { type: 'inc', key: 'n' }, { type: 'inc', key: 'n' }]);
    expect(g.state.caps).toBe(0);
    expect(g.state.hp).toBe(1);
    expect(g.count('key')).toBe(1);
    expect(g.flag('n')).toBe(2);
  });

  it('saves and loads state', () => {
    const kv = memKV();
    const g = new Game(CONTENT);
    g.give('valve');
    g.setFlag('door_open');
    expect(saveGame(g.state, kv)).toBe(true);
    const loaded = loadGame(kv)!;
    expect(loaded.items.valve).toBe(1);
    expect(loaded.flags.door_open).toBe(true);
  });

  it('logs checks and tracks stats', () => {
    const g = new Game(CONTENT, fixedRng([0.0, 0.99]));
    expect(g.check({ skill: 'lockpick' }).success).toBe(true);
    expect(g.check({ skill: 'lockpick' }).success).toBe(false);
    expect(g.state.stats).toMatchObject({ checksPassed: 1, checksFailed: 1 });
  });
});
