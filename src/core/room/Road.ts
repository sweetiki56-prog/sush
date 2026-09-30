// The mission room on the world map: leaving a place, heading somewhere, the clock and water on the way,
// arriving. The rules of the road live in core/travel; this is the room's side of them.
import { areaKnown, areasOf, placeOfMap } from '../places';
import { DAY_MIN, freshTravel, MIN_PER_SEC, MORNING, Travel, type PartyPace, type TravelEvent } from '../travel/Travel';
import { fighterStrength, Parties, strengthWord, type HeroOnMap, type PartyEvent } from '../travel/Parties';
import type { Intent } from './protocol';
import type { AreaDef, LocationDef } from '../types';
import type { MissionRoom } from './Mission';
import type { Player } from './Room';
import { newDay } from './Days';
import { flagsHold } from '../Game';
import { trade } from './Trade';
import { drops, lowerFirst } from '../words';
import { meet } from './Meetings';
import { partyOf } from '../companions';

const SEND_MS = 200;
const THIRST_HP = 3; // per hour on the road without water
const ESCORT_REP = 3; // Guild reputation for a caravan brought in
const ESCORT_XP = 40;

/** How the whole party walks: the best eyes and scout, the worst wounds and thirst. */
export function partyPace(room: MissionRoom): PartyPace {
  const games = [...room.players.values()].map((p) => p.game);
  return {
    survival: Math.max(0, ...games.map((g) => g.skill('survival'))),
    perception: Math.max(0, ...games.map((g) => g.attr('per'))),
    tracker: games.some((g) => g.hasPerk('tracker')),
    wounded: games.some((g) => g.state.hp < g.maxHp / 2),
    thirsty: games.some((g) => g.body.thirsty),
    storm: !!room.world.travel && stormAt(room, room.world.travel.x, room.world.travel.y),
  };
}

/** Salt storms raging now (their conditions hold), as rectangles on the map. */
export function activeStorms(room: MissionRoom): [number, number, number, number][] {
  return (room.content.travel.storms ?? []).filter((s) => flagsHold(room.world.flags, s.if)).map((s) => s.area);
}

export function stormAt(room: MissionRoom, x: number, y: number): boolean {
  return activeStorms(room).some(([x0, y0, x1, y1]) => x >= x0 && x < x1 + 1 && y >= y0 && y < y1 + 1);
}

/** Everyone else on the world map, over the shared travel state. */
export function partiesOf(room: MissionRoom): Parties | null {
  const grid = room.worldMap;
  const s = room.world.travel;
  if (!grid || !s) return null;
  const c = room.content;
  return new Parties(grid, (s.parties ??= []), c.travel, c.creatures, c.weapons, c.locations, () => room.roll());
}

/** The hero's party as the others see it: where, how strong, sneaking, carrying water, wanted by the Trust. */
export function heroOnMap(room: MissionRoom): HeroOnMap {
  const t = room.world.travel!;
  const games = [...room.players.values()].map((p) => p.game);
  let strength = games.reduce((s, g) => s + fighterStrength(g.state.hp, g.hands().length ? g.hands() : ['fists'], g.content.weapons, (g.armor?.dr ?? 0) + g.mod('dr')), 0);
  // riding with a caravan: its guns count too
  const ps = t.escort && partiesOf(room);
  const car = ps ? ps.byId(t.escort!.party) : undefined;
  if (ps && car) strength += ps.strength(car);
  // companions fight too
  for (const id of partyOf(room.world.flags, room.content.companions ?? {})) {
    const def = room.content.creatures[room.content.companions[id].creature];
    if (def) strength += fighterStrength(def.hp, def.weapons, room.content.weapons, def.dr);
  }
  return { x: t.x, y: t.y, strength, sneak: t.sneak, water: games.some((g) => g.count('flask') > 0), trustEnemy: room.world.flags.trust_outcome === 'fight', escort: t.escort?.party };
}

