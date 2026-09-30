import { describe, it, expect } from 'vitest';
import { CONTENT } from '../../src/content';
import { room, until } from './rooms';

describe('mission room (solo)', () => {
  it('welcomes the player with the whole scene', () => {
    const { clients } = room();
    const w = clients[0].last('welcome')!;
    expect(w.you).toBe('player');
    const ids = w.actors.map((a) => a.id);
    expect(ids).toEqual(expect.arrayContaining(['player', 'marta', 'hank', 'scorp_big', 'scorp_road']));
    expect(w.hostiles.find((h) => h.id === 'scorp_big')!.asleep).toBe(true);
  });

  it('walks where it is told and remembers the spot', () => {
    const { r, clients } = room();
    const [c] = clients;
    c.do({ t: 'walk', x: 6, y: 26 });
    expect(c.last('walk')).toMatchObject({ id: 'player' });
    expect(until(r, () => !r.players.get('player')!.mover.moving)).toBe(true);
    expect(r.players.get('player')!.game.state.player).toMatchObject({ x: 6, y: 26 });
  });

  it('walks up to Marta, talks, and ends the talk', () => {
    const { r, clients } = room();
    const [c] = clients;
    c.do({ t: 'debug', op: { op: 'teleport', x: 12, y: 25 } });
    c.do({ t: 'interact', id: 'marta' });
    expect(until(r, () => !!c.last('dialogue'))).toBe(true);
    const d = c.last('dialogue')!;
    expect(d.speaker).toBeTruthy();
    expect(d.options.length).toBeGreaterThan(1);
    c.do({ t: 'choose', i: d.options.length - 1 }); // "Мне пора."
    expect(c.last('dialogueEnd')).toBeTruthy();
    expect(r.players.get('player')!.talk).toBeNull();
  });

  it('the nest notices a careless player; the fight is paced by client acks', () => {
    const { r, clients } = room();
    const [c] = clients;
    c.do({ t: 'debug', op: { op: 'teleport', x: 31, y: 21 } });
    c.do({ t: 'debug', op: { op: 'rig', values: [0.0] } }); // every sting lands and crits
    c.do({ t: 'walk', x: 31, y: 15 });
    expect(until(r, () => !!r.fight)).toBe(true);
    const seq = r.fight!.seq;
    r.tick(1000);
    expect(r.fight!.seq).toBe(seq); // nothing moves on until the client has animated
    for (let n = 0; n < 200 && !c.last('combatEnd'); n++) {
      const last = c.last('combat')!;
      if (!last.sync.busy && last.sync.units[last.sync.idx].id === 'player') c.do({ t: 'endTurn' });
      else c.ack();
    }
    expect(c.last('combatEnd')!.outcome).toBe('defeat');
    expect(c.last('gameOver')).toBeTruthy();
    expect(r.players.get('player')!.game.state.log.at(-1)).toBe('Пустошь забирает вас.');
  });

  it('turn timeout ends an idle human turn in co-op', () => {
    const { r, clients } = room(2);
    const [a, b] = clients;
    a.do({ t: 'debug', op: { op: 'combat', ids: ['scorp_road'] } });
    expect(r.fight).not.toBeNull();
    // both clients acknowledge until a human has to act
    for (let n = 0; n < 50 && r.fight!.sync().busy; n++) {
      a.ack();
      b.ack();
    }
    const turn = r.fight!.combat.current.id;
    expect(['player', 'p2']).toContain(turn);
    r.tick(31_000);
    for (let n = 0; n < 50 && r.fight && r.fight.sync().busy; n++) {
      a.ack();
      b.ack();
    }
    expect(r.fight?.combat.current.id ?? '').not.toBe(turn);
  });
});

