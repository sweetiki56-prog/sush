// Earning on the road: guarding a caravan to its next stop, and stepping into a fight between two parties.
import { describe, it, expect } from 'vitest';
import { CONTENT } from '../../src/content';
import type { PartyState } from '../../src/core/travel/Parties';
import type { Client } from './rooms';
import { room, until } from './rooms';

const say = (c: Client, start: string) => {
  const d = c.last('dialogue')!;
  const i = d.options.findIndex((o) => o.replace(/^\[[^\]]*%\] /, '').startsWith(start));
  expect(i, `«${start}» in ${JSON.stringify(d.options)}`).toBeGreaterThanOrEqual(0);
  c.do({ t: 'choose', i });
};

/** On the road beside Три столба with these parties standing about. */
function road(parties: PartyState[]) {
  const { r, clients } = room();
  const [c] = clients;
  const g = r.players.get(c.id)!.game;
  g.setFlag('trust_outcome', 'tax');
  g.apply([{ type: 'travel' }]);
  const t = r.world.travel!;
  Object.assign(t, { x: 18.5, y: 61.5, minute: 8 * 60, parties });
  return { r, c, g, t };
}

const caravan = (x: number, y: number, extra: Partial<PartyState> = {}): PartyState => ({
  id: 'caravan_7', tpl: 'caravan', x, y, path: [], members: ['caravaneer', 'caravan_guard', 'caravan_guard'], hurt: 0, wait: 0, think: 9999, route: { id: 'tract', i: 1 }, ...extra,
});

