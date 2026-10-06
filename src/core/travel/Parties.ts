// Parties on the world map (Mount & Blade style): bandits roam round their lairs and chase the weak,
// caravans walk their routes and rest in towns, Trust patrols circle the tract, wanderers drift,
// Сухостои come out at night. They move only while the world's clock runs (the hero is on the move).
import type { CreatureDef, WeaponDef } from '../combat/types';
import type { Rng } from '../rng';
import type { Condition, Effect } from '../types';
import { MORNING, routeOn, terrainOf, type WorldGridData } from './Travel';

export type PartyKind = 'bandits' | 'caravan' | 'trust' | 'wanderers' | 'dry' | 'beast';

export interface PartyTemplate {
  name: string;
  kind: PartyKind;
  faction?: string;
  members: [string, number, number][]; // creature, how many at least, at most
  pace: number; // × the road pace
  sight: number; // cells
  hostile?: boolean; // goes after the hero
  night?: boolean; // only out between dusk and dawn
  trader?: string; // barter with them
  toll?: number; // what bandits ask to let you pass
  dialogue?: string; // a written meeting talk instead of the one built for the kind (story encounters)
  portrait?: string; // the party leader's dialogue portrait, attached by the content catalog
  ambush?: boolean; // lies in wait like bandits do (rocks, the Dead fields, a storm), whatever its kind
  seen?: string; // a flag: the hero saw them coming, so they talk instead of shooting from cover
}

/** One of a kind on the map (a bounty's target): out while `if` holds, gone for good once beaten. */
export interface UniqueParty {
  id: string;
  party: string;
  cell: [number, number];
  if?: Condition[];
  roam?: number; // cells around its spot (0: stays put)
  route?: string; // walks this route from its first stop instead of roaming (a story caravan)
  beaten?: Effect[]; // what beating it brings (a cache it guarded)
}

export interface TravelContent {
  parties: Record<string, PartyTemplate>;
  lairs: { id: string; cell: [number, number]; party: string; max: number }[];
  routes: { id: string; party: string; stops: string[]; every: number; from: number; loop?: boolean }[];
  roamers: { party: string; count: number; area: [number, number, number, number] }[];
  battlefields: Record<string, string>; // terrain char -> the map a fight there is fought on
  uniques?: UniqueParty[];
  storms?: Storm[];
}

/** A salt storm standing over a stretch of the map while its conditions hold: half the sight, slower going. */
export interface Storm {
  id: string;
  area?: [number, number, number, number]; // fixed rectangle, inclusive
  route?: [number, number][]; // moving 3×3 storm: centre at each hour of the cycle
  if?: Condition[];
}

export interface PartyState {
  id: string;
  tpl: string;
  x: number;
  y: number;
  path: [number, number][];
  members: string[]; // creature ids, rolled when the party appears
  hurt: number; // 0..1: losses since, strength shrinks with them
  home?: [number, number]; // lair or area centre
  lair?: string;
  route?: { id: string; i: number };
  area?: [number, number, number, number];
  wait: number; // minutes to stand (a caravan in town)
  think: number; // minutes to the next decision
  chasing?: 'hero' | string; // the hero or a party id
  met?: boolean; // touching the hero now (a meeting starts once until they part)
  calm?: number; // minutes they leave the hero be (paid off, talked down, lost the trail)
  fight?: { with: string; left: number }; // locked in a fight with another party: minutes till it is decided
  roam?: number; // how far from home it wanders (uniques)
  chased?: number; // minutes spent chasing the hero in this pursuit
}

export type PartyEvent =
  | { t: 'meet'; id: string } // this party reached the hero
  | { t: 'battle'; a: string; b: string } // two parties started fighting (the hero may still come and join)
  | { t: 'clash'; winner: string; loser: string } // two parties fought it out without the hero
  | { t: 'arrive'; id: string; at: string } // a caravan reached a stop
  | { t: 'gaveUp'; id: string }; // a pursuer lost the hero and turned away

