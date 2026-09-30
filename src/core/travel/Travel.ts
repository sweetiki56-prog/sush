// The world map as rules: terrain, speed, sight, the clock that runs only while the party moves,
// water on the way and the fog. Pure: the room ticks it and the travel scene draws what it reports.
// See docs/story/world.md «Карта Низовья».
import type { PartyState } from './Parties';

export interface WorldGridData {
  id: string;
  name: string;
  width: number;
  height: number;
  rows: string[];
  roads: [number, number][][];
}

export interface Terrain {
  name: string;
  speed: number; // × the road pace
  sight: number; // × the sight radius
}

export const TERRAIN: Record<string, Terrain> = {
  '=': { name: 'тракт', speed: 1, sight: 1 },
  '.': { name: 'песок', speed: 0.7, sight: 1 },
  '|': { name: 'русло', speed: 0.9, sight: 1.33 },
  ':': { name: 'трещины', speed: 0.6, sight: 1 },
  '^': { name: 'скалы', speed: 0.4, sight: 0.5 },
  x: { name: 'Мёртвые поля', speed: 0.6, sight: 1 },
  _: { name: 'солончак', speed: 0.8, sight: 0.8 },
  s: { name: 'соляное море', speed: 0.6, sight: 1.2 },
  '~': { name: 'дельта', speed: 0.7, sight: 1 },
};

export const MIN_PER_SEC = 45; // game minutes per real second on the road (a road cell in about 1.3 s)
export const ROAD_PACE = 1; // cells per game hour on the road
export const DAY_MIN = 1440;
export const STORM_PACE = 0.7;
export const STORM_SIGHT = 0.5;
export const MORNING = 6 * 60;

/** Where the party is on the world map; shared by the room like flags and saved with it. */
export interface TravelState {
  x: number; // cell coordinates, fractional while walking
  y: number;
  path: [number, number][]; // cells still to walk
  target: string | null; // a location id when heading for one
  minute: number; // minute of the day
  seen: string; // fog: '1' per revealed cell, row by row
  sneak: boolean;
  sinceDrink: number; // minutes of travel since the last water
  parties?: PartyState[]; // everyone else on the map (see Parties.ts)
  encounter?: string; // the party being fought on a battlefield right now
  ally?: string; // the party fighting on our side there (a caravan we help or guard)
  escort?: Escort; // riding with a caravan as its guard
}

/** Hired to guard a caravan to its next stop: we move with it, the clock runs unless paused. */
export interface Escort {
  party: string;
  to: string; // location id of the stop
  pay: number;
  paused: boolean;
}

/**
 * The fog of a save made on a narrower map (the chart grew east in stage K): each old row keeps its cells and
 * the new columns start unseen. A fog of the right size comes back as it is.
 */
export function fitSeen(seen: string, grid: WorldGridData): string {
  const W = grid.width;
  const H = grid.height;
  if (seen.length === W * H) return seen;
  const oldW = Math.floor(seen.length / H);
  if (!oldW) return '0'.repeat(W * H);
  let out = '';
  for (let y = 0; y < H; y++) out += seen.slice(y * oldW, y * oldW + Math.min(oldW, W)).padEnd(W, '0');
  return out;
}

export function freshTravel(grid: WorldGridData, at: [number, number]): TravelState {
  return { x: at[0], y: at[1], path: [], target: null, minute: MORNING, seen: '0'.repeat(grid.width * grid.height), sneak: false, sinceDrink: 0 };
}

export type TravelEvent =
  | { t: 'arrived'; target: string | null } // the path ran out (at a location, or a spot on the map)
  | { t: 'day' } // midnight passed on the road
  | { t: 'drink' } // a day of travel since the last water: everyone needs a flask
  | { t: 'hour' }; // an hour passed (thirst and the like tick by hours)

/** What slows or speeds the party: everyone's Выживание, wounds, thirst, «Следопыт», sneaking. */
export interface PartyPace {
  survival: number; // the best in the party
  tracker: boolean;
  wounded: boolean; // someone below half health
  thirsty: boolean;
  perception: number; // the best
  storm?: boolean; // inside a salt storm: half the sight, slower going
}

export class Travel {
  constructor(
    readonly grid: WorldGridData,
    readonly s: TravelState,
  ) {
    s.seen = fitSeen(s.seen, grid);
  }

  terrainAt(x: number, y: number): Terrain {
    return terrainOf(this.grid, x, y);
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.grid.width && y < this.grid.height;
  }

  /** Cells per game hour here. */
  pace(p: PartyPace, x = this.s.x, y = this.s.y): number {
    let v = ROAD_PACE * this.terrainAt(x, y).speed * (1 + p.survival / 400);
    if (p.tracker) v *= 1.1;
    if (p.wounded) v *= 0.85;
    if (p.thirsty) v *= 0.8;
    if (this.s.sneak) v *= 0.7;
    if (p.storm) v *= STORM_PACE;
    return v;
  }

  night(): boolean {
    return this.s.minute < MORNING || this.s.minute >= 21 * 60;
  }

  /** Sight radius in cells. */
  sight(p: PartyPace): number {
    const r = (3 + Math.floor(p.perception / 2)) * this.terrainAt(this.s.x, this.s.y).sight * (p.storm ? STORM_SIGHT : 1);
    return this.night() ? r / 2 : r;
  }

