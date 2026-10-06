// Meetings on the road, the room's side: a party touching ours stops the clock and opens a talk built for it
// (core/travel/Encounters.ts); how the talk ends decides what happens: part, flee, fight, hire on, join a fight.
import { battleDialogue, meetingDialogue } from '../travel/Encounters';
import type { Parties, PartyState } from '../travel/Parties';
import type { EncounterAction } from '../types';
import type { MissionRoom } from './Mission';
import { heroOnMap, partiesOf, stormAt, travelOf } from './Road';
import { HEAD_START_MIN, startBattle } from './RoadBattle';

const AMBUSH_GROUND = ['^', 'x']; // rocks, the Dead fields
const AMBUSH_EYES = 8; // Восприятие that always spots one
const CALM_MIN = 180; // after a peaceful parting they leave the party be for three hours
const HIRE_MIN_CELLS = 3; // shorter hops pay nothing worth the name
const HIRE_BASE = 15;
const HIRE_PER_CELL = 2.5;

/** A party reached ours: the clock stops and the talk opens (the host speaks for the party; co-op reads the log). */
export function meet(room: MissionRoom, ps: Parties, p: PartyState): void {
  const tr = travelOf(room)!;
  const host = room.host;
  if (!host || room.meeting || room.fight) return;
  const tpl = ps.tpl(p);
  const hero = heroOnMap(room);
  if (p.id === hero.escort) return; // our own caravan
  if (hero.sneak && p.chasing !== 'hero' && !p.fight) return room.logAll(`Вы пропускаете стороной: ${tpl.name}.`); // unseen, nothing to talk about
  tr.halt();
  // a fight already going on: we may join either side
  const other = p.fight ? ps.byId(p.fight.with) : undefined;
  if (other) {
    const [bandits, victim] = tpl.kind === 'bandits' ? [p, other] : [other, p];
    room.meeting = bandits.id;
    room.meetingAlly = victim.id;
    room.logAll(`Вы натыкаетесь на бой: ${tpl.name} и ${ps.tpl(other).name}.`);
    room.talkOnRoad(host, `road_${bandits.id}`, battleDialogue(ps.tpl(bandits), ps.tpl(victim)));
    return room.sendTravel(true);
  }
  const ground = room.worldMap!.rows[Math.floor(p.y)]?.[Math.floor(p.x)] ?? '.';
  // a gang on the hunt lies in wait in rocks and the Dead fields: Выживание, sharp eyes or a dog see it coming
  const spotted = !!tpl.seen && !!room.world.flags[tpl.seen];
  if ((tpl.kind === 'bandits' || tpl.ambush) && !spotted && p.chasing === 'hero' && (AMBUSH_GROUND.includes(ground) || stormAt(room, p.x, p.y))) {
    const games = [...room.players.values()].map((q) => q.game);
    if (!games.some((g) => g.attr('per') >= AMBUSH_EYES || g.hasMod('sentry') || g.silentCheck({ skill: 'survival' }))) {
      room.logAll(`Засада! ${tpl.name} бьёт из укрытия.`);
      room.sendTravel(true);
      return room.defer(() => startBattle(room, ps, p, true, escorted(room, ps)));
    }
    room.logAll('Вы замечаете засаду раньше, чем она вас.');
  }
  room.meeting = p.id;
  room.logAll(`Вы натыкаетесь на отряд: ${tpl.name}.`);
  const written = tpl.dialogue ? room.content.dialogues[tpl.dialogue] : undefined;
  const d = written ? { ...written, portrait: written.portrait ?? tpl.portrait } : meetingDialogue({
    party: tpl,
    count: p.members.length,
    ratio: hero.strength / Math.max(1, ps.strength(p)),
    terrain: ground,
    sneak: hero.sneak,
    trustEnemy: hero.trustEnemy,
    hire: hireTerms(room, ps, p) ?? undefined,
  });
  room.talkOnRoad(host, `road_${p.id}`, d);
  room.sendTravel(true);
}

/** The caravan we guard, if any: it fights beside us. */
function escorted(room: MissionRoom, ps: Parties): PartyState | undefined {
  const id = room.world.travel?.escort?.party;
  return id ? ps.byId(id) : undefined;
}

/** A caravan on its way takes a guard to its next stop; the pay grows with the distance. */
export function hireTerms(room: MissionRoom, ps: Parties, p: PartyState): { stop: string; to: string; pay: number } | null {
  if (ps.tpl(p).kind !== 'caravan' || !p.route || room.world.travel?.escort) return null;
  const stop = room.content.travel.routes.find((r) => r.id === p.route!.id)?.stops[p.route.i];
  const loc = stop ? room.content.locations[stop] : undefined;
  if (!stop || !loc) return null;
  const cells = Math.hypot(loc.cell[0] + 0.5 - p.x, loc.cell[1] + 0.5 - p.y);
  if (cells < HIRE_MIN_CELLS) return null;
  return { stop, to: loc.name, pay: Math.round(HIRE_BASE + cells * HIRE_PER_CELL) };
}

/** The meeting's talk closed: part ways, slip off with a head start, fight, hire on, or join a fight in progress. */
export function settleMeeting(room: MissionRoom, action: EncounterAction | null): void {
  const id = room.meeting;
  const allyId = room.meetingAlly;
  room.meeting = null;
  room.meetingAlly = null;
  const ps = partiesOf(room);
  const p = id ? ps?.byId(id) : undefined;
  if (!ps || !p) return;
  const other = allyId ? ps.byId(allyId) : undefined;
  switch (action) {
    case 'fight':
    case 'ambush':
      return startBattle(room, ps, p, action === 'ambush', escorted(room, ps));
    case 'help':
      return startBattle(room, ps, p, false, other);
    case 'turn':
      if (other) return startBattle(room, ps, other, false, p);
      break;
    case 'flee':
      ps.part(p.id, HEAD_START_MIN * 2, HEAD_START_MIN);
      room.logAll('Вы оторвались. У вас около часа форы.');
      break;
    case 'hire': {
      const terms = hireTerms(room, ps, p);
      if (!terms) break;
      room.world.travel!.escort = { party: p.id, to: terms.stop, pay: terms.pay, paused: false };
      p.wait = 0; // off we go
      room.logAll(`Вы идёте с караваном до места «${terms.to}». Плата — у ворот. Пробел — привал, клик по карте — уйти от каравана.`);
      break;
    }
    default:
      ps.part(p.id, CALM_MIN);
  }
  room.sendTravel(true);
  room.save();
}

/** Debug: a party of this kind stands still beside ours (tests and poking in the console). */
export function placeParty(room: MissionRoom, tpl: string, dx: number, dy: number, members?: string[], route?: string): void {
  const t = room.world.travel;
  const ps = partiesOf(room);
  if (!t || !ps || !room.content.travel.parties[tpl]) return;
  const p = ps.spawn(tpl, [Math.floor(t.x + dx), Math.floor(t.y + dy)]);
  if (members) p.members = members;
  if (route && room.content.travel.routes.some((r) => r.id === route)) p.route = { id: route, i: 1 };
  Object.assign(p, { wait: 9999, think: 9999 });
  room.sendTravel(true);
}
