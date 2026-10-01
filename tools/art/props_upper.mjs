// Props for the Верховья (stage U): a stalled freight car of the Депо, the main pump with its flywheel, the
// lattice mast of the «Шептун», a relay console, the striped boom of the pass «Ворота», a searchlight, a guard
// booth and a length of the great water main.
import { line, poly, ellipse, circle, px, rng } from './draw.mjs';
import { P, shade } from './palette.mjs';
import { propCanvas, box } from './propkit.mjs';

/** A freight car stalled on its rails: rusted planks, a sliding door, iron wheels. 2x1. */
export function railcar() {
  const cv = propCanvas(2, 1, 50);
  const { ctx, bx, by } = cv;
  const r = rng(71);
  const g = box(ctx, bx, by - 8, 2, 1, 40, {
    left: (x, y, h) => (h % 8 < 1 ? P.rust0 : r() < 0.04 ? P.brown0 : shade(P.rust1, (x % 11) / 60)),
    right: P.rust0,
    top: P.grey2,
  });
  const [lx, ly] = g.left[0];
  poly(ctx, [[lx + 24, ly - 4], [lx + 44, ly + 6], [lx + 44, ly - 24], [lx + 24, ly - 34]], P.brown1); // the door
  line(ctx, lx + 34, ly + 1, lx + 34, ly - 29, P.brown0);
  for (const t of [0.15, 0.4, 0.62, 0.87]) {
    const x = lx + t * 64;
    const y = ly + t * 32 + 8;
    circle(ctx, x, y, 5, P.dark1);
    circle(ctx, x, y, 2, P.grey3);
  }
  return cv;
}

/** The main pump: a housing on a plinth, a big flywheel on its side, a riser pipe with a valve wheel. 2x2. */
export function mainPump() {
  const cv = propCanvas(2, 2, 70);
  const { ctx, bx, by } = cv;
  box(ctx, bx, by, 2, 2, 10, { left: P.grey2, right: P.grey1, top: P.grey3 });
  const [cx, cy] = cv.center;
  ellipse(ctx, cx - 4, cy - 30, 20, 26, P.teal0);
  ellipse(ctx, cx - 8, cy - 34, 14, 18, shade(P.teal0, 0.18));
  ellipse(ctx, cx + 22, cy - 22, 4, 20, P.dark1); // the flywheel, edge on
  ellipse(ctx, cx + 22, cy - 22, 2, 14, P.grey3);
  line(ctx, cx + 8, cy - 22, cx + 22, cy - 22, P.grey4);
  line(ctx, cx - 18, cy - 50, cx - 18, cy - 68, P.grey3);
  line(ctx, cx - 17, cy - 50, cx - 17, cy - 68, P.grey4);
  ellipse(ctx, cx - 18, cy - 60, 6, 2.5, P.red1);
  circle(ctx, cx + 4, cy - 40, 3, P.bone);
  line(ctx, cx + 4, cy - 40, cx + 6, cy - 42, P.ink);
  return cv;
}

/** The mast of the relay «Шептун»: a lattice tower of four legs, cross braces, a dish and a red lamp. */
export function relayMast() {
  const cv = propCanvas(1, 1, 230);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  const H = 220;
  const legs = [[-14, 6], [14, 6], [-10, -4], [10, -4]];
  for (const [dx, dy] of legs) line(ctx, cx + dx, cy + dy, cx + dx * 0.15, cy - H + dy * 0.1, dy > 0 ? P.grey3 : P.grey1);
  for (let k = 1; k < 11; k++) {
    const t = k / 11;
    const y = cy - H * t;
    const w = 14 * (1 - t * 0.85);
    line(ctx, cx - w, y + 6 * (1 - t), cx + w, y + 6 * (1 - t), P.grey2);
    line(ctx, cx - w, y + 6 * (1 - t), cx + w * 0.8, y - 20 + 6 * (1 - t), P.grey1);
  }
  ellipse(ctx, cx + 8, cy - H * 0.72, 9, 12, P.grey4);
  ellipse(ctx, cx + 9, cy - H * 0.72, 6, 9, P.grey5);
  line(ctx, cx, cy - H, cx, cy - H - 10, P.grey2);
  circle(ctx, cx, cy - H - 11, 2.2, P.red1);
  for (const s of [-1, 1]) line(ctx, cx + s * 2, cy - H * 0.9, cx + s * 30, cy + 4, 'rgba(60,60,60,0.5)'); // guy wires
  return cv;
}

