// Small props, vegetation, vehicles, fx sprites and cursors.
import { canvas, makeNoise, rng, line, poly, circle, ellipse, px } from './draw.mjs';
import { P } from './palette.mjs';
import { propCanvas, box, cylinder } from './propkit.mjs';

const nz = makeNoise(99);

export function barrel(hazard) {
  const cv = propCanvas(1, 1, 30);
  const [cx, cy] = cv.center;
  cylinder(cv.ctx, cx, cy + 3, 9, 24, { light: hazard ? P.sand4 : P.rust3, mid: hazard ? P.sand3 : P.rust2, dark: hazard ? P.sand1 : P.rust0, top: hazard ? P.sand2 : P.rust1, band: P.dark1, bands: [6, 17] });
  if (hazard) {
    for (let x = -8; x < 9; x += 4) line(cv.ctx, cx + x, cy - 5, cx + x + 3, cy - 11, P.ink);
  } else {
    for (let i = 0; i < 18; i++) px(cv.ctx, cx - 8 + ((i * 7) % 16), cy - 18 + ((i * 11) % 20), P.brown1);
  }
  ellipse(cv.ctx, cx - 2, cy - 21, 2, 1, P.dark0);
  return cv;
}

export function tires() {
  const cv = propCanvas(1, 1, 22);
  const [cx, cy] = cv.center;
  for (let i = 0; i < 3; i++) {
    ellipse(cv.ctx, cx, cy + 2 - i * 6, 12, 6, P.dark0);
    ellipse(cv.ctx, cx - 1, cy + 1 - i * 6, 11, 5, P.grey1);
    ellipse(cv.ctx, cx, cy - 1 - i * 6, 5, 2.4, P.dark0);
  }
  return cv;
}

export function crate(big) {
  const s = big ? 0.72 : 0.6;
  const cv = propCanvas(1, 1, 26);
  const plank = (base, dark) => (x, y, hh) => ((Math.floor(hh) % 6 === 0 || x % 11 === 0) ? dark : nz(x * 0.3, y * 0.3) > 0.62 ? P.brown2 : base);
  const off = (1 - s) * 16;
  const g = box(cv.ctx, cv.bx, cv.by - off, s, s, big ? 20 : 16, {
    left: big ? plank(P.olive2, P.olive0) : plank(P.brown4, P.brown2),
    right: big ? plank(P.olive1, P.olive0) : plank(P.brown3, P.brown1),
    top: big ? P.olive3 : P.brown5,
  });
  if (big) {
    const [x, y] = [g.L[0] + 8, g.L[1] - 6];
    line(cv.ctx, x, y, x + 10, y + 5, P.sand4); // stencil mark
    line(cv.ctx, x, y - 4, x + 10, y + 1, P.sand4);
  }
  return cv;
}

