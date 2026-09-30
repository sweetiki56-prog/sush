// Bakes the whole map floor into one image: continuous noise across tiles,
// organic borders between materials, cracks, scattered debris and cast shadows.
// The image also covers the unwalkable ring around the map (map.outer), fading into dust haze.
import { canvas, makeNoise, rng, bayer, TW, TH } from './draw.mjs';
import { P, hexToRgb } from './palette.mjs';

// cast-shadow length (in tiles, along +x) per object frame prefix
// [length along +x in tiles, width as a fraction of the footprint]
const SHADOW = { cliff: [1.3, 1], mesa: [2.4, 1], ruin: [1.2, 1], shack: [1.6, 1], pump: [0.7, 0.8], tank: [1.1, 0.7], barrel: [0.5, 0.55], tires: [0.3, 0.6], car: [0.7, 0.8], pylon: [2.6, 0.12], wall_hi: [1.3, 1], wall_lo: [0.4, 1], wall_broken: [0.3, 1], door: [1.2, 1], crate: [0.5, 0.7], machine: [1.0, 0.85], rock: [0.5, 0.8], cactus: [0.9, 0.25], dead_tree: [1.8, 0.3], sign: [0.8, 0.2], hull_hi: [1.3, 1], hull_lo: [0.4, 1], glass_hi: [0.9, 0.3], transformer: [1.4, 0.9], mast: [3.2, 0.1], safe: [0.6, 0.8], valve: [0.8, 0.3], coil: [0.4, 0.7] };
const shadowOf = (frame) => {
  for (const k of Object.keys(SHADOW)) if (frame.startsWith(k)) return SHADOW[k];
  return [0, 0];
};

const rgb = Object.fromEntries(Object.entries(P).map(([k, v]) => [k, hexToRgb(v)]));
const HAZE = [158, 134, 100];

