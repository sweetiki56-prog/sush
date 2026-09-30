// Props for the new areas of stage L: the cistern under НС-2 (hatch, ladder, valve wheel, pipes), the substation
// ruins (transformer, copper coil), the old greenhouses (glass frames), the barge «Стрежень» (hull plates, a mast,
// an anchor), the post station (a safe) and the eel queen's clutch.
import { line, poly, ellipse, circle, px, rng } from './draw.mjs';
import { P, shade } from './palette.mjs';
import { propCanvas, box, cylinder } from './propkit.mjs';

const rivets = (every, c) => (x, y) => (x % every === 0 && y % 5 === 0 ? P.dark1 : c);

/** A square iron hatch in the floor with a ring, a little raised. */
export function hatch() {
  const cv = propCanvas(1, 1, 8);
  const { ctx, bx, by } = cv;
  box(ctx, bx, by - 3, 0.8, 0.8, 3, { left: P.grey1, right: P.dark2, top: rivets(6, P.grey3) });
  const [cx, cy] = cv.center;
  ellipse(ctx, cx, cy - 4, 5, 2.5, P.dark1);
  ellipse(ctx, cx, cy - 4, 3.5, 1.6, P.grey3);
  return cv;
}

/** An iron ladder bolted to the wall, going up into a square of daylight. */
export function ladder() {
  const cv = propCanvas(1, 1, 70);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  poly(ctx, [[cx - 14, cy - 66], [cx + 14, cy - 66], [cx + 10, cy - 58], [cx - 10, cy - 58]], P.sand4); // the light above
  for (const dx of [-7, 7]) line(ctx, cx + dx, cy + 4, cx + dx, cy - 60, P.rust1);
  for (let y = cy; y > cy - 58; y -= 7) line(ctx, cx - 7, y, cx + 7, y, P.rust2);
  return cv;
}

/** A big valve wheel on a pipe stand: the bypass of the cistern. */
export function valve() {
  const cv = propCanvas(1, 1, 44);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  cylinder(ctx, cx, cy + 4, 6, 26, { light: P.grey4, mid: P.grey3, dark: P.grey1, top: P.grey2 });
  ellipse(ctx, cx, cy - 30, 13, 13, P.dark1);
  ellipse(ctx, cx, cy - 30, 11, 11, P.rust2);
  ellipse(ctx, cx, cy - 30, 8, 8, P.dark1);
  for (let a = 0; a < 6; a++) line(ctx, cx, cy - 30, cx + Math.cos(a) * 9, cy - 30 + Math.sin(a) * 9, P.rust1);
  circle(ctx, cx, cy - 30, 2.5, P.grey4);
  return cv;
}

/** Two thick pipes on saddles along x, sweating rust. Two tiles. */
export function pipes() {
  const cv = propCanvas(2, 1, 26);
  const { ctx, bx, by } = cv;
  for (const [dy, c] of [[-14, P.grey3], [-4, P.grey2]]) {
    const a = [bx + 16, by - 8 + dy];
    const b = [bx - 48, by - 40 + dy];
    for (let k = -4; k <= 4; k++) line(ctx, a[0], a[1] + k, b[0], b[1] + k, k < -2 ? shade(c, 0.2) : k > 2 ? shade(c, -0.3) : c);
    ellipse(ctx, a[0], a[1], 4, 5, P.dark1);
  }
  const r = rng(7);
  for (let i = 0; i < 6; i++) px(ctx, bx - 40 + r() * 50, by - 30 + r() * 20, P.rust1);
  return cv;
}

/** A section of greenhouse wall: a rusted iron frame with a few panes left (hi) or only the sill (lo). */
export function glass(kind) {
  const H = kind === 'hi' ? 44 : 12;
  const cv = propCanvas(1, 1, H + 6);
  const { ctx, bx, by } = cv;
  box(ctx, bx, by, 1, 1, 6, { left: P.grey2, right: P.grey1, top: P.grey3 });
  if (kind === 'hi') {
    const L = [bx - 32, by - 16];
    const B = [bx, by];
    const R = [bx + 32, by - 16];
    const r = rng(kind.length);
    for (const [a, b] of [[L, B], [B, R]]) {
      for (let k = 0; k <= 2; k++) {
        const x = a[0] + ((b[0] - a[0]) * k) / 2;
        const y = a[1] + ((b[1] - a[1]) * k) / 2;
        line(ctx, x, y - 6, x, y - H, P.rust1);
      }
      line(ctx, a[0], a[1] - H, b[0], b[1] - H, P.rust1);
      if (r() < 0.7) poly(ctx, [[a[0], a[1] - 8], [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 8], [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - H + 2], [a[0], a[1] - H + 2]], 'rgba(170,210,205,0.35)');
    }
  }
  return cv;
}

