// Tile line of sight: Bresenham between tile centers; the endpoints never block.
import type { Blocked, Tile } from './Pathfinder';

export function lineOfSight(blocked: Blocked, a: Tile, b: Tile): boolean {
  let x = a.x;
  let y = a.y;
  const dx = Math.abs(b.x - x);
  const dy = -Math.abs(b.y - y);
  const sx = x < b.x ? 1 : -1;
  const sy = y < b.y ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    if (x === b.x && y === b.y) return true;
    if ((x !== a.x || y !== a.y) && blocked(x, y)) return false;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

/** Distance in tiles as used by combat: 8-directional steps (Chebyshev). */
export function tileDist(a: Tile, b: Tile): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}
