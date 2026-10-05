import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../src/content';
import { Game } from '../../src/core/Game';
import { releaseRocketGear, seizeRocketGear } from '../../src/core/room/RocketEscrow';
import { premadeState, room, until } from './rooms';

const make = () => new Game(CONTENT, () => 0.01, premadeState(0));

describe('pilgrim chest', () => {
  it('seals every carried item but the Mandate tube, exactly once, then restores inventory and slots', () => {
    const game = make();
    game.give('tube');
    game.give('tube_copy');
    game.give('knife');
    game.give('jacket');
    game.equip('weapon', 'knife');
    game.equip('armor', 'jacket');
    const before = { ...game.state.items };
    const slots = { ...game.state.equipped };
    expect(seizeRocketGear(game)).toBe(true);
    expect(seizeRocketGear(game)).toBe(false);
    expect(game.count('tube')).toBe(1);
    expect(game.count('tube_copy')).toBe(1);
    expect(game.count('knife')).toBe(0);
    expect(game.hands()).toEqual([]);
    expect(game.armor).toBe(null);
    expect(releaseRocketGear(game)).toBe(true);
    expect(releaseRocketGear(game)).toBe(false);
    expect(game.state.items).toEqual(before);
    expect(game.state.equipped).toEqual(slots);
  });

  it('keeps each co-op player’s chest separate and restores gear on exit', () => {
    const { r, clients } = room(2);
    const games = clients.map((c) => r.players.get(c.id)!.game);
    games[0].give('knife', 2);
    games[1].give('jacket');
    const before = games.map((g) => ({ ...g.state.items }));
    r.goTo('rocket_outpost');
    games[0].apply([{ type: 'rocketEscrow', action: 'seize' }]);
    expect(games.every((g) => g.state.rocketEscrow !== undefined)).toBe(true);
    expect(games[0].state.rocketEscrow!.knife).toBe(before[0].knife);
    expect(games[1].state.rocketEscrow!.jacket).toBe(before[1].jacket);
    r.goTo('rusty_well');
    games.forEach((g, i) => {
      expect(g.state.rocketEscrow).toBeUndefined();
      expect(g.state.items).toEqual(before[i]);
    });
  });

  it('reconciles an old or interrupted save outside the Sanctuary and returns gear on the real south exit', () => {
    const old = make();
    old.give('knife');
    const before = old.count('knife');
    seizeRocketGear(old);
    const saved = JSON.parse(JSON.stringify(old.state));
    const restored = new Game(CONTENT, () => 0.01, saved);
    expect(releaseRocketGear(restored)).toBe(true);
    expect(restored.count('knife')).toBe(before);

    const { r, clients } = room();
    const c = clients[0];
    const g = r.players.get(c.id)!.game;
    g.give('knife');
    const carried = g.count('knife');
    r.goTo('rocket_outpost');
    g.apply([{ type: 'rocketEscrow', action: 'seize' }]);
    c.do({ t: 'debug', op: { op: 'teleport', x: 13, y: 24 } });
    c.do({ t: 'walk', x: 13, y: 25 });
    expect(until(r, () => r.onRoad)).toBe(true);
    expect(g.state.rocketEscrow).toBeUndefined();
    expect(g.count('knife')).toBe(carried);
  });
});
