// Props for the rest of Низовье (stage N): the lead flower of the poisoned fields, the bell tower of Хлебное, a
// stack of «Суховей» barrels, the «Мираж» still, a Trust water truck.
import { line, poly, ellipse, circle, px, rng } from './draw.mjs';
import { P, shade } from './palette.mjs';
import { propCanvas, box } from './propkit.mjs';

/** A clump of lead flowers: grey stems, heavy dull-blue heads. */
export function leadFlower() {
  const cv = propCanvas(1, 1, 24);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  const r = rng(9);
  for (let k = 0; k < 7; k++) {
    const x = cx - 12 + r() * 24;
    const y = cy - 2 + r() * 6;
    const h = 8 + r() * 10;
    line(ctx, x, y, x + (r() - 0.5) * 4, y - h, P.grey3);
    circle(ctx, x, y - h, 2.4, k % 2 ? P.denim1 : P.grey4);
    px(ctx, x, y - h - 1, P.bone);
  }
  return cv;
}

/** The bell tower of Хлебное: a brick shaft, an open belfry, a bell, a cross-beam. */
export function bellTower() {
  const cv = propCanvas(1, 1, 150);
  const { ctx, bx, by } = cv;
  const g = box(ctx, bx, by, 0.9, 0.9, 110, { left: (x, y, h) => (h % 9 < 1 ? P.rust0 : P.rust1), right: P.rust0, top: P.brown1 });
  const [tx, ty] = g.top[0];
  const cx = tx + 14;
  for (const d of [-12, 12]) line(ctx, cx + d, ty, cx + d, ty - 26, P.brown0);
  poly(ctx, [[cx - 16, ty - 26], [cx, ty - 40], [cx + 16, ty - 26]], P.grey2);
  ellipse(ctx, cx, ty - 12, 6, 7, P.sand4);
  ellipse(ctx, cx, ty - 7, 7, 2, shade(P.sand4, -0.2));
  return cv;
}

/** A stack of «Суховей» barrels: yellow drums with a black band and a skull stencil. 2x1. */
export function suhoveyStack() {
  const cv = propCanvas(2, 1, 40);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  for (const [dx, dy] of [[-20, 4], [-6, 8], [8, 4], [22, 8], [-13, -14], [1, -10], [15, -14]]) {
    ellipse(ctx, cx + dx, cy + dy - 8, 7, 3, P.sand4);
    poly(ctx, [[cx + dx - 7, cy + dy - 8], [cx + dx + 7, cy + dy - 8], [cx + dx + 7, cy + dy + 6], [cx + dx - 7, cy + dy + 6]], P.sand3);
    line(ctx, cx + dx - 7, cy + dy - 1, cx + dx + 7, cy + dy - 1, P.dark1);
    circle(ctx, cx + dx, cy + dy + 2, 1.5, P.dark1);
  }
  return cv;
}

/** The «Мираж» still: a copper pot on a fire box, a coil, a dripping spout into a jar. */
export function still() {
  const cv = propCanvas(1, 1, 60);
  const { ctx, bx, by } = cv;
  box(ctx, bx, by, 0.8, 0.8, 12, { left: P.dark1, right: P.dark0, top: P.grey1 });
  const [cx, cy] = cv.center;
  circle(ctx, cx - 4, cy - 10, 3, P.fire1 ?? P.red1);
  ellipse(ctx, cx - 4, cy - 30, 12, 14, P.rust1);
  ellipse(ctx, cx - 7, cy - 34, 7, 8, shade(P.rust1, 0.2));
  line(ctx, cx - 4, cy - 44, cx + 14, cy - 40, P.rust0);
  for (let k = 0; k < 4; k++) ellipse(ctx, cx + 16, cy - 36 + k * 6, 4, 2, P.rust0);
  ellipse(ctx, cx + 16, cy - 6, 4, 5, P.water1);
  return cv;
}

/** A Trust water truck: a cab and a round tank on a flatbed, the Trust's grey with a white stripe. 2x1. */
export function waterTruck() {
  const cv = propCanvas(2, 1, 56);
  const { ctx, bx, by } = cv;
  box(ctx, bx, by - 8, 1.92, 0.9, 10, { left: P.grey2, right: P.grey1, top: P.grey3 });
  const [cx, cy] = cv.center;
  ellipse(ctx, cx - 8, cy - 27, 28, 15, P.grey1);
  ellipse(ctx, cx - 9, cy - 30, 27, 14, P.grey3);
  ellipse(ctx, cx - 12, cy - 34, 22, 9, P.grey4);
  for (const d of [-23, 2]) {
    line(ctx, cx + d, cy - 40, cx + d + 8, cy - 31, P.grey1);
    line(ctx, cx + d + 8, cy - 31, cx + d + 7, cy - 19, P.grey1);
  }
  line(ctx, cx - 33, cy - 25, cx + 15, cy - 25, P.bone); // Trust stripe
  line(ctx, cx - 4, cy - 44, cx + 8, cy - 44, P.grey1); // filling hatch
  const cab = box(ctx, bx + 7, by - 18, 0.62, 0.76, 22, {
    left: (_x, _y, z) => z > 4 && z < 17 ? P.teal1 : P.grey3,
    right: (_x, _y, z) => z > 4 && z < 17 ? P.teal0 : P.grey2,
    top: P.grey4,
  });
  line(ctx, cab.up(cab.L)[0], cab.up(cab.L)[1], cab.up(cab.B)[0], cab.up(cab.B)[1], P.grey5);
  for (const d of [-23, -3, 18]) {
    const x = cx + d;
    const y = cy + 3 + d * 0.17;
    circle(ctx, x, y, 5.5, P.dark0);
    circle(ctx, x, y, 2.6, P.grey3);
  }
  line(ctx, cx - 34, cy - 13, cx - 34, cy - 5, P.grey2); // drain valve
  circle(ctx, cx - 34, cy - 5, 2, P.rust1);
  return cv;
}