export interface HeroOnMap {
  x: number;
  y: number;
  strength: number;
  sneak: boolean;
  water: boolean; // carries water (Сухостои smell it)
  trustEnemy: boolean; // the Trust hunts the hero
  escort?: string; // the caravan the hero guards: bandits meet the hero there, not a lone caravan
}

const MEET = 0.7; // cells
export const CLASH_MIN = 120; // how long two parties fight before it is decided
const THINK_MIN = 60;
const CHASE_THINK = 10; // a pursuer looks where the hero is now this often (minutes)
export const CHASE_MAX = 180; // a pursuit that has not caught up in three hours is given up
const GIVE_UP_CALM = 360; // and they leave the hero be for six hours

/** A fighter's worth: health × the best average damage it can deal, as one number. */
export function fighterStrength(hp: number, weapons: string[], all: Record<string, WeaponDef>, dr = 0): number {
  const best = Math.max(1, ...weapons.map((w) => (all[w] ? (all[w].dmg[0] + all[w].dmg[1]) / 2 * (all[w].burst ?? 1) : 0)));
  return (hp * best * (1 + dr / 100)) / 10;
}

export function templateStrength(members: string[], creatures: Record<string, CreatureDef>, weapons: Record<string, WeaponDef>, hurt = 0): number {
  return members.reduce((s, id) => s + (creatures[id] ? fighterStrength(creatures[id].hp, creatures[id].weapons, weapons, creatures[id].dr) : 0), 0) * (1 - hurt);
}

/** How a party compares with the hero, in words (the colours of M&B). */
export function strengthWord(them: number, us: number): string {
  const r = them / Math.max(1, us);
  return r < 0.6 ? 'слабее вас' : r < 1.2 ? 'вровень с вами' : r < 2 ? 'сильнее вас' : 'намного сильнее вас';
}

const isNight = (minute: number) => minute < MORNING || minute >= 21 * 60;

export class Parties {
  constructor(
    readonly grid: WorldGridData,
    readonly list: PartyState[],
    readonly content: TravelContent,
    readonly creatures: Record<string, CreatureDef>,
    readonly weapons: Record<string, WeaponDef>,
    readonly locations: Record<string, { cell: [number, number] }>,
    readonly rng: Rng,
  ) {}

  tpl(p: PartyState): PartyTemplate {
    return this.content.parties[p.tpl];
  }

  strength(p: PartyState): number {
    return templateStrength(p.members, this.creatures, this.weapons, p.hurt);
  }

  byId(id: string): PartyState | undefined {
    return this.list.find((p) => p.id === id);
  }

  private nextId(prefix: string): string {
    for (let i = 1; ; i++) if (!this.byId(`${prefix}_${i}`)) return `${prefix}_${i}`;
  }

  private roll(tpl: PartyTemplate): string[] {
    const out: string[] = [];
    for (const [id, lo, hi] of tpl.members) for (let n = lo + Math.floor(this.rng() * (hi - lo + 1)); n > 0; n--) out.push(id);
    return out;
  }

  private add(tplId: string, at: [number, number], extra: Partial<PartyState>): PartyState {
    const tpl = this.content.parties[tplId];
    const p: PartyState = { id: this.nextId(tplId), tpl: tplId, x: at[0] + 0.5, y: at[1] + 0.5, path: [], members: this.roll(tpl), hurt: 0, wait: 0, think: 0, ...extra };
    this.list.push(p);
    return p;
  }

  /** A party of this template at a cell (debug and scripted meetings). */
  spawn(tplId: string, at: [number, number]): PartyState {
    return this.add(tplId, at, {});
  }

