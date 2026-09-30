// Low-level drawing helpers shared by the tile, prop and character generators.
import { createCanvas } from '@napi-rs/canvas';
import { nearest, hexToRgb, P } from './palette.mjs';

export const TW = 64; // iso tile width
export const TH = 32; // iso tile height

export function canvas(w, h) {
  const c = createCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return { c, ctx, w, h };
}

/** Deterministic RNG (mulberry32). Same seed => same texture pack. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

// ---------- value noise ----------
export function makeNoise(seed) {
  const r = rng(seed);
  const perm = new Uint8Array(512);
  const vals = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    perm[i] = i;
    vals[i] = r();
  }
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 256; i++) perm[256 + i] = perm[i];
  const at = (x, y) => vals[perm[(x & 255) + perm[y & 255]]];
  const sm = (t) => t * t * (3 - 2 * t);
  const n2 = (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = sm(x - xi);
    const yf = sm(y - yi);
    const a = at(xi, yi) + (at(xi + 1, yi) - at(xi, yi)) * xf;
    const b = at(xi, yi + 1) + (at(xi + 1, yi + 1) - at(xi, yi + 1)) * xf;
    return a + (b - a) * yf;
  };
  return (x, y, oct = 3) => {
    let s = 0;
    let amp = 1;
    let f = 1;
    let norm = 0;
    for (let o = 0; o < oct; o++) {
      s += n2(x * f, y * f) * amp;
      norm += amp;
      amp *= 0.5;
      f *= 2;
    }
    return s / norm;
  };
}

// ---------- pixel ops ----------
export function px(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
}

export function poly(ctx, pts, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fill();
}

export function line(ctx, x0, y0, x1, y1, color) {
  // Bresenham, crisp pixels
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  ctx.fillStyle = color;
  for (;;) {
    ctx.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

export function circle(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2);
  ctx.fill();
}

export function ellipse(ctx, x, y, rx, ry, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Is pixel center inside the 64x32 diamond placed at (ox, oy)? */
export function inDiamond(x, y, w = TW, h = TH) {
  return Math.abs(x + 0.5 - w / 2) / (w / 2) + Math.abs(y + 0.5 - h / 2) / (h / 2) <= 1;
}

/**
 * Snap every pixel to the palette, harden alpha and add a 1px dark outline.
 * This single pass is what gives the procedural art its pixel-art look.
 */
export function finalize(cv, { outline = true, outlineColor = P.ink, alphaCut = 110, quantize = true } = {}) {
  const { ctx, w, h } = cv;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < alphaCut) {
      d[i + 3] = 0;
      continue;
    }
    d[i + 3] = 255;
    if (quantize) {
      const [r, g, b] = nearest(d[i], d[i + 1], d[i + 2]);
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
    }
  }
  if (outline) {
    const [or, og, ob] = hexToRgb(outlineColor);
    const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] === 255;
    const add = [];
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (solid(x, y)) continue;
        if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) add.push(y * w + x);
      }
    for (const i of add) {
      d[i * 4] = or;
      d[i * 4 + 1] = og;
      d[i * 4 + 2] = ob;
      d[i * 4 + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

/** Ordered 4x4 Bayer threshold, used for dithered shading. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const bayer = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;

/**
 * Fill a polygon pixel by pixel with a color picked by fn(x, y).
 * Used for textured iso faces (corrugated metal, concrete, wood).
 */
export function fillPolyFn(ctx, pts, fn) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of pts) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  for (let y = Math.floor(minY); y < Math.ceil(maxY); y++)
    for (let x = Math.floor(minX); x < Math.ceil(maxX); x++) {
      if (!pointInPoly(x + 0.5, y + 0.5, pts)) continue;
      const c = fn(x, y);
      if (c) px(ctx, x, y, c);
    }
}

export function pointInPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Geometry of an iso box with footprint w (along +x) by h (along +y) and given height,
 * with its bottom vertex at (bx, by). Returns the corner points of the three visible faces.
 */
export function isoBox(bx, by, w, h, height) {
  const hw = TW / 2;
  const hh = TH / 2;
  const B = [bx, by];
  const R = [bx + h * hw, by - h * hh];
  const L = [bx - w * hw, by - w * hh];
  const T = [bx + h * hw - w * hw, by - (w + h) * hh];
  const up = ([x, y]) => [x, y - height];
  return {
    left: [L, B, up(B), up(L)], // +y face, lower-left
    right: [B, R, up(R), up(B)], // +x face, lower-right
    top: [up(L), up(B), up(R), up(T)],
    B,
    R,
    L,
    T,
    up,
  };
}
