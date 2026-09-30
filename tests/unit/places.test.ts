// Stage T engine: towns opened by conditions, a board per town, arrival and morning hooks, day marks,
// one-of-a-kind parties on the world map, and bouts on the ring.
import { describe, it, expect } from 'vitest';
import { CONTENT } from '../../src/content';
import { flagsHold } from '../../src/core/Game';
import { MissionRoom } from '../../src/core/room/Mission';
import type { PartyState } from '../../src/core/travel/Parties';
import type { MapData } from '../../src/world/MapData';
import { Client, FIELDS, MAP, premadeState, room, until, untilAlone, WORLD, ARENA } from './rooms';

describe('conditions and effects for places', () => {
  it('a flag compared with another flag: the day of a raid', () => {
    expect(flagsHold({ day: 5, raid_day: 5 }, [{ flag: 'day', gteFlag: 'raid_day' }])).toBe(true);
    expect(flagsHold({ day: 4, raid_day: 5 }, [{ flag: 'day', gteFlag: 'raid_day' }])).toBe(false);
    expect(flagsHold({ day: 4, raid_day: 5 }, [{ flag: 'day', ltFlag: 'raid_day' }])).toBe(true);
  });

  it('dayMark sets a day from today', () => {
    const { r, clients } = room();
    const g = r.players.get(clients[0].id)!.game;
    g.setFlag('day', 4);
    g.apply([{ type: 'dayMark', key: 'raid_day', in: 3 }]);
    expect(g.flag('raid_day')).toBe(7);
  });

  it('every town has its own board', () => {
    const board = CONTENT.dialogues.board;
    const pillars = CONTENT.dialogues.board_pillars;
    expect(board.speaker).toBe('Доска у колодца');
    expect(pillars.speaker).toBe('Доска наград');
    const takes = (d: typeof board) => d.nodes.board.options.filter((o) => o.text.startsWith('Взять')).map((o) => o.text);
    for (const [id, j] of Object.entries(CONTENT.jobs)) {
      const on = (j.board ?? 'rusty_well') === 'three_pillars' ? pillars : board;
      const off = on === board ? pillars : board;
      expect(takes(on).some((t) => t.includes(j.title)), id).toBe(true);
      expect(takes(off).some((t) => t.includes(j.title)), id).toBe(false);
    }
  });
});

/** A room that knows one more map: `town`, with the given hooks and actors. */
function withTown(patch: Partial<MapData>, roll = 0.5) {
  const town: MapData = { ...structuredClone(ARENA), id: 'test_town', name: 'Городок', entries: { default: [5, 5] }, actors: [], triggers: [], ...patch };
  const first = premadeState(2);
  const r = new MissionRoom(
    { mode: 'solo', code: 'T', content: CONTENT, map: MAP, maps: { rusty_well: MAP, test_town: town, ...FIELDS }, worldMap: WORLD, rng: () => roll, debug: true, maxPlayers: 4, turnLimitMs: null },
    { flags: first.flags, quests: first.quests, stats: first.stats },
  );
  const c = new Client(r);
  c.id = r.join('tok', first, c.link).id;
  return { r, c, g: r.players.get(c.id)!.game };
}

describe('arriving somewhere', () => {
  it('map hooks fire on arrival and every morning spent there', () => {
    const { r, g } = withTown({ arrive: [{ if: [{ flag: 'day', gteFlag: 'raid_day' }, { notFlag: 'raid_now' }], effects: [{ type: 'flag', key: 'raid_now' }], log: 'Сухари у тропы!' }] });
    g.setFlag('day', 2);
    g.setFlag('raid_day', 3);
    r.goTo('test_town');
    expect(g.flag('raid_now')).toBeFalsy();
    g.apply([{ type: 'rest' }]);
    expect(g.flag('day')).toBe(3);
    expect(g.flag('raid_now')).toBe(true);
    expect(g.state.log).toContain('Сухари у тропы!');
  });

  it('a town opens only while its conditions hold; reaching Запруда can end the chapter', () => {
    const { r, clients } = room();
    const [c] = clients;
    const g = r.players.get(c.id)!.game;
    g.setFlag('trust_outcome', 'tax');
    g.apply([{ type: 'travel' }]);
    // Три столба open once Chapter I is done
    g.setFlag('chapter1_done', false);
    r.world.travel!.parties = [];
    c.do({ t: 'travel', to: 'three_pillars' });
    expect(untilAlone(r, () => r.world.travel!.path.length === 0)).toBe(true);
    expect(g.flag('at')).toBe('world');
    expect(g.state.log.some((l) => l.includes('Три столба') && l.includes('главе II'))).toBe(true);
    g.setFlag('chapter1_done');
    c.do({ t: 'travel', to: 'three_pillars' }); // standing at its gates: in at once
    r.tick(50);
    expect(untilAlone(r, () => g.flag('at') === 'three_pillars')).toBe(true);
    expect(g.stage('tract')).toBe('rumors'); // the arrival hook starts the chapter
    // Запруда's gate ends Chapter II once the Notary's name is known
    g.setFlag('notary_known');
    r.runHooks(r.host!, CONTENT.locations.zapruda.reach);
    expect(g.flag('chapter2_done')).toBe(true);
  });
});

