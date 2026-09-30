// Props for earning a living at the Rusty Well: the workbench, the contract board, scrap heaps, the scorpion burrow.
import { line, poly, circle, ellipse, px, rng } from './draw.mjs';
import { P } from './palette.mjs';
import { propCanvas, box } from './propkit.mjs';

/** A plank bench on trestles with a vice, a saw and a jar of nuts. Two tiles along x. */
export function workbench() {
  const cv = propCanvas(2, 1, 26);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  // trestle legs, then a thin plank top on them
  for (const [dx, dy] of [[-24, -2], [22, 2], [-4, 10], [-2, -12]]) line(ctx, cx + dx, cy + dy, cx + dx, cy + dy - 12, P.brown0);
  const plank = (base, dark) => (x) => (x % 7 === 0 ? dark : base);
  box(ctx, cv.bx, cv.by - 10, 2, 1, 4, { left: plank(P.brown3, P.brown1), right: plank(P.brown2, P.brown0), top: plank(P.brown4, P.brown2) });
  // vice on the near end, a saw lying across, a tin of nuts
  poly(ctx, [[cx - 22, cy - 18], [cx - 14, cy - 22], [cx - 12, cy - 17], [cx - 20, cy - 13]], P.grey2);
  line(ctx, cx - 18, cy - 22, cx - 16, cy - 27, P.grey4);
  line(ctx, cx - 4, cy - 16, cx + 14, cy - 25, P.grey4);
  poly(ctx, [[cx + 14, cy - 25], [cx + 18, cy - 27], [cx + 19, cy - 24], [cx + 15, cy - 22]], P.red1);
  ellipse(ctx, cx + 20, cy - 15, 3.5, 2, P.grey3);
  px(ctx, cx + 19, cy - 16, P.sand4);
  return cv;
}

/** A board of planks on two posts with papers nailed to it. */
export function board() {
  const cv = propCanvas(1, 1, 44);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  for (const dx of [-11, 10]) {
    ctx.fillStyle = P.brown1;
    ctx.fillRect(cx + dx, cy - 30, 3, 31);
  }
  poly(ctx, [[cx - 15, cy - 42], [cx + 16, cy - 36], [cx + 16, cy - 18], [cx - 15, cy - 24]], P.brown3);
  line(ctx, cx - 15, cy - 33, cx + 16, cy - 27, P.brown2);
  const papers = [[-12, -38, P.bone], [-3, -34, P.sand5], [6, -32, P.bone], [-9, -29, P.sand4], [3, -25, P.bone]];
  for (const [x, y, c] of papers) {
    poly(ctx, [[cx + x, cy + y], [cx + x + 7, cy + y + 1.4], [cx + x + 7, cy + y + 7.4], [cx + x, cy + y + 6]], c);
    px(ctx, cx + x + 3, cy + y + 1, P.red1); // the nail
  }
  return cv;
}

/** A heap of rusted junk: sheet metal, a wheel rim, pipes. */
export function scrapPile() {
  const cv = propCanvas(1, 1, 16);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  const r = rng(77);
  ellipse(ctx, cx, cy - 2, 13, 6, P.rust0);
  for (let i = 0; i < 9; i++) {
    const x = cx - 10 + r() * 20;
    const y = cy - 4 - r() * 9;
    poly(ctx, [[x, y], [x + 6, y - 2], [x + 7, y + 2], [x + 1, y + 4]], [P.rust1, P.rust2, P.grey2, P.grey3][i % 4]);
  }
  circle(ctx, cx + 5, cy - 8, 4, P.dark1);
  circle(ctx, cx + 5, cy - 8, 2, P.rust1);
  line(ctx, cx - 9, cy - 10, cx + 2, cy - 14, P.grey4);
  return cv;
}

/** A scorpion burrow: a dark mouth in a mound of dug-out sand, a husk by the edge. */
export function burrow() {
  const cv = propCanvas(1, 1, 10);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  ellipse(ctx, cx, cy, 14, 7, P.sand2);
  ellipse(ctx, cx - 1, cy - 1, 11, 5, P.sand3);
  ellipse(ctx, cx + 1, cy, 7, 3.5, P.dark0);
  ellipse(ctx, cx + 2, cy + 1, 5, 2.2, P.ink);
  poly(ctx, [[cx - 12, cy + 2], [cx - 7, cy], [cx - 6, cy + 3]], P.rust1);
  return cv;
}
