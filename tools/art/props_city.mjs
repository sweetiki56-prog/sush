// Props for Запруда (stage Z): prison bars, the Trust's Tower, water towers over the roofs, the mint's press and
// scales, prison bunks, the speakers' platform in the Lower city.
import { line, poly, ellipse, circle, px, rng } from './draw.mjs';
import { P, shade } from './palette.mjs';
import { propCanvas, box, cylinder } from './propkit.mjs';

/** A barred gate on the +y face (a cell door, the city gate's grille): closed, or swung open against the post. */
export function bars(open) {
  const H = 42;
  const cv = propCanvas(1, 1, H + 8);
  const { ctx, bx, by } = cv;
  const L = [bx - 32, by - 16];
  const post = (x, y) => {
    poly(ctx, [[x, y], [x + 4, y + 2], [x + 4, y - H + 2], [x, y - H]], P.grey2);
    poly(ctx, [[x + 4, y + 2], [x + 7, y + 0.5], [x + 7, y - H + 0.5], [x + 4, y - H + 2]], P.grey1);
  };
  post(L[0], L[1]);
  post(bx - 6, by - 3);
  poly(ctx, [[L[0], L[1] - H], [bx + 1, by - H - 2], [bx + 1, by - H + 3], [L[0], L[1] - H + 5]], P.grey3);
  const a = [L[0] + 5, L[1] + 2];
  const b = [bx - 6, by - 3];
  if (!open) {
    for (let k = 1; k < 7; k++) {
      const x = a[0] + ((b[0] - a[0]) * k) / 7;
      const y = a[1] + ((b[1] - a[1]) * k) / 7;
      line(ctx, x, y, x, y - H + 5, P.dark1);
      line(ctx, x + 1, y, x + 1, y - H + 5, P.grey3);
    }
    for (const t of [10, 28]) line(ctx, a[0], a[1] - t, b[0], b[1] - t, P.grey2);
    ctx.fillStyle = P.sand3;
    ctx.fillRect(Math.round((a[0] + b[0]) / 2) - 2, Math.round((a[1] + b[1]) / 2) - 20, 5, 6); // the lock
  } else {
    // the grille swung back flat against the far post
    for (let k = 0; k < 4; k++) line(ctx, a[0] + 2 + k * 2, a[1] - 2 - k, a[0] + 2 + k * 2, a[1] - H + 3 - k, P.grey2);
  }
  return cv;
}

/** The Trust's Tower: a concrete block of three storeys with narrow windows and a water tank on the roof. 3x3. */
export function tower() {
  const cv = propCanvas(3, 3, 190);
  const { ctx, bx, by } = cv;
  const H = 150;
  const r = rng(71);
  const g = box(ctx, bx, by, 3, 3, H, {
    left: (x, y, h) => (h % 40 < 3 ? P.grey1 : (x % 16 < 4 && h % 40 > 14 && h % 40 < 30) ? P.dark1 : r() < 0.03 ? P.rust0 : P.grey4),
    right: (x, y, h) => (h % 40 < 3 ? P.dark2 : (x % 16 < 4 && h % 40 > 14 && h % 40 < 30) ? P.dark0 : P.grey2),
    top: P.grey3,
  });
  const [tx, ty] = [(g.top[0][0] + g.top[2][0]) / 2, (g.top[0][1] + g.top[2][1]) / 2];
  for (const dx of [-14, 14]) line(ctx, tx + dx, ty, tx + dx * 0.7, ty - 14, P.dark1);
  cylinder(ctx, tx, ty - 12, 20, 22, { light: P.rust2, mid: P.rust1, dark: P.rust0, top: P.rust2, bands: [6, 14] });
  // the Trust's sign: a drop in a ring over the door
  const [dx, dy] = [bx - 40, by - 70];
  circle(ctx, dx, dy, 7, P.sand4);
  circle(ctx, dx, dy, 5, P.grey2);
  ellipse(ctx, dx, dy + 1, 2.5, 3, P.water1);
  return cv;
}

