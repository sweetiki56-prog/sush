// Props for the Костяной круг and the ruins of Светлоречье (stage B): a hide tent of the Сухари, a ring post of bull
// ribs with a skull, the dam guard's painted oath on a rock wall, a museum display case, a card catalogue, a broken
// colonnade of a ministry, a rail draisine.
import { line, poly, ellipse, circle, px, rng } from './draw.mjs';
import { P, shade } from './palette.mjs';
import { propCanvas, box } from './propkit.mjs';

/** A tent of hides on poles: a low cone, a smoke hole, a dark entrance. */
export function tent() {
  const cv = propCanvas(1, 1, 60);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  poly(ctx, [[cx - 26, cy + 4], [cx, cy - 46], [cx + 26, cy + 4], [cx, cy + 14]], P.sand3);
  poly(ctx, [[cx, cy - 46], [cx + 26, cy + 4], [cx, cy + 14]], shade(P.sand3, -0.18));
  for (const d of [-12, 8]) line(ctx, cx, cy - 44, cx + d, cy + 8, P.brown1);
  poly(ctx, [[cx - 8, cy + 9], [cx - 2, cy - 8], [cx + 4, cy + 11]], P.dark1);
  line(ctx, cx - 3, cy - 50, cx, cy - 44, P.brown0);
  line(ctx, cx + 4, cy - 52, cx, cy - 44, P.brown0);
  return cv;
}

/** A post of the bone ring: two bull ribs arched over a skull on a cairn. */
export function boneRing() {
  const cv = propCanvas(1, 1, 56);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  ellipse(ctx, cx, cy, 12, 6, P.grey2);
  ellipse(ctx, cx, cy - 3, 9, 5, P.grey3);
  for (const s of [-1, 1])
    for (let k = 0; k < 10; k++) {
      const t = k / 10;
      const x = cx + s * (10 - t * 6) + s * Math.sin(t * 3) * 4;
      const y = cy - 4 - t * 46;
      ellipse(ctx, x, y, 2.4, 2.4, P.bone);
    }
  ellipse(ctx, cx, cy - 12, 7, 5, P.bone);
  circle(ctx, cx - 3, cy - 13, 1.4, P.dark0);
  circle(ctx, cx + 3, cy - 13, 1.4, P.dark0);
  line(ctx, cx - 7, cy - 15, cx - 13, cy - 20, P.bone);
  line(ctx, cx + 7, cy - 15, cx + 13, cy - 20, P.bone);
  return cv;
}

/** The dam guard's oath painted on a slab of rock: figures, a dam, a hand over water. */
export function oathMural() {
  const cv = propCanvas(1, 1, 62);
  const { ctx, bx, by } = cv;
  const g = box(ctx, bx, by, 1, 0.4, 56, { left: P.brown2, right: P.brown1, top: P.brown3 });
  const [lx, ly] = g.left[0];
  const o = (x, y) => [lx + x, ly + x * 0.5 - y];
  line(ctx, ...o(4, 40), ...o(26, 40), P.rust1); // the dam
  for (let k = 0; k < 4; k++) line(ctx, ...o(6 + k * 5, 40), ...o(6 + k * 5, 30), P.rust1);
  for (let k = 0; k < 5; k++) px(ctx, ...o(5 + k * 4, 24), P.water1);
  for (const x of [8, 14, 20]) {
    circle(ctx, ...o(x, 18), 1.6, P.bone);
    line(ctx, ...o(x, 16), ...o(x, 8), P.bone);
  }
  return cv;
}

/** A museum display case: a wooden plinth, a glass box, a rod on velvet inside. */
export function displayCase() {
  const cv = propCanvas(1, 1, 50);
  const { ctx, bx, by } = cv;
  box(ctx, bx, by, 0.8, 0.8, 18, { left: P.brown2, right: P.brown1, top: P.red1 });
  const [cx, cy] = cv.center;
  line(ctx, cx - 8, cy - 22, cx + 10, cy - 28, P.sand4);
  circle(ctx, cx + 11, cy - 28, 2, P.teal1);
  // the glass: a steel frame and one glint, the rod seen through it
  for (const [a, b] of [[[cx - 18, cy - 14], [cx - 18, cy - 40]], [[cx + 18, cy - 14], [cx + 18, cy - 40]], [[cx, cy - 23], [cx, cy - 49]], [[cx - 18, cy - 40], [cx, cy - 49]], [[cx, cy - 49], [cx + 18, cy - 40]], [[cx - 18, cy - 40], [cx, cy - 31]], [[cx, cy - 31], [cx + 18, cy - 40]]]) line(ctx, a[0], a[1], b[0], b[1], P.grey4);
  line(ctx, cx - 12, cy - 36, cx - 6, cy - 22, P.water2);
  return cv;
}

/** A card catalogue: a cabinet of small drawers with brass pulls. */
export function cardCatalog() {
  const cv = propCanvas(1, 1, 48);
  const { ctx, bx, by } = cv;
  const r = rng(5);
  box(ctx, bx, by, 0.9, 0.5, 40, {
    left: (x, y, h) => (h % 8 < 1 || x % 9 < 1 ? P.brown0 : P.brown2),
    right: P.brown1,
    top: P.brown3,
  });
  for (let k = 0; k < 6; k++) px(ctx, bx - 18 + r() * 22, by - 10 - r() * 26, P.sand4);
  return cv;
}

/** A broken colonnade of a ministry: a stepped base, two columns, a cracked lintel. 2x1. */
export function colonnade() {
  const cv = propCanvas(2, 1, 90);
  const { ctx, bx, by } = cv;
  box(ctx, bx, by, 2, 1, 8, { left: P.grey3, right: P.grey2, top: P.grey4 });
  const [cx, cy] = cv.center;
  for (const d of [-20, 14]) {
    for (let y = 0; y < 72; y++) line(ctx, cx + d - 6, cy - 6 - y, cx + d + 6, cy - 6 - y, y % 12 < 1 ? P.grey3 : shade(P.bone, -0.08 - (d > 0 ? 0.08 : 0)));
    line(ctx, cx + d - 6, cy - 6, cx + d - 6, cy - 78, P.grey3);
  }
  poly(ctx, [[cx - 30, cy - 78], [cx + 24, cy - 92], [cx + 24, cy - 84], [cx - 30, cy - 70]], P.grey4);
  line(ctx, cx - 4, cy - 82, cx, cy - 74, P.dark1);
  return cv;
}

/** A rail draisine: a flat cart on four wheels, a pump handle on a post. */
export function draisine() {
  const cv = propCanvas(1, 1, 40);
  const { ctx, bx, by } = cv;
  box(ctx, bx, by - 6, 0.9, 0.7, 6, { left: P.brown1, right: P.brown0, top: P.brown2 });
  const [cx, cy] = cv.center;
  for (const [dx, dy] of [[-14, 4], [10, 10], [-6, -4], [16, 2]]) circle(ctx, cx + dx, cy + dy, 3.5, P.dark1);
  line(ctx, cx, cy - 10, cx, cy - 26, P.grey2);
  line(ctx, cx - 12, cy - 30, cx + 12, cy - 22, P.grey3);
  return cv;
}
