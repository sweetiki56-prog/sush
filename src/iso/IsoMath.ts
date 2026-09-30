// Iso projection for 64x32 diamonds. Tile (tx, ty) as continuous grid coordinates:
// integer values are tile corners, +0.5 is the tile center.
export const TILE_W = 64;
export const TILE_H = 32;
const HW = TILE_W / 2;
const HH = TILE_H / 2;

export interface Pt {
  x: number;
  y: number;
}

/** Grid point -> world pixels. */
export function gridToScreen(gx: number, gy: number): Pt {
  return { x: (gx - gy) * HW, y: (gx + gy) * HH };
}

/** Tile center -> world pixels. */
export function tileCenter(tx: number, ty: number): Pt {
  return gridToScreen(tx + 0.5, ty + 0.5);
}

/** World pixels -> continuous grid coordinates. */
export function screenToGrid(sx: number, sy: number): Pt {
  return { x: (sx / HW + sy / HH) / 2, y: (sy / HH - sx / HW) / 2 };
}

/** World pixels -> tile index. */
export function screenToTile(sx: number, sy: number): Pt {
  const g = screenToGrid(sx, sy);
  return { x: Math.floor(g.x), y: Math.floor(g.y) };
}

/**
 * Depth key. Objects sort by the sum of their footprint center; works for the
 * convex, non-overlapping footprints used in this map (see docs/ARCHITECTURE.md).
 */
export function depthOf(cx: number, cy: number): number {
  return (cx + cy) * 10;
}

/** Screen direction index 0..7 (0 = east, clockwise) for a screen-space vector. */
export function dirFromVector(dx: number, dy: number): number {
  const a = Math.atan2(dy, dx);
  return (Math.round(a / (Math.PI / 4)) + 8) % 8;
}