/** A water tower on four legs: the landmark of Запруда's skyline. */
export function waterTower() {
  const cv = propCanvas(1, 1, 150);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  for (const [dx, dy] of [[-12, 4], [12, 4], [-8, -4], [8, -4]]) line(ctx, cx + dx, cy + dy, cx + dx * 0.5, cy - 100, P.dark1);
  for (const h of [30, 60, 90]) line(ctx, cx - 11, cy - h, cx + 11, cy - h + 6, P.dark2);
  cylinder(ctx, cx, cy - 98, 18, 34, { light: P.grey4, mid: P.grey3, dark: P.grey1, top: P.grey3, bands: [8, 20] });
  poly(ctx, [[cx - 18, cy - 132], [cx, cy - 146], [cx + 18, cy - 132]], P.rust1);
  px(ctx, cx + 6, cy - 110, P.water2);
  return cv;
}

/** The mint's screw press: a cast-iron frame, a wheel on top, a tray of blanks. */
export function press() {
  const cv = propCanvas(1, 1, 64);
  const { ctx, bx, by } = cv;
  box(ctx, bx, by, 0.8, 0.8, 10, { left: P.grey1, right: P.dark2, top: P.grey2 });
  const [cx, cy] = cv.center;
  for (const dx of [-9, 9]) line(ctx, cx + dx, cy - 8, cx + dx, cy - 44, P.dark1);
  line(ctx, cx - 10, cy - 44, cx + 10, cy - 44, P.dark1);
  line(ctx, cx, cy - 44, cx, cy - 18, P.grey3);
  ellipse(ctx, cx, cy - 52, 16, 5, P.dark1);
  ellipse(ctx, cx, cy - 52, 14, 4, P.rust1);
  for (let i = 0; i < 5; i++) circle(ctx, cx - 6 + i * 3, cy - 12, 1.3, P.sand4);
  return cv;
}

/** A plank bunk with a thin blanket. */
export function bunk() {
  const cv = propCanvas(1, 1, 16);
  const { ctx, bx, by } = cv;
  box(ctx, bx, by, 1, 0.6, 9, { left: P.brown1, right: P.brown0, top: (x) => (x % 6 ? P.brown3 : P.brown2) });
  const [cx, cy] = cv.center;
  poly(ctx, [[cx - 12, cy - 10], [cx + 6, cy - 16], [cx + 12, cy - 13], [cx - 6, cy - 7]], P.olive0);
  return cv;
}

/** A speakers' platform of crates and planks, with a rag banner on a pole. 2x2. */
export function podium() {
  const cv = propCanvas(2, 2, 70);
  const { ctx, bx, by } = cv;
  const g = box(ctx, bx, by, 2, 2, 14, { left: (x) => (x % 8 ? P.brown2 : P.brown0), right: (x) => (x % 8 ? P.brown1 : P.dark2), top: (x, y) => ((x + y) % 7 ? P.brown3 : P.brown2) });
  const [px0, py0] = g.top[0];
  line(ctx, px0 + 6, py0 + 4, px0 + 6, py0 - 50, P.dark1);
  poly(ctx, [[px0 + 7, py0 - 48], [px0 + 32, py0 - 44], [px0 + 30, py0 - 30], [px0 + 7, py0 - 34]], P.red1);
  line(ctx, px0 + 12, py0 - 42, px0 + 26, py0 - 39, shade(P.red1, 0.3));
  return cv;
}

/** Brass scales on a stand, a little pile of drops in one pan. */
export function scales() {
  const cv = propCanvas(1, 1, 40);
  const { ctx, bx, by } = cv;
  box(ctx, bx, by, 0.6, 0.6, 16, { left: P.brown2, right: P.brown1, top: P.brown3 });
  const [cx, cy] = cv.center;
  line(ctx, cx, cy - 14, cx, cy - 34, P.fire0);
  line(ctx, cx - 12, cy - 30, cx + 12, cy - 34, P.fire1);
  for (const [x, y] of [[cx - 12, cy - 30], [cx + 12, cy - 34]]) {
    line(ctx, x, y, x, y + 6, P.fire0);
    ellipse(ctx, x, y + 7, 5, 1.6, P.fire1);
  }
  for (let i = 0; i < 3; i++) circle(ctx, cx - 13 + i * 1.5, cy - 24 - i, 1.1, P.water1);
  return cv;
}