export function car(axis, burnt) {
  const w = axis === 'x' ? 2 : 1;
  const h = axis === 'x' ? 1 : 2;
  const cv = propCanvas(w, h, burnt ? 42 : 34);
  const { ctx, bx, by } = cv;
  const sedan = axis === 'x' && !burnt;
  const pickup = axis === 'y' && !burnt;
  const paint = burnt ? [P.grey2, P.grey1, P.dark1] : sedan ? [P.rust3, P.rust1, P.rust2] : [P.olive3, P.olive1, P.olive2];
  const worn = (lit, shade) => (x, y, z) => {
    const n = nz(x * 0.17, y * 0.17);
    if (n > 0.72 && z > 3) return burnt ? P.ink : P.rust0;
    return n > 0.51 ? shade : lit;
  };
  const g = box(ctx, bx, by - 4, w - 0.12, h - 0.12, 12, {
    left: worn(paint[0], paint[1]), right: worn(paint[1], P.dark1), top: paint[2],
  });
  // Place a part on the chassis top by its distance from the near (+x,+y) vertex.
  const deck = (fromX, fromY, width, depth, height, faces) => {
    const p = g.up(g.B);
    return box(ctx, p[0] - fromX * 32 + fromY * 32, p[1] - (fromX + fromY) * 16, width, depth, height, faces);
  };
  const glass = (light) => (_x, _y, z) => z > 2 && z < 8 ? light : paint[0];
  if (sedan) {
    // A low saloon roof leaves an obvious bonnet and boot at either end.
    const cab = deck(0.48, 0.13, 0.86, 0.6, 9, {
      left: glass(P.teal1), right: glass(P.teal0), top: P.rust1,
    });
    line(ctx, cab.up(cab.L)[0], cab.up(cab.L)[1], cab.up(cab.T)[0], cab.up(cab.T)[1], P.rust3);
  } else if (pickup) {
    // Open dark bed with raised rails; the separate high cab sits at the far end.
    const bed = deck(0.06, 0.08, 0.74, 0.98, 4, { left: P.olive1, right: P.olive0, top: P.dark1 });
    for (let t = 0.2; t < 0.95; t += 0.24) {
      const a = [bed.up(bed.B)[0] + (bed.up(bed.R)[0] - bed.up(bed.B)[0]) * t, bed.up(bed.B)[1] + (bed.up(bed.R)[1] - bed.up(bed.B)[1]) * t];
      line(ctx, a[0] - 13, a[1] - 7, a[0] - 3, a[1] - 12, P.brown2);
    }
    deck(0.08, 1.14, 0.68, 0.58, 12, { left: glass(P.teal2), right: glass(P.teal0), top: P.olive3 });
  } else {
    // Burnt delivery van: tall cargo shell, crushed cab and black empty windows.
    deck(0.08, 0.06, 1.03, 0.75, 19, { left: worn(P.grey2, P.grey1), right: worn(P.grey1, P.dark0), top: P.grey1 });
    deck(1.14, 0.08, 0.59, 0.71, 11, { left: glass(P.ink), right: glass(P.dark0), top: P.grey1 });
    for (let i = 0; i < 24; i++) px(ctx, bx - 48 + ((i * 17) % 92), by - 26 - ((i * 13) % 20), i % 3 ? P.rust0 : P.ink);
  }
  // Two wheels on the long visible side, one on the short side: a readable vehicle at game zoom.
  const wheel = (x, y) => {
    ellipse(ctx, x, y, 5.8, 4.8, P.ink);
    ellipse(ctx, x, y, 3.2, 2.9, P.grey1);
    ellipse(ctx, x - 1, y - 1, 1.2, 1, P.grey4);
  };
  const along = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  for (const t of [0.18, 0.82]) {
    const p = axis === 'x' ? along(g.L, g.B, t) : along(g.B, g.R, t);
    wheel(p[0], p[1] - 3);
  }
  const side = axis === 'x' ? along(g.B, g.R, 0.5) : along(g.L, g.B, 0.5);
  wheel(side[0], side[1] - 3);
  const trim = axis === 'x' ? [g.L, g.B] : [g.B, g.R];
  const p0 = along(trim[0], trim[1], 0.08);
  const p1 = along(trim[0], trim[1], 0.92);
  line(ctx, p0[0], p0[1] - 10, p1[0], p1[1] - 10, burnt ? P.grey0 : P.sand2);
  if (!burnt) {
    const nose = axis === 'x' ? g.B : g.R;
    px(ctx, nose[0] - 3, nose[1] - 11, P.sand5);
    px(ctx, nose[0] + 3, nose[1] - 13, P.sand5);
  }
  return cv;
}

export function pylon() {
  const cv = propCanvas(1, 1, 118);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  ctx.fillStyle = P.brown1;
  ctx.fillRect(cx - 2, cy - 110, 4, 112);
  ctx.fillStyle = P.brown3;
  ctx.fillRect(cx - 2, cy - 110, 1, 112);
  line(ctx, cx - 18, cy - 92, cx + 18, cy - 104, P.brown2);
  line(ctx, cx - 18, cy - 91, cx + 18, cy - 103, P.brown1);
  for (const t of [-15, 0, 15]) {
    ctx.fillStyle = P.teal2;
    ctx.fillRect(cx + t - 1, cy - 97 - t * 0.33 - 4, 2, 4);
  }
  line(ctx, cx - 14, cy - 90, cx - 30, cy - 78, P.dark1); // snapped wire
  return cv;
}

export function skeleton() {
  const cv = propCanvas(1, 1, 6);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  circle(ctx, cx - 9, cy - 2, 3.2, P.bone);
  px(ctx, cx - 10, cy - 2, P.ink);
  px(ctx, cx - 8, cy - 2, P.ink);
  line(ctx, cx - 6, cy, cx + 8, cy + 4, P.bone);
  for (let i = 0; i < 4; i++) line(ctx, cx - 3 + i * 3, cy + i * 0.8 - 2, cx - 2 + i * 3, cy + i * 0.8 + 3, P.grey6);
  line(ctx, cx + 8, cy + 4, cx + 14, cy + 2, P.bone);
  line(ctx, cx + 8, cy + 4, cx + 13, cy + 7, P.bone);
  line(ctx, cx - 4, cy - 1, cx - 8, cy + 5, P.grey6);
  ctx.fillStyle = P.brown2;
  ctx.fillRect(cx + 2, cy - 6, 6, 4); // satchel
  return cv;
}

