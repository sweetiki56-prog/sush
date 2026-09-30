// Props for Соль and the Salt sea (stage K): walls of cut salt blocks, the Guild's beam scales, the mine's headframe
// and carts, salt heaps and crystal growths, the arena's stands, a wreck's ribs, a pre-war radio, a nomad wagon.
import { line, poly, ellipse, circle, px, rng, bayer } from './draw.mjs';
import { P, shade } from './palette.mjs';
import { propCanvas, box, cylinder } from './propkit.mjs';

/** A wall of cut salt blocks, pale and glinting: tall at the back, low in front, or broken. */
export function saltWall(kind) {
  const H = kind === 'hi' ? 40 : kind === 'lo' ? 16 : 22;
  const cv = propCanvas(1, 1, H + 6);
  const { ctx, bx, by } = cv;
  const r = rng(kind.length * 31);
  // courses of blocks: a mortar line every 8 px, joints staggered
  const face = (base, mortar) => (x, y, h) => {
    const course = Math.floor(h / 8);
    if (h % 8 < 1) return mortar;
    if ((x + course * 7) % 14 < 1) return mortar;
    if (kind === 'broken' && h > 10 + Math.abs(Math.sin(x * 0.13)) * 10) return null;
    return bayer(x, y) > 0.86 ? P.bone : base;
  };
  box(ctx, bx, by, 1, 1, H, { left: face(P.grey5, P.grey3), right: face(P.grey4, P.grey2), top: kind === 'broken' ? null : P.bone });
  if (kind === 'broken') for (let i = 0; i < 10; i++) ellipse(ctx, bx - 20 + r() * 40, by - 6 - r() * 10, 2 + r() * 3, 1.5 + r() * 2, r() < 0.5 ? P.grey5 : P.bone);
  return cv;
}

/** The Guild's beam scales: a gallows-like frame, a long beam, a pan heaped with salt and a stack of weights. 2x1. */
export function beamScales() {
  const cv = propCanvas(2, 1, 70);
  const { ctx, bx, by } = cv;
  box(ctx, bx, by, 2, 1, 6, { left: P.brown1, right: P.brown0, top: P.brown2 });
  const [cx, cy] = cv.center;
  line(ctx, cx - 2, cy - 4, cx - 2, cy - 58, P.dark1);
  line(ctx, cx + 1, cy - 4, cx + 1, cy - 58, P.brown1);
  line(ctx, cx - 30, cy - 50, cx + 30, cy - 58, P.dark1);
  line(ctx, cx - 30, cy - 49, cx + 30, cy - 57, P.fire0);
  for (const [x, y] of [[cx - 30, cy - 50], [cx + 30, cy - 58]]) {
    line(ctx, x, y, x - 6, y + 16, P.dark2);
    line(ctx, x, y, x + 6, y + 16, P.dark2);
    ellipse(ctx, x, y + 17, 9, 3, P.fire1);
  }
  for (let i = 0; i < 6; i++) circle(ctx, cx - 33 + i * 1.3, cy - 35 - (i % 3), 2, P.bone); // salt in the left pan
  for (let i = 0; i < 3; i++) box(ctx, cx + 28, cy - 40 - i * 4, 0.15, 0.15, 4, { left: P.grey2, right: P.grey1, top: P.grey3 });
  return cv;
}

/** The mine's headframe: two timber legs, a cross beam and a winding wheel over the shaft. 2x2. */
export function headframe() {
  const cv = propCanvas(2, 2, 130);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  ellipse(ctx, cx, cy, 22, 10, P.dark0); // the shaft mouth
  ellipse(ctx, cx, cy - 1, 18, 7, P.ink);
  for (const [dx, dy] of [[-26, 6], [26, 6], [-14, -8], [14, -8]]) {
    line(ctx, cx + dx, cy + dy, cx + dx * 0.25, cy - 104, P.brown0);
    line(ctx, cx + dx + 1, cy + dy, cx + dx * 0.25 + 1, cy - 104, P.brown2);
  }
  for (const h of [34, 68]) line(ctx, cx - 20 + h * 0.12, cy - h, cx + 20 - h * 0.12, cy - h, P.brown1);
  circle(ctx, cx, cy - 108, 13, P.dark1);
  circle(ctx, cx, cy - 108, 10, P.rust1);
  circle(ctx, cx, cy - 108, 3, P.dark1);
  for (let a = 0; a < 6; a++) line(ctx, cx, cy - 108, cx + Math.cos(a) * 10, cy - 108 + Math.sin(a) * 10, P.dark2);
  line(ctx, cx + 10, cy - 108, cx + 6, cy - 4, P.grey2); // the rope down the shaft
  return cv;
}