/** Parties the hero can see right now, for the map. */
export function visibleParties(room: MissionRoom) {
  const tr = travelOf(room);
  const ps = partiesOf(room);
  if (!tr || !ps) return [];
  const r = tr.sight(partyPace(room));
  const hero = heroOnMap(room);
  return ps.list
    .filter((p) => Math.hypot(p.x - tr.s.x, p.y - tr.s.y) <= r)
    .map((p) => {
      const tpl = ps.tpl(p);
      const stop = p.route ? room.content.locations[room.content.travel.routes.find((x) => x.id === p.route!.id)!.stops[p.route.i]]?.name : undefined;
      const sheet = room.content.creatures[p.members[0]]?.sheet ?? 'raider';
      return { id: p.id, kind: tpl.kind, name: tpl.name, x: p.x, y: p.y, word: strengthWord(ps.strength(p), hero.strength), heading: stop, chasing: p.chasing === 'hero', sheet, count: p.members.length };
    });
}

export const GANGS_TO_ANGER = 3; // beaten gangs before «Жажда» sends more

/** Keep the map stocked (lairs refill in the morning); «Жажда» keeps an extra gang out once it is angry. */
function populate(room: MissionRoom, morning: boolean): void {
  if (room.quietRoad) return;
  const f = room.world.flags;
  const angry = Number(f.road_gangs_beaten ?? 0) >= GANGS_TO_ANGER ? 1 : 0;
  const uniques = (room.content.travel.uniques ?? []).filter((u) => !f[`gone_${u.id}`] && flagsHold(f, u.if));
  partiesOf(room)?.populate(Number(f.day ?? 1), room.world.travel!.minute, morning, angry, uniques);
}

export function travelOf(room: MissionRoom): Travel | null {
  const grid = room.worldMap;
  const s = room.world.travel;
  return grid && s ? new Travel(grid, s) : null;
}

/** Out of a town onto the world map, standing at the town's cell. */
export function leaveToWorld(room: MissionRoom, p: Player): boolean {
  const grid = room.worldMap;
  if (!grid || room.fight) return false;
  const here = placeOfMap(room.content.locations, room.map.id ?? '')?.loc;
  const cell = here?.cell ?? [grid.width / 2, grid.height / 2];
  const t = (room.world.travel ??= freshTravel(grid, cell));
  t.x = cell[0] + 0.5;
  t.y = cell[1] + 0.5;
  t.path = [];
  t.target = null;
  for (const q of room.players.values()) {
    if (q.talk) room.closeTalk(q);
    q.game.state.travel = t;
  }
  p.game.setFlag('at', 'world');
  new Travel(grid, t).reveal(partyPace(room));
  populate(room, !t.parties?.length);
  p.game.log(`Вы выходите на дорогу. ${here ? `${here.name} остаётся позади.` : ''}`.trim());
  room.resyncAll();
  room.save();
  return true;
}

/** Intents on the world map: where to go, stop, sneak, camp. Bag work (items, gear) stays with the room. */
export function roadIntent(room: MissionRoom, p: Player, i: Intent): boolean {
  const tr = travelOf(room);
  if (!tr) return false;
  switch (i.t) {
    case 'enter':
      enterArea(room, p, i.loc, i.area);
      return true;
    case 'travel': {
      if (room.meeting) return true;
      if (tr.s.escort) {
        tr.s.escort = undefined;
        room.logAll('Вы уходите от каравана. Плата пропала.');
      }
      const loc = i.to ? room.content.locations[i.to] : undefined;
      const cell: [number, number] | null = loc ? loc.cell : i.x !== undefined && i.y !== undefined ? [Math.floor(i.x), Math.floor(i.y)] : null;
      if (!cell || !tr.go(cell, loc ? i.to! : null)) p.game.log('Туда не пройти.');
      else if (loc && !tr.moving) roadEvent(room, { t: 'arrived', target: i.to! }); // already standing at its gates
      room.sendTravel(true);
      return true;
    }
    case 'halt':
      tr.halt();
      if (tr.s.escort) {
        tr.s.escort.paused = !tr.s.escort.paused;
        room.logAll(tr.s.escort.paused ? 'Караван встаёт на привал.' : 'Караван трогается.');
      }
      room.sendTravel(true);
      return true;
    case 'camp':
      camp(room, tr);
      return true;
    case 'trade': {
      // a caravan or scavengers' cart standing by
      const ps = partiesOf(room)!;
      const near = ps.list.some((q) => ps.tpl(q).trader === i.trader && Math.hypot(q.x - tr.s.x, q.y - tr.s.y) < 1.5);
      if (near && trade(p.game, i.trader, { buy: i.buy, sell: i.sell })) room.save();
      return true;
    }
    case 'sneak':
      tr.s.sneak = i.on;
      p.game.log(i.on ? 'Отряд идёт скрытно: медленнее, но заметить труднее.' : 'Отряд идёт открыто.');
      room.sendTravel(true);
      return true;
  }
  return false;
}

