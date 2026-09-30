// Props for the towns of Chapter II: the «Сухая глотка» tavern and the rows at Три столба,
// the thorn palisade, resin vats and cactus beds of Колючка.
import { line, poly, ellipse, px, rng } from './draw.mjs';
import { P, shade } from './palette.mjs';
import { propCanvas, box, cylinder } from './propkit.mjs';

const plank = (base, dark, every = 6) => (x) => (x % every === 0 ? dark : base);

/** A point on the long (x) axis of a two-tile prop, t = 0 at the near end, `up` px above the ground. */
const along = (cv, t, up) => [cv.bx + 16 - t * 64, cv.by - 8 - t * 32 - up];

/** The bar counter: a heavy plank top on a boarded front, mugs and a jug on it. Two tiles along x. */
export function counter() {
  const cv = propCanvas(2, 1, 28);
  const { ctx } = cv;
  box(ctx, cv.bx, cv.by, 2, 1, 18, { left: plank(P.brown2, P.brown0, 5), right: plank(P.brown1, P.brown0, 5), top: plank(P.brown4, P.brown3, 9) });
  for (const t of [0.2, 0.42, 0.62]) {
    const [x, y] = along(cv, t, 18);
    ctx.fillStyle = P.grey3;
    ctx.fillRect(Math.round(x) - 2, Math.round(y) - 5, 4, 5);
    px(ctx, Math.round(x) + 2, Math.round(y) - 4, P.grey2);
  }
  const [jx, jy] = along(cv, 0.85, 18);
  ellipse(ctx, jx, jy - 4, 3, 4, P.rust1);
  px(ctx, jx, jy - 9, P.rust0);
  return cv;
}

/** A plank table on thick legs with a mug and a candle stub. */
export function table() {
  const cv = propCanvas(1, 1, 18);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  box(ctx, cx, cy + 0.4 * 16, 0.4, 0.4, 9, { left: P.brown1, right: P.brown0, top: P.brown1 }); // the leg block
  box(ctx, cx, cy + 0.8 * 16 - 9, 0.8, 0.8, 3, { left: P.brown2, right: P.brown1, top: plank(P.brown4, P.brown3, 5) });
  ctx.fillStyle = P.grey3;
  ctx.fillRect(cx - 5, cy - 18, 3, 4);
  ctx.fillStyle = P.bone;
  ctx.fillRect(cx + 4, cy - 17, 2, 3);
  px(ctx, cx + 4, cy - 18, P.fire2);
  return cv;
}

/** A shelf against the wall with bottles of all colours. */
export function shelf() {
  const cv = propCanvas(1, 1, 40);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  box(ctx, cv.bx, cv.by, 1, 0.4, 36, { left: plank(P.brown1, P.brown0, 4), right: P.brown0, top: P.brown2 });
  const r = rng(31);
  for (const shelfY of [-12, -22, -32])
    for (let i = 0; i < 4; i++) {
      const x = cx - 13 + i * 6 + r() * 2;
      const y = cy + shelfY - i * 1.6;
      const c = [P.teal1, P.olive2, P.rust1, P.sand3, P.bone][Math.floor(r() * 5)];
      ctx.fillStyle = c;
      ctx.fillRect(Math.round(x), Math.round(y - 5), 3, 5);
      px(ctx, Math.round(x) + 1, Math.round(y - 7), shade(c, -0.2));
    }
  return cv;
}

