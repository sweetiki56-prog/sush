// Roofs over buildings with an inside: a gable roof resting on the walls (40 px high), ridge along the longer side,
// a little overhang. Three kinds: corrugated tin with rust, sun-bleached planks, riveted hull plates (the barge).
// The game melts a roof away while one of the party stands under it (src/world/Roofs.ts).
import { fillPolyFn, rng, makeNoise } from './draw.mjs';
import { propCanvas } from './propkit.mjs';
import { P } from './palette.mjs';

const WALL = 40; // wall_hi height
const OVER = 0.35; // overhang, tiles

const STYLES = {
  tin: { light: [P.grey4, P.grey5], dark: [P.grey2, P.grey3], rust: [P.rust0, P.brown1], stripe: 5, along: false },
  planks: { light: [P.brown3, P.brown4], dark: [P.brown1, P.brown2], rust: [P.dark2, P.brown0], stripe: 7, along: true },
  hull: { light: [P.grey2, P.brown1], dark: [P.dark2, P.dark1], rust: [P.rust0, P.rust1], stripe: 16, along: false, rivets: true },
};

/** A roof for the rectangle x0..x1, y0..y1 (inclusive tiles); anchored at the bottom vertex of the footprint. */
export function roofArt({ x0, y0, x1, y1, style }, seed = 1) {
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const s = STYLES[style] ?? STYLES.tin;
  const along = w >= h; // the ridge runs along x
  const span = along ? h : w;
  const rise = Math.min(34, 7 + span * 3.2);
  const cv = propCanvas(w, h, WALL + rise + 30, 20);
  const { ctx, bx, by } = cv;
  const n = makeNoise(seed * 13 + 5);
  const r = rng(seed);
  // local tile coords (0..w, 0..h) and height z to canvas pixels: the footprint's bottom vertex is (w, h) → (bx, by)
  const pt = (gx, gy, z) => [bx + (gx - w - (gy - h)) * 32, by + (gx - w + (gy - h)) * 16 - z];
  const o = OVER;
  const zr = WALL + rise;
  let planes;
  if (along) {
    const m = h / 2;
    planes = [
      { pts: [pt(-o, -o, WALL), pt(w + o, -o, WALL), pt(w + o, m, zr), pt(-o, m, zr)], lit: false, u: (gx) => gx },
      { pts: [pt(-o, -o, WALL), pt(-o, h + o, WALL), pt(-o, m, zr)], gable: true },
      { pts: [pt(-o, h + o, WALL), pt(w + o, h + o, WALL), pt(w + o, m, zr), pt(-o, m, zr)], lit: true, u: (gx) => gx },
      { pts: [pt(w + o, -o, WALL), pt(w + o, h + o, WALL), pt(w + o, m, zr)], gable: true, east: true },
    ];
  } else {
    const m = w / 2;
    planes = [
      { pts: [pt(-o, -o, WALL), pt(-o, h + o, WALL), pt(m, h + o, zr), pt(m, -o, zr)], lit: false },
      { pts: [pt(-o, -o, WALL), pt(w + o, -o, WALL), pt(m, -o, zr)], gable: true },
      { pts: [pt(w + o, -o, WALL), pt(w + o, h + o, WALL), pt(m, h + o, zr), pt(m, -o, zr)], lit: true },
      { pts: [pt(-o, h + o, WALL), pt(w + o, h + o, WALL), pt(m, h + o, zr)], gable: true, east: true },
    ];
  }
  // rust runs down the slope in streaks, thickest along the eaves
  const rustAt = (x, y) => n(x * 0.09, y * 0.02) > 0.74 || n(x * 0.05 + 9, y * 0.05) > 0.8;
  for (const pl of planes) {
    if (pl.gable) {
      // the gable end: boards or plates in shadow (the east one catches a little light)
      fillPolyFn(ctx, pl.pts, (x, y) => {
        const band = Math.floor(y / 6) % 2;
        const [a, b] = pl.east ? s.dark : [P.dark1, P.dark2];
        return band ? a : b;
      });
      continue;
    }
    const [c0, c1] = pl.lit ? s.light : s.dark;
    fillPolyFn(ctx, pl.pts, (x, y) => {
      if (rustAt(x, y)) return (x + y) % 3 ? s.rust[0] : s.rust[1];
      // corrugation / board seams: stripes across the slope (screen x drifts with the ridge direction)
      const u = along ? x - y * (pl.lit ? -2 : 2) : x + y * (pl.lit ? 2 : -2);
      const k = Math.floor(u / s.stripe) % 2;
      if (s.rivets && Math.abs(((u % s.stripe) + s.stripe) % s.stripe) < 1 && y % 4 === 0) return P.dark1;
      return k ? c0 : c1;
    });
  }
  // the ridge and the eaves, inked
  ctx.strokeStyle = P.dark0;
  ctx.lineWidth = 1.5;
  for (const pl of planes) {
    ctx.beginPath();
    pl.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.stroke();
  }
  // a few patches and a stovepipe on the tin: lived-in
  if (style === 'tin') {
    const [px0, py0] = pt(w * 0.3, h * 0.75, WALL + rise * 0.45);
    ctx.fillStyle = P.grey1;
    ctx.fillRect(px0 - 3, py0 - 16, 6, 16);
    ctx.fillStyle = P.dark0;
    ctx.fillRect(px0 - 4, py0 - 18, 8, 3);
    for (let i = 0; i < 3; i++) {
      const [qx, qy] = pt(r() * w, h * (0.55 + r() * 0.4), WALL + rise * 0.3);
      ctx.fillStyle = P.grey3;
      ctx.fillRect(qx - 6, qy - 3, 12, 6);
      ctx.fillStyle = P.dark1;
      ctx.fillRect(qx - 6, qy - 3, 12, 1);
    }
  }
  return cv;
}