  /** Keep the world stocked: every morning lairs refill and caravans set out on their days; wanderers and night herds any hour. */
  populate(day: number, minute: number, morning: boolean, angry = 0, uniques: UniqueParty[] = []): void {
    // one of a kind: out while its conditions hold (the caller filters), off the map once they do not
    const due = new Set(uniques.map((u) => u.id));
    for (const u of this.content.uniques ?? []) if (!due.has(u.id) && this.byId(u.id)) this.remove(u.id);
    for (const u of uniques) if (!this.byId(u.id)) this.add(u.party, u.cell, u.route ? { id: u.id, route: { id: u.route, i: 1 } } : { id: u.id, home: u.cell, roam: u.roam ?? 3 });
    // `angry`: «Жажда» remembers the gangs the hero beat and keeps more of them out
    for (const lair of morning ? this.content.lairs : []) {
      const alive = this.list.filter((p) => p.lair === lair.id).length;
      const max = lair.max + (this.content.parties[lair.party].kind === 'bandits' ? angry : 0);
      for (let n = alive; n < max; n++) this.add(lair.party, lair.cell, { lair: lair.id, home: lair.cell });
    }
    for (const r of this.content.routes) {
      if (this.list.some((p) => p.route?.id === r.id) || (!morning && !r.loop)) continue;
      if (!r.loop && (day < r.from || (day - r.from) % r.every)) continue;
      this.add(r.party, this.locations[r.stops[0]].cell, { route: { id: r.id, i: 0 } });
    }
    for (const ro of this.content.roamers) {
      const tpl = this.content.parties[ro.party];
      if (tpl.night && !isNight(minute)) continue;
      const alive = this.list.filter((p) => p.tpl === ro.party).length;
      for (let n = alive; n < ro.count; n++) {
        const [x0, y0, x1, y1] = ro.area;
        this.add(ro.party, [x0 + Math.floor(this.rng() * (x1 - x0)), y0 + Math.floor(this.rng() * (y1 - y0))], { area: ro.area, home: [(x0 + x1) >> 1, (y0 + y1) >> 1] });
      }
    }
  }

  /** The world's clock ran `minutes`: everyone decides now and then, walks, meets and clashes. */
  step(minutes: number, hero: HeroOnMap, minute: number): PartyEvent[] {
    const ev: PartyEvent[] = [];
    for (const p of [...this.list]) {
      const tpl = this.tpl(p);
      if (tpl.night && !isNight(minute)) {
        this.remove(p.id); // back into the sand at dawn
        continue;
      }
      if (p.fight) {
        p.fight.left -= minutes; // they stand and fight; the hero may still come
      } else p.think -= minutes;
      if (!p.fight && p.think <= 0) {
        const was = p.chasing;
        p.think = THINK_MIN;
        this.decide(p, hero, minute);
        if (p.chasing === 'hero') p.think = CHASE_THINK; // keep the hero in sight: re-aim often
        // lost sight of the hero mid-pursuit: they turn away and leave the hero be for a while
        else if (was === 'hero' && !p.calm && Math.hypot(p.x - hero.x, p.y - hero.y) > tpl.sight) {
          this.part(p.id, GIVE_UP_CALM);
          ev.push({ t: 'gaveUp', id: p.id });
        }
      }
      // a pursuit ends one way or the other: caught (a meeting), or given up after a while or out of sight
      if (p.chasing === 'hero' && Math.hypot(p.x - hero.x, p.y - hero.y) < MEET) p.chased = 0; // caught up: the meeting settles it
      else if (p.chasing === 'hero') {
        p.chased = (p.chased ?? 0) + minutes;
        const far = Math.hypot(p.x - hero.x, p.y - hero.y) > tpl.sight * 1.5;
        if (p.chased >= CHASE_MAX || far) {
          this.part(p.id, GIVE_UP_CALM);
          this.wander(p, 6);
          ev.push({ t: 'gaveUp', id: p.id });
        }
      } else p.chased = 0;
      if (p.calm) p.calm = Math.max(0, p.calm - minutes);
      if (p.wait > 0) p.wait -= minutes;
      else if (!p.fight) this.walk(p, minutes);
      const d = Math.hypot(p.x - hero.x, p.y - hero.y);
      if (d < MEET && !p.met) {
        p.met = true;
        ev.push({ t: 'meet', id: p.id });
      } else if (d > MEET * 3) p.met = false;
      if (p.route && !p.path.length && p.wait <= 0) this.nextStop(p, ev);
    }
    this.clashes(ev, hero);
    return ev;
  }