describe('mission room (co-op)', () => {
  it('players share flags and quest XP but keep their own bags', () => {
    const { r, clients } = room(2);
    const [a, b] = clients;
    expect(b.id).toBe('p2');
    const pa = r.players.get(a.id)!;
    const pb = r.players.get(b.id)!;
    expect(pa.game.state.flags).toBe(pb.game.state.flags);
    const xpB = pb.game.char.xp;
    pa.game.setStage('water', 'find_station');
    expect(pb.game.stage('water')).toBe('find_station');
    const stageXp = CONTENT.quests.water.stages.find((s) => s.id === 'find_station')?.xp ?? 0;
    expect(pb.game.char.xp).toBe(xpB + stageXp);
    pa.game.give('crowbar');
    expect(pb.game.count('crowbar')).toBe(0);
    expect(a.of('spawn').length + b.of('welcome').length).toBeGreaterThan(0);
  });

  it('one NPC talks to one player at a time', () => {
    const { r, clients } = room(2);
    const [a, b] = clients;
    a.do({ t: 'debug', op: { op: 'teleport', x: 12, y: 25 } });
    b.do({ t: 'debug', op: { op: 'teleport', x: 16, y: 25 } });
    a.do({ t: 'interact', id: 'marta' });
    expect(until(r, () => !!a.last('dialogue'))).toBe(true);
    b.do({ t: 'interact', id: 'marta' });
    until(r, () => !r.players.get(b.id)!.mover.moving, 5000);
    expect(b.last('dialogue')).toBeUndefined();
    expect(r.players.get(b.id)!.game.state.log.at(-1)).toMatch(/занят разговором/);
  });

  it('items change hands between players standing close', () => {
    const { r, clients } = room(2);
    const [a, b] = clients;
    a.do({ t: 'debug', op: { op: 'teleport', x: 10, y: 26 } });
    b.do({ t: 'debug', op: { op: 'teleport', x: 11, y: 26 } });
    a.do({ t: 'give', to: b.id, item: 'bandage' });
    expect(r.players.get(b.id)!.game.count('bandage')).toBe(2);
    expect(r.players.get(a.id)!.game.count('bandage')).toBe(0);
  });

  it('a downed ally can be lifted with a bandage in a fight', () => {
    const { r, clients } = room(2);
    const [a, b] = clients;
    a.do({ t: 'debug', op: { op: 'teleport', x: 20, y: 27 } });
    b.do({ t: 'debug', op: { op: 'teleport', x: 21, y: 27 } });
    a.do({ t: 'debug', op: { op: 'combat', ids: ['scorp_road'] } });
    const c = r.fight!.combat;
    // play until it is a human's turn, then knock the other one down
    for (let n = 0; n < 50 && r.fight!.sync().busy; n++) {
      a.ack();
      b.ack();
    }
    const me = c.current;
    const other = c.units.find((u) => u.side === 'player' && u.id !== me.id)!;
    other.hp = 0;
    other.dead = true;
    other.x = me.x + 1;
    other.y = me.y;
    const helper = clients.find((x) => x.id === me.id)!;
    const pl = r.players.get(me.id)!;
    pl.game.give('bandage');
    pl.game.rng = () => 0; // the Медицина roll succeeds
    helper.do({ t: 'revive', target: other.id });
    expect(other.dead).toBe(false);
    expect(other.hp).toBeGreaterThan(0);
    expect(r.players.get(other.id)!.game.state.hp).toBe(other.hp);
    expect(me.ap).toBe(me.maxAp - 3);
  });
});

describe('many maps', () => {
  it('the party moves to another map and back; the world stays the same', () => {
    const { r, clients } = room(2);
    const [a, b] = clients;
    const g = r.players.get(a.id)!.game;
    g.setFlag('pump_fixed');
    expect(r.goTo('arena')).toBe(true);
    expect(a.last('welcome')!.map).toBe('arena');
    expect(b.last('welcome')!.map).toBe('arena');
    expect(r.world.flags.at).toBe('arena');
    expect(r.npcs.has('marta')).toBe(false);
    const [pa, pb] = [r.players.get(a.id)!.mover.tile, r.players.get(b.id)!.mover.tile];
    expect(pa).not.toEqual(pb); // side by side, not on one tile
    expect(r.goTo('rusty_well', 'road')).toBe(true);
    expect(r.npcs.has('marta')).toBe(true);
    expect(r.world.flags.pump_fixed).toBe(true);
    expect(r.goTo('nowhere')).toBe(false);
  });
});
