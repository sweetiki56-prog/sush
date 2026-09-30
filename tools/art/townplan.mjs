// A town's plan for the town screen: aged parchment with each area as a sepia vignette of its real ground
// (the baked ground image, cropped to the map's diamond), inked roads between areas that lead into each other,
// a border and a compass. The names and buttons are drawn by the game (src/scenes/TownScene.ts).
import { canvas, makeNoise, rng } from './draw.mjs';

export const PLAN_W = 1100;
export const PLAN_H = 600;
const VIGNETTE_W = 330;

function parchment(ctx, seed) {
  const n = makeNoise(seed);
  const img = ctx.createImageData(PLAN_W, PLAN_H);
  for (let y = 0; y < PLAN_H; y++)
    for (let x = 0; x < PLAN_W; x++) {
      const i = (y * PLAN_W + x) * 4;
      const stain = n(x * 0.004, y * 0.004) * 0.6 + n(x * 0.02, y * 0.02) * 0.4;
      const edge = Math.min(x, y, PLAN_W - 1 - x, PLAN_H - 1 - y);
      const burn = edge < 26 ? (26 - edge) / 26 : 0;
      const k = 1 - stain * 0.18 - burn * 0.55 - Math.random() * 0.04;
      img.data[i] = 226 * k;
      img.data[i + 1] = 200 * k;
      img.data[i + 2] = 150 * k;
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  ctx.strokeStyle = 'rgba(52,34,20,0.8)';
  ctx.lineWidth = 3;
  ctx.strokeRect(34, 34, PLAN_W - 68, PLAN_H - 68);
  ctx.lineWidth = 1;
  ctx.strokeRect(42, 42, PLAN_W - 84, PLAN_H - 84);
}

/** The map's diamond from its baked ground, toned sepia, fading at the edges. */
function vignette(ground, map) {
  const { width: W, height: H } = map;
  const sw = (W + H) * 32;
  const sh = (W + H) * 16;
  const sx = ground.offX - H * 32;
  const sy = ground.offY;
  const vw = VIGNETTE_W;
  const vh = Math.round((vw * sh) / sw);
  const out = canvas(vw, vh);
  out.ctx.drawImage(ground.cv.c, sx, sy, sw, sh, 0, 0, vw, vh);
  const img = out.ctx.getImageData(0, 0, vw, vh);
  const d = img.data;
  for (let y = 0; y < vh; y++)
    for (let x = 0; x < vw; x++) {
      const i = (y * vw + x) * 4;
      const l = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255;
      // inside the diamond, fading near its edges
      const dx = Math.abs(x - vw / 2) / (vw / 2);
      const dy = Math.abs(y - vh / 2) / (vh / 2);
      const e = 1 - (dx + dy);
      const a = Math.max(0, Math.min(1, e * 6));
      d[i] = 60 + l * 170;
      d[i + 1] = 40 + l * 140;
      d[i + 2] = 22 + l * 96;
      d[i + 3] = 255 * a * 0.92;
    }
  out.ctx.putImageData(img, 0, 0);
  return out;
}

/** The plan: `areas` with their positions (0..1), `maps` by id, baked `grounds` by map id. */
export function townPlan(areas, maps, grounds, seed = 1) {
  const cv = canvas(PLAN_W, PLAN_H);
  const { ctx } = cv;
  parchment(ctx, seed);
  const r = rng(seed);
  const centre = (a) => [a.at[0] * PLAN_W, a.at[1] * PLAN_H];
  // roads between areas whose maps lead into each other
  ctx.strokeStyle = 'rgba(52,34,20,0.75)';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 8]);
  for (const a of areas)
    for (const ex of maps[a.map]?.exits ?? []) {
      const b = areas.find((o) => o.map === ex.to);
      if (!b || b.map < a.map) continue;
      const [x0, y0] = centre(a);
      const [x1, y1] = centre(b);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo((x0 + x1) / 2 + (r() - 0.5) * 60, (y0 + y1) / 2 + (r() - 0.5) * 40, x1, y1);
      ctx.stroke();
    }
  ctx.setLineDash([]);
  for (const a of areas) {
    const map = maps[a.map];
    const g = grounds[a.map];
    if (!map || !g) continue;
    const v = vignette(g, map);
    const [cx, cy] = centre(a);
    ctx.drawImage(v.c, cx - v.c.width / 2, cy - v.c.height / 2);
  }
  // a small compass in the corner
  const [kx, ky] = [PLAN_W - 96, 104];
  ctx.fillStyle = 'rgba(52,34,20,0.85)';
  ctx.beginPath();
  ctx.moveTo(kx, ky - 40);
  ctx.lineTo(kx + 8, ky);
  ctx.lineTo(kx, ky + 40);
  ctx.lineTo(kx - 8, ky);
  ctx.closePath();
  ctx.fill();
  ctx.font = 'bold 16px serif';
  ctx.fillText('С', kx - 6, ky - 46);
  return cv;
}