  /** A meeting is over: they leave the hero be for a while; `wait` keeps them standing (a head start). */
  part(id: string, calm: number, wait = 0): void {
    const p = this.byId(id);
    if (!p) return;
    p.calm = calm;
    p.wait = Math.max(p.wait, wait);
    p.chasing = undefined;
    p.think = 0;
  }

  remove(id: string): void {
    const i = this.list.findIndex((p) => p.id === id);
    if (i >= 0) this.list.splice(i, 1);
  }

  /** Who a party goes for, runs from, or where it wanders. */
  private decide(p: PartyState, hero: HeroOnMap, minute: number): void {
    const tpl = this.tpl(p);
    const mine = this.strength(p);
    // night halves everyone's eyes but the Сухостои's, who go by smell
    const sees = (x: number, y: number, r = tpl.sight) => Math.hypot(x - p.x, y - p.y) <= r * (isNight(minute) && tpl.kind !== 'dry' ? 0.5 : 1);
    const heroSeen = !p.calm && sees(hero.x, hero.y, tpl.sight * (hero.sneak ? 0.5 : 1));
    p.chasing = undefined;
    if (tpl.kind === 'bandits') {
      if (heroSeen && hero.strength > mine * 1.6) return this.flee(p, hero);
      if (heroSeen && hero.strength <= mine * 1.25) return this.chase(p, hero, 'hero');
      const prey = this.list.find((o) => o !== p && o.route && o.id !== hero.escort && !o.fight && this.tpl(o).kind === 'caravan' && sees(o.x, o.y) && this.strength(o) < mine * 1.1);
      if (prey) return this.chase(p, prey, prey.id);
      return this.wander(p, 6);
    }
    if (tpl.kind === 'beast') {
      // a pack goes for prey it can take and keeps clear of the rest
      if (heroSeen && hero.strength <= mine * 1.25) return this.chase(p, hero, 'hero');
      return this.wander(p, p.roam ?? 3);
    }
    if (tpl.kind === 'dry') {
      if (heroSeen && hero.water) return this.chase(p, hero, 'hero');
      return this.wander(p, 5);
    }
    if (tpl.kind === 'trust' && (hero.trustEnemy || tpl.hostile) && heroSeen) return this.chase(p, hero, 'hero'); // hunters sent for the hero come anyway
    if (p.route) {
      if (!p.path.length && p.wait <= 0) this.headFor(p, this.locations[this.routeOf(p).stops[p.route.i]].cell);
      return;
    }
    this.wander(p, 5);
  }

  private routeOf(p: PartyState) {
    return this.content.routes.find((r) => r.id === p.route!.id)!;
  }

  /** A caravan (or a patrol) reached its stop: rest there, then on to the next; the last stop ends a caravan's trip. */
  private nextStop(p: PartyState, ev: PartyEvent[]): void {
    const r = this.routeOf(p);
    const stop = this.locations[r.stops[p.route!.i]].cell;
    if (Math.hypot(p.x - stop[0] - 0.5, p.y - stop[1] - 0.5) > 1) return this.headFor(p, stop);
    ev.push({ t: 'arrive', id: p.id, at: r.stops[p.route!.i] });
    p.route!.i++;
    if (p.route!.i >= r.stops.length) {
      if (!r.loop) return this.remove(p.id);
      p.route!.i = 0;
    }
    p.wait = this.tpl(p).kind === 'caravan' ? 12 * 60 : 2 * 60;
    this.headFor(p, this.locations[r.stops[p.route!.i]].cell);
  }

  private headFor(p: PartyState, cell: [number, number]): void {
    p.path = routeOn(this.grid, [p.x, p.y], cell) ?? [];
  }

