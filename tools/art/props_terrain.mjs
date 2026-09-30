// Landforms and ruins for the unwalkable ring around the map: layered cliffs,
// a flat-topped mesa and a broken concrete shell. Same palette and outline as all props.
import { makeNoise, rng, ellipse, line, px, bayer, TW, TH } from './draw.mjs';
import { P } from './palette.mjs';
import { propCanvas, box } from './propkit.mjs';

const nz = makeNoise(515);
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const BANDS_LIT = [P.sand2, P.brown4, P.rust2, P.brown3, P.sand1, P.brown5, P.sand2].map(hex);
const BANDS_DARK = [P.sand0, P.brown2, P.rust1, P.brown1, P.brown2, P.brown3, P.sand0].map(hex);
const TOP = [P.sand2, P.sand3, P.sand4, P.olive1].map(hex);
const RIM_LIT = hex(P.sand5);
const RIM_DARK = hex(P.sand1);
const FOOT = hex(P.dark2);
const SCREE = [P.brown2, P.sand0, P.brown3, P.sand1].map(hex);

/** Screen position of a local footprint point (u, v) for a prop whose bottom vertex is (bx, by) at (w, h). */
const at = (bx, by, w, h, u, v) => [bx + (u - w - (v - h)) * (TW / 2), by + (u - w + (v - h)) * (TH / 2)];

/**
 * Render a heightfield (px above ground over footprint coords u, v) as pixel columns,
 * back to front. Faces take sediment bands by absolute height; the +y side is lit.
 */
function heightProp(W, H, maxH, hf, seed) {
  const cv = propCanvas(W, H, Math.ceil(maxH) + 6);
  const { ctx, bx, by, w: cw, h: ch } = cv;
  const img = ctx.getImageData(0, 0, cw, ch);
  const d = img.data;
  const put = (x, y, c) => {
    if (x < 0 || y < 0 || x >= cw || y >= ch) return;
    const i = (y * cw + x) * 4;
    d[i] = c[0];
    d[i + 1] = c[1];
    d[i + 2] = c[2];
    d[i + 3] = 255;
  };
  const S = 1 / 32;
  const N = Math.round(W / S);
  const M = Math.round(H / S);
  const hs = new Float32Array((N + 2) * (M + 2));
  const at2 = (i, j) => hs[j * (N + 2) + i];
  for (let j = 0; j <= M; j++) for (let i = 0; i <= N; i++) hs[j * (N + 2) + i] = Math.max(0, hf(i * S, j * S));
  for (let s = 0; s <= N + M; s++)
    for (let i = Math.max(0, s - M); i <= Math.min(N, s); i++) {
      const j = s - i;
      const h = at2(i, j);
      if (h < 0.6) continue;
      const u = i * S;
      const v = j * S;
      const [sx, sy] = at(bx, by, W, H, u, v);
      const dropR = h - at2(i + 1, j);
      const dropL = h - at2(i, j + 1);
      const lit = dropL >= dropR;
      const flat = Math.max(dropR, dropL) < 1.1;
      const x0 = Math.round(sx);
      const base = Math.round(sy);
      const top = Math.round(sy - h);
      const gully = nz(x0 * 0.3 + seed, 1.7) > 0.7;
      for (let y = top; y <= base; y++) {
        const z = sy - y;
        let c;
        const low = h < maxH * 0.2;
        if (low && y <= top + 1) c = SCREE[Math.floor(nz(u * 7 + seed, v * 7) * 4) % 4];
        else if (y === top) c = flat ? TOP[pickTop(u, v, x0, y, seed)] : lit ? RIM_LIT : RIM_DARK;
        else if (y <= top + 1 && flat) c = TOP[pickTop(u, v, x0, y, seed)];
        else if (z < 2.5) c = FOOT;
        else {
          const wob = (nz(x0 * 0.12 + seed, z * 0.05) - 0.5) * 7 + x0 * 0.06;
          const bands = lit && !gully ? BANDS_LIT : BANDS_DARK;
          c = bands[(((Math.floor((z + wob) / 5) % bands.length) + bands.length) % bands.length)];
          if (lit && gully && bayer(x0, y) < 0.5) c = BANDS_LIT[1];
        }
        put(x0, y, c);
        put(x0 + 1, y, c);
      }
    }
  ctx.putImageData(img, 0, 0);
  return cv;
}

function pickTop(u, v, x, y, seed) {
  const n = nz(u * 3 + seed, v * 3);
  if (n > 0.74) return 3;
  return n > 0.52 ? 2 : bayer(x, y) < n * 1.3 ? 1 : 0;
}

