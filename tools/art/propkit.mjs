// Shared scaffolding for iso props: canvas sized to the footprint, textured box faces.
import { canvas, isoBox, fillPolyFn, poly, TW, TH } from './draw.mjs';

/**
 * Create a canvas for a prop with footprint w x h tiles and `top` px of vertical room.
 * The bottom vertex of the footprint is at (bx, by); the atlas anchor points there.
 */
export function propCanvas(w, h, top, pad = 3) {
  const cw = Math.ceil((w + h) * (TW / 2)) + pad * 2;
  const ch = Math.ceil((w + h) * (TH / 2)) + top + pad * 2;
  const cv = canvas(cw, ch);
  const bx = pad + w * (TW / 2);
  const by = ch - pad;
  const center = [bx + (h - w) * (TW / 4), by - (w + h) * (TH / 4)];
  return { ...cv, bx, by, center, anchor: { x: bx / cw, y: by / ch } };
}

/** Base Y of the left (+y) face at screen x. */
const leftBase = (L, x) => L[1] + (x - L[0]) * 0.5;
const rightBase = (B, x) => B[1] - (x - B[0]) * 0.5;

/**
 * Draw an iso box. Each face gets a color function (x, y, h, t) where
 * h = height above the face base in px and t = 0..1 along the face.
 */
export function box(ctx, bx, by, w, h, height, { left, right, top }) {
  const g = isoBox(bx, by, w, h, height);
  const lw = g.B[0] - g.L[0];
  const rw = g.R[0] - g.B[0];
  if (left) fillPolyFn(ctx, g.left, typeof left === 'string' ? () => left : (x, y) => left(x, y, leftBase(g.L, x + 0.5) - y, (x - g.L[0]) / lw));
  if (right) fillPolyFn(ctx, g.right, typeof right === 'string' ? () => right : (x, y) => right(x, y, rightBase(g.B, x + 0.5) - y, (x - g.B[0]) / rw));
  if (top) {
    if (typeof top === 'string') poly(ctx, g.top, top);
    else fillPolyFn(ctx, g.top, top);
  }
  return g;
}

/** Vertical cylinder standing on (cx, cy): body shaded left-to-right, elliptical top. */
export function cylinder(ctx, cx, cy, rx, height, { light, mid, dark, top, band, bands = [] }) {
  const ry = rx * 0.5;
  for (let x = Math.floor(cx - rx); x < Math.ceil(cx + rx); x++) {
    const t = (x + 0.5 - (cx - rx)) / (2 * rx);
    const col = t < 0.3 ? light : t < 0.72 ? mid : dark;
    const dy = ry * Math.sqrt(Math.max(0, 1 - ((x + 0.5 - cx) / rx) ** 2));
    ctx.fillStyle = col;
    ctx.fillRect(x, Math.round(cy - height), 1, Math.round(height + dy));
    for (const b of bands) {
      ctx.fillStyle = band;
      ctx.fillRect(x, Math.round(cy - b + dy), 1, 2);
    }
  }
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.ellipse(cx, cy - height, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}