describe('one of a kind on the world map', () => {
  it('a unique party is out while its flag holds and gone for good once beaten', () => {
    const { r, clients } = room();
    const [c] = clients;
    const g = r.players.get(c.id)!.game;
    const saved = CONTENT.travel.uniques;
    CONTENT.travel.uniques = [{ id: 'hunt_test', party: 'gang', cell: [16, 36], if: [{ flag: 'hunt_on' }], roam: 0 }];
    try {
      g.setFlag('trust_outcome', 'tax');
      g.apply([{ type: 'travel' }]);
      const t = r.world.travel!;
      const has = () => t.parties!.some((p: PartyState) => p.id === 'hunt_test');
      expect(has()).toBe(false);
      g.setFlag('hunt_on');
      c.do({ t: 'travel', x: 10, y: 36 });
      expect(until(r, has, 60_000)).toBe(true);
      g.setFlag('gone_hunt_test');
      t.parties = t.parties!.filter((p: PartyState) => p.id !== 'hunt_test');
      c.do({ t: 'travel', x: 20, y: 36 });
      r.tick(20_000);
      expect(has()).toBe(false);
    } finally {
      CONTENT.travel.uniques = saved;
    }
  });
});

describe('the ring', () => {
  const boxer = { id: 'boxer', sheet: 'raider', creature: 'raider', x: 7, y: 5, dir: 5, label: 'Боец', dialogue: 'none', ring: true, peace: [{ notFlag: 'ring_fight' }] };

  function bout(win: boolean) {
    const { r, c, g } = withTown({ actors: [boxer] }, 0.01); // every blow lands
    r.goTo('test_town');
    g.give('grenade', 1);
    g.setFlag('ring_fight');
    expect(r.fight).not.toBeNull();
    expect(r.ring).toBe(true);
    const combat = r.fight!.combat;
    expect(combat.units.map((u) => u.weapons)).toEqual([['fists'], ['fists']]);
    // no items on the ring
    c.do({ t: 'useItem', item: 'stim' });
    for (let n = 0; n < 400 && r.fight; n++) {
      const last = c.last('combat')!;
      if (last.sync.busy || last.sync.units[last.sync.idx].id !== c.id) {
        c.ack();
        continue;
      }
      const me = combat.unit(c.id)!;
      const foe = combat.unit('boxer')!;
      if (win) Object.assign(foe, { hp: 1, x: me.x + 1, y: me.y });
      else me.hp = 1;
      if (win && me.ap >= 3) c.do({ t: 'attack', target: 'boxer' });
      else c.do({ t: 'endTurn' });
    }
    return { r, c, g };
  }

  it('a won bout: the boxer is knocked down, not killed, and is back behind the ropes to talk to', () => {
    const { r, g } = bout(true);
    expect(r.fight).toBeNull();
    expect(g.flag('ring_result')).toBe('won');
    expect(g.flag('dead_boxer')).toBeFalsy();
    expect(r.npcs.has('boxer')).toBe(true);
    expect(r.hostiles.byId('boxer')).toBeUndefined();
  });

  it('a lost bout is not the end: you come round with 1 HP', () => {
    const { r, c, g } = bout(false);
    expect(r.fight).toBeNull();
    expect(g.flag('ring_result')).toBe('lost');
    expect(g.state.hp).toBeGreaterThanOrEqual(1);
    expect(c.last('gameOver')).toBeUndefined();
    expect(r.defeated).toBe(false);
  });
});
