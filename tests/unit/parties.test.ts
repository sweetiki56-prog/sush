// Parties on the world map: who appears where, who chases whom, caravans on their routes, fights without the hero.
import { describe, it, expect } from 'vitest';
import { Parties, strengthWord, type HeroOnMap, type PartyEvent, type PartyState } from '../../src/core/travel/Parties';
import { mulberry32 } from '../../src/core/rng';
import { CONTENT } from '../../src/content';
import { room, until, WORLD } from './rooms';

const make = (list: PartyState[] = [], seed = 3) => new Parties(WORLD, list, CONTENT.travel, CONTENT.creatures, CONTENT.weapons, CONTENT.locations, mulberry32(seed));
const hero = (x: number, y: number, strength: number, patch: Partial<HeroOnMap> = {}): HeroOnMap => ({ x, y, strength, sneak: false, water: false, trustEnemy: false, ...patch });
const NOON = 12 * 60;

function run(ps: Parties, h: HeroOnMap, hours: number, minute = NOON) {
  const ev = [];
  for (let i = 0; i < hours * 6; i++) ev.push(...ps.step(10, h, minute));
  return ev;
}

describe('parties on the world map', () => {
  it('every morning lairs fill and caravans set out; night herds come only at night and go at dawn', () => {
    const ps = make();
    ps.populate(1, NOON, true);
    expect(ps.list.filter((p) => p.lair === 'stone_bag')).toHaveLength(2);
    expect(ps.list.filter((p) => p.lair === 'elevator')).toHaveLength(1);
    expect(ps.list.some((p) => p.route?.id === 'salt_road')).toBe(true); // day 1
    expect(ps.list.some((p) => p.route?.id === 'tract')).toBe(false); // from day 2
    expect(ps.list.some((p) => p.tpl === 'dry_herd')).toBe(false);
    ps.populate(1, 23 * 60, false);
    expect(ps.list.filter((p) => p.tpl === 'dry_herd')).toHaveLength(2);
    ps.step(10, hero(0, 32, 10), 7 * 60);
    expect(ps.list.some((p) => p.tpl === 'dry_herd')).toBe(false);
  });

  it('a gang chases a weak hero it sees and runs from a strong one', () => {
    const ps = make();
    ps.populate(1, NOON, true);
    const gang = ps.list.find((p) => p.lair === 'stone_bag')!;
    const s = ps.strength(gang);
    const weak = hero(gang.x + 4, gang.y, s * 0.5);
    run(ps, weak, 1);
    expect(gang.chasing).toBe('hero');
    const before = Math.hypot(gang.x - weak.x, gang.y - weak.y);
    run(ps, weak, 2);
    expect(Math.hypot(gang.x - weak.x, gang.y - weak.y)).toBeLessThan(before);
    const strong = hero(gang.x + 3, gang.y, s * 5);
    Object.assign(gang, { think: 0, calm: 0, chased: 0 }); // a fresh look (the slow pursuit over the rocks may have been given up)
    const d0 = Math.hypot(gang.x - strong.x, gang.y - strong.y);
    run(ps, strong, 3);
    expect(gang.chasing).toBeUndefined();
    expect(Math.hypot(gang.x - strong.x, gang.y - strong.y)).toBeGreaterThan(d0);
    expect(strengthWord(s, s * 5)).toBe('слабее вас');
    expect(strengthWord(s * 3, s)).toBe('намного сильнее вас');
  });

  it('a gang that reaches the hero starts a meeting, once until they part', () => {
    const ps = make();
    ps.populate(1, NOON, true);
    const gang = ps.list.find((p) => p.lair === 'stone_bag')!;
    const h = hero(gang.x + 2, gang.y, ps.strength(gang) * 0.5);
    const ev = run(ps, h, 4);
    expect(ev.filter((e) => e.t === 'meet' && e.id === gang.id)).toHaveLength(1);
  });

  it('a caravan walks its stops and rests in each; its last stop ends the trip', () => {
    const ps = make();
    ps.populate(1, NOON, true);
    const car = ps.list.find((p) => p.route?.id === 'salt_road')!;
    const ev = run(ps, hero(0, 79, 1), 24 * 6);
    const stops = ev.filter((e) => e.t === 'arrive' && e.id === car.id).map((e) => (e as { at: string }).at);
    expect(stops.slice(0, 3)).toEqual(['salt', 'elevator', 'barge']);
    if (stops.includes('rusty_well')) expect(ps.byId(car.id)).toBeUndefined();
  });

  it('bandits that catch a weaker caravan fight it for two hours without the hero; the stronger side usually wins', () => {
    const ps = make();
    const car = { id: 'car', tpl: 'caravan', x: 20.5, y: 52.5, path: [], members: ['caravaneer'], hurt: 0, wait: 99999, think: 99999, route: { id: 'tract', i: 1 } } as PartyState;
    const band = { id: 'band', tpl: 'band', x: 22.5, y: 52.5, path: [], members: ['raider_boss', 'raider', 'raider', 'raider'], hurt: 0, wait: 0, think: 0, home: [22, 52] } as PartyState;
    ps.list.push(car, band);
    const ev = run(ps, hero(60, 37, 1), 5);
    // first they lock in a fight that lasts a while (the hero could still come), then it is decided
    const began = ev.findIndex((e) => e.t === 'battle');
    const ended = ev.findIndex((e) => e.t === 'clash' && e.winner === 'band' && e.loser === 'car');
    expect(began).toBeGreaterThanOrEqual(0);
    expect(ended).toBeGreaterThan(began);
    expect(ps.byId('car')).toBeUndefined();
    expect(ps.byId('band')!.hurt).toBeGreaterThan(0);
  });

  it('the room shows the parties in sight and stops the hero when one reaches him', () => {
    const { r, clients } = room();
    const [c] = clients;
    const g = r.players.get(c.id)!.game;
    g.setFlag('trust_outcome', 'tax');
    g.apply([{ type: 'travel' }]);
    expect(r.world.travel!.parties!.length).toBeGreaterThan(3);
    // a worn-out hero walks past the Каменный мешок, where the gangs live
    g.state.hp = 4;
    Object.assign(r.world.travel!, { x: 12.5, y: 56.5 });
    c.do({ t: 'travel', x: 8, y: 51 });
    expect(until(r, () => (c.last('travel')?.parties ?? []).some((p) => p.kind === 'bandits'), 120_000)).toBe(true);
    expect(until(r, () => g.state.log.some((l) => l.startsWith('Вы натыкаетесь')), 120_000)).toBe(true);
    expect(r.world.travel!.path).toEqual([]);
  });
});

