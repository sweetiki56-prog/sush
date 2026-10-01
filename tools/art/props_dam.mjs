// Props for «Заслон» (stage F): a turbine of the machine hall, a sluice gate in the crest, a banner of a side in the
// siege (its colour by the side).
import { line, poly, ellipse, circle } from './draw.mjs';
import { P, shade } from './palette.mjs';
import { propCanvas, box } from './propkit.mjs';

/** A turbine of the dam: a round housing on a plinth, a shaft, an inspection hatch. 2x2. */
export function turbine() {
  const cv = propCanvas(2, 2, 70);
  const { ctx, bx, by } = cv;
  box(ctx, bx, by, 2, 2, 12, { left: P.grey2, right: P.grey1, top: P.grey3 });
  const [cx, cy] = cv.center;
  ellipse(ctx, cx, cy - 34, 30, 22, P.denim0);
  ellipse(ctx, cx - 3, cy - 38, 24, 16, shade(P.denim0, 0.15));
  ellipse(ctx, cx - 3, cy - 40, 10, 7, P.grey4);
  circle(ctx, cx - 3, cy - 40, 3, P.dark1);
  line(ctx, cx + 22, cy - 30, cx + 22, cy - 62, P.grey3);
  circle(ctx, cx + 22, cy - 64, 4, P.red1);
  return cv;
}

/** A sluice gate in the crest: a steel leaf in its frame, rails, a wheel on top. */
export function sluiceGate() {
  const cv = propCanvas(1, 1, 80);
  const { ctx, bx, by } = cv;
  const g = box(ctx, bx, by, 1, 0.4, 70, { left: (x, y, h) => (h % 14 < 2 ? P.grey1 : P.grey3), right: P.grey2, top: P.grey4 });
  const [tx, ty] = g.top[0];
  ellipse(ctx, tx + 14, ty - 6, 9, 4, P.rust1);
  line(ctx, tx + 5, ty - 6, tx + 23, ty - 6, P.rust0);
  return cv;
}

/** A banner of a side on a pole: `color` is the side's cloth. */
export function banner(color) {
  const cv = propCanvas(1, 1, 80);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  line(ctx, cx, cy, cx, cy - 74, P.brown0);
  poly(ctx, [[cx + 1, cy - 72], [cx + 24, cy - 66], [cx + 20, cy - 56], [cx + 24, cy - 46], [cx + 1, cy - 50]], color);
  line(ctx, cx + 1, cy - 72, cx + 24, cy - 66, shade(color, 0.2));
  return cv;
}
