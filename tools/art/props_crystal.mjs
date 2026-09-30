// Props for Кристалл (stage V): a glowing salt vein in the rock, a tomb niche cut into the salt, the brine pool of
// the baths, and the Wall of names with its scratched lines (the top ones knocked off).
import { line, poly, ellipse, circle, px, rng } from './draw.mjs';
import { P, shade } from './palette.mjs';
import { propCanvas, box } from './propkit.mjs';

const GLOW = '#bfe8e0';
const GLOW_DIM = '#7fb8b0';

/** A block of salt rock with a vein of pale light running through it. */
export function vein(seed = 1) {
  const cv = propCanvas(1, 1, 50);
  const { ctx, bx, by } = cv;
  const r = rng(seed * 13 + 5);
  box(ctx, bx, by, 1, 1, 34 + seed * 4, { left: P.grey4, right: P.grey3, top: P.grey5 });
  let [x, y] = [bx - 26 + r() * 8, by - 8];
  for (let i = 0; i < 7; i++) {
    const nx = x + 3 + r() * 5;
    const ny = y - 4 - r() * 5;
    line(ctx, x, y, nx, ny, GLOW);
    line(ctx, x + 1, y, nx + 1, ny, GLOW_DIM);
    if (r() < 0.4) circle(ctx, nx, ny, 1.5, GLOW);
    [x, y] = [nx, ny];
  }
  return cv;
}

/** A tomb niche cut into a salt wall: a dark arch, a bundle wrapped in white inside. */
export function niche() {
  const cv = propCanvas(1, 1, 46);
  const { ctx, bx, by } = cv;
  const g = box(ctx, bx, by, 1, 1, 40, { left: P.grey5, right: P.grey4, top: P.bone });
  const [lx, ly] = g.left[0];
  const ax = lx + 10;
  const ay = ly - 10;
  poly(ctx, [[ax, ay], [ax + 14, ay + 7], [ax + 14, ay - 13], [ax + 7, ay - 22], [ax, ay - 20]], P.dark1);
  ellipse(ctx, ax + 7, ay - 4, 6, 3, P.bone);
  px(ctx, ax + 4, ay - 18, GLOW);
  return cv;
}

/** The brine pool of the baths: a basin cut into the salt, murky brine, a copper pipe dripping into it. 2x2. */
export function brinePool() {
  const cv = propCanvas(2, 2, 26);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  ellipse(ctx, cx, cy, 58, 28, P.grey5);
  ellipse(ctx, cx, cy + 1, 50, 23, P.grey3);
  ellipse(ctx, cx, cy + 2, 46, 20, '#8aa39a');
  ellipse(ctx, cx - 10, cy - 2, 18, 6, '#a8c2b8');
  const r = rng(77);
  for (let i = 0; i < 8; i++) circle(ctx, cx - 40 + r() * 80, cy - 14 + r() * 28, 1, P.bone);
  line(ctx, cx + 38, cy - 24, cx + 38, cy - 8, P.fire0);
  line(ctx, cx + 39, cy - 24, cx + 30, cy - 24, P.fire0);
  circle(ctx, cx + 38, cy - 4, 1.2, '#a8c2b8');
  return cv;
}

/** The Wall of names: a tall slab of salt scratched with thousands of lines; the top ones knocked off. 3x1. */
export function wallNames() {
  const cv = propCanvas(3, 1, 80);
  const { ctx, bx, by } = cv;
  const H = 70;
  const g = box(ctx, bx, by, 3, 1, H, {
    left: (x, y, h) => (h > H - 16 ? (Math.floor(x / 3) % 2 ? P.grey3 : P.grey4) : h % 5 < 1 && x % 9 > 1 ? P.grey2 : P.bone),
    right: P.grey4,
    top: shade(P.bone, -0.05),
  });
  const [lx, ly] = g.left[0];
  const r = rng(91);
  for (let i = 0; i < 12; i++) circle(ctx, lx + 8 + r() * 80, ly - H + 6 + r() * 10 + (r() * 80) / 2, 1.2, P.grey2); // hammer marks
  return cv;
}