export function rock(i) {
  const cv = propCanvas(1, 1, 30);
  const { ctx } = cv;
  const r = rng(40 + i);
  const [cx, cy] = cv.center;
  const n = 3 + Math.floor(r() * 3);
  for (let k = 0; k < n; k++) {
    const x = cx + (r() - 0.5) * 30;
    const y = cy + (r() - 0.5) * 10;
    const rr = 7 + r() * 8;
    const base = i % 2 ? [P.brown1, P.brown3, P.brown4] : [P.grey1, P.grey3, P.grey4];
    ellipse(ctx, x + 1, y - rr * 0.6 + 1, rr, rr * 0.8, base[0]);
    ellipse(ctx, x, y - rr * 0.6, rr * 0.92, rr * 0.72, base[1]);
    ellipse(ctx, x - rr * 0.3, y - rr * 0.9, rr * 0.45, rr * 0.3, base[2]);
  }
  return cv;
}

export function cactus() {
  const cv = propCanvas(1, 1, 36);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  const stem = (x0, y0, x1, y1, w) => {
    for (let t = 0; t <= 1; t += 0.04) {
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      ellipse(ctx, x, y, w, w * 0.7, P.olive1);
      ellipse(ctx, x - w * 0.35, y, w * 0.4, w * 0.5, P.olive3);
    }
  };
  stem(cx, cy, cx, cy - 30, 3.6);
  stem(cx - 7, cy - 14, cx - 7, cy - 22, 2.4);
  line(ctx, cx - 4, cy - 13, cx - 7, cy - 14, P.olive1);
  stem(cx + 6, cy - 18, cx + 6, cy - 26, 2.2);
  px(ctx, cx, cy - 33, P.red2); // flower
  return cv;
}

export function deadTree() {
  const cv = propCanvas(1, 1, 70);
  const { ctx } = cv;
  const r = rng(7);
  const [cx, cy] = cv.center;
  const branch = (x, y, a, len, depth) => {
    const x2 = x + Math.cos(a) * len;
    const y2 = y + Math.sin(a) * len;
    for (let k = 0; k < Math.max(1, depth); k++) line(ctx, x + k * 0.6, y, x2 + k * 0.6, y2, depth > 2 ? P.brown1 : P.grey3);
    if (depth > 0) {
      branch(x2, y2, a - 0.4 - r() * 0.3, len * 0.7, depth - 1);
      branch(x2, y2, a + 0.35 + r() * 0.3, len * 0.66, depth - 1);
    }
  };
  branch(cx, cy, -Math.PI / 2, 26, 4);
  return cv;
}

export function bush() {
  const cv = propCanvas(1, 1, 16);
  const { ctx } = cv;
  const r = rng(3);
  const [cx, cy] = cv.center;
  for (let i = 0; i < 14; i++) {
    const a = -Math.PI * (0.1 + r() * 0.8);
    line(ctx, cx, cy, cx + Math.cos(a) * (6 + r() * 7), cy + Math.sin(a) * (5 + r() * 7), r() < 0.5 ? P.olive2 : P.brown3);
  }
  return cv;
}

export function sign() {
  const cv = propCanvas(1, 1, 40);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  ctx.fillStyle = P.brown1;
  ctx.fillRect(cx - 1, cy - 34, 3, 35);
  poly(ctx, [[cx - 16, cy - 36], [cx + 14, cy - 30], [cx + 14, cy - 20], [cx - 16, cy - 26]], P.brown4);
  line(ctx, cx - 16, cy - 31, cx + 14, cy - 25, P.brown3);
  for (let i = -12; i < 10; i += 3) line(ctx, cx + i, cy - 31 + (i + 12) * 0.2, cx + i + 1, cy - 31 + (i + 12) * 0.2, P.dark1);
  for (let i = -12; i < 4; i += 3) line(ctx, cx + i, cy - 26 + (i + 12) * 0.2, cx + i + 1, cy - 26 + (i + 12) * 0.2, P.red1);
  return cv;
}