/** Make camp where the party stands: sleep till morning (a new day if midnight passes), wounds close, water is drunk. */
function camp(room: MissionRoom, tr: Travel): void {
  tr.halt();
  const s = tr.s;
  const hours = ((MORNING - s.minute + DAY_MIN) % DAY_MIN || DAY_MIN) / 60;
  const pastMidnight = s.minute >= MORNING; // sleeping till the next morning crosses midnight
  s.minute = MORNING;
  s.sinceDrink += hours * 60;
  const people = [...room.players.values()];
  if (pastMidnight) newDay(room, room.host!);
  if (s.sinceDrink >= DAY_MIN) {
    s.sinceDrink -= DAY_MIN;
    for (const q of people) q.game.drink();
  }
  for (const q of people) {
    q.game.tick(hours * 3600_000);
    if (!q.game.body.thirsty) q.game.state.hp = q.game.maxHp;
    q.game.log(q.game.body.thirsty ? 'Привал без воды: сон не лечит.' : `Привал до утра (${Math.round(hours)} ч). Раны затянулись.`);
    q.game.events.emit('stats');
  }
  room.sendTravel(true);
  room.save();
}

/** Time passes on the road while the party moves: on its own feet, or riding with a caravan it guards. */
export function roadTick(room: MissionRoom, ms: number): void {
  const tr = travelOf(room);
  if (!tr || room.meeting) return;
  const esc = tr.s.escort;
  const riding = !!esc && !esc.paused && !tr.moving;
  const ps = partiesOf(room)!;
  // standing still with someone on your heels: the clock runs, and they close in (or give up)
  const hunted = !tr.moving && !riding && ps.list.some((p) => p.chasing === 'hero' && !p.calm);
  if (!tr.moving && !riding && !hunted) return;
  const minutes = (ms / 1000) * MIN_PER_SEC;
  if (hunted) {
    const events = ps.step(minutes, heroOnMap(room), tr.s.minute);
    const clock = tr.pass(minutes, partyPace(room));
    for (const e of events) partyEvent(room, ps, e);
    for (const e of clock) roadEvent(room, e);
    return room.sendTravel(false, SEND_MS);
  }
  if (riding) {
    // the caravan sets the pace: we stay at its side
    const events = ps.step(minutes, heroOnMap(room), tr.s.minute);
    const car = ps.byId(esc.party);
    if (car) Object.assign(tr.s, { x: car.x, y: car.y });
    const clock = tr.pass(minutes, partyPace(room));
    for (const e of events) partyEvent(room, ps, e);
    for (const e of clock) roadEvent(room, e);
    if (tr.s.escort && !ps.byId(tr.s.escort.party)) {
      room.logAll('Каравана больше нет. Платить некому.');
      tr.s.escort = undefined;
    }
    return room.sendTravel(false, SEND_MS);
  }
  const events = tr.tick(ms, partyPace(room));
  // the others move on the same clock
  for (const e of ps.step(minutes, heroOnMap(room), tr.s.minute)) partyEvent(room, ps, e);
  for (const e of events) roadEvent(room, e);
  room.sendTravel(false, SEND_MS);
}

/** The caravan we guard reached its stop: pay at the gates. */
function escortArrived(room: MissionRoom): void {
  const t = room.world.travel!;
  const esc = t.escort!;
  t.escort = undefined;
  const where = room.content.locations[esc.to]?.name ?? esc.to;
  room.host?.game.apply([
    { type: 'caps', amount: esc.pay },
    { type: 'inc', key: 'rep_guild', by: ESCORT_REP },
    { type: 'inc', key: 'road_escorts' },
    { type: 'flag', key: `arrived_${esc.party}` }, // a story caravan (a unique party) knows it got there
    { type: 'log', text: `Караван дошёл: ${where}. Караванщик отсчитывает ${esc.pay} ${drops(esc.pay)}.` },
  ]);
  for (const q of room.players.values()) q.game.addXp(ESCORT_XP);
  room.sendTravel(true);
  room.save();
}