/** A mine cart on short rails, heaped with salt. */
export function mineCart() {
  const cv = propCanvas(1, 1, 30);
  const { ctx, bx, by } = cv;
  const [cx, cy] = cv.center;
  line(ctx, cx - 22, cy + 8, cx + 22, cy - 4, P.grey2);
  line(ctx, cx - 18, cy + 11, cx + 26, cy - 1, P.grey2);
  box(ctx, bx, by - 4, 0.7, 0.55, 12, { left: P.rust1, right: P.rust0, top: P.dark1 });
  for (const [dx, dy] of [[-10, 4], [8, -2]]) circle(ctx, cx + dx, cy + dy, 3, P.dark1);
  for (let i = 0; i < 7; i++) circle(ctx, cx - 7 + i * 2.2, cy - 16 - (i % 3) * 1.5, 2.6, i % 2 ? P.bone : P.grey5);
  return cv;
}

/** A heap of salt lumps, the odd glint. */
export function saltPile() {
  const cv = propCanvas(1, 1, 22);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  const r = rng(52);
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2;
    const d = r() * 14;
    circle(ctx, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.5 - (14 - d) * 0.9, 2 + r() * 2.5, r() < 0.3 ? P.grey4 : r() < 0.6 ? P.grey5 : P.bone);
  }
  px(ctx, cx - 3, cy - 12, '#ffffff');
  return cv;
}

/** A cluster of salt crystals as tall as a man, growing out of the crust. */
export function crystalGrowth() {
  const cv = propCanvas(1, 1, 56);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  const spikes = [[-9, 26, -0.25], [-2, 44, -0.05], [6, 34, 0.18], [12, 20, 0.35], [-14, 14, -0.45]];
  for (const [dx, h, lean] of spikes) {
    const top = [cx + dx + lean * h, cy - h];
    poly(ctx, [[cx + dx - 4, cy], [top[0] - 1, top[1] + 4], top, [cx + dx + 1, cy + 1]], P.grey5);
    poly(ctx, [[cx + dx + 1, cy + 1], top, [top[0] + 1, top[1] + 4], [cx + dx + 5, cy]], P.grey3);
    line(ctx, cx + dx - 1, cy - 2, top[0] - 0.5, top[1] + 3, P.bone);
  }
  ellipse(ctx, cx, cy + 1, 16, 5, shade(P.grey4, -0.1));
  return cv;
}

/** The arena's stands: three tiers of planks on salt blocks, looking down into the ring. 3x1. */
export function stands() {
  const cv = propCanvas(3, 1, 40);
  const { ctx, bx, by } = cv;
  for (let t = 0; t < 3; t++)
    box(ctx, bx - t * 8, by - t * 4 - t * 8, 3, 1 - t * 0.28, 8 + t * 2, {
      left: (x, y, h) => (h < 3 ? P.grey4 : x % 10 ? P.brown2 : P.brown0),
      right: P.brown1,
      top: (x) => (x % 7 ? P.brown3 : P.brown2),
    });
  return cv;
}