/**
 * Butte shape: a warped rounded plateau with a lower ledge ring and a scree skirt.
 * Coordinates are normalized to the footprint so ridges stretch with it.
 */
function butte(W, H, maxH, seed, { edge = 0.34, ledge = 0.1, ledgeH = 0.5 } = {}) {
  return (u, v) => {
    const px = u / W - 0.5;
    const py = v / H - 0.5;
    const dist = Math.pow(Math.abs(px) ** 3 + Math.abs(py) ** 3, 1 / 3);
    const warp = (nz(u * 1.1 + seed, v * 1.1 - seed) - 0.5) * 0.22;
    const e = edge + warp;
    const bump = (nz(u * 6 + seed, v * 6) - 0.5) * 3;
    if (dist < e - ledge) return maxH + bump;
    if (dist < e) return maxH * ledgeH + bump * 0.6;
    const t = (dist - e) / 0.055;
    return t < 1 ? maxH * 0.1 * (1 - t) + (nz(u * 9, v * 9 + seed) - 0.5) * 2 : 0;
  };
}

export function cliff(variant) {
  const plans = { a: [2, 2, 46, 0.34], b: [3, 2, 38, 0.36], c: [2, 3, 52, 0.33] };
  const [W, H, maxH, edge] = plans[variant];
  const seed = variant.charCodeAt(0) * 7;
  return heightProp(W, H, maxH, butte(W, H, maxH, seed, { edge, ledge: 0.12, ledgeH: 0.45 }), seed);
}

export function mesa() {
  return heightProp(4, 4, 64, butte(4, 4, 64, 71, { edge: 0.38, ledge: 0.08, ledgeH: 0.3 }), 71);
}

function concrete(seed, jag, H, windows) {
  return (x, y, hh, t) => {
    if (hh > H - jag(x)) return null;
    if (windows && windows.some(([a, b]) => t > a && t < b) && hh > 12 && hh < 24) return P.dark0;
    let c = bayer(x, y) < 0.5 ? P.grey4 : P.grey3;
    if (Math.floor(hh) % 12 === 0) c = P.grey2; // panel seam
    const n = nz(x * 0.12 + seed, y * 0.12);
    if (n > 0.68) c = P.brown2; // rust run-off
    if (hh < 4) c = P.grey2;
    return c;
  };
}

export function ruin() {
  const cv = propCanvas(3, 3, 48);
  const { ctx, bx, by } = cv;
  const r = rng(99);
  const H = 40;
  const jag = (x) => Math.abs(Math.sin(x * 0.07)) * 26 + nz(x * 0.5, 9) * 6;
  box(ctx, bx, by, 3, 3, 4, { left: P.grey2, right: P.grey1, top: (x, y) => (nz(x * 0.2, y * 0.2) > 0.6 ? P.sand2 : P.grey3) });
  // back walls along the far edges, front wall only a stump
  const [lx, ly] = at(bx, by, 3, 3, 3, 0.3);
  box(ctx, lx, ly - 4, 3, 0.3, H, { left: concrete(1, jag, H, [[0.15, 0.3], [0.6, 0.75]]), right: concrete(4, jag, H) });
  const [rx, ry] = at(bx, by, 3, 3, 0.3, 3);
  box(ctx, rx, ry - 4, 0.3, 3, H, { right: concrete(7, (x) => jag(x + 40), H, [[0.35, 0.55]]), left: concrete(8, jag, H) });
  const [fx, fy] = at(bx, by, 3, 3, 3, 3);
  box(ctx, fx, fy - 4, 1.2, 0.25, 10, { left: concrete(3, () => 0, 10), right: concrete(5, () => 0, 10), top: P.grey4 });
  for (let i = 0; i < 26; i++) {
    const [x, y] = at(bx, by, 3, 3, 0.6 + r() * 2.2, 0.6 + r() * 2.2);
    ellipse(ctx, x, y - 4 - r() * 3, 2 + r() * 3, 1.5 + r() * 2, r() < 0.5 ? P.grey3 : P.grey4);
  }
  for (let i = 0; i < 4; i++) {
    const [x, y] = at(bx, by, 3, 3, 0.4 + r() * 2.4, 0.3);
    line(ctx, x, y - 20 - r() * 10, x + 2, y - 34 - r() * 10, P.rust1); // rebar
  }
  px(ctx, bx, by - 8, P.grey1);
  return cv;
}
