// Meetings on the road: the talk built for each party, how it ends, and the battle on the ground they met on.
import { describe, it, expect } from 'vitest';
import { meetingDialogue } from '../../src/core/travel/Encounters';
import { CONTENT } from '../../src/content';
import type { PartyState } from '../../src/core/travel/Parties';
import type { Client } from './rooms';
import { room, until, WORLD } from './rooms';
import type { MissionRoom } from '../../src/core/room/Mission';

const say = (c: Client, start: string) => {
  const d = c.last('dialogue')!;
  const i = d.options.findIndex((o) => o.replace(/^\[[^\]]*%\] /, '').startsWith(start));
  expect(i, `«${start}» in ${JSON.stringify(d.options)}`).toBeGreaterThanOrEqual(0);
  c.do({ t: 'choose', i });
};

/** The hero on the road with a gang standing right on the next cell. */
function meetGang(caps = 100) {
  const { r, clients } = room();
  const [c] = clients;
  const g = r.players.get(c.id)!.game;
  g.setFlag('trust_outcome', 'tax');
  g.apply([{ type: 'travel' }]);
  const t = r.world.travel!;
  Object.assign(t, { x: 20.5, y: 68.5, parties: [] });
  g.state.caps = caps;
  const gang: PartyState = { id: 'gang_9', tpl: 'gang', x: 22.5, y: 68.5, path: [], members: ['raider', 'raider'], hurt: 0, wait: 9999, think: 9999 };
  t.parties!.push(gang);
  c.do({ t: 'travel', x: 23, y: 68 });
  expect(until(r, () => !!r.meeting, 60_000)).toBe(true);
  return { r, c, g, gang };
}

/** Win for real (kills go through the room's rules): every foe stands next to us on one hit point, every shot lands. */
function winFight(r: MissionRoom, c: Client) {
  const combat = r.fight!.combat;
  const g = r.players.get(c.id)!.game;
  g.rng = () => 0.01;
  for (let n = 0; n < 200 && r.fight; n++) {
    const last = c.last('combat')!;
    if (last.sync.busy || last.sync.units[last.sync.idx].id !== c.id) {
      c.ack();
      continue;
    }
    const me = combat.unit(c.id)!;
    me.skills.guns = me.skills.melee = 95;
    g.give('ammo', 5);
    const foe = combat.units.find((u) => u.side === 'hostile' && u.team !== 'player' && !u.dead && !u.fled);
    if (foe) Object.assign(foe, { hp: 1, x: me.x + 1, y: me.y, fleeAt: 0 });
    if (foe && me.ap >= 5) c.do({ t: 'attack', target: foe.id });
    else c.do({ t: 'endTurn' });
  }
  r.tick(50);
}

