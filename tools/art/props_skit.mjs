// Props for the Скит and «Роса-2» (stage S): a dew catcher's white sail on its mast, the archive's tall stacks, a
// glass capsule with a sleeper's shape inside, a dead terminal with a green cursor.
import { line, poly, ellipse, circle, px, rng } from './draw.mjs';
import { P, shade } from './palette.mjs';
import { propCanvas, box } from './propkit.mjs';

/** A dew catcher: a steel mast with a white sail of mesh, a gutter and a jar at its foot. */
export function dewSail() {
  const cv = propCanvas(1, 1, 110);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  line(ctx, cx, cy, cx, cy - 100, P.grey2);
  line(ctx, cx + 1, cy, cx + 1, cy - 100, P.grey4);
  poly(ctx, [[cx + 2, cy - 96], [cx + 30, cy - 82], [cx + 26, cy - 34], [cx + 2, cy - 30]], P.bone);
  for (let k = 0; k < 6; k++) line(ctx, cx + 4, cy - 90 + k * 10, cx + 26, cy - 80 + k * 8, shade(P.bone, -0.12));
  line(ctx, cx + 2, cy - 30, cx + 26, cy - 34, P.grey3);
  ellipse(ctx, cx + 12, cy - 4, 6, 3, P.water1);
  circle(ctx, cx + 20, cy - 60, 1.2, P.water2);
  return cv;
}

/** The archive's stacks: tall shelves of binders and tubes. */
export function stacks() {
  const cv = propCanvas(1, 1, 64);
  const { ctx, bx, by } = cv;
  const r = rng(33);
  box(ctx, bx, by, 1, 0.5, 58, {
    left: (x, y, h) => (h % 14 < 2 ? P.brown0 : [P.red1, P.sand3, P.teal1, P.brown2, P.bone, P.olive1][Math.floor((x + Math.floor(h / 14) * 3) / 3) % 6]),
    right: P.brown0,
    top: P.brown2,
  });
  for (let i = 0; i < 4; i++) px(ctx, bx - 20 + r() * 30, by - 20 - r() * 30, P.bone);
  return cv;
}

/** A glass capsule on its plinth, frost inside, a sleeper's shape. 1x2. */
export function capsule() {
  const cv = propCanvas(1, 2, 44);
  const { ctx, bx, by } = cv;
  box(ctx, bx, by, 1, 2, 8, { left: P.grey2, right: P.grey1, top: P.grey3 });
  const [cx, cy] = cv.center;
  ellipse(ctx, cx, cy - 18, 26, 14, 'rgba(160,210,220,0.55)');
  ellipse(ctx, cx - 2, cy - 18, 16, 6, P.grey4);
  ellipse(ctx, cx + 12, cy - 22, 5, 4, P.grey4);
  line(ctx, cx - 20, cy - 26, cx + 14, cy - 30, 'rgba(255,255,255,0.8)');
  circle(ctx, cx + 22, cy - 8, 1.5, P.crt3 ?? P.water2);
  return cv;
}

/** A dead terminal: a grey cabinet, a dark screen with one green line. */
export function terminal() {
  const cv = propCanvas(1, 1, 44);
  const { ctx, bx, by } = cv;
  const g = box(ctx, bx, by, 0.7, 0.6, 30, { left: P.grey3, right: P.grey2, top: P.grey4 });
  const [lx, ly] = g.left[0];
  poly(ctx, [[lx + 4, ly - 10], [lx + 18, ly - 3], [lx + 18, ly - 17], [lx + 4, ly - 24]], P.dark0);
  line(ctx, lx + 6, ly - 16, lx + 12, ly - 13, P.crt2 ?? P.water2);
  return cv;
}