  /** The cheapest way over the terrain (8 directions, cost = time to cross), from here to a cell. */
  route(to: [number, number], from: [number, number] = [this.s.x, this.s.y]): [number, number][] | null {
    return routeOn(this.grid, from, to);
  }

  /** Head for a cell (or a location at it). False when there is no way. */
  go(to: [number, number], target: string | null = null): boolean {
    const path = this.route(to);
    if (!path) return false;
    this.s.path = path;
    this.s.target = target;
    return true;
  }

  halt(): void {
    this.s.path = [];
    this.s.target = null;
  }

  get moving(): boolean {
    return this.s.path.length > 0;
  }

  /** Real time passes: only while the party moves does the world's clock run. */
  tick(ms: number, p: PartyPace): TravelEvent[] {
    if (!this.moving) return [];
    const s = this.s;
    const ev: TravelEvent[] = [];
    const minutes = (ms / 1000) * MIN_PER_SEC;
    // walk: the pace of the cell underfoot, cell by cell
    let left = minutes;
    while (left > 0 && s.path.length) {
      const [nx, ny] = s.path[0];
      const cx = nx + 0.5;
      const cy = ny + 0.5;
      const d = Math.hypot(cx - s.x, cy - s.y);
      const perMin = this.pace(p) / 60;
      const need = d / perMin;
      if (need <= left) {
        s.x = cx;
        s.y = cy;
        s.path.shift();
        left -= need;
      } else {
        s.x += ((cx - s.x) * (left * perMin)) / d;
        s.y += ((cy - s.y) * (left * perMin)) / d;
        left = 0;
      }
    }
    ev.push(...this.pass(minutes - left, p));
    if (!s.path.length) {
      ev.push({ t: 'arrived', target: s.target });
      s.target = null;
    }
    return ev;
  }

  /** The clock runs `minutes` (walking, or riding with a caravan): hours, midnight, water; the fog lifts around us. */
  pass(minutes: number, p: PartyPace): TravelEvent[] {
    const s = this.s;
    const ev: TravelEvent[] = [];
    const before = s.minute;
    s.minute += minutes;
    s.sinceDrink += minutes;
    if (Math.floor(s.minute / 60) !== Math.floor(before / 60)) ev.push({ t: 'hour' });
    if (s.minute >= DAY_MIN) {
      s.minute -= DAY_MIN;
      ev.push({ t: 'day' });
    }
    if (s.sinceDrink >= DAY_MIN) {
      s.sinceDrink -= DAY_MIN;
      ev.push({ t: 'drink' });
    }
    this.reveal(p);
    return ev;
  }

  /** Lift the fog around the party. */
  reveal(p: PartyPace): void {
    const r = this.sight(p);
    const { width: W } = this.grid;
    const seen = this.s.seen.split('');
    for (let y = Math.floor(this.s.y - r); y <= this.s.y + r; y++)
      for (let x = Math.floor(this.s.x - r); x <= this.s.x + r; x++)
        if (this.inside(x, y) && Math.hypot(x + 0.5 - this.s.x, y + 0.5 - this.s.y) <= r) seen[y * W + x] = '1';
    this.s.seen = seen.join('');
  }

  seenAt(x: number, y: number): boolean {
    return this.s.seen[Math.floor(y) * this.grid.width + Math.floor(x)] === '1';
  }
}

export function terrainOf(grid: WorldGridData, x: number, y: number): Terrain {
  const row = grid.rows[Math.floor(y)];
  return TERRAIN[row?.[Math.floor(x)] ?? '^'] ?? TERRAIN['.'];
}

/** The cheapest way over the terrain between two cells (8 directions, cost = time to cross); A* on a binary heap. */
export function routeOn(grid: WorldGridData, from: [number, number], to: [number, number]): [number, number][] | null {
  const { width: W, height: H } = grid;
  const [tx, ty] = [Math.floor(to[0]), Math.floor(to[1])];
  const [sx, sy] = [Math.floor(from[0]), Math.floor(from[1])];
  if (tx < 0 || ty < 0 || tx >= W || ty >= H || sx < 0 || sy < 0 || sx >= W || sy >= H) return null;
  const idx = (x: number, y: number) => y * W + x;
  const cost = new Float64Array(W * H).fill(Infinity);
  const prev = new Int32Array(W * H).fill(-1);
  const heap: [number, number][] = []; // [cost + estimate, cell]
  const push = (e: [number, number]) => {
    heap.push(e);
    for (let i = heap.length - 1; i > 0; ) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = (): [number, number] => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      for (let i = 0; ; ) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };
  const guess = (x: number, y: number) => Math.hypot(x - tx, y - ty); // the road is the fastest ground: never overestimates
  cost[idx(sx, sy)] = 0;
  push([guess(sx, sy), idx(sx, sy)]);
  const goal = idx(tx, ty);
  while (heap.length) {
    const [, i] = pop();
    if (i === goal) break;
    const x = i % W;
    const y = (i - x) / W;
    const c = cost[i];
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = idx(nx, ny);
        const nc = c + Math.hypot(dx, dy) / terrainOf(grid, nx, ny).speed;
        if (nc < cost[j]) {
          cost[j] = nc;
          prev[j] = i;
          push([nc + guess(nx, ny), j]);
        }
      }
  }
  if (cost[goal] === Infinity) return null;
  const path: [number, number][] = [];
  for (let i = goal; i !== idx(sx, sy); i = prev[i]) path.push([i % W, Math.floor(i / W)]);
  return path.reverse();
}