export function campfire() {
  const cv = propCanvas(1, 1, 10);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  ellipse(ctx, cx, cy, 13, 6.5, P.dark0);
  for (let a = 0; a < Math.PI * 2; a += 0.7) ellipse(ctx, cx + Math.cos(a) * 11, cy + Math.sin(a) * 5.5, 3, 2, P.grey3);
  line(ctx, cx - 7, cy + 2, cx + 6, cy - 3, P.brown2);
  line(ctx, cx - 6, cy - 3, cx + 7, cy + 2, P.brown1);
  ellipse(ctx, cx, cy - 1, 4, 2, P.fire0);
  return cv;
}

// ---------- fx and cursors (kept semi-transparent: not finalized) ----------
export function glow() {
  const cv = canvas(128, 64);
  const g = cv.ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  g.addColorStop(0, 'rgba(255,190,110,0.55)');
  g.addColorStop(0.4, 'rgba(240,140,60,0.22)');
  g.addColorStop(1, 'rgba(240,120,40,0)');
  cv.ctx.setTransform(1, 0, 0, 0.5, 0, 0);
  cv.ctx.fillStyle = g;
  cv.ctx.fillRect(0, 0, 128, 128);
  return cv;
}

export function blobShadow() {
  const cv = canvas(28, 12);
  cv.ctx.fillStyle = 'rgba(18,13,10,0.42)';
  cv.ctx.beginPath();
  cv.ctx.ellipse(14, 6, 12, 5, 0, 0, Math.PI * 2);
  cv.ctx.fill();
  return cv;
}

export function soft(size, color) {
  const cv = canvas(size, size);
  const g = cv.ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  cv.ctx.fillStyle = g;
  cv.ctx.fillRect(0, 0, size, size);
  return cv;
}

export function tumbleweed() {
  const cv = canvas(18, 18);
  const r = rng(12);
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2;
    const b = a + 1 + r() * 2;
    line(cv.ctx, 9 + Math.cos(a) * 7, 9 + Math.sin(a) * 7, 9 + Math.cos(b) * 7, 9 + Math.sin(b) * 7, r() < 0.5 ? P.brown3 : P.sand1);
  }
  return cv;
}

export function tileCursor(color) {
  const cv = canvas(64, 32);
  const { ctx } = cv;
  const pts = [[32, 0], [63, 15.5], [32, 31], [0, 15.5]];
  for (let i = 0; i < 4; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % 4];
    line(ctx, a[0], a[1], b[0], b[1], color);
  }
  return cv;
}

export function pointer() {
  const cv = canvas(16, 18);
  poly(cv.ctx, [[1, 1], [1, 14], [4, 11], [7, 17], [9, 16], [6, 10], [11, 10]], P.sand4);
  line(cv.ctx, 2, 3, 2, 11, P.sand5);
  return cv;
}

export function hand() {
  const cv = canvas(16, 18);
  const { ctx } = cv;
  ctx.fillStyle = P.sand4;
  ctx.fillRect(5, 1, 3, 10);
  ctx.fillRect(8, 5, 6, 8);
  ctx.fillRect(3, 8, 3, 5);
  ctx.fillRect(5, 12, 9, 4);
  ctx.fillStyle = P.sand2;
  ctx.fillRect(10, 5, 1, 4);
  ctx.fillRect(12, 6, 1, 4);
  return cv;
}

export function metal() {
  const cv = canvas(128, 128);
  const { ctx } = cv;
  for (let y = 0; y < 128; y++)
    for (let x = 0; x < 128; x++) {
      const n = nz((x % 128) * 0.08, y * 0.08, 4);
      const c = n > 0.66 ? P.rust1 : n > 0.58 ? P.brown1 : n > 0.4 ? P.grey1 : P.grey0;
      px(ctx, x, y, c);
    }
  return cv;
}

export function rivet() {
  const cv = canvas(6, 6);
  circle(cv.ctx, 3, 3, 2.4, P.grey2);
  px(cv.ctx, 2, 2, P.grey5);
  return cv;
}

/** Hank's army duffel bag by the fire. */
export function bag() {
  const cv = propCanvas(1, 1, 18);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  ellipse(ctx, cx + 1, cy - 4, 11, 6, P.olive0);
  ellipse(ctx, cx, cy - 6, 10, 6, P.olive1);
  ellipse(ctx, cx - 3, cy - 8, 5, 3, P.olive2);
  line(ctx, cx - 8, cy - 9, cx + 7, cy - 3, P.brown1); // strap
  line(ctx, cx + 8, cy - 8, cx + 10, cy - 12, P.brown2);
  px(ctx, cx + 2, cy - 7, P.grey5); // buckle
  return cv;
}