/** A pre-war transformer: a ribbed tank with insulators on top, behind a broken fence. Two by two tiles. */
export function transformer() {
  const cv = propCanvas(2, 2, 70);
  const { ctx, bx, by } = cv;
  const ribs = (x) => (x % 4 === 0 ? P.grey1 : P.grey3);
  const g = box(ctx, bx, by - 8, 1.4, 1.4, 44, { left: ribs, right: (x) => (x % 4 === 0 ? P.dark2 : P.grey2), top: P.grey3 });
  const [tx, ty] = [(g.top[0][0] + g.top[2][0]) / 2, (g.top[0][1] + g.top[2][1]) / 2];
  for (const dx of [-12, 0, 12]) {
    for (let k = 0; k < 4; k++) ellipse(ctx, tx + dx, ty - 4 - k * 4, 3.5, 1.6, k % 2 ? P.bone : P.sand4);
    line(ctx, tx + dx, ty - 20, tx + dx, ty - 24, P.dark1);
  }
  ctx.fillStyle = P.sand5; // a faded warning sign
  poly(ctx, [[bx - 28, by - 36], [bx - 16, by - 30], [bx - 16, by - 42], [bx - 28, by - 48]], P.sand4);
  px(ctx, bx - 22, by - 40, P.red1);
  px(ctx, bx - 22, by - 38, P.red1);
  return cv;
}

/** A spool of copper wire as tall as a knee, green at the edges. */
export function coil() {
  const cv = propCanvas(1, 1, 30);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  cylinder(ctx, cx, cy + 4, 12, 18, { light: P.fire1, mid: P.fire0, dark: P.rust1, top: P.fire1, bands: [4, 9, 14] });
  ellipse(ctx, cx, cy - 14, 4, 2, P.dark1);
  for (const a of [0.4, 1.6, 2.6]) px(ctx, cx + Math.cos(a) * 11, cy - 10 + Math.sin(a) * 4, P.olive2);
  return cv;
}

/** A clutch of eel eggs half sunk in the sand: pale leathery ovals in a slick. */
export function eggs() {
  const cv = propCanvas(1, 1, 14);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  ellipse(ctx, cx, cy, 20, 9, 'rgba(60,50,30,0.5)');
  const r = rng(5);
  for (let i = 0; i < 9; i++) {
    const x = cx - 13 + r() * 26;
    const y = cy - 5 + r() * 8;
    ellipse(ctx, x, y - 3, 4, 3, P.bone);
    px(ctx, x - 1, y - 5, P.sand5);
  }
  return cv;
}

/** A heavy post office safe, door hanging open, empty. */
export function safe() {
  const cv = propCanvas(1, 1, 34);
  const { ctx, bx, by } = cv;
  box(ctx, bx, by, 0.8, 0.8, 30, { left: P.grey2, right: P.grey1, top: P.grey3 });
  const [cx, cy] = cv.center;
  poly(ctx, [[cx - 20, cy - 2], [cx - 8, cy + 4], [cx - 8, cy - 22], [cx - 20, cy - 28]], P.grey3); // the open door
  circle(ctx, cx - 14, cy - 12, 3, P.dark1);
  poly(ctx, [[cx - 6, cy + 2], [cx + 8, cy - 5], [cx + 8, cy - 25], [cx - 6, cy - 18]], P.dark0); // the dark inside
  return cv;
}

/** The barge's side: riveted hull plates, rust streaks; high (a wall) or low (a rail). */
export function hull(kind) {
  const H = kind === 'hi' ? 40 : 14;
  const cv = propCanvas(1, 1, H + 6);
  const { ctx, bx, by } = cv;
  const r = rng(H);
  // dark weathered steel, rust bleeding down from the rivet lines
  const face = (base, streak) => (x, y) => (x % 16 === 0 || (y % 12 === 0 && x % 3 === 0) ? P.dark0 : (x * 7 + Math.floor(y / 3)) % 11 === 0 ? streak : r() < 0.08 ? P.rust0 : base);
  box(ctx, bx, by, 1, 1, H, { left: face(P.brown1, P.rust1), right: face(P.dark2, P.rust0), top: kind === 'hi' ? P.grey1 : P.brown2 });
  return cv;
}

/** A stub of a mast with a spar and loose rigging. */
export function mast() {
  const cv = propCanvas(1, 1, 150);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  for (let k = -2; k <= 2; k++) line(ctx, cx + k, cy + 2, cx + k * 0.6, cy - 140, k < 0 ? P.brown3 : P.brown1);
  line(ctx, cx - 30, cy - 112, cx + 30, cy - 124, P.brown2);
  for (const [x, y] of [[-30, -112], [30, -124]]) line(ctx, cx + x, cy + y, cx + x * 0.3, cy - 10, P.dark2);
  poly(ctx, [[cx - 26, cy - 110], [cx - 4, cy - 118], [cx - 8, cy - 70], [cx - 22, cy - 76]], P.sand2); // a rag of sail
  return cv;
}

/** A huge anchor lying on its side, rusted to the colour of the sand. */
export function anchor() {
  const cv = propCanvas(1, 1, 24);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  for (let k = -2; k <= 2; k++) line(ctx, cx - 24, cy - 8 + k, cx + 18, cy + 8 + k, k ? P.rust1 : P.rust2);
  for (let a = 0.2; a < 2.9; a += 0.1) {
    const x = cx + 18 + Math.cos(a + 1.3) * 10;
    const y = cy + 8 - Math.sin(a + 1.3) * 10;
    px(ctx, x, y, P.rust1);
    px(ctx, x + 1, y, P.rust0);
  }
  ellipse(ctx, cx - 26, cy - 9, 5, 5, P.dark1);
  ellipse(ctx, cx - 26, cy - 9, 3, 3, P.sand3);
  return cv;
}
