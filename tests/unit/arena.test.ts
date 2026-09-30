import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { CONTENT } from '../../src/content';
import { ArenaRoom } from '../../src/core/room/Arena';
import { decodeLoadout, defaultLoadout, encodeLoadout, loadoutCharacter, loadoutState, validLoadout, type Loadout } from '../../src/core/room/loadout';
import type { Intent, ServerMsg } from '../../src/core/room/protocol';
import { skill } from '../../src/core/character/Character';
import { fixedRng } from '../../src/core/rng';
import type { MapData } from '../../src/world/MapData';

const ARENA = JSON.parse(readFileSync('public/assets/maps/arena.json', 'utf8')) as MapData;

describe('arena builds', () => {
  it('accepts a free build within the limits and turns it into a sheet', () => {
    const l = validLoadout({ ...defaultLoadout(), attrs: { str: 10, per: 10, end: 10, cha: 1, int: 1, agi: 10, luk: 10 }, level: 6, perks: ['tough', 'quickhands', 'sharpeye', 'thickskin', 'tracker'], skills: { guns: 150 } }, CONTENT)!;
    expect(l).not.toBeNull();
    const c = loadoutCharacter(l, CONTENT);
    expect(skill(c, CONTENT.character, 'guns')).toBe(150);
    expect(c.level).toBe(6);
    const s = loadoutState(l, CONTENT, { x: 1, y: 1, dir: 0 });
    expect(s.items).toMatchObject({ rifle: 1, machete: 1, jacket: 1, ammo: CONTENT.arena.ammoPerGun });
    expect(s.equipped).toEqual({ weapon: 'rifle', alt: 'machete', charms: [], armor: 'jacket' });
  });

  it('builds carry up to two charms; three, or an unknown one, fail the check', () => {
    const base = defaultLoadout();
    const l = validLoadout({ ...base, charms: ['lucky_nut', 'venom_ward'] }, CONTENT)!;
    expect(loadoutState(l, CONTENT, { x: 1, y: 1, dir: 0 }).equipped.charms).toEqual(['lucky_nut', 'venom_ward']);
    expect(validLoadout({ ...base, charms: ['lucky_nut', 'venom_ward', 'lens'] }, CONTENT)).toBeNull();
    expect(validLoadout({ ...base, charms: ['rifle'] }, CONTENT)).toBeNull();
    const old: Partial<typeof base> = { ...base }; // a build shared before charms existed
    delete old.charms;
    expect(validLoadout(old, CONTENT)?.charms).toEqual([]);
  });

  it('rejects builds that break the rules', () => {
    const base = defaultLoadout();
    expect(validLoadout({ ...base, attrs: { ...base.attrs, str: 11 } }, CONTENT)).toBeNull();
    expect(validLoadout({ ...base, level: 9 }, CONTENT)).toBeNull();
    expect(validLoadout({ ...base, perks: ['tough', 'tough2'] }, CONTENT)).toBeNull();
    expect(validLoadout({ ...base, level: 1, perks: ['tough'] }, CONTENT)).toBeNull(); // a perk per level after the first
    expect(validLoadout({ ...base, weapons: ['rifle', 'shotgun', 'sledge'] }, CONTENT)).toBeNull();
    expect(validLoadout({ ...base, weapons: ['claw'] }, CONTENT)).toBeNull(); // monster parts are not for sale
    expect(validLoadout({ ...base, items: { tincan: 99 } }, CONTENT)).toBeNull();
    expect(validLoadout({ ...base, armor: 'power_armor' }, CONTENT)).toBeNull();
    expect(validLoadout({ ...base, name: '   ' }, CONTENT)).toBeNull();
  });

  it('a build travels as a short code', () => {
    const l = { ...defaultLoadout(), name: 'Жнец' };
    expect(decodeLoadout(encodeLoadout(l), CONTENT)).toEqual(l);
    expect(decodeLoadout('мусор', CONTENT)).toBeNull();
  });
});

class Client {
  msgs: ServerMsg[] = [];
  id = '';
  link = { send: (m: ServerMsg) => void this.msgs.push(m) };
  constructor(private room: ArenaRoom) {}
  last<T extends ServerMsg['t']>(t: T): Extract<ServerMsg, { t: T }> | undefined {
    return this.msgs.filter((m) => m.t === t).at(-1) as Extract<ServerMsg, { t: T }> | undefined;
  }
  do(i: Intent) {
    this.room.handle(this.id, i);
  }
}

