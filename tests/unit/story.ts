// Story tests in a real room: pick answers by their words, walk up to someone and talk, win a fight for real.
import { expect } from 'vitest';
import type { MissionRoom } from '../../src/core/room/Mission';
import { type Client, until } from './rooms';

type R = MissionRoom;

/** Pick the shown answer that contains `text` (skill tags like «[Красноречие 40%]» ignored). */
export function say(c: Client, text: string) {
  const d = c.last('dialogue')!;
  const i = d.options.findIndex((o) => o.includes(text));
  expect(i, `"${text}" in ${JSON.stringify(d.options)} (${d.text.slice(0, 60)})`).toBeGreaterThanOrEqual(0);
  c.do({ t: 'choose', i });
}

export function talk(r: R, c: Client, id: string, from: [number, number]) {
  const before = c.of('dialogue').length;
  c.do({ t: 'debug', op: { op: 'teleport', x: from[0], y: from[1] } });
  c.do({ t: 'interact', id });
  expect(until(r, () => c.of('dialogue').length > before), `talk to ${id}`).toBe(true);
}

/** Win a fight for real: every foe one hit from the end next to us, every shot lands. */
export function winFight(r: R, c: Client) {
  const combat = r.fight!.combat;
  const g = r.players.get(c.id)!.game;
  Object.assign(combat.unit(c.id)!, { hp: 999, maxHp: 999 }); // this is about how a fight ends, not about balance
  for (let n = 0; n < 400 && r.fight; n++) {
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
}
