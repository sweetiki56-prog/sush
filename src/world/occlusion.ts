/** Texture alpha masks and geometry, shared by rendering and headless tests. */
export interface AlphaMask {
  w: number;
  h: number;
  alpha: Uint8Array;
}

export function masksOverlap(a: AlphaMask, ax: number, ay: number, b: AlphaMask, bx: number, by: number): boolean {
  const aX = Math.round(ax), aY = Math.round(ay), bX = Math.round(bx), bY = Math.round(by);
  const x0 = Math.max(aX, bX), y0 = Math.max(aY, bY);
  const x1 = Math.min(aX + a.w, bX + b.w), y1 = Math.min(aY + a.h, bY + b.h);
  if (x1 <= x0 || y1 <= y0) return false;
  let pixels = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    if (a.alpha[(y - aY) * a.w + x - aX] > 64 && b.alpha[(y - bY) * b.w + x - bX] > 64 && ++pixels >= 2) return true;
  }
  return false;
}