/** A relay console: a steel desk with a sloped panel of dials, toggles and lamps. */
export function relayConsole() {
  const cv = propCanvas(1, 1, 40);
  const { ctx, bx, by } = cv;
  const r = rng(12);
  const g = box(ctx, bx, by, 0.9, 0.6, 24, { left: P.grey3, right: P.grey2, top: P.grey4 });
  const [lx, ly] = g.left[0];
  poly(ctx, [[lx + 2, ly - 22], [lx + 26, ly - 10], [lx + 26, ly - 22], [lx + 6, ly - 34]], P.grey2);
  for (let k = 0; k < 4; k++) circle(ctx, lx + 8 + k * 5, ly - 26 + k * 2.5, 1.8, P.bone);
  for (let k = 0; k < 5; k++) px(ctx, lx + 8 + k * 4, ly - 19 + k * 2, r() < 0.5 ? P.red1 : P.olive1);
  return cv;
}

/** The boom of the pass «Ворота»: a concrete post and a striped bar laid across the road. 1x2. */
export function barrier() {
  const cv = propCanvas(1, 2, 44);
  const { ctx, bx, by } = cv;
  const g = box(ctx, bx, by, 0.4, 0.4, 26, { left: P.grey3, right: P.grey2, top: P.grey4 });
  const [tx, ty] = g.top[0];
  for (let k = 0; k < 13; k++) {
    const a = [tx + 2 + k * 5, ty - 4 + k * 2.6];
    const b = [tx + 2 + (k + 1) * 5, ty - 4 + (k + 1) * 2.6];
    line(ctx, a[0], a[1], b[0], b[1], k % 2 ? P.bone : P.red1);
    line(ctx, a[0], a[1] + 1, b[0], b[1] + 1, k % 2 ? P.bone : P.red1);
  }
  return cv;
}

/** A searchlight on a tripod: a drum lamp with a pale glass, cables. */
export function searchlight() {
  const cv = propCanvas(1, 1, 56);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  for (const d of [-10, 0, 10]) line(ctx, cx, cy - 30, cx + d, cy + (d ? 2 : 6), P.grey2);
  ellipse(ctx, cx + 2, cy - 38, 11, 9, P.grey2);
  ellipse(ctx, cx + 6, cy - 39, 7, 7, P.grey4);
  ellipse(ctx, cx + 7, cy - 39, 5, 5, 'rgba(250,244,210,0.95)');
  line(ctx, cx - 6, cy - 34, cx - 14, cy + 4, P.dark1);
  return cv;
}

/** A guard booth: a narrow hut of planks with a window on the road and a tin roof. */
export function booth() {
  const cv = propCanvas(1, 1, 70);
  const { ctx, bx, by } = cv;
  const g = box(ctx, bx, by, 0.8, 0.8, 52, { left: (x) => (x % 6 < 1 ? P.brown0 : P.brown2), right: P.brown1, top: P.grey3 });
  const [lx, ly] = g.left[0];
  poly(ctx, [[lx + 6, ly - 26], [lx + 18, ly - 20], [lx + 18, ly - 32], [lx + 6, ly - 38]], P.dark1);
  line(ctx, lx + 6, ly - 33, lx + 18, ly - 27, P.water2 ?? P.grey4);
  return cv;
}

/** A length of the great water main: a riveted pipe as tall as a man lying on saddles. 2x1. */
export function bigPipe() {
  const cv = propCanvas(2, 1, 40);
  const { ctx, bx, by } = cv;
  box(ctx, bx, by, 2, 1, 30, {
    left: (x, y, h) => (x % 16 < 1 ? P.grey1 : shade(P.grey3, Math.sin(h / 6) * 0.12)),
    right: P.grey2,
    top: P.grey4,
  });
  return cv;
}