describe('guarding a caravan', () => {
  it('hire on: ride with the caravan, the clock runs, pay and reputation at its next stop', () => {
    const { r, c, g, t } = road([caravan(19.5, 61.5, { wait: 9999 })]);
    c.do({ t: 'travel', x: 19, y: 61 });
    expect(until(r, () => !!r.meeting)).toBe(true);
    const offer = c.last('dialogue')!.options.find((o) => o.startsWith('Нужна охрана'))!;
    expect(offer).toMatch(/Колючка/);
    const pay = Number(offer.match(/\((\d+)/)![1]);
    say(c, 'Нужна охрана');
    say(c, 'По рукам');
    expect(t.escort).toMatchObject({ party: 'caravan_7', to: 'kolyuchka', pay });
    expect(c.last('travel')!.escort).toEqual({ to: 'Колючка', paused: false });
    // space: the caravan stops, and so does the clock
    c.do({ t: 'halt' });
    const at = t.minute;
    r.tick(2000);
    expect(t.minute).toBe(at);
    c.do({ t: 'halt' });
    t.sneak = true; // slip past wanderers on the way
    const caps = g.state.caps;
    const rep = Number(g.flag('rep_guild') ?? 0);
    const xp = g.char.xp;
    expect(until(r, () => !t.escort, 180_000)).toBe(true);
    expect(g.state.caps).toBe(caps + pay);
    expect(Number(g.flag('rep_guild'))).toBe(rep + 3);
    expect(g.char.xp).toBe(xp + 40);
    expect(g.awardXp('escort:kolyuchka', 40)).toBe(false); // another caravan may pay, not level us again
    expect(Math.hypot(t.x - 20.5, t.y - 51.5)).toBeLessThan(1.5); // at Колючка with the caravan
  });

  it('walking off on your own ends the job without pay', () => {
    const { r, c, t } = road([caravan(19.5, 61.5, { wait: 9999 })]);
    c.do({ t: 'travel', x: 19, y: 61 });
    until(r, () => !!r.meeting);
    say(c, 'Нужна охрана');
    say(c, 'По рукам');
    c.do({ t: 'travel', x: 10, y: 68 });
    expect(t.escort).toBeUndefined();
    expect(t.path.length).toBeGreaterThan(0);
  });

  it('bandits that stop the caravan are fought with its guards at our side', () => {
    const { r, c, t } = road([caravan(19.5, 61.5, { wait: 9999 })]);
    c.do({ t: 'travel', x: 19, y: 61 });
    until(r, () => !!r.meeting);
    say(c, 'Нужна охрана');
    say(c, 'По рукам');
    const gang: PartyState = { id: 'gang_3', tpl: 'gang', x: t.x + 0.3, y: t.y, path: [], members: ['raider', 'raider'], hurt: 0, wait: 9999, think: 9999, chasing: 'hero' };
    t.parties!.push(gang);
    expect(until(r, () => !!r.meeting, 5000)).toBe(true);
    say(c, 'Напасть');
    say(c, '…');
    const units = r.fight!.combat.units;
    expect(units.filter((u) => u.id.startsWith('ally_')).map((u) => u.team)).toEqual(['player', 'player', 'player']);
    expect(units.filter((u) => u.id.startsWith('enc_'))).toHaveLength(2);
  });
});

describe('a fight already going on', () => {
  it('bandits on a caravan: help it, win, and the caravan pays and the Guild remembers', () => {
    const gang: PartyState = { id: 'gang_4', tpl: 'gang', x: 20.5, y: 61.5, path: [], members: ['raider'], hurt: 0, wait: 0, think: 9999, fight: { with: 'caravan_7', left: 999 } };
    const car = caravan(20.5, 61.5, { think: 9999, fight: { with: 'gang_4', left: 999 } });
    const { r, c, g, t } = road([gang, car]);
    c.do({ t: 'travel', x: 20, y: 61 });
    expect(until(r, () => !!r.meeting)).toBe(true);
    expect(c.last('dialogue')!.speaker).toBe('Бой на дороге');
    say(c, 'Помочь: Караван');
    say(c, '…');
    const combat = r.fight!.combat;
    expect(combat.units.filter((u) => u.id.startsWith('enc_')).map((u) => u.name)).toEqual([CONTENT.creatures.raider.name]);
    expect(combat.units.filter((u) => u.id.startsWith('ally_'))).toHaveLength(3);
    // the caravan's guards and we finish the raider (a real kill, through the room's rules)
    g.rng = () => 0.01;
    const caps = g.state.caps;
    for (let n = 0; n < 200 && r.fight; n++) {
      const last = c.last('combat')!;
      if (last.sync.busy || last.sync.units[last.sync.idx].id !== c.id) {
        c.ack();
        continue;
      }
      const me = combat.unit(c.id)!;
      me.skills.guns = me.skills.melee = 95;
      g.give('ammo', 5);
      const foe = combat.unit('enc_0')!;
      if (!foe.dead) Object.assign(foe, { hp: 1, x: me.x + 1, y: me.y, fleeAt: 0 });
      if (!foe.dead && me.ap >= 5) c.do({ t: 'attack', target: foe.id });
      else c.do({ t: 'endTurn' });
    }
    r.tick(50);
    if (r.pile) c.do({ t: 'lootDone' });
    expect(g.flag('at')).toBe('world');
    expect(g.state.caps).toBe(caps + 25);
    expect(Number(g.flag('rep_guild'))).toBeGreaterThanOrEqual(5);
    expect(t.parties!.find((p) => p.id === 'caravan_7')!.fight).toBeUndefined();
    expect(t.parties!.some((p) => p.id === 'gang_4')).toBe(false);
  });

  it('keeping out of it leaves them to it', () => {
    const gang: PartyState = { id: 'gang_4', tpl: 'gang', x: 20.5, y: 61.5, path: [], members: ['raider'], hurt: 0, wait: 0, think: 9999, fight: { with: 'caravan_7', left: 999 } };
    const { r, c } = road([gang, caravan(20.5, 61.5, { think: 9999, fight: { with: 'gang_4', left: 999 } })]);
    c.do({ t: 'travel', x: 20, y: 61 });
    until(r, () => !!r.meeting);
    say(c, 'Переждать');
    say(c, '…');
    expect(r.fight).toBeNull();
    expect(r.meeting).toBeNull();
  });
});