  private chase(p: PartyState, target: { x: number; y: number }, id: string): void {
    p.chasing = id;
    p.wait = 0;
    this.headFor(p, [Math.floor(target.x), Math.floor(target.y)]);
  }

  private flee(p: PartyState, from: { x: number; y: number }): void {
    const dx = p.x - from.x;
    const dy = p.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const to: [number, number] = [Math.floor(p.x + (dx / len) * 6), Math.floor(p.y + (dy / len) * 6)];
    this.headFor(p, [Math.max(0, Math.min(this.grid.width - 1, to[0])), Math.max(0, Math.min(this.grid.height - 1, to[1]))]);
  }

  /** Drift to a random spot near home (or within the area). */
  private wander(p: PartyState, r: number): void {
    if (p.path.length && this.rng() < 0.7) return;
    const [hx, hy] = p.home ?? [Math.floor(p.x), Math.floor(p.y)];
    const area = p.area;
    const x = area ? area[0] + Math.floor(this.rng() * (area[2] - area[0])) : hx + Math.floor((this.rng() - 0.5) * 2 * r);
    const y = area ? area[1] + Math.floor(this.rng() * (area[3] - area[1])) : hy + Math.floor((this.rng() - 0.5) * 2 * r);
    this.headFor(p, [Math.max(0, Math.min(this.grid.width - 1, x)), Math.max(0, Math.min(this.grid.height - 1, y))]);
  }

  private walk(p: PartyState, minutes: number): void {
    const tpl = this.tpl(p);
    let left = minutes;
    while (left > 0 && p.path.length) {
      const [nx, ny] = p.path[0];
      const cx = nx + 0.5;
      const cy = ny + 0.5;
      const d = Math.hypot(cx - p.x, cy - p.y);
      const perMin = (tpl.pace * terrainOf(this.grid, p.x, p.y).speed) / 60;
      const need = d / perMin;
      if (need <= left) {
        p.x = cx;
        p.y = cy;
        p.path.shift();
        left -= need;
      } else {
        p.x += ((cx - p.x) * left * perMin) / d;
        p.y += ((cy - p.y) * left * perMin) / d;
        left = 0;
      }
    }
  }

  /** Bandits that catch a caravan (or anyone they chase) fight it: a while, then the stronger side, with luck, wins. */
  private clashes(ev: PartyEvent[], hero: HeroOnMap): void {
    for (const a of [...this.list]) {
      if (a.fight) {
        const b = this.byId(a.fight.with);
        if (!b) a.fight = undefined;
        else if (a.fight.left <= 0) this.decideFight(a, b, ev);
        continue;
      }
      if (!a.chasing || a.chasing === 'hero' || a.chasing === hero.escort) continue;
      const b = this.byId(a.chasing);
      if (!b || b.fight || Math.hypot(a.x - b.x, a.y - b.y) > MEET) continue;
      a.fight = { with: b.id, left: CLASH_MIN };
      b.fight = { with: a.id, left: CLASH_MIN };
      a.path = [];
      b.path = [];
      ev.push({ t: 'battle', a: a.id, b: b.id });
    }
  }

  /** A fight between two parties ends: the loser is gone, the winner is hurt. */
  decideFight(a: PartyState, b: PartyState, ev: PartyEvent[]): void {
    const sa = this.strength(a) * (0.7 + this.rng() * 0.6);
    const sb = this.strength(b) * (0.7 + this.rng() * 0.6);
    const [w, l, sw, sl] = sa >= sb ? [a, b, sa, sb] : [b, a, sb, sa];
    w.hurt = Math.min(0.8, w.hurt + sl / (sw + sl));
    w.chasing = undefined;
    w.fight = undefined;
    this.remove(l.id);
    ev.push({ t: 'clash', winner: w.id, loser: l.id });
  }

  /** Mend a little every day: wounded bands heal back to full over a few days. */
  mend(): void {
    for (const p of this.list) p.hurt = Math.max(0, p.hurt - 0.25);
  }
}
