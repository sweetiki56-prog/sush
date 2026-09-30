// Stage K: the world map grew east to the Солончаки. Old saves keep their fog; the new places sit on the chart;
// a salt storm over the sea road halves the sight and slows the party while the main line has the caravan out.
import { describe, it, expect } from 'vitest';
import { CONTENT } from '../../src/content';
import { fitSeen, freshTravel, routeOn, STORM_PACE, STORM_SIGHT, terrainOf, Travel, type PartyPace } from '../../src/core/travel/Travel';
import { partyPace, stormAt } from '../../src/core/room/Road';
import { room, WORLD } from './rooms';

const PACE: PartyPace = { survival: 0, perception: 5, tracker: false, wounded: false, thirsty: false };

describe('the chart of the Солончаки', () => {
  it('is 112 cells wide; the west half is Низовье as before, the east has the Salt sea', () => {
    expect(WORLD.width).toBe(112);
    expect(WORLD.rows.every((r) => r.length === 112)).toBe(true);
    expect(terrainOf(WORLD, 96, 26).name).toBe('соляное море');
    expect(terrainOf(WORLD, 74, 24).name).toBe('тракт'); // the east road runs on into Соль
  });

  it('fits the fog of a save made on the old 64-wide map: seen cells stay, the east starts dark', () => {
    const old = Array.from({ length: 48 }, (_, y) => (y === 10 ? '1'.repeat(64) : '0'.repeat(63) + '1')).join('');
    const seen = fitSeen(old, WORLD);
    expect(seen.length).toBe(112 * 48);
    expect(seen.slice(10 * 112, 10 * 112 + 64)).toBe('1'.repeat(64));
    expect(seen.slice(10 * 112 + 64, 11 * 112)).toBe('0'.repeat(48));
    expect(seen[5 * 112 + 63]).toBe('1');
    expect(fitSeen(seen, WORLD)).toBe(seen);
    // the rules fit it too, whoever loads the save first
    const t = { ...freshTravel(WORLD, [14, 36]), seen: old };
    new Travel(WORLD, t);
    expect(t.seen.length).toBe(112 * 48);
  });

  it('puts every place inside the chart, with a way to it from the Rusty Well', () => {
    for (const [id, loc] of Object.entries(CONTENT.locations)) {
      const [x, y] = loc.cell;
      expect(x >= 0 && x < WORLD.width && y >= 0 && y < WORLD.height, id).toBe(true);
      expect(routeOn(WORLD, [14, 36], [x, y]), id).not.toBeNull();
    }
    expect(CONTENT.locations.to_salt).toBeUndefined();
    expect(CONTENT.locations.salt.cell).toEqual([74, 24]);
    expect(CONTENT.travel.routes.find((r) => r.id === 'sea_road')!.stops).toEqual(['salt', 'wrecks']);
  });
});

describe('the salt storm', () => {
  it('halves the sight and slows the going', () => {
    const tr = new Travel(WORLD, { ...freshTravel(WORLD, [84, 28]), minute: 12 * 60 });
    expect(tr.sight({ ...PACE, storm: true })).toBeCloseTo(tr.sight(PACE) * STORM_SIGHT);
    expect(tr.pace({ ...PACE, storm: true })).toBeCloseTo(tr.pace(PACE) * STORM_PACE);
  });

  it('rages over the sea road only while the Guild caravan is out and the ambush is not settled', () => {
    const { r, clients } = room();
    const g = r.players.get(clients[0].id)!.game;
    g.setFlag('trust_outcome', 'tax');
    g.apply([{ type: 'travel' }]);
    Object.assign(r.world.travel!, { x: 84.5, y: 28.5 });
    expect(stormAt(r, 84.5, 28.5)).toBe(false);
    g.setFlag('sea_caravan', 'go');
    expect(stormAt(r, 84.5, 28.5)).toBe(true);
    expect(stormAt(r, 74.5, 24.5)).toBe(false); // Соль itself is clear
    expect(partyPace(r).storm).toBe(true);
    r.sendTravel(true);
    expect(clients[0].last('travel')!.storms).toEqual([[79, 25, 89, 32]]);
    g.setFlag('ambush_done', 'fought');
    expect(stormAt(r, 84.5, 28.5)).toBe(false);
  });
});
