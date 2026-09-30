// Wasteland palette. Every generated sprite is quantized to these colors,
// which is what makes tiles, props and characters read as one art set.
export const P = {
  ink: '#120d0a',
  dark0: '#1e1611',
  dark1: '#2b1f17',
  dark2: '#3a2a1e',
  brown0: '#4a3222',
  brown1: '#5e3d24',
  brown2: '#7a4a28',
  brown3: '#8f5a2e',
  brown4: '#a8683a',
  brown5: '#c47f45',
  rust0: '#6a2f18',
  rust1: '#8a3c1c',
  rust2: '#a84e24',
  rust3: '#c46a32',
  sand0: '#8a6a3e',
  sand1: '#a07c4a',
  sand2: '#b8925a',
  sand3: '#c9a46a',
  sand4: '#d8b97e',
  sand5: '#e6cc97',
  olive0: '#45472e',
  olive1: '#5a5a3a',
  olive2: '#6b6a45',
  olive3: '#807d52',
  olive4: '#9a956a',
  grey0: '#2e2b28',
  grey1: '#3d3a36',
  grey2: '#55514a',
  grey3: '#6e6960',
  grey4: '#8a847a',
  grey5: '#a8a196',
  grey6: '#c4bdb0',
  bone: '#e8dcc0',
  teal0: '#2f4a44',
  teal1: '#3f625a',
  teal2: '#5b8a7a',
  crt0: '#16261a',
  crt1: '#1f3b22',
  crt2: '#3f7a3a',
  crt3: '#7ad36a',
  crt4: '#b8f5a0',
  red0: '#5a1810',
  red1: '#8a2818',
  red2: '#b83c22',
  fire0: '#d0602a',
  fire1: '#f0a040',
  fire2: '#ffd87a',
  skin0: '#8a5a3c',
  skin1: '#b07a54',
  skin2: '#d4a27a',
  skin3: '#e8c09a',
  denim0: '#343e4c',
  denim1: '#4a5668',
  denim2: '#66758a',
  water0: '#3e6470',
  water1: '#5f8f9a',
  water2: '#9cc4c4',
};

export const PALETTE_RGB = Object.values(P).map(hexToRgb);

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

/** Lighten (k>0) or darken (k<0) a hex color. */
export function shade(hex, k) {
  const [r, g, b] = hexToRgb(hex);
  const t = k > 0 ? 255 : 0;
  const a = Math.abs(k);
  return rgbToHex([r + (t - r) * a, g + (t - g) * a, b + (t - b) * a]);
}

export function mix(h1, h2, t) {
  const a = hexToRgb(h1);
  const b = hexToRgb(h2);
  return rgbToHex(a.map((v, i) => v + (b[i] - v) * t));
}

const cache = new Map();
export function nearest(r, g, b) {
  const key = (r << 16) | (g << 8) | b;
  const hit = cache.get(key);
  if (hit) return hit;
  let best = PALETTE_RGB[0];
  let bd = Infinity;
  for (const c of PALETTE_RGB) {
    // weighted distance: eyes care more about green/red than blue
    const dr = r - c[0];
    const dg = g - c[1];
    const db = b - c[2];
    const d = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
    if (d < bd) {
      bd = d;
      best = c;
    }
  }
  cache.set(key, best);
  return best;
}
