// The world map of Низовье as an old expedition chart of the pre-war Water Authority, inked and aged:
// parchment with stains, folds and a burnt edge; land that blends softly between kinds of ground with relief
// shading; inked mountains, stippled sand, craquelure, dead trees, salt hatching; the dry river with both banks;
// roads, region names by hand, a cartouche, a compass rose, a scale bar and a framed survey grid.
// Drawn at ART× resolution from public/assets/maps/world_low.json (tools/build-world.mjs); the game shows it at
// CELL px per cell (the scene scales it down), so it stays crisp when zoomed in.
import { canvas, makeNoise, rng } from './draw.mjs';

export const CELL = 20;
export const ART = 2;
const PX = CELL * ART; // art pixels per cell

const INK = 'rgba(52,34,20,';
const BASE = {
  '.': [214, 178, 124],
  '=': [214, 178, 124],
  '|': [186, 146, 100],
  ':': [196, 156, 104],
  '^': [168, 128, 86],
  x: [150, 142, 124],
  _: [232, 222, 198],
  '~': [198, 168, 118],
};

export function worldMap(data) {
  const W = data.width * PX;
  const H = data.height * PX;
  const cv = canvas(W, H);
  const { ctx } = cv;
  const n = makeNoise(77);
  const n2 = makeNoise(131);
  const r = rng(203);
  const at = (x, y) => data.rows[Math.max(0, Math.min(data.height - 1, y))]?.[Math.max(0, Math.min(data.width - 1, x))] ?? '^';
  const fbm = (x, y, f = n) => f(x, y) * 0.55 + f(x * 2.1, y * 2.1) * 0.28 + f(x * 4.3, y * 4.3) * 0.17;
  const rockness = (wx, wy) => {
    // bilinear share of rock around a point, for relief
    const x0 = Math.floor(wx - 0.5);
    const y0 = Math.floor(wy - 0.5);
    const fx = wx - 0.5 - x0;
    const fy = wy - 0.5 - y0;
    const v = (x, y) => (at(x, y) === '^' ? 1 : at(x, y) === ':' ? 0.25 : 0);
    return v(x0, y0) * (1 - fx) * (1 - fy) + v(x0 + 1, y0) * fx * (1 - fy) + v(x0, y0 + 1) * (1 - fx) * fy + v(x0 + 1, y0 + 1) * fx * fy;
  };

  // ---- ground: kinds of land blending into each other, relief lit from the north-west, aged paper over it ----
  const img = ctx.createImageData(W, H);
  const cx = W / 2;
  const cy = H / 2;
  for (let py = 0; py < H; py++)
    for (let px = 0; px < W; px++) {
      const u = px / PX;
      const v = py / PX;
      // a warped lookup and a soft blend of the four nearest cells: organic borders, no squares
      const wu = u + (fbm(u * 0.35, v * 0.35) - 0.5) * 1.6;
      const wv = v + (fbm(u * 0.35 + 30, v * 0.35) - 0.5) * 1.6;
      const x0 = Math.floor(wu - 0.5);
      const y0 = Math.floor(wv - 0.5);
      const fx = Phaser_smooth(wu - 0.5 - x0);
      const fy = Phaser_smooth(wv - 0.5 - y0);
      const c00 = BASE[at(x0, y0)] ?? BASE['.'];
      const c10 = BASE[at(x0 + 1, y0)] ?? BASE['.'];
      const c01 = BASE[at(x0, y0 + 1)] ?? BASE['.'];
      const c11 = BASE[at(x0 + 1, y0 + 1)] ?? BASE['.'];
      const col = [0, 1, 2].map((k) => c00[k] * (1 - fx) * (1 - fy) + c10[k] * fx * (1 - fy) + c01[k] * (1 - fx) * fy + c11[k] * fx * fy);
      // relief: slope of rock height toward the light
      const h = (a, b) => rockness(a, b) * 1.2 + fbm(a * 0.6, b * 0.6, n2) * 0.25;
      const lit = (h(wu - 0.3, wv - 0.3) - h(wu + 0.3, wv + 0.3)) * 60;
      // paper: broad stains, fibres, foxing specks
      const stain = (fbm(u * 0.08, v * 0.08, n2) - 0.5) * 34;
      const fibre = (n(px * 0.9, py * 0.07) - 0.5) * 7;
      const fox = n2(px * 0.11, py * 0.11) > 0.86 ? -18 : 0;
      // a burnt, darkened edge and a soft vignette
      const edge = Math.min(px, py, W - 1 - px, H - 1 - py) / PX;
      const burn = edge < 1.4 + n(px * 0.02, py * 0.02) * 1.8 ? -60 * (1 - edge / (1.4 + n(px * 0.02, py * 0.02) * 1.8)) : 0;
      const vign = -((Math.hypot((px - cx) / cx, (py - cy) / cy) ** 2.4) * 30);
      const k = lit + stain + fibre + fox + burn + vign;
      const i = (py * W + px) * 4;
      img.data[i] = clamp(col[0] + k);
      img.data[i + 1] = clamp(col[1] + k * 0.95);
      img.data[i + 2] = clamp(col[2] + k * 0.8);
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);

  // fold creases: the chart was folded in four
  for (const [x0, y0, x1, y1] of [[W / 2, 0, W / 2, H], [0, H / 2, W, H / 2]]) {
    ctx.strokeStyle = 'rgba(70,46,24,0.18)';
    ctx.lineWidth = 3;
    line(ctx, x0, y0, x1, y1);
    ctx.strokeStyle = 'rgba(255,240,210,0.16)';
    ctx.lineWidth = 2;
    line(ctx, x0 + 3, y0 + 3, x1 + 3, y1 + 3);
  }
  // coffee rings left by a careless surveyor
  for (const [x, y, rad] of [[W * 0.78, H * 0.18, 70], [W * 0.2, H * 0.83, 55]]) {
    ctx.strokeStyle = 'rgba(90,52,20,0.16)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0.3, Math.PI * 1.85);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + 4, y - 2, rad - 6, 0.1, Math.PI * 1.4);
    ctx.stroke();
  }

  // ---- marks by the kind of ground ----
  const cellsOf = (c) => {
    const out = [];
    for (let y = 0; y < data.height; y++) for (let x = 0; x < data.width; x++) if (at(x, y) === c) out.push([x, y]);
    return out;
  };
  // stippled sand and the odd dune line
  for (const [x, y] of cellsOf('.')) {
    ctx.fillStyle = `${INK}0.28)`;
    for (let k = 0; k < 6; k++) ctx.fillRect(x * PX + r() * PX, y * PX + r() * PX, 1.5, 1.5);
    if (r() < 0.08) {
      ctx.strokeStyle = `${INK}0.3)`;
      ctx.lineWidth = 1.5;
      const bx = x * PX + r() * PX;
      const by = y * PX + r() * PX;
      ctx.beginPath();
      ctx.moveTo(bx - 14, by + 4);
      ctx.quadraticCurveTo(bx, by - 6, bx + 14, by + 3);
      ctx.stroke();
    }
  }
  // craquelure of the dried riverside flats
  ctx.lineWidth = 1.2;
  for (const [x, y] of cellsOf(':')) {
    ctx.strokeStyle = `${INK}0.35)`;
    for (let k = 0; k < 2; k++) {
      let px = x * PX + r() * PX;
      let py = y * PX + r() * PX;
      ctx.beginPath();
      ctx.moveTo(px, py);
      for (let s = 0; s < 4; s++) ctx.lineTo((px += (r() - 0.5) * 18), (py += (r() - 0.5) * 18));
      ctx.stroke();
    }
  }
  // salt: horizontal hatching and glints
  for (const [x, y] of cellsOf('_')) {
    ctx.strokeStyle = 'rgba(120,110,90,0.25)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 3; k++) {
      const yy = y * PX + 6 + k * 12 + r() * 4;
      line(ctx, x * PX + r() * 8, yy, x * PX + PX - r() * 8, yy);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    if (r() < 0.4) glint(ctx, x * PX + r() * PX, y * PX + r() * PX);
  }
  // the delta: ripple marks of water long gone
  for (const [x, y] of cellsOf('~')) {
    ctx.strokeStyle = `${INK}0.3)`;
    ctx.lineWidth = 1.2;
    for (let k = 0; k < 2; k++) {
      const by = y * PX + 10 + k * 18 + r() * 5;
      ctx.beginPath();
      ctx.moveTo(x * PX + 4, by);
      ctx.bezierCurveTo(x * PX + 14, by - 5, x * PX + 24, by + 5, x * PX + PX - 4, by);
      ctx.stroke();
    }
  }
  // the Dead fields: diagonal wash hatching and dead trees
  for (const [x, y] of cellsOf('x')) {
    ctx.strokeStyle = 'rgba(40,40,36,0.22)';
    ctx.lineWidth = 1;
    for (let k = -1; k < 3; k++) line(ctx, x * PX + k * 14, y * PX + PX, x * PX + k * 14 + PX * 0.6, y * PX);
    if (r() < 0.22) deadTree(ctx, x * PX + PX / 2 + (r() - 0.5) * 14, y * PX + PX - 6, 12 + r() * 8, r);
  }

  // mountains: inked peaks, lit on the left, hatched on the right, drawn back to front
  const peaks = [];
  for (const [x, y] of cellsOf('^')) for (let k = 0; k < 2; k++) if (r() < 0.75) peaks.push([x * PX + r() * PX, y * PX + r() * PX, 16 + r() * 16]);
  peaks.sort((a, b) => a[1] - b[1]);
  for (const [x, y, s] of peaks) mountain(ctx, x, y, s, r);

  // ---- the dry river: a sandy bed between two inked banks, the old current as a faint dashed thread ----
  const rows = [];
  for (let y = 0; y < data.height; y++) {
    const xs = [...data.rows[y]].map((c, x) => (c === '|' ? x : -1)).filter((x) => x >= 0);
    if (xs.length) rows.push([(xs[0] + xs[xs.length - 1] + 1) / 2, y + 0.5, xs.length]);
  }
  const mid = rows.map(([, y, w], i) => {
    const near = rows.slice(Math.max(0, i - 3), i + 4);
    return [near.reduce((s, c) => s + c[0], 0) / near.length, y, Math.max(1.1, w * 0.55)];
  });
  const bank = (side) =>
    mid.map(([x, y, w], i) => {
      const a = mid[Math.max(0, i - 1)];
      const b = mid[Math.min(mid.length - 1, i + 1)];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1;
      const wob = (n(i * 0.4, side * 9) - 0.5) * 0.35;
      return [(x + (side * (-dy / len)) * (w + wob)) * PX, (y + side * (dx / len) * (w + wob)) * PX];
    });
  const left = bank(-1);
  const right = bank(1);
  ctx.fillStyle = 'rgba(150,108,66,0.35)';
  ctx.beginPath();
  [...left, ...right.slice().reverse()].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.fill();
  for (const b of [left, right]) {
    ctx.strokeStyle = `${INK}0.75)`;
    ctx.lineWidth = 2.2;
    poly(ctx, b);
    // bank hatching toward the bed
    ctx.lineWidth = 1;
    ctx.strokeStyle = `${INK}0.35)`;
    b.forEach(([x, y], i) => {
      if (i % 2) return;
      const [mx, my] = [mid[i][0] * PX, mid[i][1] * PX];
      line(ctx, x, y, x + (mx - x) * 0.25, y + (my - y) * 0.25);
    });
  }
  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = 'rgba(70,90,110,0.45)';
  ctx.lineWidth = 1.5;
  poly(ctx, mid.map(([x, y]) => [x * PX, y * PX]));
  ctx.setLineDash([]);

  // ---- roads: a pale track and brown ink dashes with a hand's wobble ----
  for (const road of data.roads) {
    const pts = road.map(([x, y], i) => [(x + 0.5) * PX + (n(i * 0.7, 3) - 0.5) * 4, (y + 0.5) * PX + (n(i * 0.7, 7) - 0.5) * 4]);
    ctx.strokeStyle = 'rgba(240,226,196,0.55)';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    poly(ctx, pts);
    ctx.strokeStyle = 'rgba(78,44,20,0.9)';
    ctx.lineWidth = 3.5;
    ctx.setLineDash([14, 8]);
    poly(ctx, pts);
    ctx.setLineDash([]);
  }

  // ---- names of the land, by hand ----
  const label = (text, x, y, size, angle = 0, alpha = 0.7) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.font = `italic ${size}px "Georgia", "Times New Roman", serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = `${INK}${alpha})`;
    ctx.fillText(text, 0, 0);
    ctx.restore();
  };
  const centre = (c) => {
    const cs = cellsOf(c);
    const sx = cs.reduce((s, [x]) => s + x, 0) / cs.length;
    const sy = cs.reduce((s, [, y]) => s + y, 0) / cs.length;
    return [(sx + 0.5) * PX, (sy + 0.5) * PX];
  };
  const [dxc, dyc] = centre('x');
  label('М ё р т в ы е   п о л я', dxc, dyc, 34, -0.05);
  label('здесь по ночам бродят Сухостои', dxc, dyc + 36, 20, -0.05, 0.55);
  const [sx, sy] = centre('_');
  label('С о л о н ч а к и', sx, sy, 30, Math.PI / 2, 0.6);
  if (mid.length) {
    const [rx, ry] = mid[Math.floor(mid.length * 0.72)];
    label('Мёртвое русло Светлой', rx * PX + 34, ry * PX, 24, Math.PI / 2 - 0.08, 0.6);
  }
  label('К а м е н н ы й   м е ш о к', 5 * PX, 22 * PX, 24, -Math.PI / 2 + 0.1, 0.6);
  label('↑ Верховья', 30.5 * PX, 1.6 * PX, 22, 0, 0.6);

  // ---- a cartouche, a compass rose, a scale bar ----
  cartouche(ctx, 2.2 * PX, H - 6.2 * PX, 13 * PX, 4.2 * PX);
  compass(ctx, W - 5.2 * PX, 5.5 * PX, 2.8 * PX);
  scaleBar(ctx, W - 16 * PX, H - 2.4 * PX);

  // ---- the survey grid with its coordinates, and the frame ----
  ctx.strokeStyle = `${INK}0.14)`;
  ctx.lineWidth = 1;
  const LETTERS = 'АБВГДЕЖИКЛМН';
  for (let x = 8, i = 0; x <= data.width; x += 8, i++) {
    if (x < data.width) line(ctx, x * PX + 0.5, 0, x * PX + 0.5, H);
    frameText(ctx, LETTERS[i], (x - 4) * PX, 26);
    frameText(ctx, LETTERS[i], (x - 4) * PX, H - 12);
  }
  for (let y = 8, i = 1; y <= data.height; y += 8, i++) {
    if (y < data.height) line(ctx, 0, y * PX + 0.5, W, y * PX + 0.5);
    frameText(ctx, String(i), 18, (y - 4) * PX + 6);
    frameText(ctx, String(i), W - 18, (y - 4) * PX + 6);
  }
  ctx.strokeStyle = 'rgba(40,26,14,0.9)';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, W - 8, H - 8);
  ctx.strokeStyle = 'rgba(40,26,14,0.6)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(38.5, 38.5, W - 77, H - 77);
  return cv;
}

// ---------- small drawing helpers ----------
function clamp(v) {
  return Math.max(0, Math.min(255, v));
}
function Phaser_smooth(t) {
  return t * t * (3 - 2 * t);
}
function line(ctx, x0, y0, x1, y1) {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}
function poly(ctx, pts) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
}
function glint(ctx, x, y) {
  ctx.fillRect(x - 3, y, 7, 1);
  ctx.fillRect(x, y - 3, 1, 7);
}
function deadTree(ctx, x, y, h, r) {
  ctx.strokeStyle = 'rgba(36,32,28,0.75)';
  ctx.lineWidth = 1.6;
  line(ctx, x, y, x, y - h);
  for (let k = 0; k < 3; k++) {
    const by = y - h * (0.4 + k * 0.2);
    const s = k % 2 ? 1 : -1;
    line(ctx, x, by, x + s * (4 + r() * 5), by - 5 - r() * 4);
  }
}
/** An inked peak: lit left face, hatched right face, a snowless ridge line. */
function mountain(ctx, x, y, s, r) {
  const peak = [x + (r() - 0.5) * s * 0.2, y - s];
  const lb = [x - s * 0.75, y];
  const rb = [x + s * 0.75, y];
  ctx.fillStyle = 'rgba(214,184,138,0.95)';
  ctx.beginPath();
  ctx.moveTo(...lb);
  ctx.lineTo(...peak);
  ctx.lineTo(peak[0] + s * 0.1, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(120,86,52,0.95)';
  ctx.beginPath();
  ctx.moveTo(...peak);
  ctx.lineTo(...rb);
  ctx.lineTo(peak[0] + s * 0.1, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(52,34,20,0.5)';
  ctx.lineWidth = 1;
  for (let k = 1; k < 5; k++) {
    const t = k / 5;
    line(ctx, peak[0] + (rb[0] - peak[0]) * t, peak[1] + (rb[1] - peak[1]) * t, peak[0] + s * 0.1 + (rb[0] - peak[0]) * t * 0.3, y);
  }
  ctx.strokeStyle = 'rgba(52,34,20,0.9)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(...lb);
  ctx.lineTo(...peak);
  ctx.lineTo(...rb);
  ctx.stroke();
}
/** A framed title plate with scrolled ends. */
function cartouche(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(236,216,176,0.92)';
  ctx.strokeStyle = 'rgba(52,34,20,0.85)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 20, y);
  ctx.lineTo(x + w - 20, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + 20);
  ctx.lineTo(x + w, y + h - 20);
  ctx.quadraticCurveTo(x + w, y + h, x + w - 20, y + h);
  ctx.lineTo(x + 20, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - 20);
  ctx.lineTo(x, y + 20);
  ctx.quadraticCurveTo(x, y, x + 20, y);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 10, y + 10, w - 20, h - 20);
  ctx.fillStyle = 'rgba(52,34,20,0.95)';
  ctx.textAlign = 'center';
  ctx.font = 'bold 48px "Georgia", "Times New Roman", serif';
  ctx.fillText('Н И З О В Ь Е', x + w / 2, y + h * 0.48);
  ctx.font = 'italic 20px "Georgia", "Times New Roman", serif';
  ctx.fillText('Водоуправление бассейна Светлой · лист 3', x + w / 2, y + h * 0.72);
  ctx.font = 'italic 16px "Georgia", "Times New Roman", serif';
  ctx.fillText('поправки от руки — после Засухи', x + w / 2, y + h * 0.88);
}
/** An eight-point star with north («С») on top. */
function compass(ctx, x, y, rad) {
  ctx.strokeStyle = 'rgba(52,34,20,0.8)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, rad * 0.62, 0, Math.PI * 2);
  ctx.stroke();
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4 - Math.PI / 2;
    const long = k % 2 === 0;
    const len = rad * (long ? 1 : 0.55);
    const w = rad * (long ? 0.14 : 0.1);
    const tip = [x + Math.cos(a) * len, y + Math.sin(a) * len];
    const l = [x + Math.cos(a - Math.PI / 2) * w, y + Math.sin(a - Math.PI / 2) * w];
    const rr = [x + Math.cos(a + Math.PI / 2) * w, y + Math.sin(a + Math.PI / 2) * w];
    ctx.fillStyle = 'rgba(52,34,20,0.9)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(...l);
    ctx.lineTo(...tip);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(236,216,176,0.95)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(...rr);
    ctx.lineTo(...tip);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(52,34,20,0.95)';
  ctx.font = 'bold 30px "Georgia", serif';
  ctx.textAlign = 'center';
  ctx.fillText('С', x, y - rad - 10);
}
/** A scale bar: 0 — 10 — 20 км (a cell is about two kilometres). */
function scaleBar(ctx, x, y) {
  const seg = 5 * PX; // 10 km
  for (let k = 0; k < 2; k++) {
    ctx.fillStyle = k % 2 ? 'rgba(236,216,176,0.95)' : 'rgba(52,34,20,0.9)';
    ctx.fillRect(x + k * seg, y, seg, 8);
  }
  ctx.strokeStyle = 'rgba(52,34,20,0.9)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, seg * 2, 8);
  ctx.fillStyle = 'rgba(52,34,20,0.95)';
  ctx.font = 'italic 18px "Georgia", serif';
  ctx.textAlign = 'center';
  for (const [k, t] of [[0, '0'], [1, '10'], [2, '20 км']]) ctx.fillText(t, x + k * seg, y - 8);
}
function frameText(ctx, t, x, y) {
  ctx.fillStyle = 'rgba(236,216,176,0.9)';
  ctx.font = 'bold 18px "Georgia", serif';
  ctx.textAlign = 'center';
  ctx.fillText(t, x, y);
}
