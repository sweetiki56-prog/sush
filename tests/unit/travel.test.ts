// The world map: terrain and pace, time only on the move, days and water, fog; the room on the road.
import { describe, it, expect } from 'vitest';
import { freshTravel, MIN_PER_SEC, Travel, type PartyPace } from '../../src/core/travel/Travel';
import { room, until, untilAlone, WORLD } from './rooms';

const PACE: PartyPace = { survival: 0, perception: 5, tracker: false, wounded: false, thirsty: false };

describe('travel rules', () => {
  it('the road is fastest, rocks slowest; wounds, thirst and sneaking slow the party', () => {
    const t = new Travel(WORLD, freshTravel(WORLD, [18, 60])); // Три столба, on the road
    expect(t.terrainAt(18, 60).name).toBe('тракт');
    expect(t.pace(PACE)).toBe(1);
    expect(t.pace(PACE, 0, 0)).toBeCloseTo(0.4);
    expect(t.pace({ ...PACE, survival: 100 })).toBeCloseTo(1.25);
    expect(t.pace({ ...PACE, wounded: true, thirsty: true })).toBeCloseTo(0.68);
    t.s.sneak = true;
    expect(t.pace(PACE)).toBeCloseTo(0.7);
  });

  it('routes follow the roads, and time passes only while moving', () => {
    const t = new Travel(WORLD, freshTravel(WORLD, [14, 68]));
    const minute = t.s.minute;
    expect(t.tick(5000, PACE)).toEqual([]);
    expect(t.s.minute).toBe(minute); // standing still: the world waits
    expect(t.go([26, 42], 'zapruda')).toBe(true);
    const onRoad = t.s.path.filter(([x, y]) => WORLD.rows[y][x] === '=').length;
    expect(onRoad / t.s.path.length).toBeGreaterThan(0.6);
    t.tick(1000, PACE);
    expect(t.s.minute).toBeCloseTo(minute + MIN_PER_SEC, 0);
    let arrived = false;
    for (let i = 0; i < 400 && !arrived; i++) arrived = t.tick(1000, PACE).some((e) => e.t === 'arrived' && e.target === 'zapruda');
    expect(arrived).toBe(true);
    expect([Math.floor(t.s.x), Math.floor(t.s.y)]).toEqual([26, 42]);
  });

  it('a day on the road asks for water; the fog lifts around the party, less at night', () => {
    const t = new Travel(WORLD, freshTravel(WORLD, [18, 60]));
    t.reveal(PACE);
    expect(t.seenAt(18, 60)).toBe(true);
    expect(t.seenAt(40, 42)).toBe(false);
    const day = t.sight(PACE);
    t.s.minute = 23 * 60;
    expect(t.sight(PACE)).toBe(day / 2);
    t.s.minute = 12 * 60;
    t.go([63, 57]);
    const ev = [];
    for (let i = 0; i < 200 && t.moving; i++) ev.push(...t.tick(1000, PACE));
    expect(ev.some((e) => e.t === 'day')).toBe(true);
    expect(ev.some((e) => e.t === 'drink')).toBe(true);
  });
});

describe('the room on the road', () => {
  it('leaving by the west road puts the party on the world map; walking home brings it back', () => {
    const { r, clients } = room();
    const [c] = clients;
    const g = r.players.get(c.id)!.game;
    g.setFlag('trust_outcome', 'tax');
    c.do({ t: 'debug', op: { op: 'teleport', x: 2, y: 25 } });
    c.do({ t: 'walk', x: 0, y: 25 });
    expect(until(r, () => r.onRoad)).toBe(true);
    expect(c.last('welcome')!.map).toBe('world');
    expect(c.last('travel')).toMatchObject({ x: 14.5, y: 68.5 });
    expect(g.flag('chapter1_done')).toBe(true);
    r.world.travel!.parties = [];
    c.do({ t: 'travel', to: 'zapruda' }); // not built yet: its gates say which chapter opens it
    expect(untilAlone(r, () => r.world.travel!.path.length === 0)).toBe(true);
    expect(g.state.log.some((l) => l.includes('Запруда') && l.includes('главе III'))).toBe(true);
    c.do({ t: 'travel', to: 'rusty_well' });
    expect(untilAlone(r, () => !r.onRoad)).toBe(true);
    expect(c.last('welcome')!.map).toBe('rusty_well');
    expect(r.npcs.has('marta')).toBe(true);
  });

  it('a day on the road without water: thirst costs health every hour; a flask ends it', () => {
    const { r, clients } = room();
    const [c] = clients;
    const g = r.players.get(c.id)!.game;
    g.setFlag('trust_outcome', 'tax');
    g.apply([{ type: 'travel' }]);
    expect(r.onRoad).toBe(true);
    const day = Number(r.world.flags.day ?? 1);
    c.do({ t: 'travel', x: 62, y: 57 });
    r.world.travel!.sinceDrink = 1430;
    until(r, () => g.body.thirsty === true, 30_000);
    expect(g.body.thirsty).toBe(true);
    const hp = g.state.hp;
    until(r, () => g.state.hp < hp, 30_000);
    expect(g.state.hp).toBe(hp - 3);
    g.give('flask');
    g.drink();
    expect(g.body.thirsty).toBe(false);
    // nobody else on the road: a meeting would stop the party and the clock
    untilAlone(r, () => Number(r.world.flags.day ?? 1) > day);
    expect(Number(r.world.flags.day)).toBe(day + 1);
  });
});

describe('camping on the road', () => {
  it('sleeps till morning: a new day after dark, wounds close unless thirsty', () => {
    const { r, clients } = room();
    const [c] = clients;
    const g = r.players.get(c.id)!.game;
    g.setFlag('trust_outcome', 'tax');
    g.apply([{ type: 'travel' }]);
    const day = Number(r.world.flags.day ?? 1);
    r.world.travel!.minute = 20 * 60;
    g.state.hp = 5;
    c.do({ t: 'camp' });
    expect(r.world.travel!.minute).toBe(6 * 60);
    expect(Number(r.world.flags.day)).toBe(day + 1);
    expect(g.state.hp).toBe(g.maxHp);
    r.world.travel!.minute = 3 * 60; // before dawn: the same day
    c.do({ t: 'camp' });
    expect(Number(r.world.flags.day)).toBe(day + 1);
  });
});
