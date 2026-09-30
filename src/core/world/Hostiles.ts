// Hostile creatures outside combat: patrols, the sleeping nest, bait, noticing players.
// Pure logic on Movers; the scene only draws what the room reports.
import type { CreatureDef } from '../combat/types';
import type { Game } from '../Game';
import type { FlagValue } from '../types';
import type { Pathfinder, Tile } from '../../iso/Pathfinder';
import { lineOfSight } from '../../iso/LineOfSight';
import type { MapActor } from '../../world/MapData';
import { Mover } from './Mover';

export const LURE_MS = 60_000;
export const PATROL_SPEED = 1.3;
const PATROL_WAIT = 2500;

export interface Hostile {
  id: string;
  creature: string; // its kind: key in creatures.json
  def: CreatureDef;
  sheet: string;
  group: string;
  mover: Mover;
  home: Tile;
  patrol: Tile[];
  leg: number;
  wait: number;
  asleep: boolean;
  lured: number; // ms left at the bait
  dead: boolean;
  gone: boolean; // fled for good
  ally: boolean; // on the players' side: never notices them, fights with them
  ring: false | 'fists' | 'arms'; // a boxer or an arena fighter: fights only bouts (fists, or own weapons)
}

export class Hostiles {
  readonly list: Hostile[] = [];
  /** Called whenever a hostile starts walking a path (the room broadcasts it). */
  onWalk: (h: Hostile, path: Tile[]) => void = () => {};

  constructor(
    actors: MapActor[],
    private creatures: Record<string, CreatureDef>,
    private flag: (key: string) => FlagValue | undefined,
    private pf: () => Pathfinder,
    private opaque: (x: number, y: number) => boolean,
  ) {
    for (const a of actors) this.add(a);
  }

  /** A creature on the map (or a person turning hostile where they stand). Runaways stay away. */
  add(a: MapActor): Hostile | null {
    if (!a.creature || this.flag(`fled_${a.id}`) || this.byId(a.id)) return null;
    const h: Hostile = {
      id: a.id,
      creature: a.creature,
      def: this.creatures[a.creature],
      sheet: a.sheet,
      group: a.group ?? a.id,
      mover: new Mover(a.x, a.y, a.dir, PATROL_SPEED),
      home: { x: a.x, y: a.y },
      patrol: (a.patrol ?? []).map(([x, y]) => ({ x, y })),
      leg: 0,
      wait: PATROL_WAIT,
      asleep: a.group === 'nest',
      lured: 0,
      dead: !!this.flag(`dead_${a.id}`),
      gone: false,
      ally: !!a.ally,
      ring: a.ring === 'arms' ? 'arms' : a.ring ? 'fists' : false,
    };
    this.list.push(h);
    return h;
  }

  /** Off the map for good (they left the scene). */
  remove(id: string): void {
    const i = this.list.findIndex((h) => h.id === id);
    if (i >= 0) this.list.splice(i, 1);
  }

  get alive(): Hostile[] {
    return this.list.filter((h) => !h.dead && !h.gone);
  }

  byId(id: string): Hostile | undefined {
    return this.list.find((h) => h.id === id);
  }

  at(x: number, y: number): Hostile | undefined {
    return this.alive.find((h) => {
      const t = h.mover.tile;
      return t.x === x && t.y === y;
    });
  }

  group(g: string): Hostile[] {
    return this.alive.filter((h) => h.group === g);
  }

  update(dtMs: number): void {
    for (const h of this.alive) {
      h.mover.update(dtMs / 1000);
      if (h.mover.moving) continue;
      if (h.lured > 0) {
        h.lured -= dtMs;
        if (h.lured <= 0) this.walk(h, h.home, () => (h.asleep = h.group === 'nest'));
        continue;
      }
      if (!h.patrol.length) continue;
      h.wait -= dtMs;
      if (h.wait > 0) continue;
      h.wait = PATROL_WAIT;
      h.leg = (h.leg + 1) % h.patrol.length;
      this.walk(h, h.patrol[h.leg]);
    }
  }

  walk(h: Hostile, to: Tile, done?: () => void): void {
    const path = this.pf().find(h.mover.tile, [to]);
    if (!path) return void done?.();
    h.mover.speed = PATROL_SPEED;
    h.mover.walk(path, done);
    if (path.length) this.onWalk(h, path);
  }

  stopAll(): void {
    for (const h of this.alive) h.mover.stop();
  }

  /** Detection radius in tiles: perception, sleep, the player's sneaking and perks. */
  radius(h: Hostile, sneaking: boolean, g: Game): number {
    let r = 2 + h.def.perception;
    if (h.asleep) r *= 0.8;
    if (sneaking) r *= 0.5;
    return r * Math.max(0.1, 1 + g.mod('detect'));
  }

  /** A hostile that notices the player standing on `p`, or null. Sneaking rolls Скрытность per close step. */
  noticedBy(p: Tile, sneaking: boolean, g: Game): Hostile | null {
    for (const h of this.alive) {
      if (h.lured > 0 || h.ally || h.ring) continue;
      const t = h.mover.tile;
      const d = Math.hypot(t.x - p.x, t.y - p.y);
      const r = this.radius(h, sneaking, g);
      if (d > r || !lineOfSight(this.opaque, t, p)) continue;
      if (!sneaking || !g.silentCheck({ skill: 'sneak' }, -Math.round((r - d) * 10))) return h;
    }
    return null;
  }

  /** Nearest group with a member within `range` of p. */
  nearGroup(p: Tile, range: number): Hostile[] {
    let best: Hostile | null = null;
    let bestD = range;
    for (const h of this.alive) {
      if (h.ally) continue;
      const t = h.mover.tile;
      const d = Math.hypot(t.x - p.x, t.y - p.y);
      if (d <= bestD) {
        best = h;
        bestD = d;
      }
    }
    return best ? this.group(best.group) : [];
  }

  lure(group: Hostile[], spot: Tile, ms = LURE_MS): void {
    group.forEach((h, i) => {
      h.asleep = false;
      h.lured = ms;
      this.walk(h, { x: spot.x + (i % 2), y: spot.y + Math.floor(i / 2) });
    });
  }

  wake(group: Hostile[]): void {
    for (const h of group) h.asleep = false;
  }
}
