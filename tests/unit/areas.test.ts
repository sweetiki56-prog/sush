// Stage L: towns of several maps. Ways out at the edges lead to the next area or the world map, a hatch leads down,
// co-op moves between areas after the same countdown as leaving town, and a town with several known areas opens
// its plan from the world map.
import { describe, it, expect } from 'vitest';
import { room, until, untilAlone } from './rooms';
import { say, talk } from './story';

/** After Chapter I: the party stands in `at`. */
function setup(at = 'three_pillars', players = 1) {
  const { r, clients } = room(players);
  const [c] = clients;
  const g = r.players.get(c.id)!.game;
  for (const [k, v] of [['chapter1_seen', true], ['trust_outcome', 'tax'], ['chapter1_done', true], ['day', 3]] as const) g.setFlag(k, v);
  g.rng = () => 0.01;
  r.goTo(at);
  return { r, c, g, clients };
}

/** Out of town onto the world map, with nobody else on the road. */
function onRoad(s: ReturnType<typeof setup>) {
  s.g.apply([{ type: 'travel' }]);
  for (let t = 0; t < 10_500 && !s.r.onRoad; t += 50) s.r.tick(50);
  s.r.world.travel!.parties = [];
  s.r.quietRoad = true;
}

describe('ways out', () => {
  it('the south edge of Три столба leads to the substation ruins and back; the area is on the plan from then on', () => {
    const { r, c, g } = setup();
    c.do({ t: 'debug', op: { op: 'teleport', x: 33, y: 37 } });
    c.do({ t: 'walk', x: 33, y: 39 });
    expect(until(r, () => r.map.id === 'pillars_ruins')).toBe(true);
    expect(g.flag('at')).toBe('pillars_ruins');
    expect(g.flag('seen_pillars_ruins')).toBe(true);
    expect(r.players.get(c.id)!.mover.tile).toMatchObject({ y: 2 });
    c.do({ t: 'walk', x: 16, y: 0 });
    expect(until(r, () => r.map.id === 'three_pillars')).toBe(true);
    expect(r.players.get(c.id)!.mover.tile.y).toBeGreaterThanOrEqual(36);
  });

  it('a closed way out says why and keeps the party: the west road of the Rusty Well before the Trust is settled', () => {
    const { r, c, g } = setup('rusty_well');
    g.setFlag('trust_outcome', false);
    c.do({ t: 'debug', op: { op: 'teleport', x: 2, y: 25 } });
    c.do({ t: 'walk', x: 0, y: 25 });
    until(r, () => false, 3000);
    expect(r.onRoad).toBe(false);
    expect(r.map.id).toBe('rusty_well');
    expect(g.state.log.some((l) => l.includes('Сначала дело'))).toBe(true);
  });

  it('the hatch in the pump station goes down to the cistern, the ladder back up', () => {
    const { r, c, g } = setup('rusty_well');
    g.setFlag('door_open', true);
    talk(r, c, 'station_hatch', [33, 10]);
    say(c, 'Спуститься');
    expect(until(r, () => r.map.id === 'rw_cistern')).toBe(true);
    c.do({ t: 'walk', x: 4, y: 3 });
    c.do({ t: 'debug', op: { op: 'teleport', x: 5, y: 3 } });
    c.do({ t: 'walk', x: 4, y: 3 });
    expect(until(r, () => r.map.id === 'rusty_well')).toBe(true);
    expect(r.players.get(c.id)!.mover.tile).toMatchObject({ x: 33 });
  });

  it('co-op: moving to another area waits ten seconds for anyone to say stay, then takes everyone', () => {
    const { r, c, clients } = setup('kolyuchka', 2);
    const [, b] = clients;
    c.do({ t: 'debug', op: { op: 'teleport', x: 33, y: 18 } });
    c.do({ t: 'walk', x: 35, y: 18 });
    expect(until(r, () => !!b.last('depart')?.by)).toBe(true);
    expect(b.last('depart')!.where).toBe('Старые теплицы');
    expect(r.map.id).toBe('kolyuchka');
    expect(until(r, () => r.map.id === 'kolyuchka_glass', 20_000)).toBe(true);
    for (const p of r.players.values()) expect(p.game.flag('at')).toBe('kolyuchka_glass');
  });
});

describe('the town screen', () => {
  it('one known area: straight in; two: the plan, and the pick walks the party in', () => {
    const s = setup();
    const { r, c, g } = s;
    onRoad(s);
    c.do({ t: 'travel', to: 'three_pillars' });
    expect(untilAlone(r, () => !r.onRoad)).toBe(true);
    expect(r.map.id).toBe('three_pillars');
    expect(c.of('town')).toHaveLength(0);
    g.setFlag('copper_asked', true); // Мытный told of the ruins
    onRoad(s);
    c.do({ t: 'travel', to: 'three_pillars' });
    expect(untilAlone(r, () => c.of('town').length > 0)).toBe(true);
    expect(c.last('town')!.loc).toBe('three_pillars');
    expect(r.onRoad).toBe(true);
    c.do({ t: 'enter', loc: 'three_pillars', area: 'pillars_ruins' });
    expect(until(r, () => r.map.id === 'pillars_ruins')).toBe(true);
    expect(g.state.log.some((l) => l.includes('Южные развалины'))).toBe(true);
  });

  it('an area nobody told of cannot be picked; a place the party is not at cannot be entered', () => {
    const s = setup();
    const { r, c } = s;
    onRoad(s);
    c.do({ t: 'enter', loc: 'barge', area: 'barge_deck' }); // far from the barge
    until(r, () => false, 1000);
    expect(r.onRoad).toBe(true);
    c.do({ t: 'travel', to: 'barge' });
    expect(untilAlone(r, () => c.of('town').length > 0)).toBe(true); // the riverbed and the barge herself are in sight
    c.do({ t: 'enter', loc: 'barge', area: 'barge_post' }); // nobody told of the post station yet
    until(r, () => false, 1000);
    expect(r.onRoad).toBe(true);
    c.do({ t: 'enter', loc: 'barge', area: 'barge_deck' });
    expect(until(r, () => r.map.id === 'barge_deck')).toBe(true);
  });
});