/** A market stall: a counter under a patched awning on poles, goods laid out. Two tiles along x. */
export function stall() {
  const cv = propCanvas(2, 1, 50);
  const { ctx } = cv;
  const g = box(ctx, cv.bx, cv.by, 2, 1, 11, { left: plank(P.brown2, P.brown0), right: plank(P.brown1, P.brown0), top: P.brown3 });
  const r = rng(12);
  for (let i = 0; i < 7; i++) {
    const [x, y] = along(cv, 0.12 + i * 0.12, 11);
    ellipse(ctx, x + (i % 2 ? 4 : -4), y + (i % 2 ? -2 : 2), 2.6, 1.8, [P.sand4, P.olive2, P.rust2, P.grey4, P.teal1][Math.floor(r() * 5)]);
  }
  // four poles from the counter corners up to a two-colour awning
  const lift = 30;
  for (const [x, y] of g.top) line(ctx, x, y, x, y - lift, P.brown0);
  const aw = g.top.map(([x, y]) => [x, y - lift]);
  poly(ctx, aw, P.rust2);
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  poly(ctx, [aw[0], mid(aw[0], aw[1]), mid(aw[3], aw[2]), aw[3]], P.sand3);
  line(ctx, aw[0][0], aw[0][1], aw[1][0], aw[1][1], P.rust0);
  line(ctx, aw[1][0], aw[1][1], aw[2][0], aw[2][1], P.rust0);
  return cv;
}

/** A post with a Trust notice nailed to it: the stamp of the counter, a sum in big letters. */
export function noticePost() {
  const cv = propCanvas(1, 1, 46);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  ctx.fillStyle = P.brown1;
  ctx.fillRect(cx - 1, cy - 44, 4, 45);
  poly(ctx, [[cx - 10, cy - 40], [cx + 11, cy - 36], [cx + 11, cy - 20], [cx - 10, cy - 24]], P.bone);
  for (let i = 0; i < 4; i++) line(ctx, cx - 7, cy - 35 + i * 3, cx + 8, cy - 32 + i * 3, P.grey3);
  ellipse(ctx, cx + 5, cy - 24, 2.6, 2, P.grey1); // the Trust stamp
  px(ctx, cx - 9, cy - 39, P.red1);
  return cv;
}

/** A boxing ring: a square of trampled boards, corner posts and slack ropes. 3×3, walkable. */
export function ring() {
  const cv = propCanvas(3, 3, 18);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  const q = [[cx, cy - 46], [cx + 44, cy - 24], [cx, cy - 2], [cx - 44, cy - 24]];
  poly(ctx, q, P.brown2);
  for (let i = 1; i < 8; i++) line(ctx, cx - 44 + i * 5.5, cy - 24 + i * 2.75, cx + i * 5.5, cy - 46 + i * 2.75, P.brown1);
  for (const lift of [9, 14]) for (let k = 0; k < 4; k++) {
    const a = q[k];
    const b = q[(k + 1) % 4];
    line(ctx, a[0], a[1] - lift, b[0], b[1] - lift, k % 2 ? P.rust1 : P.sand4);
  }
  for (const [x, y] of q) {
    ctx.fillStyle = P.dark1;
    ctx.fillRect(x - 1, y - 16, 3, 16);
  }
  return cv;
}

/** One tile of palisade: sharpened stakes lashed together, thorny branches woven through. */
export function thornFence() {
  const cv = propCanvas(1, 1, 30);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  const r = rng(5);
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const x = cx - 15 + t * 30;
    const y = cy + 7 - t * 15;
    const h = 22 + r() * 6;
    poly(ctx, [[x - 2, y], [x + 2, y], [x + 2, y - h], [x, y - h - 4], [x - 2, y - h]], i % 2 ? P.brown2 : P.brown1);
  }
  for (const lift of [8, 17]) line(ctx, cx - 16, cy + 7 - lift, cx + 16, cy - 8 - lift, P.olive1);
  for (let i = 0; i < 12; i++) px(ctx, cx - 14 + r() * 28, cy - 4 - r() * 20, P.olive3);
  return cv;
}

/** The farm gate: two tall posts, a crossbar hung with thorns and a skull of some beast. Two tiles along x. */
export function gate() {
  const cv = propCanvas(2, 1, 44);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  for (const [dx, dy] of [[-24, -2], [24, 2]]) {
    ctx.fillStyle = P.brown1;
    ctx.fillRect(cx + dx - 2, cy + dy - 40, 5, 41);
  }
  line(ctx, cx - 26, cy - 38, cx + 26, cy - 36, P.brown2);
  line(ctx, cx - 26, cy - 37, cx + 26, cy - 35, P.brown0);
  for (let i = 0; i < 9; i++) line(ctx, cx - 22 + i * 5.5, cy - 36, cx - 21 + i * 5.5, cy - 32, P.olive2);
  ellipse(ctx, cx, cy - 41, 4, 3, P.bone);
  px(ctx, cx - 1, cy - 41, P.ink);
  px(ctx, cx + 2, cy - 41, P.ink);
  return cv;
}

