// Structures: shacks, concrete walls, door, pump well, water tank, pump machine.
import { makeNoise, rng, line, poly, circle, ellipse, px, bayer } from './draw.mjs';
import { P } from './palette.mjs';
import { propCanvas, box, cylinder } from './propkit.mjs';

const nz = makeNoise(314);

function corrugated(light, mid, dark, rustiness, seed) {
  return (x, y, hh) => {
    if (hh < 2) return P.dark2;
    const s = ((x % 4) + 4) % 4;
    let c = s === 0 ? dark : s === 1 ? light : mid;
    const n = nz(x * 0.09 + seed, y * 0.09);
    if (n > 1 - rustiness) c = n > 1 - rustiness * 0.5 ? P.rust1 : s === 1 ? P.rust3 : P.rust2;
    if (nz(x * 0.7 + seed, y * 0.04) > 0.72 && s !== 1) c = P.rust0; // streaks
    return c;
  };
}

export function shack(variant) {
  const w = 3;
  const h = 3;
  const H = 42;
  const cv = propCanvas(w, h, H + 22);
  const { ctx, bx, by } = cv;
  const pal = variant === 'a' ? [P.grey5, P.grey4, P.grey2, 0.3] : [P.teal2, P.teal1, P.teal0, 0.42];
  const g = box(ctx, bx, by, w, h, H, {
    left: corrugated(pal[0], pal[1], pal[2], pal[3], 3),
    right: corrugated(pal[1], pal[2], P.grey0, pal[3], 9),
  });
  // door on the +y face (plank door) and a boarded window on +x face
  const L = g.L;
  const dx = L[0] + 30;
  const dy = L[1] + 15;
  poly(ctx, [[dx, dy], [dx + 14, dy + 7], [dx + 14, dy + 7 - 28], [dx, dy - 28]], P.brown1);
  for (let i = 1; i < 14; i += 4) line(ctx, dx + i, dy + i / 2, dx + i, dy + i / 2 - 27, P.brown3);
  line(ctx, dx, dy - 14, dx + 14, dy - 7, P.dark2);
  px(ctx, dx + 11, dy - 7, P.fire2);
  const wx = g.B[0] + 26;
  const wy = g.B[1] - 13 - 16;
  poly(ctx, [[wx, wy], [wx + 14, wy - 7], [wx + 14, wy - 17], [wx, wy - 10]], P.dark0);
  line(ctx, wx, wy - 3, wx + 14, wy - 12, P.brown3);
  line(ctx, wx, wy - 7, wx + 14, wy - 15, P.brown2);
  // roof: sheets with overhang and slight tilt
  const up = (p, k = 0) => [p[0], p[1] - H - k];
  const o = 4;
  const roof = [
    [up(g.L)[0] - o, up(g.L)[1] + 1],
    [up(g.B)[0], up(g.B)[1] + o],
    [up(g.R, 8)[0] + o, up(g.R, 8)[1] + 1],
    [up(g.T, 8)[0], up(g.T, 8)[1] - o],
  ];
  poly(ctx, roof, variant === 'a' ? P.rust2 : P.grey3);
  for (let k = 1; k < 12; k++) {
    const t = k / 12;
    const a = [roof[0][0] + (roof[3][0] - roof[0][0]) * t, roof[0][1] + (roof[3][1] - roof[0][1]) * t];
    const b = [roof[1][0] + (roof[2][0] - roof[1][0]) * t, roof[1][1] + (roof[2][1] - roof[1][1]) * t];
    line(ctx, a[0], a[1], b[0], b[1], k % 3 === 0 ? P.rust0 : variant === 'a' ? P.rust3 : P.grey4);
  }
  poly(ctx, [roof[0], roof[1], [roof[1][0], roof[1][1] + 3], [roof[0][0], roof[0][1] + 3]], P.dark1);
  poly(ctx, [roof[1], roof[2], [roof[2][0], roof[2][1] + 3], [roof[1][0], roof[1][1] + 3]], P.dark0);
  // clutter: a tire and a pipe chimney on the roof
  ellipse(ctx, roof[3][0] + 6, roof[3][1] + 22, 7, 3.5, P.dark0);
  ellipse(ctx, roof[3][0] + 6, roof[3][1] + 22, 3, 1.4, P.grey1);
  ctx.fillStyle = P.grey2;
  ctx.fillRect(Math.round(roof[2][0] - 18), Math.round(roof[2][1] - 12), 4, 14);
  ctx.fillStyle = P.dark1;
  ctx.fillRect(Math.round(roof[2][0] - 18), Math.round(roof[2][1] - 13), 4, 2);
  return cv;
}

function concrete(seed, broken) {
  return (x, y, hh, t) => {
    const n = nz(x * 0.2 + seed, y * 0.2);
    let c = n > 0.55 ? P.grey4 : n > 0.4 ? P.grey3 : P.grey2;
    if (hh < 3) c = P.grey1;
    if (Math.abs(((hh + 2) % 12) - 0) < 1 && t > 0.02) c = P.grey2; // block joints
    if (nz(x * 0.5 + seed, y * 0.08) > 0.7) c = P.brown2;
    if (broken && hh > broken(x)) return null;
    return c;
  };
}

