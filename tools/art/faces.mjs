// Dialogue portraits: a head-and-shoulders close-up on a 48-pixel grid, drawn from a character's look.
// The map sprite is too small to carry a face, so the portrait paints its own: eyes, brows, nose,
// mouth, age lines, hair, hats, hoods, beards, goggles, masks and salt growths. Small features
// vary with the id, so two people with one outfit still get two faces.
import { bayer, canvas, finalize, rng } from './draw.mjs';
import { P } from './palette.mjs';

const N = 48;
const RAMPS = [
  [P.ink, P.dark0, P.dark1, P.dark2],
  [P.skin0, P.skin1, P.skin2, P.skin3],
  [P.grey0, P.grey1, P.grey2, P.grey3, P.grey4, P.grey5, P.grey6, P.bone],
  [P.brown0, P.brown1, P.brown2, P.brown3, P.brown4, P.brown5],
  [P.rust0, P.rust1, P.rust2, P.rust3],
  [P.sand0, P.sand1, P.sand2, P.sand3, P.sand4, P.sand5],
  [P.olive0, P.olive1, P.olive2, P.olive3, P.olive4],
  [P.teal0, P.teal1, P.teal2],
  [P.denim0, P.denim1, P.denim2],
  [P.red0, P.red1, P.red2],
  [P.crt0, P.crt1, P.crt2, P.crt3, P.crt4],
  [P.water0, P.water1, P.water2],
];

/** One step lighter (d > 0) or darker (d < 0) along the color's own ramp. */
function step(color, d) {
  if (!color) return color;
  const c = color.toLowerCase();
  for (const ramp of RAMPS) {
    const i = ramp.findIndex((x) => x.toLowerCase() === c);
    if (i >= 0) return ramp[Math.max(0, Math.min(ramp.length - 1, i + d))];
  }
  return d < 0 ? P.dark1 : P.bone;
}