function partyEvent(room: MissionRoom, ps: Parties, e: PartyEvent): void {
  const tr = travelOf(room)!;
  if (e.t === 'meet') {
    const p = ps.byId(e.id);
    if (p) meet(room, ps, p);
  }
  if (e.t === 'arrive' && tr.s.escort?.party === e.id && tr.s.escort.to === e.at) escortArrived(room);
  if (e.t === 'gaveUp') {
    const p = ps.byId(e.id);
    if (p) room.logAll(`${ps.tpl(p).name}: отстали и повернули прочь.`);
  }
  if (e.t === 'battle') {
    const [a, b] = [ps.byId(e.a), ps.byId(e.b)];
    if (a && b && Math.hypot(a.x - tr.s.x, a.y - tr.s.y) <= tr.sight(partyPace(room)))
      room.logAll(`Впереди бой: ${lowerFirst(ps.tpl(a).name)} против отряда «${ps.tpl(b).name}». Успеете — можно вмешаться.`);
  }
  if (e.t === 'clash') {
    const w = ps.byId(e.winner);
    if (w && Math.hypot(w.x - tr.s.x, w.y - tr.s.y) <= tr.sight(partyPace(room))) room.logAll(`Вдалеке ${lowerFirst(ps.tpl(w).name)} бьётся с кем-то. Потом всё стихает.`);
  }
}

function roadEvent(room: MissionRoom, e: TravelEvent): void {
  const host = room.host;
  if (!host) return;
  const people = [...room.players.values()];
  switch (e.t) {
    case 'day':
      newDay(room, host);
      populate(room, true);
      partiesOf(room)?.mend();
      break;
    case 'drink':
      for (const q of people) q.game.drink();
      break;
    case 'hour':
      populate(room, false);
      for (const q of people)
        if (q.game.body.thirsty) {
          q.game.addHp(-THIRST_HP);
          q.game.log('Жажда: губы трескаются, в глазах песок.');
        }
      break;
    case 'arrived': {
      room.sendTravel(true);
      const loc = e.target ? room.content.locations[e.target] : undefined;
      if (!loc) break;
      room.runHooks(host, loc.reach);
      const known = knownAreas(room, loc);
      // a choice of areas: the town's plan; one known area: straight in at the main road
      if (known.length > 1 && host.game.testAll(loc.open)) {
        room.broadcast({ t: 'town', loc: e.target! });
        break;
      }
      if (known.length && host.game.testAll(loc.open) && room.goTo(known[0].map, known[0].entry)) {
        host.game.log(`Вы входите: ${loc.name}.`);
        break;
      }
      if (loc.secret) break; // its hooks told what is here
      for (const q of people) q.game.log(`${loc.name}. ${loc.chapter ? `Сюда дорога откроется в главе ${ROMAN[loc.chapter] ?? loc.chapter}.` : 'Здесь пока нечего делать.'}`);
      break;
    }
  }
}

/** The areas of a place the party knows of: visited ones, and those whose `known` conditions hold. */
export function knownAreas(room: MissionRoom, loc: LocationDef): AreaDef[] {
  const host = room.host;
  return host ? areasOf(loc).filter((a) => areaKnown(a, room.world.flags, (c) => host.game.testAll(c))) : [];
}

/** From the town's plan: walk into one of its known areas (only while the party stands at that town). */
function enterArea(room: MissionRoom, p: Player, locId: string, map: string): void {
  const tr = travelOf(room);
  const loc = room.content.locations[locId];
  if (!tr || !loc || room.meeting || tr.moving) return;
  if (Math.floor(tr.s.x) !== loc.cell[0] || Math.floor(tr.s.y) !== loc.cell[1] || !p.game.testAll(loc.open)) return;
  const area = knownAreas(room, loc).find((a) => a.map === map);
  if (area && room.goTo(area.map, area.entry)) room.host?.game.log(`Вы входите: ${area.name === loc.name ? loc.name : `${loc.name}, ${area.name}`}.`);
}

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