describe('meetings on the road', () => {
  it('every party gets a talk whose every way leads somewhere', () => {
    for (const [id, party] of Object.entries(CONTENT.travel.parties))
      for (const trustEnemy of [false, true]) {
        const d = meetingDialogue({ party, count: 3, ratio: 1, terrain: '=', sneak: false, trustEnemy });
        for (const [nid, n] of Object.entries(d.nodes))
          for (const o of n.options) {
            for (const to of [o.next, o.check?.pass, o.check?.fail]) if (to) expect(d.nodes[to], `${id}.${nid} → ${to}`).toBeDefined();
            for (const e of o.effects ?? []) if (e.type === 'open') expect(CONTENT.traders[e.id], `${id} trader`).toBeDefined();
          }
        const ends = Object.values(d.nodes).flatMap((n) => [...(n.effects ?? []), ...n.options.flatMap((o) => o.effects ?? [])]).filter((e) => e.type === 'encounter');
        expect(ends.length, id).toBeGreaterThan(0);
      }
  });

  it('a gang that reaches the hero stops the road and asks for a toll; paying lets the party go on', () => {
    const { r, c, g, gang } = meetGang();
    expect(r.world.travel!.path).toEqual([]);
    expect(c.last('dialogue')!.speaker).toBe(CONTENT.travel.parties.gang.name);
    const toll = CONTENT.travel.parties.gang.toll!;
    say(c, 'Держите');
    say(c, '…');
    expect(g.state.caps).toBe(100 - toll);
    expect(r.meeting).toBeNull();
    expect(gang.calm).toBeGreaterThan(0);
    expect(r.fight).toBeNull();
    // the road is open again
    c.do({ t: 'travel', x: 30, y: 68 });
    expect(r.world.travel!.path.length).toBeGreaterThan(0);
  });

  it('while the talk is open nobody walks off', () => {
    const { r, c } = meetGang();
    c.do({ t: 'travel', x: 30, y: 68 });
    expect(r.world.travel!.path).toEqual([]);
  });

  it('a fight moves the party onto a battlefield with the gang on the far side, then back to the road', () => {
    const { r, c, g, gang } = meetGang(0);
    say(c, 'Напасть');
    say(c, '…');
    const field = g.flag('at') as string;
    expect(field).toMatch(/^enc_/);
    expect(r.world.travel!.encounter).toBe(gang.id);
    expect(r.fight).not.toBeNull();
    const foes = r.fight!.combat.units.filter((u) => u.side === 'hostile');
    expect(foes.map((u) => u.id).sort()).toEqual(['enc_0', 'enc_1']);
    expect(c.last('welcome')!.map).toBe(g.flag('at'));
    winFight(r, c);
    expect(r.fight).toBeNull();
    // the spoils wait in a pile; take them, then go on
    expect(g.flag('at')).toBe(field);
    const pile = c.last('loot')!.items!;
    expect(Object.keys(pile).length).toBeGreaterThan(0);
    const [item, n] = Object.entries(pile)[0];
    const had = g.count(item);
    c.do({ t: 'take', item });
    expect(g.count(item)).toBe(had + n);
    expect(c.last('loot')!.items![item]).toBeUndefined();
    c.do({ t: 'lootDone' });
    expect(c.last('loot')!.items).toBeNull();
    expect(g.flag('at')).toBe('world');
    expect(r.world.travel!.encounter).toBeUndefined();
    expect(r.world.travel!.parties!.some((p) => p.id === gang.id)).toBe(false);
    expect(Object.keys(r.world.flags).some((k) => k.startsWith('dead_enc_'))).toBe(false);
    expect(c.last('welcome')!.map).toBe('world');
  });

  it('a fight on the road leaves the autosave from before the meeting', () => {
    const saves: string[] = [];
    const { r, c } = meetGang(0);
    (r as unknown as { opts: { save: (room: MissionRoom, slot: string) => void } }).opts.save = (room, slot) => saves.push(`${slot}:${room.world.flags.at}`);
    say(c, 'Напасть');
    say(c, '…');
    expect(r.fight).not.toBeNull();
    expect(saves.filter((x) => x.startsWith('auto'))).toEqual(['auto:world']);
    expect(saves.every((x) => x.endsWith(':world'))).toBe(true); // nothing is saved on the battlefield
  });

  it('a getaway that fails lets the gang strike first', () => {
    const { r, c } = meetGang(0);
    r.players.get(c.id)!.game.rng = () => 0.99; // every roll fails
    say(c, 'Отступить');
    say(c, '…');
    const combat = r.fight!.combat;
    expect(combat.units.filter((u) => u.id.startsWith('enc_')).every((u) => u.seq > combat.unit(c.id)!.seq)).toBe(true);
  });

  it('a gang lying in wait in the rocks skips the talk unless someone spots it', () => {
    const { r, clients } = room();
    const [c] = clients;
    const g = r.players.get(c.id)!.game;
    g.apply([{ type: 'travel' }]);
    const t = r.world.travel!;
    // Каменный мешок is rocks: the gang is already on the hunt
    const rock = WORLD.rows.flatMap((row, y) => [...row].map((ch, x) => [ch, x, y] as const)).find(([ch, x]) => ch === '^' && x > 2)!;
    Object.assign(t, { x: rock[1] + 0.5, y: rock[2] + 0.5, parties: [{ id: 'gang_9', tpl: 'gang', x: rock[1] + 0.5, y: rock[2] + 0.5, path: [], members: ['raider'], hurt: 0, wait: 9999, think: 9999, chasing: 'hero' }] });
    g.char.attrs.per = 3;
    g.rng = () => 0.99; // Выживание fails
    c.do({ t: 'travel', x: rock[1] + 1, y: rock[2] });
    expect(until(r, () => !!r.fight, 20_000)).toBe(true);
    expect(r.meeting).toBeNull();
    expect(g.state.log.some((l) => l.startsWith('Засада!'))).toBe(true);
  });

  it('a clean getaway leaves the gang standing an hour behind', () => {
    const { r, c, gang } = meetGang(0);
    r.players.get(c.id)!.game.rng = () => 0; // every roll passes
    say(c, 'Отступить');
    say(c, '…');
    expect(r.fight).toBeNull();
    expect(gang.wait).toBeGreaterThanOrEqual(60);
    expect(gang.calm).toBeGreaterThan(0);
  });

  it('a caravan trades on the spot', () => {
    const { r, clients } = room();
    const [c] = clients;
    const g = r.players.get(c.id)!.game;
    g.apply([{ type: 'travel' }]);
    const t = r.world.travel!;
    Object.assign(t, { x: 20.5, y: 68.5, parties: [{ id: 'caravan_1', tpl: 'caravan', x: 21.5, y: 68.5, path: [], members: ['caravaneer', 'caravan_guard'], hurt: 0, wait: 9999, think: 9999 }] });
    c.do({ t: 'travel', x: 22, y: 68 });
    expect(until(r, () => !!r.meeting)).toBe(true);
    say(c, 'Покажи');
    expect(c.last('window')).toMatchObject({ kind: 'barter', id: CONTENT.travel.parties.caravan.trader });
    expect(r.meeting).toBeNull();
    g.state.caps = 500;
    const before = g.state.caps;
    c.do({ t: 'trade', trader: CONTENT.travel.parties.caravan.trader!, buy: { ammo: 10 }, sell: {} });
    expect(g.state.caps).toBeLessThan(before);
  });

  it('raiders killed on the road count for the board, and «Жажда» grows angry after three beaten gangs', () => {
    const { r, c, g, gang } = meetGang(0);
    g.setFlag('job_thirst_heads', 'active');
    g.setFlag('job_thirst_heads_n', 0);
    g.setFlag('road_gangs_beaten', 2);
    say(c, 'Напасть');
    say(c, '…');
    winFight(r, c);
    c.do({ t: 'lootDone' });
    expect(g.flag('job_thirst_heads_n')).toBe(gang.members.length);
    expect(g.flag('road_gangs_beaten')).toBe(3);
    expect(g.state.log.some((l) => l.includes('назначил цену за вашу голову'))).toBe(true);
    // next morning every bandit lair keeps one gang more
    const ps = r.world.travel!.parties!;
    ps.length = 0;
    r.world.travel!.minute = 23 * 60 + 59;
    c.do({ t: 'travel', x: 5, y: 68 });
    until(r, () => (r.world.flags.day as number) >= 2 || !!r.meeting, 120_000);
    const lairs = CONTENT.travel.lairs.filter((l) => CONTENT.travel.parties[l.party].kind === 'bandits');
    for (const l of lairs) expect(ps.filter((p) => p.lair === l.id).length, l.id).toBe(l.max + 1);
  });
});
