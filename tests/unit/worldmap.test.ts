// Stage K: the world map grew east to the Солончаки; stage U: north to the Верховья. Old saves keep their fog and
// move down with the old land; the new places sit on the chart;
// a salt storm over the sea road halves the sight and slows the party while the main line has the caravan out.
import { describe, it, expect } from 'vitest';
import { CONTENT } from '../../src/content';
import { fitSeen, fitWorld, freshTravel, routeOn, STORM_PACE, STORM_SIGHT, terrainOf, Travel, type PartyPace } from '../../src/core/travel/Travel';
import { partyPace, stormAt } from '../../src/core/room/Road';
import { room, WORLD } from './rooms';

const PACE: PartyPace = { survival: 0, perception: 5, tracker: false, wounded: false, thirsty: false };

describe('the chart', () => {
  it('is 112 by 80: the Верховья on top, Низовье and the Солончаки below them as before', () => {
    expect([WORLD.width, WORLD.height, WORLD.north]).toEqual([112, 80, 32]);
    expect(WORLD.rows.every((r) => r.length === 112)).toBe(true);
    expect(terrainOf(WORLD, 96, 58).name).toBe('соляное море');
    expect(terrainOf(WORLD, 74, 56).name).toBe('тракт'); // the east road runs on into Соль
    expect(terrainOf(WORLD, 44, 11).name).toBe('нагорье'); // under the «Шептун»
    expect(terrainOf(WORLD, 30, 20).name).toBe('русло'); // the Светлая goes on north to the dam
  });

  it('fits the fog of a save made on the old 64-wide map: seen cells stay, the east and the north start dark', () => {
    const old = Array.from({ length: 48 }, (_, y) => (y === 10 ? '1'.repeat(64) : '0'.repeat(63) + '1')).join('');
    const seen = fitSeen(old, WORLD);
    expect(seen.length).toBe(112 * 80);
    expect(seen.slice(0, 32 * 112)).toBe('0'.repeat(32 * 112));
    expect(seen.slice(42 * 112, 42 * 112 + 64)).toBe('1'.repeat(64));
    expect(seen.slice(42 * 112 + 64, 43 * 112)).toBe('0'.repeat(48));
    expect(seen[37 * 112 + 63]).toBe('1');
    expect(fitSeen(seen, WORLD)).toBe(seen);
  });

  it('moves a save from before the Верховья down with the old land, once', () => {
    const old = Array.from({ length: 48 }, (_, y) => (y === 36 ? '1'.repeat(112) : '0'.repeat(112))).join('');
    const party = { id: 'gang_1', tpl: 'gang', x: 8.5, y: 20.5, path: [[9, 21]] as [number, number][], members: ['raider'], hurt: 0, wait: 0, think: 0, home: [8, 20] as [number, number], area: [12, 26, 24, 34] as [number, number, number, number] };
    const t = { ...freshTravel(WORLD, [14, 36]), y: 36.5, path: [[15, 35]] as [number, number][], seen: old, parties: [party] };
    fitWorld(t, WORLD);
    expect([t.y, t.path, t.seen.length]).toEqual([68.5, [[15, 67]], 112 * 80]);
    expect(t.seen.slice(68 * 112, 69 * 112)).toBe('1'.repeat(112));
    expect([party.y, party.path, party.home, party.area]).toEqual([52.5, [[9, 53]], [8, 52], [12, 58, 24, 66]]);
    fitWorld(t, WORLD);
    expect(t.y).toBe(68.5);
    // the rules fit it too, whoever loads the save first
    const u = { ...freshTravel(WORLD, [14, 36]), seen: old };
    new Travel(WORLD, u);
    expect([u.y, u.seen.length]).toEqual([68, 112 * 80]);
  });

  it('puts every place inside the chart, with a way to it from the Rusty Well', () => {
    for (const [id, loc] of Object.entries(CONTENT.locations)) {
      const [x, y] = loc.cell;
      expect(x >= 0 && x < WORLD.width && y >= 0 && y < WORLD.height, id).toBe(true);
      expect(routeOn(WORLD, [14, 68], [x, y]), id).not.toBeNull();
    }
    expect(CONTENT.locations.to_upper).toBeUndefined();
    expect(CONTENT.locations.salt.cell).toEqual([74, 56]);
    expect(CONTENT.travel.routes.find((r) => r.id === 'sea_road')!.stops).toEqual(['salt', 'wrecks']);
  });

  it('the road north follows the old riverbed from Запруда to the Депо and the pass', () => {
    const path = routeOn(WORLD, CONTENT.locations.zapruda.cell, CONTENT.locations.depot.cell)!;
    expect(path.filter(([x, y]) => WORLD.rows[y][x] === '=').length / path.length).toBeGreaterThan(0.6);
  });
});

describe('the salt storm', () => {
  it('halves the sight and slows the going', () => {
    const tr = new Travel(WORLD, { ...freshTravel(WORLD, [84, 60]), minute: 12 * 60 });
    expect(tr.sight({ ...PACE, storm: true })).toBeCloseTo(tr.sight(PACE) * STORM_SIGHT);
    expect(tr.pace({ ...PACE, storm: true })).toBeCloseTo(tr.pace(PACE) * STORM_PACE);
  });

  it('rages over the sea road only while the Guild caravan is out and the ambush is not settled', () => {
    const { r, clients } = room();
    const g = r.players.get(clients[0].id)!.game;
    g.setFlag('trust_outcome', 'tax');
    g.apply([{ type: 'travel' }]);
    Object.assign(r.world.travel!, { x: 84.5, y: 60.5 });
    expect(stormAt(r, 84.5, 60.5)).toBe(false);
    g.setFlag('sea_caravan', 'go');
    expect(stormAt(r, 84.5, 60.5)).toBe(true);
    expect(stormAt(r, 74.5, 56.5)).toBe(false); // Соль itself is clear
    expect(partyPace(r).storm).toBe(true);
    r.sendTravel(true);
    expect(clients[0].last('travel')!.storms).toEqual([[79, 57, 89, 64]]);
    g.setFlag('ambush_done', 'fought');
    expect(stormAt(r, 84.5, 60.5)).toBe(false);
  });
});