export function wall(kind) {
  const H = kind === 'hi' ? 40 : kind === 'lo' ? 16 : 22;
  const cv = propCanvas(1, 1, H + 6);
  const { ctx, bx, by } = cv;
  const r = rng(kind.length * 17);
  const jag = kind === 'broken' ? (x) => 9 + Math.abs(Math.sin(x * 0.11) * 9) + Math.floor(nz(x * 0.4, 3) * 4) : null;
  const shadeTop = (x, y) => (bayer(x, y) > 0.5 ? P.grey5 : P.grey4);
  box(ctx, bx, by, 1, 1, H, { left: concrete(1, jag), right: (x, y, hh, t) => {
    const c = concrete(5, jag)(x, y, hh, t);
    return c === P.grey4 ? P.grey3 : c === P.grey3 ? P.grey2 : c;
  }, top: jag ? null : shadeTop });
  if (kind === 'broken') {
    // rubble heap at the foot of the broken section
    for (let i = 0; i < 14; i++) ellipse(ctx, bx - 22 + r() * 44, by - 6 - r() * 10, 2 + r() * 3, 1.5 + r() * 2, r() < 0.5 ? P.grey3 : P.grey4);
    for (let i = 0; i < 3; i++) {
      const x = bx - 20 + r() * 40;
      line(ctx, x, by - 18 - r() * 4, x + 2, by - 30 - r() * 8, P.rust1); // rebar
    }
  } else {
    // rubble crumbs on top
    for (let i = 0; i < 6; i++) px(ctx, bx - 14 + r() * 28, by - H - 16 + r() * 12, P.grey1);
  }
  return cv;
}

export function door(open) {
  const H = 40;
  const cv = propCanvas(1, 1, H + 8);
  const { ctx, bx, by } = cv;
  const L = [bx - 32, by - 16];
  // posts at both ends of the +y face and a lintel
  const post = (x, y) => {
    poly(ctx, [[x, y], [x + 5, y + 2.5], [x + 5, y - H + 2.5], [x, y - H]], P.grey3);
    poly(ctx, [[x + 5, y + 2.5], [x + 8, y + 1], [x + 8, y - H + 1], [x + 5, y - H + 2.5]], P.grey2);
  };
  post(L[0], L[1]);
  post(bx - 6, by - 3);
  poly(ctx, [[L[0], L[1] - H], [bx + 2, by - H], [bx + 2, by - H + 6], [L[0], L[1] - H + 6]], P.grey4);
  const a = [L[0] + 5, L[1] + 2];
  const b = [bx - 6, by - 3];
  if (!open) {
    const pts = [a, b, [b[0], b[1] - H + 6], [a[0], a[1] - H + 6]];
    const fill = (x, y) => {
      const n = nz(x * 0.15, y * 0.15);
      if ((x - a[0]) % 7 === 0) return P.teal0;
      return n > 0.62 ? P.rust2 : n > 0.5 ? P.rust1 : P.teal1;
    };
    for (let y = Math.floor(a[1] - H); y < b[1] + 1; y++)
      for (let x = Math.floor(a[0]); x < b[0]; x++) {
        const base = a[1] + (x - a[0]) * 0.5;
        if (y <= base && y >= base - H + 6) px(ctx, x, y, fill(x, y));
      }
    void pts;
    // chained padlock
    line(ctx, a[0] + 14, a[1] - 17, a[0] + 20, a[1] - 14, P.grey5);
    ctx.fillStyle = P.sand3;
    ctx.fillRect(Math.round(a[0] + 17), Math.round(a[1] - 15), 3, 4);
  } else {
    // panel swung inward, seen edge-on along the +x direction
    const hinge = a;
    const end = [hinge[0] + 20, hinge[1] - 10];
    poly(ctx, [hinge, end, [end[0], end[1] - H + 6], [hinge[0], hinge[1] - H + 6]], P.teal0);
    for (let k = 0; k < 20; k += 5) line(ctx, hinge[0] + k, hinge[1] - k / 2, hinge[0] + k, hinge[1] - k / 2 - H + 7, P.rust0);
  }
  return cv;
}

