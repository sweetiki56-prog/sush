// Companions (stage V): who joins and how many, following from map to map and onto a road battlefield, fighting on
// the party's side, holding back on order, dying for good, a line on arriving, no companions in a bout.
import { describe, it, expect } from 'vitest';
import { nextAction } from '../../src/core/combat/ai';
import { room, until } from './rooms';
import { say, talk, winFight } from './story';

function setup(flags: [string, string | boolean][] = []) {
  const { r, clients } = room();
  const [c] = clients;
  const g = r.players.get(c.id)!.game;
  for (const [k, v] of [['trust_outcome', 'tax'], ['chapter1_done', true], ['chapter1_seen', true], ...flags] as [string, string | boolean][]) g.setFlag(k, v);
  g.char.attrs.cha = 6; // two companions at most
  g.rng = () => 0.01;
  return { r, c, g };
}
const comp = (r: ReturnType<typeof setup>['r'], id: string) => r.hostiles.byId(`comp_${id}`);

describe('companions', () => {
  it('Хэнк who left with the hero in Chapter I walks with the party on the next map', () => {
    const s = setup([['hank_joins', true]]);
    s.r.goTo('three_pillars');
    expect(s.g.flag('with_hank')).toBe(true);
    const h = comp(s.r, 'hank')!;
    expect(h.ally).toBe(true);
    const me = s.r.players.get(s.c.id)!.mover.tile;
    expect(Math.hypot(h.mover.tile.x - me.x, h.mover.tile.y - me.y)).toBeLessThan(4);
    expect(s.c.last('welcome')!.actors.find((a) => a.id === 'comp_hank')!.kind).toBe('ally');
  });

  it('follows the leader across the map', () => {
    const s = setup([['hank_joins', true]]);
    s.r.goTo('three_pillars');
    s.c.do({ t: 'debug', op: { op: 'teleport', x: 30, y: 20 } });
    expect(until(s.r, () => { const t = comp(s.r, 'hank')!.mover.tile; return Math.hypot(t.x - 30, t.y - 20) <= 2.5; }, 20_000)).toBe(true);
  });

  it('the party is limited by Обаяние: a third, at least one', () => {
    const s = setup();
    s.g.char.attrs.cha = 3;
    s.g.apply([{ type: 'join', id: 'hank' }]);
    s.g.apply([{ type: 'join', id: 'granit' }]);
    expect(s.g.flag('with_hank')).toBe(true);
    expect(s.g.flag('with_granit')).toBeFalsy();
    expect(s.g.state.log.at(-1)).toContain('Отпустите кого-нибудь');
    s.g.apply([{ type: 'leave', id: 'hank' }, { type: 'join', id: 'granit' }]);
    expect(s.g.flag('with_granit')).toBe(true);
  });

  it('talks by a click and takes orders: hold back, go home; at home it can be called again', () => {
    const s = setup([['hank_joins', true]]);
    s.r.goTo('rusty_well');
    const h = comp(s.r, 'hank')!;
    talk(s.r, s.c, 'comp_hank', [h.mover.tile.x + 1, h.mover.tile.y]);
    say(s.c, 'Держись позади');
    expect(s.g.flag('stance_hank')).toBe('back');
    say(s.c, '…');
    talk(s.r, s.c, 'comp_hank', [comp(s.r, 'hank')!.mover.tile.x + 1, comp(s.r, 'hank')!.mover.tile.y]);
    say(s.c, 'Возвращайся домой');
    say(s.c, '…');
    expect(s.g.flag('with_hank')).toBe(false);
    expect(comp(s.r, 'hank')).toBeUndefined();
    expect(s.r.npcs.has('hank_home')).toBe(true); // waiting by the fire
    talk(s.r, s.c, 'hank_home', [17, 31]);
    say(s.c, 'Пойдём со мной');
    expect(s.g.flag('with_hank')).toBe(true);
    expect(comp(s.r, 'hank')).toBeDefined();
  });

  it('fights beside the party, and a companion who falls is gone for good', () => {
    const s = setup([['hank_joins', true]]);
    s.r.goTo('zap_sewers', 'aqueduct');
    s.r.startCombat(s.r.players.get(s.c.id)!, s.r.hostiles.alive.filter((h) => h.group === 'rats').map((h) => h.id));
    const u = s.r.fight!.combat.unit('comp_hank')!;
    expect(u.team).toBe('player');
    u.hp = 1;
    // a rat bites Хэнк: he dies in the fight
    const rat = s.r.fight!.combat.units.find((x) => x.id !== 'comp_hank' && x.side === 'hostile' && x.team !== 'player')!;
    Object.assign(rat, { x: u.x + 1, y: u.y });
    for (let n = 0; n < 200 && !u.dead && s.r.fight; n++) {
      s.c.ack();
      if (s.r.fight?.combat.current.id === s.c.id) s.c.do({ t: 'endTurn' });
    }
    expect(u.dead).toBe(true);
    expect(s.g.flag('lost_hank')).toBe(true);
    expect(s.g.flag('with_hank')).toBe(false);
    if (s.r.fight) winFight(s.r, s.c);
    s.g.apply([{ type: 'join', id: 'hank' }]);
    expect(s.g.flag('with_hank')).toBe(false);
  });

  it('held back, it strikes only foes who came close to the party', () => {
    const s = setup([['hank_joins', true], ['stance_hank', 'back']]);
    s.r.goTo('zap_sewers', 'aqueduct');
    s.r.startCombat(s.r.players.get(s.c.id)!, s.r.hostiles.alive.filter((h) => h.group === 'rats').map((h) => h.id));
    const combat = s.r.fight!.combat;
    const u = combat.unit('comp_hank')!;
    expect(u.holdBack).toBe(true);
    const me = combat.unit(s.c.id)!;
    for (const f of combat.units.filter((x) => x.side === 'hostile' && x.team !== 'player')) Object.assign(f, { x: me.x + 8, y: me.y + 8 });
    Object.assign(u, { ap: 8 });
    expect(nextAction(combat, u).kind).toBe('end');
  });

  it('no companion steps into a bout on the ring', () => {
    const s = setup([['hank_joins', true]]);
    s.r.goTo('salt_arena');
    s.g.setFlag('ring_fight');
    expect(until(s.r, () => !!s.r.fight, 10_000)).toBe(true);
    expect(s.r.fight!.combat.unit('comp_hank')).toBeUndefined();
  });

  it('says a line on arriving somewhere, once', () => {
    const s = setup([['hank_joins', true]]);
    s.r.goTo('three_pillars');
    const said = s.g.state.log.filter((l) => l.startsWith('Хэнк: «')).length;
    expect(said).toBe(1);
    s.r.goTo('rusty_well');
    s.r.goTo('three_pillars');
    expect(s.g.state.log.filter((l) => l.startsWith('Хэнк: «')).length).toBe(1);
  });

  it('comes along onto a road battlefield', () => {
    const s = setup([['hank_joins', true]]);
    s.r.goTo('three_pillars');
    s.g.apply([{ type: 'travel' }]);
    const t = s.r.world.travel!;
    t.parties = [{ id: 'gang_9', tpl: 'gang', x: t.x + 0.3, y: t.y, path: [], members: ['raider', 'raider'], hurt: 0, wait: 9999, think: 9999, chasing: 'hero' }];
    s.c.do({ t: 'travel', x: Math.floor(t.x) + 3, y: Math.floor(t.y) });
    expect(until(s.r, () => !!s.r.meeting, 5000)).toBe(true);
    say(s.c, 'Напасть');
    say(s.c, '…');
    expect(until(s.r, () => !!s.r.fight, 10_000)).toBe(true);
    expect(s.r.fight!.combat.unit('comp_hank')?.team).toBe('player');
  });
});