function hash(text) {
  let h = 2166136261;
  for (const ch of String(text)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

const GREY_HAIR = new Set([P.grey3, P.grey4, P.grey5, P.grey6, P.bone].map((c) => c.toLowerCase()));

export function buildFace(cfg, id = '') {
  const r = rng(hash(id || JSON.stringify(cfg)));
  const g = Array.from({ length: N }, () => new Array(N).fill(null));
  const put = (x, y, c) => {
    x = Math.round(x);
    y = Math.round(y);
    if (c && x >= 0 && y >= 0 && x < N && y < N) g[y][x] = c;
  };
  const get = (x, y) => (x >= 0 && y >= 0 && x < N && y < N ? g[y][x] : null);
  const rect = (x0, y0, x1, y1, c) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, c);
  };

  const bulk = Math.min(1.45, cfg.bulk ?? 1);
  const child = (cfg.height ?? 1) < 0.92 && !cfg.beard;
  const salt = !!cfg.crystals;
  const dry = /^dry/.test(id) && cfg.skin === P.grey2;
  const old = !child && !salt && !cfg.bald && GREY_HAIR.has(String(cfg.hair).toLowerCase()) || (!!cfg.cane && !child);
  const skin = cfg.skin;
  const skinLo = step(skin, -1);
  const skinHi = step(skin, 1);
  const hair = cfg.hair;

  // ---- features that vary by person ----
  const cx = 24;
  const cy = child ? 23 : 21;
  const rx = Math.round((child ? 9 : 10 + (bulk - 1) * 4) + (r() < 0.3 ? -1 : r() < 0.6 ? 0 : 1));
  const ry = child ? 11 : 12;
  const jaw = 0.55 + r() * 0.3 + (bulk - 1) * 0.6; // how square the jaw is
  const eyeGap = child ? 4 : 4 + Math.round(r() * 1.2);
  const eyeY = cy + (child ? 2 : 1);
  const noseLen = child ? 2 : 3 + Math.round(r() * 2);
  const mouthW = child ? 2 : 2 + Math.round(r() * 2);
  const mouthY = cy + (child ? 7 : 8) + (noseLen > 4 ? 1 : 0);
  const browTilt = cfg.bandana || cfg.mask || bulk > 1.2 ? 1 : r() < 0.3 ? -1 : 0; // 1 = stern
  const hairStyle = cfg.bun ? 'bun' : child ? 'mop' : ['crop', 'swept', 'long', 'crop'][Math.floor(r() * 4)];

  // ---- background ----
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) put(x, y, bayer(x, y) > (y - 8) / 20 ? P.crt1 : P.crt0);

  // ---- shoulders and clothes ----
  const torso = cfg.coat ?? cfg.shirt;
  const half = Math.round(Math.min(22, (child ? 12 : 15) * bulk));
  const top = Math.min(42, cy + ry + 5);
  for (let y = top; y < N; y++) {
    const w = Math.min(half, half - Math.max(0, 3 - (y - top)) * 2);
    for (let x = cx - w; x <= cx + w; x++) put(x, y, x < cx - w + 3 ? step(torso, 1) : x > cx + w - 3 ? step(torso, -1) : torso);
  }
  // the shirt in the open collar
  for (let y = top; y < N; y++) {
    const w = Math.max(0, 4 - Math.floor((y - top) / 2));
    for (let x = cx - w; x <= cx + w; x++) put(x, y, cfg.coat ? cfg.shirt : step(torso, -1));
  }
  if (cfg.armor) for (const sx of [-1, 1]) rect(cx + sx * (half - 6) - 3, top + 1, cx + sx * (half - 6) + 3, top + 5, sx < 0 ? P.grey4 : P.grey3);
  if (cfg.apron) {
    rect(cx - 6, top + 4, cx + 6, N - 1, cfg.apron);
    for (const sx of [-1, 1]) for (let y = top; y < top + 4; y++) put(cx + sx * (6 - (y - top)), y, cfg.apron);
  }
  if (cfg.backpack || cfg.rifle) for (let i = 0; i < 12; i++) put(cx - half + 4 + i, top + 11 - i, cfg.rifle ? P.brown1 : step(cfg.backpack, -1));

  // ---- neck ----
  rect(cx - 3, cy + ry - 2, cx + 3, top + 1, skin);
  rect(cx + 1, cy + ry - 2, cx + 3, top + 1, skinLo);
  rect(cx - 3, cy + ry - 1, cx + 3, cy + ry, skinLo); // under the chin

  // ---- head ----
  const inHead = (x, y) => {
    const dy = (y - cy) / ry;
    let w = rx;
    if (y > cy + 2) w = rx * (1 - (1 - jaw) * ((y - cy - 2) / (ry - 2)) ** 1.5);
    return Math.abs(x - cx) <= w * Math.sqrt(Math.max(0, 1 - dy * dy)) + 0.4;
  };
  for (let y = cy - ry; y <= cy + ry; y++)
    for (let x = cx - rx; x <= cx + rx; x++) {
      if (!inHead(x, y)) continue;
      const edgeR = !inHead(x + 2, y);
      const edgeL = !inHead(x - 2, y);
      put(x, y, edgeR || y > cy + ry - 2 ? skinLo : edgeL && y < cy + 3 ? skinHi : skin);
    }
  // ears
  for (const sx of [-1, 1]) {
    const ex = cx + sx * (rx + 1);
    rect(Math.min(ex, ex - sx), eyeY, Math.max(ex, ex - sx), eyeY + 3, sx > 0 ? skinLo : skin);
    put(ex, eyeY + 1, skinLo);
  }

  // ---- hair (under hats and hoods) ----
  const grey = GREY_HAIR.has(String(hair).toLowerCase());
  if (!cfg.bald && !cfg.hood) {
    const line = cy - (hairStyle === 'swept' ? 3 : 4);
    for (let y = cy - ry - 1; y <= line; y++)
      for (let x = cx - rx - 1; x <= cx + rx + 1; x++) {
        const dy = (y - cy) / (ry + 1);
        if (Math.abs(x - cx) > (rx + 1) * Math.sqrt(Math.max(0, 1 - dy * dy)) + 0.5) continue;
        const swept = hairStyle === 'swept' && y === line && x > cx + 2;
        if (swept) continue;
        put(x, y, x > cx + rx - 3 ? step(hair, -1) : (x + y) % 5 === 0 ? step(hair, 1) : hair);
      }
    // temples and sides
    const sideTo = hairStyle === 'long' ? cy + 10 : hairStyle === 'mop' ? cy + 3 : cy;
    for (let y = line; y <= sideTo; y++) for (const sx of [-1, 1]) {
      put(cx + sx * (rx + 1), y, sx > 0 ? step(hair, -1) : hair);
      put(cx + sx * rx, y, sx > 0 ? step(hair, -1) : hair);
      if (hairStyle === 'long') put(cx + sx * (rx + 2), y + 1, step(hair, -1));
    }
    if (hairStyle === 'mop') for (let x = cx - rx + 1; x <= cx + rx - 1; x++) if (x % 3) put(x, line + 1, hair);
    if (hairStyle === 'bun') {
      for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) if (x * x + y * y <= 15) put(cx + x, cy - ry - 2 + y, (x + y) > 2 ? step(hair, -1) : hair);
      put(cx - 1, cy - ry - 4, step(hair, 1));
    }
  } else if (cfg.bald && !salt && hair !== skin && !cfg.hood) {
    for (let y = cy - 3; y <= cy + 1; y++) for (const sx of [-1, 1]) put(cx + sx * rx, y, step(hair, sx > 0 ? -1 : 0)); // a fringe over the ears
  }
  if (cfg.bald && !cfg.hood && !cfg.hat) {
    put(cx - rx + 3, cy - ry + 3, skinHi);
    put(cx - rx + 4, cy - ry + 2, skinHi);
  } // shine

  // ---- eyes and brows ----
  const sclera = dry ? P.dark1 : P.bone;
  const pupil = dry ? P.grey3 : salt ? P.water0 : P.ink;
  for (const sx of [-1, 1]) {
    const ex = cx + sx * eyeGap;
    const inner = ex - sx;
    put(Math.min(ex, inner), eyeY, sclera);
    put(Math.max(ex, inner), eyeY, sclera);
    put(sx < 0 ? ex : inner, eyeY, pupil); // both look slightly to the viewer's left
    if (child) {
      put(ex, eyeY - 1, P.ink);
      put(inner, eyeY - 1, P.ink);
    }
    else for (let x = Math.min(ex, inner) - (sx < 0 ? 1 : 0); x <= Math.max(ex, inner) + (sx > 0 ? 1 : 0); x++) put(x, eyeY - 1, step(skin, -2)); // the lid
    // the brow: thick, tilted down to the nose when stern
    const browC = cfg.bald && (hair === skin || salt) ? step(skin, -2) : grey ? step(hair, -1) : step(hair, -1);
    for (let i = -1; i <= 2; i++) {
      const bx = ex + sx * (i - 1) - (sx < 0 ? 0 : 0);
      const tilt = browTilt * (i <= 0 ? 1 : 0);
      put(bx, eyeY - 3 + tilt, browC);
    }
    if (old) {
      put(ex + sx, eyeY + 1, skinLo);
      put(ex + sx * 2, eyeY - 1, skinLo);
    } // bags and crow's feet
  }

  // ---- nose ----
  for (let y = eyeY; y <= eyeY + noseLen; y++) put(cx + 1, y, skinLo);
  put(cx, eyeY + noseLen, skinLo);
  put(cx - 1, eyeY + noseLen, step(skin, -2));
  put(cx + 2, eyeY + noseLen, step(skin, -2));
  put(cx, eyeY + noseLen - 1, skinHi);

  // ---- mouth ----
  const lip = salt || dry ? step(skin, -2) : P.rust0;
  for (let x = cx - mouthW + 1; x <= cx + mouthW; x++) put(x, mouthY, lip);
  if (browTilt > 0) put(cx - mouthW, mouthY + 1, lip); // a hard set to the mouth
  else if (r() < 0.5) put(cx + mouthW + 1, mouthY - 1, lip); // half a smile
  put(cx, mouthY + 1, skinLo);
  if (old) {
    for (let y = eyeY + 3; y <= mouthY; y++) put(cx - mouthW - 1 - (y > mouthY - 2 ? 0 : 1), y, skinLo); // lines from the nose
    if (!cfg.bandana && !cfg.goggles && !cfg.hat) for (let x = cx - 3; x <= cx + 3; x += 2) put(x, cy - 3, skinLo); // forehead
  }

  // ---- beard ----
  if (cfg.beard) {
    for (let y = mouthY - 2; y <= cy + ry + 1; y++)
      for (let x = cx - rx; x <= cx + rx; x++) {
        if (!inHead(x, y) && y <= cy + ry) continue;
        if (y > cy + ry && Math.abs(x - cx) > rx - 4 - (y - cy - ry) * 3) continue;
        if (y < mouthY && Math.abs(x - cx) < 3 && y < mouthY - 1) continue;
        if (y === mouthY && Math.abs(x - cx) <= mouthW - 1) continue;
        put(x, y, x > cx + rx - 3 ? step(cfg.beard, -1) : (x * 3 + y) % 4 === 0 ? step(cfg.beard, 1) : cfg.beard);
      }
    for (let x = cx - mouthW; x <= cx + mouthW + 1; x++) put(x, mouthY - 1, step(cfg.beard, -1)); // moustache
  }

  // ---- salt growths, bark ----
  if (salt) {
    const c = cfg.crystals;
    for (const [x, y] of [[cx - rx + 2, cy - ry + 2], [cx + 2, cy - ry], [cx + rx - 2, cy - 4], [cx - rx + 1, mouthY - 1]]) {
      put(x, y, c);
      put(x + 1, y, step(c, -1));
      put(x, y - 1, step(c, 1));
      if (r() < 0.6) put(x + 1, y - 2, c);
    }
  }
  if (dry) for (let i = 0; i < 9; i++) {
    const x = cx - rx + 2 + Math.floor(r() * (rx * 2 - 3));
    const y0 = cy - ry + 2 + Math.floor(r() * 8);
    for (let y = y0; y < y0 + 4; y++) if (inHead(x, y) && get(x, y) === skin) put(x, y, P.grey1);
  }

  // ---- mask over the lower face ----
  if (cfg.mask) {
    for (let y = eyeY + 2; y <= cy + ry + 1; y++)
      for (let x = cx - rx; x <= cx + rx; x++) if (inHead(x, y) || y === cy + ry + 1 && Math.abs(x - cx) < rx - 2) put(x, y, x > cx + rx - 3 ? step(cfg.mask, -1) : cfg.mask);
    for (const x of [cx - 4, cx, cx + 4]) put(x, eyeY + 5, P.ink);
    put(cx - rx + 2, eyeY + 3, step(cfg.mask, 2));
  }

  // ---- headwear ----
  if (cfg.bandana) {
    const by = cy - 5;
    for (let x = cx - rx - 1; x <= cx + rx + 1; x++) for (let y = by; y <= by + 2; y++) if (get(x, y) !== null && (inHead(x, y) || Math.abs(x - cx) <= rx + 1)) put(x, y, y === by + 2 ? step(cfg.bandana, -1) : cfg.bandana);
    put(cx + rx + 2, by + 2, cfg.bandana);
    put(cx + rx + 3, by + 3, step(cfg.bandana, -1));
    put(cx + rx + 2, by + 4, cfg.bandana);
  }
  if (cfg.goggles) {
    const gy = cfg.bandana ? cy - 8 : cy - 5;
    for (let x = cx - rx - 1; x <= cx + rx + 1; x++) put(x, gy + 1, P.dark1);
    for (const sx of [-1, 1]) {
      const gx = cx + sx * 4;
      rect(gx - 2, gy, gx + 2, gy + 2, P.grey1);
      rect(gx - 1, gy, gx + 1, gy + 2, P.water0);
      put(gx - 1, gy, P.water2);
    }
  }
  if (cfg.hat) {
    const brim = cy - 6;
    for (let x = cx - rx - 4; x <= cx + rx + 4; x++) {
      put(x, brim, x > cx + rx ? step(cfg.hat, -1) : cfg.hat);
      put(x, brim + 1, step(cfg.hat, -1));
    }
    for (let y = cy - ry - 3; y < brim; y++) {
      const w = rx - 1 - (y < cy - ry ? 1 : 0);
      for (let x = cx - w; x <= cx + w; x++) put(x, y, x > cx + w - 2 ? step(cfg.hat, -1) : x < cx - w + 2 ? step(cfg.hat, 1) : cfg.hat);
    }
    for (let x = cx - rx + 1; x <= cx + rx - 1; x++) put(x, brim - 2, step(cfg.hat, -2)); // the band
    for (let x = cx - rx; x <= cx + rx; x++) put(x, brim + 2, step(skin, -1)); // its shadow on the brow
  }
  if (cfg.hood) {
    const h = cfg.hood;
    for (let y = cy - ry - 3; y <= top + 3; y++)
      for (let x = cx - rx - 5; x <= cx + rx + 5; x++) {
        const dy = (y - cy + 2) / (ry + 5);
        const outer = Math.abs(x - cx) <= (rx + 5) * Math.sqrt(Math.max(0, 1 - Math.min(1, dy * dy))) + (y > cy ? 3 : 0);
        const face = inHead(x, y) && y > cy - ry + 3 && Math.abs(x - cx) < rx;
        if (outer && !face) put(x, y, x > cx + rx ? step(h, -1) : x < cx - rx ? step(h, 1) : h);
      }
    for (let x = cx - rx + 1; x <= cx + rx - 1; x++) put(x, cy - ry + 4, step(skin, -2)); // shade under the hood
  }

  // ---- shawl and scarf over the shoulders ----
  if (cfg.shawl) for (let y = top - 1; y < top + 7; y++) {
    const w = half - 1 + Math.min(0, y - top);
    for (let x = cx - w; x <= cx + w; x++) if (Math.abs(x - cx) > 3 || y > top + 4) put(x, y, (x + y) % 4 === 0 ? step(cfg.shawl, -1) : cfg.shawl);
  }
  if (cfg.scarf) {
    for (let y = cy + ry; y <= cy + ry + 3; y++) for (let x = cx - 6; x <= cx + 6; x++) put(x, y, y === cy + ry + 3 || x > cx + 4 ? step(cfg.scarf, -1) : cfg.scarf);
    rect(cx + 3, cy + ry + 4, cx + 5, cy + ry + 8, step(cfg.scarf, -1)); // the loose end
  }

  // ---- to pixels ----
  const cv = canvas(96, 96);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (!g[y][x]) continue;
    cv.ctx.fillStyle = g[y][x];
    cv.ctx.fillRect(x * 2, y * 2, 2, 2);
  }
  return finalize(cv, { outline: false });
}
