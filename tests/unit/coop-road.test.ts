// The road in co-op: the party leaves town together (anyone may ask to stay), and a meeting is everyone's fight.
import { describe, it, expect } from 'vitest';
import type { PartyState } from '../../src/core/travel/Parties';
import { room } from './rooms';

describe('the road in co-op', () => {
  it('stepping onto the way out starts a countdown; anyone can call it off; then everyone leaves together', () => {
    const { r, clients } = room(2);
    const [a, b] = clients;
    const ga = r.players.get(a.id)!.game;
    ga.setFlag('trust_outcome', 'tax');
    ga.apply([{ type: 'travel' }]);
    expect(b.last('depart')).toMatchObject({ by: ga.char.name, ms: 10_000 });
    r.tick(4000);
    expect(ga.flag('at')).not.toBe('world');
    b.do({ t: 'stay' });
    expect(b.last('depart')!.by).toBeNull();
    r.tick(8000);
    expect(ga.flag('at')).not.toBe('world');
    // again, and nobody objects
    ga.apply([{ type: 'travel' }]);
    for (let t = 0; t < 10_500; t += 50) r.tick(50);
    expect(ga.flag('at')).toBe('world');
    expect(b.last('welcome')!.map).toBe('world');
    expect(r.players.get(b.id)!.game.state.travel).toBe(r.world.travel);
  });

  it('a gang met on the road fights the whole party', () => {
    const { r, clients } = room(2);
    const [a] = clients;
    const ga = r.players.get(a.id)!.game;
    ga.setFlag('trust_outcome', 'tax');
    ga.apply([{ type: 'travel' }]);
    for (let t = 0; t < 10_500; t += 50) r.tick(50);
    const t = r.world.travel!;
    const gang: PartyState = { id: 'gang_5', tpl: 'gang', x: t.x + 0.3, y: t.y, path: [], members: ['raider', 'raider'], hurt: 0, wait: 9999, think: 9999 };
    t.parties = [gang];
    a.do({ t: 'travel', x: Math.floor(t.x) + 1, y: Math.floor(t.y) });
    for (let n = 0; n < 100 && !r.meeting; n++) r.tick(50);
    expect(r.meeting).toBe('gang_5');
    const d = a.last('dialogue')!;
    a.do({ t: 'choose', i: d.options.findIndex((o) => o.startsWith('Напасть')) });
    a.do({ t: 'choose', i: 0 });
    const ids = r.fight!.combat.units.filter((u) => u.side === 'player').map((u) => u.id);
    expect(ids.sort()).toEqual([...r.players.keys()].sort());
  });
});
