// Obitel iconography: one notched-ear dog on concrete, tin and old service equipment.
import { canvas, ellipse, line, poly, circle, finalize } from './draw.mjs';
import { P } from './palette.mjs';
import { propCanvas, box, cylinder } from './propkit.mjs';

function dogMark(ctx, x, y, scale = 1, metal = false) {
  const dark = metal ? P.grey1 : P.dark0;
  const rim = metal ? P.grey5 : P.brown4;
  ellipse(ctx, x, y + 4 * scale, 9 * scale, 6 * scale, dark);
  poly(ctx, [[x - 7 * scale, y + scale], [x - 8 * scale, y - 14 * scale], [x - 2 * scale, y - 8 * scale]], dark);
  poly(ctx, [[x + 2 * scale, y - 8 * scale], [x + 8 * scale, y - 14 * scale], [x + 7 * scale, y + scale]], dark);
  // The nick on the left ear survives every depiction of this one dog.
  poly(ctx, [[x - 8 * scale, y - 10 * scale], [x - 5 * scale, y - 10 * scale], [x - 7 * scale, y - 6 * scale]], rim);
  ellipse(ctx, x, y + 7 * scale, 4 * scale, 2.5 * scale, rim);
  circle(ctx, x - 3 * scale, y + 2 * scale, Math.max(0.8, scale), P.sand4);
  circle(ctx, x + 3 * scale, y + 2 * scale, Math.max(0.8, scale), P.sand4);
}

export function plaque() {
  const cv = propCanvas(1, 1, 40);
  const [x, y] = cv.center;
  box(cv.ctx, cv.bx, cv.by, 0.8, 0.6, 25, { left: P.grey2, right: P.grey1, top: P.grey4 });
  dogMark(cv.ctx, x, y - 12, 0.65, true);
  return cv;
}

export function mural() {
  const cv = propCanvas(1, 1, 52);
  const [x, y] = cv.center;
  box(cv.ctx, cv.bx, cv.by, 0.9, 0.3, 37, { left: P.sand1, right: P.grey2, top: P.grey4 });
  dogMark(cv.ctx, x, y - 18, 0.85);
  for (let i = 0; i < 3; i++) line(cv.ctx, x - 11, y - 1 + i * 2, x + 11, y - 1 + i * 2, i % 2 ? P.grey3 : P.grey1);
  return cv;
}

export function statue() {
  const cv = propCanvas(1, 1, 62);
  const [x, y] = cv.center;
  cylinder(cv.ctx, x, y + 15, 12, 12, { light: P.grey4, mid: P.grey3, dark: P.grey1, top: P.grey5, band: P.grey1 });
  ellipse(cv.ctx, x, y - 8, 12, 15, P.grey2);
  dogMark(cv.ctx, x, y - 21, 1.1, true);
  return cv;
}

export function basin() {
  const cv = propCanvas(1, 1, 25);
  const [x, y] = cv.center;
  cylinder(cv.ctx, x, y + 5, 13, 10, { light: P.grey4, mid: P.grey2, dark: P.grey1, top: P.teal2, band: P.grey5 });
  ellipse(cv.ctx, x, y - 6, 9, 3, P.teal1);
  ellipse(cv.ctx, x - 2, y - 7, 3, 1, P.bone);
  return cv;
}

export function portrait() {
  const cv = canvas(96, 96);
  cv.ctx.fillStyle = P.crt0;
  cv.ctx.fillRect(0, 0, 96, 96);
  ellipse(cv.ctx, 49, 90, 35, 24, P.dark0);
  ellipse(cv.ctx, 49, 54, 29, 34, P.dark1);
  poly(cv.ctx, [[25, 44], [21, 7], [38, 28]], P.dark0);
  poly(cv.ctx, [[60, 28], [77, 7], [72, 44]], P.dark0);
  poly(cv.ctx, [[22, 19], [31, 17], [27, 27]], P.brown4);
  ellipse(cv.ctx, 48, 70, 18, 13, P.brown3);
  ellipse(cv.ctx, 48, 65, 13, 7, P.dark0);
  circle(cv.ctx, 37, 51, 2, P.fire1);
  circle(cv.ctx, 59, 51, 2, P.fire1);
  ellipse(cv.ctx, 48, 68, 6, 3, P.ink);
  line(cv.ctx, 27, 81, 70, 81, P.red1);
  return finalize(cv, { outline: false });
}