/** A wreck's ribs standing out of the salt, a bit of keel between them. 2x1. */
export function wreckRibs() {
  const cv = propCanvas(2, 1, 64);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  line(ctx, cx - 36, cy + 8, cx + 34, cy - 10, P.brown0);
  line(ctx, cx - 36, cy + 9, cx + 34, cy - 9, P.brown2);
  for (let i = 0; i < 7; i++) {
    const x = cx - 30 + i * 10;
    const y = cy + 6 - i * 2.6;
    const h = 30 + Math.sin(i * 0.9) * 12 - (i === 5 ? 18 : 0);
    ctx.strokeStyle = shade(P.brown1, -0.1);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - 10, y - h * 0.6, x - 4, y - h);
    ctx.stroke();
    ctx.strokeStyle = P.brown3;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 1, y);
    ctx.quadraticCurveTo(x - 11, y - h * 0.6, x - 5, y - h);
    ctx.stroke();
  }
  for (let i = 0; i < 8; i++) circle(ctx, cx - 30 + i * 9, cy + 6 - i * 2.2, 3, P.bone); // salt crusted along the keel
  return cv;
}

/** A pre-war radio set on a crate: a steel case, dials, a whip aerial. */
export function radioSet() {
  const cv = propCanvas(1, 1, 50);
  const { ctx, bx, by } = cv;
  box(ctx, bx, by, 0.8, 0.8, 12, { left: P.brown2, right: P.brown1, top: P.brown3 });
  const g = box(ctx, bx, by - 12, 0.6, 0.45, 14, { left: P.olive1, right: P.olive0, top: P.olive2 });
  const [lx, ly] = g.left[0];
  for (const [dx, dy] of [[6, -6], [12, -3]]) circle(ctx, lx + dx, ly + dy, 2, P.dark1);
  ctx.fillStyle = P.fire1;
  ctx.fillRect(Math.round(lx + 4), Math.round(ly - 11), 10, 2);
  const [tx, ty] = g.top[1];
  line(ctx, tx, ty, tx + 8, ty - 30, P.grey3);
  return cv;
}

/** A nomad wagon of «Бархан»: a flatbed on two wheels under a striped canvas. 2x1. */
export function wagon() {
  const cv = propCanvas(2, 1, 56);
  const { ctx, bx, by } = cv;
  const g = box(ctx, bx, by - 8, 2, 1, 6, { left: P.brown2, right: P.brown1, top: P.brown3 });
  for (const [x, y] of [g.left[0], g.left[3]]) {
    circle(ctx, x + 10, y + 4, 8, P.dark1);
    circle(ctx, x + 10, y + 4, 6, P.brown1);
    circle(ctx, x + 10, y + 4, 1.5, P.dark1);
  }
  const [cx, cy] = cv.center;
  const arc = (dy, col) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(cx - 34, cy - 12 + dy);
    ctx.quadraticCurveTo(cx - 4, cy - 58 + dy, cx + 30, cy - 26 + dy);
    ctx.lineTo(cx + 30, cy - 20 + dy);
    ctx.quadraticCurveTo(cx - 4, cy - 50 + dy, cx - 34, cy - 6 + dy);
    ctx.fill();
  };
  arc(0, P.sand4);
  arc(8, P.red1);
  arc(16, P.sand3);
  arc(24, P.teal1);
  return cv;
}

/** A tar-black spider web of salt threads between two stakes (the spiders' drift in the mine). */
export function saltWeb() {
  const cv = propCanvas(1, 1, 44);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  line(ctx, cx - 16, cy + 4, cx - 14, cy - 38, P.brown1);
  line(ctx, cx + 16, cy - 4, cx + 14, cy - 40, P.brown1);
  const hub = [cx, cy - 22];
  for (let a = 0; a < 8; a++) line(ctx, hub[0], hub[1], hub[0] + Math.cos(a * 0.8) * 15, hub[1] + Math.sin(a * 0.8) * 16, P.grey6);
  for (const rr of [5, 10, 14]) {
    ctx.strokeStyle = P.bone;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(hub[0], hub[1], rr, rr * 1.05, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  cylinder(ctx, hub[0] + 5, hub[1] + 6, 3, 6, { light: P.bone, mid: P.grey5, dark: P.grey4, top: P.bone }); // a cocoon
  return cv;
}