/** A vat of resin: a cut-down tank on bricks, amber goo, a ladle. */
export function vat() {
  const cv = propCanvas(1, 1, 26);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  cylinder(ctx, cx, cy - 2, 11, 18, { light: P.rust2, mid: P.rust1, dark: P.rust0, top: P.fire1, band: P.rust0, bands: [6, 13] });
  ellipse(ctx, cx, cy - 20, 8, 3.6, P.fire0);
  line(ctx, cx + 3, cy - 21, cx + 12, cy - 30, P.grey3);
  return cv;
}

/** A raised bed of small cacti with a drip line along it. Two tiles along x. */
export function cactusBed() {
  const cv = propCanvas(2, 1, 22);
  const { ctx } = cv;
  box(ctx, cv.bx, cv.by, 2, 1, 5, { left: P.brown1, right: P.brown0, top: P.brown2 });
  const [ax, ay] = along(cv, 0.05, 6);
  const [bx, by] = along(cv, 0.95, 6);
  line(ctx, ax + 6, ay + 3, bx + 6, by + 3, P.grey2); // the drip pipe
  const r = rng(9);
  for (let i = 0; i < 8; i++) {
    const [x, y] = along(cv, 0.08 + i * 0.12, 5);
    const h = 10 + r() * 6;
    ctx.fillStyle = P.olive2;
    ctx.fillRect(Math.round(x) - 1, Math.round(y - h), 5, Math.round(h));
    ctx.fillStyle = P.olive3;
    ctx.fillRect(Math.round(x) - 1, Math.round(y - h), 1, Math.round(h));
    if (i % 2) ctx.fillRect(Math.round(x) + 4, Math.round(y - h * 0.6), 2, 4); // an arm
    if (i % 3 === 0) px(ctx, Math.round(x) + 1, Math.round(y - h - 1), P.fire2); // a flower
  }
  return cv;
}

/** A heap of sacks. */
export function sacks() {
  const cv = propCanvas(1, 1, 16);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  for (const [dx, dy, c] of [[-6, -3, P.sand3], [6, -1, P.sand4], [0, -9, P.sand2]]) {
    ellipse(ctx, cx + dx, cy + dy, 8, 5, c);
    line(ctx, cx + dx - 2, cy + dy - 4, cx + dx + 2, cy + dy - 5, shade(c, -0.25));
  }
  return cv;
}

/** A watchtower: four poles, a plank platform with a thorn rail, a ladder. */
export function watchtower() {
  const cv = propCanvas(1, 1, 64);
  const { ctx } = cv;
  const [cx, cy] = cv.center;
  for (const [dx, dy] of [[-12, 0], [12, 0], [0, -7], [0, 7]]) line(ctx, cx + dx, cy + dy, cx + dx * 0.7, cy + dy * 0.7 - 46, P.brown1);
  box(ctx, cv.bx, cv.by - 44, 1, 1, 4, { left: plank(P.brown2, P.brown0), right: plank(P.brown1, P.brown0), top: P.brown3 });
  for (let i = 0; i < 7; i++) line(ctx, cx - 14 + i * 4.6, cy - 52 + (i < 4 ? -i * 2.3 : (i - 6) * 2.3), cx - 14 + i * 4.6, cy - 58 + (i < 4 ? -i * 2.3 : (i - 6) * 2.3), P.olive2);
  for (let k = 0; k < 7; k++) line(ctx, cx + 6, cy + 4 - k * 6.5, cx + 10, cy + 2 - k * 6.5, P.brown2);
  return cv;
}