describe('a pursuit ends', () => {
  const pack = (x: number, y: number, pace = 1.1): PartyState => ({ id: 'jackals_9', tpl: pace === 1.1 ? 'jackal_pack' : 'slow_pack', x, y, path: [], members: ['jackal_leader', 'jackal', 'jackal'], hurt: 0, wait: 0, think: 0 });

  it('a hero standing still is caught: the pack closes in and the meeting starts', () => {
    const { r, clients } = room();
    const g = r.players.get(clients[0].id)!.game;
    g.setFlag('trust_outcome', 'tax');
    g.apply([{ type: 'travel' }]);
    g.state.hp = 4; // wounded: a pack goes for prey it can take
    const t = r.world.travel!;
    Object.assign(t, { x: 16.5, y: 65.5, minute: NOON, parties: [{ ...pack(16.5, 62.5), chasing: 'hero' as const }] });
    expect(until(r, () => !!r.meeting, 20_000)).toBe(true);
  });

  it('a pack that cannot catch up gives up after a while and turns away', () => {
    const slow = { ...CONTENT.travel.parties.jackal_pack, pace: 0.3 };
    const ps = new Parties(WORLD, [pack(20.5, 52.5, 0.3)], { ...CONTENT.travel, parties: { ...CONTENT.travel.parties, slow_pack: slow } }, CONTENT.creatures, CONTENT.weapons, CONTENT.locations, mulberry32(3));
    const p = ps.list[0];
    const ev: PartyEvent[] = [];
    // the hero is weak and in sight, walking away east faster than they run
    for (let i = 0; i < 40 && !ev.some((e) => e.t === 'gaveUp'); i++) {
      const h = hero(22.5 + i * 0.25, 52.5, 1);
      ev.push(...ps.step(10, h, NOON));
    }
    expect(ev.some((e) => e.t === 'gaveUp' && e.id === p.id)).toBe(true);
    expect(p.chasing).toBeUndefined();
    expect(p.calm).toBeGreaterThan(0);
  });
});
