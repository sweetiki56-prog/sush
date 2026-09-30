// Path following in continuous tile coordinates. The room moves every walker with it;
// the scene's Actor wraps the same class, so what players see matches what the room decided.
import { dirFromVector, gridToScreen } from '../../iso/IsoMath';
import type { Tile } from '../../iso/Pathfinder';

export class Mover {
  gx: number; // continuous tile coords of the feet (tile index + 0.5 = centered)
  gy: number;
  path: Tile[] = [];
  private onArrive: (() => void) | null = null;
  private lastTile: Tile;
  onTile: ((tile: Tile) => void) | null = null; // entered a new tile

  constructor(
    tx: number,
    ty: number,
    public dir: number,
    public speed: number, // tiles per second
  ) {
    this.gx = tx + 0.5;
    this.gy = ty + 0.5;
    this.lastTile = { x: tx, y: ty };
  }

  get tile(): Tile {
    return { x: Math.floor(this.gx), y: Math.floor(this.gy) };
  }

  get moving(): boolean {
    return this.path.length > 0;
  }

  walk(path: Tile[], onArrive?: () => void): void {
    this.path = [...path];
    this.onArrive = onArrive ?? null;
    if (!this.path.length) this.arrive();
  }

  stop(): void {
    this.path = [];
    this.onArrive = null;
  }

  teleport(tx: number, ty: number): void {
    this.stop();
    this.gx = tx + 0.5;
    this.gy = ty + 0.5;
    this.lastTile = { x: tx, y: ty };
  }

  faceTile(tx: number, ty: number): void {
    const a = gridToScreen(this.gx, this.gy);
    const b = gridToScreen(tx + 0.5, ty + 0.5);
    if (a.x !== b.x || a.y !== b.y) this.dir = dirFromVector(b.x - a.x, b.y - a.y);
  }

  /** Advance along the path; returns false when standing still. */
  update(dt: number): boolean {
    if (!this.path.length) return false;
    let budget = this.speed * dt;
    while (budget > 0 && this.path.length) {
      const next = this.path[0];
      const tx = next.x + 0.5;
      const ty = next.y + 0.5;
      const dx = tx - this.gx;
      const dy = ty - this.gy;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.001) {
        const a = gridToScreen(this.gx, this.gy);
        const b = gridToScreen(tx, ty);
        this.dir = dirFromVector(b.x - a.x, b.y - a.y);
      }
      if (dist <= budget) {
        this.gx = tx;
        this.gy = ty;
        budget -= dist;
        this.path.shift();
      } else {
        this.gx += (dx / dist) * budget;
        this.gy += (dy / dist) * budget;
        budget = 0;
      }
      const t = this.tile;
      if (t.x !== this.lastTile.x || t.y !== this.lastTile.y) {
        this.lastTile = t;
        this.onTile?.(t);
      }
    }
    if (!this.path.length) this.arrive();
    return true;
  }

  private arrive(): void {
    const cb = this.onArrive;
    this.onArrive = null;
    cb?.();
  }
}