export function pump(fixed) {
  const cv = propCanvas(2, 2, 58);
  const { ctx, center } = cv;
  const [cx, cy] = center;
  // stone ring
  const r = rng(fixed ? 2 : 1);
  ellipse(ctx, cx, cy, 25, 12.5, P.grey1);
  for (let a = 0; a < Math.PI * 2; a += 0.33) {
    const x = cx + Math.cos(a) * 22;
    const y = cy + Math.sin(a) * 11 - 4;
    ellipse(ctx, x, y, 5, 4, r() < 0.5 ? P.grey3 : P.grey4);
    px(ctx, x - 2, y - 2, P.grey5);
  }
  ellipse(ctx, cx, cy - 5, 16, 8, fixed ? P.water0 : P.dark0);
  if (fixed) {
    ellipse(ctx, cx - 3, cy - 6, 9, 3, P.water1);
    line(ctx, cx - 6, cy - 7, cx + 1, cy - 7, P.water2);
  }
  // A-frame and hand pump
  line(ctx, cx - 18, cy - 4, cx - 4, cy - 50, P.brown2);
  line(ctx, cx - 17, cy - 4, cx - 3, cy - 50, P.brown3);
  line(ctx, cx + 18, cy - 4, cx + 4, cy - 50, P.brown1);
  line(ctx, cx + 17, cy - 4, cx + 3, cy - 50, P.brown2);
  line(ctx, cx - 6, cy - 50, cx + 6, cy - 50, P.brown3);
  ctx.fillStyle = P.grey2;
  ctx.fillRect(cx + 5, cy - 34, 6, 22); // pump body
  ctx.fillStyle = P.grey4;
  ctx.fillRect(cx + 5, cy - 34, 2, 22);
  line(ctx, cx + 11, cy - 30, cx + 17, cy - 30, P.grey3); // spout
  line(ctx, cx + 8, cy - 35, cx - 6, cy - 44, P.grey4); // lever
  if (!fixed) {
    ctx.fillStyle = P.dark0;
    ctx.fillRect(cx + 5, cy - 22, 6, 3); // missing valve gap
    px(ctx, cx + 12, cy - 21, P.rust2);
  } else {
    px(ctx, cx + 17, cy - 28, P.water2);
    px(ctx, cx + 17, cy - 25, P.water1);
  }
  // bucket
  ctx.fillStyle = P.grey3;
  ctx.fillRect(cx + 14, cy + 2, 7, 6);
  ctx.fillStyle = fixed ? P.water1 : P.dark1;
  ctx.fillRect(cx + 15, cy + 2, 5, 1);
  return cv;
}

export function tank() {
  const cv = propCanvas(2, 2, 70);
  const { ctx, center } = cv;
  const [cx, cy] = center;
  for (const [ox, oy] of [[-14, -2], [14, -2], [-4, 5], [6, -8]]) line(ctx, cx + ox, cy + oy, cx + ox * 0.8, cy + oy - 24, P.rust0);
  cylinder(ctx, cx, cy - 22, 20, 38, { light: P.rust3, mid: P.rust2, dark: P.rust0, top: P.rust1, band: P.rust0, bands: [8, 22, 34] });
  ellipse(ctx, cx, cy - 60, 6, 3, P.dark1);
  for (let i = 0; i < 40; i++) {
    const x = cx - 18 + ((i * 37) % 36);
    const y = cy - 56 + ((i * 53) % 36);
    if (nz(x * 0.3, y * 0.3) > 0.6) px(ctx, x, y, P.brown1);
  }
  return cv;
}

export function machine() {
  const cv = propCanvas(2, 2, 48);
  const { ctx, bx, by } = cv;
  box(ctx, bx - 4, by - 2, 1.7, 1.7, 22, {
    left: (x, y) => (nz(x * 0.2, y * 0.2) > 0.6 ? P.rust2 : P.teal1),
    right: (x, y) => (nz(x * 0.2 + 5, y * 0.2) > 0.6 ? P.rust1 : P.teal0),
    top: P.teal2,
  });
  const [cx, cy] = cv.center;
  cylinder(ctx, cx - 10, cy - 20, 8, 16, { light: P.grey4, mid: P.grey3, dark: P.grey1, top: P.grey5, band: P.grey1, bands: [5, 11] });
  cylinder(ctx, cx + 10, cy - 24, 6, 12, { light: P.rust3, mid: P.rust2, dark: P.rust0, top: P.rust1, band: P.rust0, bands: [4] });
  line(ctx, cx - 2, cy - 36, cx + 10, cy - 36, P.grey4);
  line(ctx, cx - 2, cy - 35, cx + 10, cy - 35, P.grey2);
  circle(ctx, cx + 20, cy - 12, 3, P.dark1); // gauge
  px(ctx, cx + 20, cy - 13, P.fire1);
  return cv;
}

/** Narrow steel locker with a padlock (station interior). */
export function locker() {
  const cv = propCanvas(1, 1, 44);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  const bx = cx + 12;
  const by = cy + 6;
  box(ctx, bx, by, 0.55, 0.45, 38, {
    left: (x, y, hh) => (hh > 35 ? P.grey4 : Math.floor(hh) % 9 === 0 ? P.grey2 : nz(x * 0.2, y * 0.1) > 0.7 ? P.rust1 : P.teal1),
    right: (x, y, hh) => (hh > 35 ? P.grey3 : nz(x * 0.2 + 5, y * 0.1) > 0.72 ? P.rust0 : P.teal0),
    top: P.grey4,
  });
  line(ctx, bx - 9, by - 5, bx - 9, by - 36, P.dark1); // door seam
  for (let k = 0; k < 3; k++) line(ctx, bx - 15, by - 26 - k * 2 + 3, bx - 11, by - 24 - k * 2 + 3, P.dark0); // vents
  circle(ctx, bx - 7, by - 19, 1.6, P.fire1); // padlock
  px(ctx, bx - 7, by - 21, P.grey5);
  return cv;
}