// Voronoi edge distance, gives polygonal cracks
function voronoi(seed) {
  const hash = (x, y, s) => {
    let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  return (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    let d1 = 9;
    let d2 = 9;
    for (let j = -1; j <= 1; j++)
      for (let i = -1; i <= 1; i++) {
        const cx = xi + i + hash(xi + i, yi + j, seed);
        const cy = yi + j + hash(xi + i, yi + j, seed + 7);
        const d = Math.hypot(x - cx, y - cy);
        if (d < d1) {
          d2 = d1;
          d1 = d;
        } else if (d < d2) d2 = d;
      }
    return d2 - d1; // small near cell edges
  };
}

export function bakeGround(map) {
  const W = map.width;
  const H = map.height;
  const { margin: M, pad, ground: outer } = map.outer;
  const imgW = (W + H) * (TW / 2) + pad * 2;
  const imgH = (W + H) * (TH / 2) + 2 + pad * 2;
  const offX = H * (TW / 2) + pad;
  const offY = pad;
  const cv = canvas(imgW, imgH);
  const img = cv.ctx.createImageData(imgW, imgH);
  const d = img.data;
  const n1 = makeNoise(11);
  const n2 = makeNoise(23);
  const n3 = makeNoise(37);
  const crack = voronoi(5);
  const crackBig = voronoi(9);
  const r = rng(777);

  const OW = W + 2 * M;
  const OH = map.height + 2 * M; // maps need not be square
  const mat = (x, y) => {
    x = Math.max(0, Math.min(OW - 1, x + M));
    y = Math.max(0, Math.min(OH - 1, y + M));
    return outer[y][x];
  };

  // shadow mask in tile space, bucketed by row so the far ring stays cheap
  const casters = [...map.objects, ...map.decor]
    .map((o) => {
      const [len, wf] = shadowOf(o.frame);
      const cv = o.y + o.h / 2;
      const half = (o.h * wf) / 2;
      const u0 = wf >= 1 ? o.x + o.w : o.x + o.w / 2; // thin things cast from their center
      return { v0: cv - half, v1: cv + half, u0, u1: o.x + o.w / 2 + (o.w * wf) / 2 + len, len, thin: wf < 0.5 };
    })
    .filter((o) => o.len > 0);
  const rows = new Map();
  for (const o of casters)
    for (let row = Math.floor(o.v0); row <= Math.floor(o.v1); row++) {
      if (!rows.has(row)) rows.set(row, []);
      rows.get(row).push(o);
    }
  const inShadow = (u, v) => {
    for (const o of rows.get(Math.floor(v)) ?? []) {
      if (u < o.u0 || u >= o.u1) continue;
      // thin casters taper to a point: long, soft-ended streak
      const t = (u - o.u0) / (o.u1 - o.u0);
      const shrink = o.thin ? (o.v1 - o.v0) * 0.5 * t * 0.6 : 0;
      if (v < o.v0 + shrink || v >= o.v1 - shrink) continue;
      return true;
    }
    return false;
  };

  const put = (i, c) => {
    d[i] = c[0];
    d[i + 1] = c[1];
    d[i + 2] = c[2];
    d[i + 3] = 255;
  };
  const dith = (a, b, t, x, y) => (t > bayer(x, y) ? b : a);

  for (let py = 0; py < imgH; py++)
    for (let pxl = 0; pxl < imgW; pxl++) {
      const sx = pxl - offX + 0.5;
      const sy = py - offY + 0.5;
      const u = (sx / (TW / 2) + sy / (TH / 2)) / 2;
      const v = (sy / (TH / 2) - sx / (TW / 2)) / 2;
      // domain warp for organic material borders
      const wu = u + (n1(u * 0.9, v * 0.9) - 0.5) * 0.9;
      const wv = v + (n1(u * 0.9 + 40, v * 0.9 + 40) - 0.5) * 0.9;
      let m = mat(Math.floor(wu), Math.floor(wv));
      const hard = mat(Math.floor(u), Math.floor(v));
      if (hard === 'F' || m === 'F' || hard === '-' || m === '-') m = hard; // concrete and boardwalks keep crisp edges
      const i = (py * imgW + pxl) * 4;
      const big = n2(u * 0.25, v * 0.25, 4);
      const fine = n3(u * 3, v * 3, 4);
      let c;
      if (m === '.' || m === ',') {
        const t = big * 0.7 + fine * 0.5 - 0.1;
        const ripple = Math.sin((u * 2.2 + v * 0.9) * 3.1 + n1(u, v) * 4);
        c = t > 0.55 ? rgb.sand4 : t > 0.38 ? dith(rgb.sand3, rgb.sand4, (t - 0.38) * 3, pxl, py) : dith(rgb.sand2, rgb.sand3, t * 2.6, pxl, py);
        if (ripple > 0.82) c = rgb.sand2;
        if (ripple < -0.9 && fine > 0.5) c = rgb.sand5;
        if (m === ',') {
          const s = n3(u * 2 + 3, v * 2, 4);
          if (s > 0.5) c = dith(c, rgb.olive3, (s - 0.5) * 3, pxl, py);
        }
      } else if (m === ':') {
        const t = big * 0.6 + fine * 0.5;
        c = dith(rgb.brown4, rgb.sand1, t, pxl, py);
        const e = crack(u * 1.6, v * 1.6);
        if (e < 0.05) c = rgb.brown1;
        else if (e < 0.09) c = rgb.brown3;
      } else if (m === '=') {
        const t = fine * 0.8 + big * 0.3;
        c = t > 0.62 ? rgb.grey3 : dith(rgb.grey1, rgb.grey2, t * 1.4, pxl, py);
        const e = crackBig(u * 0.9, v * 0.9);
        if (e < 0.03) c = rgb.dark1;
        const drift = n2(u * 0.7 + 90, v * 0.7);
        if (drift > 0.6) c = drift > 0.66 ? rgb.sand2 : dith(c, rgb.sand1, 0.5, pxl, py);
        // faded center dashes along both road legs
        const onX = (Math.floor(v) === 25 || Math.floor(v) === 26) && Math.abs(v - 26) < 0.06 && Math.floor(u * 1.5) % 2 === 0;
        const onY = (Math.floor(u) === 30 || Math.floor(u) === 31) && Math.abs(u - 31) < 0.06 && Math.floor(v * 1.5) % 2 === 0;
        if ((onX || onY) && drift < 0.55 && fine > 0.35) c = rgb.sand4;
      } else if (m === '-') {
        // a boardwalk over the sand: planks across, dark gaps, nail heads, sun-bleached ends
        const fu = u - Math.floor(u);
        const fv = v - Math.floor(v);
        const plank = Math.floor(fv * 4);
        c = dith(plank % 2 ? rgb.brown3 : rgb.brown4, rgb.sand1, fine * 0.35, pxl, py);
        if (fv * 4 - plank < 0.1) c = rgb.dark1;
        if ((fu < 0.06 || fu > 0.94) && (fv * 4 - plank) > 0.4 && (fv * 4 - plank) < 0.6) c = rgb.grey2;
        if (fu < 0.03) c = rgb.brown1;
      } else if (m === 'F') {
        const t = fine * 0.6 + big * 0.5;
        c = dith(rgb.grey3, rgb.grey4, t, pxl, py);
        const fu = u - Math.floor(u);
        const fv = v - Math.floor(v);
        if (fu < 0.04 || fv < 0.04) c = rgb.grey2;
        if (n2(u * 0.8 + 7, v * 0.8) > 0.63) c = rgb.brown2; // rust stain
        if (crack(u * 1.2 + 3, v * 1.2) < 0.025) c = rgb.grey1;
      } else if (m === '^') {
        // badlands: tilted sediment bands, grit, big cracks
        const band = Math.floor((u * 0.8 + v * 0.35 + n1(u * 0.5, v * 0.5) * 2.5) * 2.2);
        c = [rgb.brown3, rgb.sand1, rgb.brown4, rgb.rust1, rgb.sand0][((band % 5) + 5) % 5];
        c = dith(c, rgb.brown2, fine * 0.6, pxl, py);
        if (fine > 0.74) c = rgb.grey3;
        if (crackBig(u * 0.7, v * 0.7) < 0.035) c = rgb.brown1;
      } else if (m === '~') {
        // dunes: long ridges, lit windward side, shaded lee
        const ph = (u * 0.33 + v * 0.14 + n1(u * 0.2 + 7, v * 0.2) * 1.4) % 1;
        const lee = ph < 0 ? ph + 1 : ph;
        c = lee < 0.6 ? dith(rgb.sand3, rgb.sand4, lee * 1.6, pxl, py) : lee < 0.68 ? rgb.sand5 : dith(rgb.sand1, rgb.sand2, (1 - lee) * 3, pxl, py);
        if (Math.sin((u * 2.6 + v * 1.1) * 3 + n1(u, v) * 3) > 0.86) c = rgb.sand2;
      } else if (m === '_') {
        // salt flat: pale crust with polygon cracks
        c = dith(rgb.sand4, rgb.bone, big * 0.8 + fine * 0.3, pxl, py);
        const e = crack(u * 0.8, v * 0.8);
        if (e < 0.03) c = rgb.sand1;
        else if (e < 0.06) c = rgb.sand3;
      } else {
        const t = fine * 0.7 + big * 0.3;
        c = dith(rgb.brown2, rgb.grey2, t, pxl, py);
        if (fine > 0.7) c = rgb.grey3;
      }
      // cloud shadows + cast shadows
      const cloud = n1(u * 0.12 + 100, v * 0.12);
      if (cloud < 0.34) c = darker(c, 0.85);
      if (inShadow(u, v) && bayer(pxl, py) < 0.75) c = darker(c, 0.62);
      // dust haze grows with distance from the playable area
      const du = u < 0 ? -u : u > W ? u - W : 0;
      const dv = v < 0 ? -v : v > H ? v - H : 0;
      const haze = smooth(2.5, M * 0.7, Math.hypot(du, dv)) * 0.72;
      if (haze > 0) c = lerp(c, HAZE, haze);
      const edge = Math.min(pxl, py, imgW - 1 - pxl, imgH - 1 - py);
      if (edge < 160) c = darker(c, 0.82 + 0.18 * (edge / 160));
      put(i, c);
    }
  cv.ctx.putImageData(img, 0, 0);

  // debris stamped on sand/dirt
  const ctx = cv.ctx;
  const toScreen = (u, v) => [(u - v) * (TW / 2) + offX, (u + v) * (TH / 2) + offY];
  for (let k = 0; k < 5200; k++) {
    const inner = k < 1600;
    const u = inner ? 1 + r() * (W - 2) : -M + r() * (W + 2 * M);
    const v = inner ? 1 + r() * (H - 2) : -M + r() * (H + 2 * M);
    if (!inner && u >= 0 && v >= 0 && u < W && v < H) continue;
    const m = mat(Math.floor(u), Math.floor(v));
    if (m === '#' || m === 'F' || m === '_' || m === '-') continue;
    const [x, y] = toScreen(u, v);
    const kind = r();
    if (kind < 0.55) {
      ctx.fillStyle = r() < 0.5 ? P.brown2 : P.grey3;
      ctx.fillRect(Math.round(x), Math.round(y), 1 + Math.floor(r() * 2), 1);
    } else if ((kind < 0.8 || m === ',') && m !== '=') {
      ctx.fillStyle = P.olive1;
      ctx.fillRect(Math.round(x), Math.round(y), 1, 2);
      ctx.fillRect(Math.round(x) + 1, Math.round(y) - 1, 1, 3);
      ctx.fillRect(Math.round(x) + 2, Math.round(y), 1, 2);
    } else if (kind < 0.9) {
      ctx.fillStyle = P.bone;
      ctx.fillRect(Math.round(x), Math.round(y), 3, 1);
      ctx.fillStyle = P.grey5;
      ctx.fillRect(Math.round(x) + 3, Math.round(y), 1, 1);
    } else {
      ctx.fillStyle = P.dark1;
      ctx.beginPath();
      ctx.ellipse(x, y, 4 + r() * 5, 2 + r() * 2, 0, 0, Math.PI * 2);
      ctx.fill(); // oil / scorch stain
    }
  }
  return { cv, offX, offY };
}

function darker(c, k) {
  return [c[0] * k, c[1] * k, c[2] * k];
}

function lerp(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function smooth(e0, e1, x) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}
