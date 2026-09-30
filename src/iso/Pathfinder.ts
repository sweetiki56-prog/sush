// 8-directional A* on a tile grid. Diagonals never cut wall corners.
export interface Tile {
  x: number;
  y: number;
}

export type Blocked = (x: number, y: number) => boolean;

const DIRS: [number, number, number][] = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2],
];

class Heap {
  private a: { k: number; f: number }[] = [];
  get size() {
    return this.a.length;
  }
  push(k: number, f: number) {
    const a = this.a;
    a.push({ k, f });
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].f <= a[i].f) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop(): number {
    const a = this.a;
    const top = a[0];
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l].f < a[m].f) m = l;
        if (r < a.length && a[r].f < a[m].f) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top.k;
  }
}

export class Pathfinder {
  constructor(
    readonly width: number,
    readonly height: number,
    private blocked: Blocked,
  ) {}

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  walkable(x: number, y: number): boolean {
    return this.inside(x, y) && !this.blocked(x, y);
  }

  /**
   * Path from start to the nearest reachable goal (start excluded, goal included).
   * Returns [] if already on a goal, null if no goal is reachable.
   */
  find(start: Tile, goals: Tile[], maxNodes = 20000): Tile[] | null {
    const W = this.width;
    const goalSet = new Set(goals.filter((g) => this.walkable(g.x, g.y)).map((g) => g.y * W + g.x));
    if (!goalSet.size) return null;
    const s = start.y * W + start.x;
    if (goalSet.has(s)) return [];
    const gl = [...goalSet].map((k) => ({ x: k % W, y: Math.floor(k / W) }));
    const h = (x: number, y: number) => {
      let best = Infinity;
      for (const g of gl) {
        const dx = Math.abs(g.x - x);
        const dy = Math.abs(g.y - y);
        best = Math.min(best, Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy));
      }
      return best;
    };
    const gScore = new Map<number, number>([[s, 0]]);
    const came = new Map<number, number>();
    const closed = new Set<number>();
    const open = new Heap();
    open.push(s, h(start.x, start.y));
    let expanded = 0;
    while (open.size) {
      const cur = open.pop();
      if (closed.has(cur)) continue;
      if (goalSet.has(cur)) return this.rebuild(came, cur);
      closed.add(cur);
      if (++expanded > maxNodes) return null;
      const cx = cur % W;
      const cy = Math.floor(cur / W);
      for (const [dx, dy, cost] of DIRS) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (!this.walkable(nx, ny)) continue;
        if (dx && dy && (!this.walkable(cx + dx, cy) || !this.walkable(cx, cy + dy))) continue; // no corner cutting
        const nk = ny * W + nx;
        if (closed.has(nk)) continue;
        const g = gScore.get(cur)! + cost;
        if (g < (gScore.get(nk) ?? Infinity)) {
          gScore.set(nk, g);
          came.set(nk, cur);
          open.push(nk, g + h(nx, ny));
        }
      }
    }
    return null;
  }

  /** Walkable tiles surrounding a footprint, used as goals when walking up to an object. */
  around(x: number, y: number, w = 1, h = 1): Tile[] {
    const out: Tile[] = [];
    for (let yy = y - 1; yy <= y + h; yy++)
      for (let xx = x - 1; xx <= x + w; xx++) {
        const inFoot = xx >= x && xx < x + w && yy >= y && yy < y + h;
        if (!inFoot && this.walkable(xx, yy)) out.push({ x: xx, y: yy });
      }
    return out;
  }

  private rebuild(came: Map<number, number>, end: number): Tile[] {
    const W = this.width;
    const path: Tile[] = [];
    let k: number | undefined = end;
    while (k !== undefined && came.has(k)) {
      path.push({ x: k % W, y: Math.floor(k / W) });
      k = came.get(k);
    }
    return path.reverse();
  }
}
