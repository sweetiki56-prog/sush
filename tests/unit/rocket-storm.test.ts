import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../src/content';
import { stormArea } from '../../src/core/room/Road';
import { freshTravel, Travel, type PartyPace } from '../../src/core/travel/Travel';
import { room, until, WORLD } from './rooms';

const pace: PartyPace = { survival: 0, perception: 5, tracker: false, wounded: false, thirsty: false };
const storm = CONTENT.travel.storms!.find((entry) => entry.id === 'rocket_storm')!;

describe('Rocket storm', () => {
  it('moves through six hourly centers, wraps at midnight and covers exactly 3×3 cells', () => {
    expect(storm.route).toEqual([[89, 42], [91, 42], [93, 42], [95, 42], [93, 43], [91, 43]]);
    expect(stormArea(storm, 1, 0)).toEqual([88, 41, 90, 43]);
    expect(stormArea(storm, 1, 60)).toEqual([90, 41, 92, 43]);
    expect(stormArea(storm, 2, 0)).toEqual(stormArea(storm, 1, 0));
    expect(stormArea(storm, 1, 5 * 60)).toEqual([90, 42, 92, 44]);
  });

  it('checks each traversed cell, even when one tick crosses several', () => {
    const travel = new Travel(WORLD, freshTravel(WORLD, [86, 42]));
    expect(travel.go([96, 42])).toBe(true);
    const event = travel.tick(30_000, pace, (x, y) => x >= 89 && x <= 91 && y === 42 ? 'rocket' : null);
    expect(event.some((e) => e.t === 'interrupt' && e.reason === 'rocket')).toBe(true);
    expect(travel.moving).toBe(false);
    expect(Math.floor(travel.s.x)).toBeGreaterThanOrEqual(89);
    expect(Math.floor(travel.s.x)).toBeLessThanOrEqual(91);
  });

  it('discovers the outpost once in the real road room and keeps the world marker', () => {
    const { r, clients } = room();
    const c = clients[0];
    const g = r.players.get(c.id)!.game;
    g.setFlag('trust_outcome', 'tax');
    g.setFlag('chapter5_done', true);
    g.setFlag('day', 1);
    g.apply([{ type: 'travel' }]);
    const travel = r.world.travel!;
    travel.parties = [];
    travel.x = 90.5;
    travel.y = 42.5;
    travel.minute = 0;
    r.quietRoad = true;
    c.do({ t: 'travel', x: 91, y: 42 });
    expect(until(r, () => r.map.id === 'rocket_outpost', 20_000)).toBe(true);
    expect(g.flag('rocket_found')).toBe(true);
    expect(g.stage('rocket')).toBe('post');
    expect(CONTENT.locations.rocket.open).toEqual([{ flag: 'rocket_found' }]);
  });
});