function arena() {
  const room = new ArenaRoom({ mode: 'arena', code: 'ARENA', content: CONTENT, map: ARENA, maxPlayers: 6, turnLimitMs: 30_000, rng: fixedRng([0.0]), debug: true });
  const shooter: Loadout = { ...defaultLoadout(), name: 'Стрелок', skills: { guns: 150 }, weapons: ['rifle'], armor: null, items: {} };
  const a = new Client(room);
  const b = new Client(room);
  a.id = room.joinArena('ta', { ...shooter, name: 'Аня' }, a.link).id;
  b.id = room.joinArena('tb', { ...shooter, name: 'Боря' }, b.link).id;
  return { room, a, b };
}

/** Play the round: whoever's turn it is shoots the other one (or walks closer), everyone acks. */
function playRound(room: ArenaRoom, cs: Client[]) {
  for (let n = 0; n < 400 && room.fight; n++) {
    const f = room.fight;
    const sync = f.sync();
    if (sync.busy) {
      for (const c of cs) {
        const last = c.last('combat');
        if (last) c.do({ t: 'ack', seq: last.seq });
      }
      continue;
    }
    const me = cs.find((c) => c.id === f.combat.current.id)!;
    const foe = f.combat.units.find((u) => u.side === 'player' && u.id !== me.id && !u.dead);
    if (!foe) {
      me.do({ t: 'endTurn' });
      continue;
    }
    const pv = f.combat.preview(f.combat.current, foe);
    if (!pv.reason) me.do({ t: 'attack', target: foe.id });
    else if (pv.reason === 'Не хватает очков действия.' || f.combat.current.ap <= 0) me.do({ t: 'endTurn' });
    else me.do({ t: 'step', x: foe.x, y: foe.y + 1 });
  }
}

describe('arena room', () => {
  it('ready up, count down, fight a round, score it, then the next round starts by itself', () => {
    const { room, a, b } = arena();
    expect(a.last('arena')!.phase).toBe('lobby');
    a.do({ t: 'ready', on: true });
    expect(room.phase).toBe('lobby'); // one ready is not enough
    b.do({ t: 'ready', on: true });
    expect(room.phase).toBe('countdown');
    room.tick(CONTENT.arena.startCountdownMs + 50);
    expect(room.phase).toBe('fight');
    expect(a.last('combat')).toBeTruthy();
    playRound(room, [a, b]);
    expect(room.phase).toBe('break');
    const s = a.last('arena')!;
    expect(Object.values(s.scores)).toEqual([1]);
    expect(s.lastRound).toMatch(/Аня|Боря/);
    const winner = Object.keys(s.scores)[0];
    expect(s.kills[winner]).toBe(1);
    expect(s.damage[winner]).toBeGreaterThan(0);
    room.tick(CONTENT.arena.roundPauseMs + 50);
    expect(room.phase).toBe('fight');
    expect(room.round).toBe(2);
    // everyone is back at full health for the new round
    for (const p of room.players.values()) expect(p.game.state.hp).toBe(p.game.maxHp);
  });

  it('the first to three round wins takes the match; ready again for a rematch', () => {
    const { room, a, b } = arena();
    a.do({ t: 'ready', on: true });
    b.do({ t: 'ready', on: true });
    room.tick(CONTENT.arena.startCountdownMs + 50);
    for (let r = 0; r < 12 && room.phase !== 'done'; r++) {
      playRound(room, [a, b]);
      if (room.phase === 'break') room.tick(CONTENT.arena.roundPauseMs + 50);
    }
    expect(room.phase).toBe('done');
    const s = a.last('arena')!;
    expect(s.winner).not.toBeNull();
    expect(s.scores[s.winner!]).toBe(CONTENT.arena.rounds);
    a.do({ t: 'ready', on: true });
    b.do({ t: 'ready', on: true });
    expect(room.phase).toBe('countdown');
    room.tick(CONTENT.arena.startCountdownMs + 50);
    expect(room.round).toBe(1);
    expect(a.last('arena')!.scores).toEqual({});
  });

  it('a new build is checked and applied between rounds', () => {
    const { room, a } = arena();
    a.do({ t: 'loadout', loadout: { ...defaultLoadout(), name: 'Танк', armor: 'exo', weapons: ['sledge'] } });
    const p = room.players.get(a.id)!;
    expect(p.game.char.name).toBe('Танк');
    expect(p.game.armor?.dt).toBe(7);
    a.do({ t: 'loadout', loadout: { ...defaultLoadout(), level: 99 } });
    expect(p.game.state.log.at(-1)).toBe('Снаряжение не прошло проверку.');
  });
});
