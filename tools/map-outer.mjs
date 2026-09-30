// The unwalkable wasteland around the playable map: an extended terrain grid for the
// ground baker plus non-interactive decor (cliffs, mesas, ruins, wrecks, power line).
import { rng, makeNoise } from './art/draw.mjs';

export const MARGIN = 34; // tiles beyond each edge: covers the ground image corners
export const PAD = 256; // px of ground image beyond the map diamond's bounding box

// ^ badlands   ~ dunes   _ salt flat   (plus the inner materials . , : = #)
// roadRows: rows where the mission road leaves the map westward (none for the arena)
/**
 * `roadRows`: rows where a road leaves the west edge into the wasteland; `roads` adds other sides
 * ({ east: rows, north: cols, south: cols }) so every way out of a town runs on beyond the map.
 */
export function buildOuter(g, W, H, rimNoise, roadRows = [25, 26], roads = {}) {
  const M = MARGIN;
  const n = makeNoise(77);
  const rows = [];
  for (let oy = 0; oy < H + 2 * M; oy++) {
    let row = '';
    for (let ox = 0; ox < W + 2 * M; ox++) {
      const x = ox - M;
      const y = oy - M;
      if (x >= 0 && y >= 0 && x < W && y < H) {
        row += g[y][x];
        continue;
      }
      const d = dist(x, y, W, H);
      const m = n(x * 0.11, y * 0.11);
      if ((x < 0 && roadRows.includes(y)) || (x >= W && roads.east?.includes(y)) || (y < 0 && roads.north?.includes(x)) || (y >= H && roads.south?.includes(x))) row += '=';
      else if (d <= 1 + Math.floor(rimNoise(x * 0.3 + 50, y * 0.3 + 50) * 3.2)) row += '#';
      else if (d < 6 + m * 7) row += '^';
      else if (m > 0.6) row += '_';
      else if (m < 0.42) row += '~';
      else row += n(x * 0.4 + 20, y * 0.4) > 0.62 ? ',' : '.';
    }
    rows.push(row);
  }
  return rows;
}

/** Chebyshev distance (tiles) from a tile to the playable rectangle. */
export function dist(x, y, W, H) {
  const dx = x < 0 ? -x : x >= W ? x - W + 1 : 0;
  const dy = y < 0 ? -y : y >= H ? y - H + 1 : 0;
  return Math.max(dx, dy);
}

/** mission: the road, its wrecks and the power line; otherwise only ruins and nature. */
export function buildDecor(outer, W, H, { mission = true } = {}) {
  const M = MARGIN;
  const r = rng(2077);
  const decor = [];
  const taken = new Set();
  const mat = (x, y) => outer[y + M]?.[x + M] ?? '.';
  // decor only matters where the ground image is: keep footprints inside it
  const onImage = (x, y) => {
    const sx = (x - y) * 32;
    const sy = (x + y) * 16;
    return sx > -H * 32 - PAD + 48 && sx < W * 32 + PAD - 48 && sy > -PAD + 24 && sy < (W + H) * 16 + PAD - 8;
  };
  const free = (x, y, w, h) => {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) {
        if (xx >= 0 && yy >= 0 && xx < W && yy < H) return false;
        if (taken.has(`${xx},${yy}`) || mat(xx, yy) === '=' || !onImage(xx, yy)) return false;
      }
    return true;
  };
  // jitter (px) breaks the tile lattice for small scatter; depth still follows the footprint
  const place = (frame, x, y, w = 1, h = 1, jitter = false) => {
    if (!free(x, y, w, h)) return false;
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) taken.add(`${xx},${yy}`);
    const o = { frame, x, y, w, h };
    if (jitter) Object.assign(o, { jx: Math.round((r() - 0.5) * 24), jy: Math.round((r() - 0.5) * 10) });
    decor.push(o);
    return true;
  };
  // tall things right past the lower (front) edges would hide the player: keep them further out
  const front = (x, y) => x >= W || y >= H;
  const scatter = (tries, fn) => {
    for (let i = 0; i < tries; i++) fn(Math.floor(r() * (W + 2 * M)) - M, Math.floor(r() * (H + 2 * M)) - M);
  };

  // the road leaves west past wrecks under a dead power line
  const west = [[-5, 23], [-12, 23], [-19, 23], [-26, 23]];
  const east = [[41, 13], [47, 9], [53, 5]];
  const standing = new Set(['2,23', '20,22', '28,23', '36,17']); // inner pylons are map objects
  if (mission) {
    for (const [x, y] of [...west, ...east]) if (place('pylon', x, y)) standing.add(`${x},${y}`);
    place('car_x_burnt', -9, 27, 2, 1);
    place('car_x', -16, 22, 2, 1);
    place('tires', -7, 22);
    place('barrel', -14, 27);
    place('ruin', -13, 5, 3, 3);
    place('ruin', 9, -11, 3, 3);
    place('ruin', 46, 31, 3, 3);
  } else {
    place('ruin', -11, 4, 3, 3);
    place('ruin', 6, -10, 3, 3);
    place('ruin', W + 6, H - 8, 3, 3);
    place('car_x_burnt', -8, H - 6, 2, 1);
  }

  scatter(900, (x, y) => {
    const d = dist(x, y, W, H);
    if (d >= 11 && decor.filter((o) => o.frame === 'mesa').length < 14) place('mesa', x, y, 4, 4);
  });
  scatter(1400, (x, y) => {
    const d = dist(x, y, W, H);
    const lo = front(x, y) ? 5 : 2;
    const v = 'abc'[Math.floor(r() * 3)];
    const [w, h] = { a: [2, 2], b: [3, 2], c: [2, 3] }[v];
    if (d >= lo && d <= lo + 7 && mat(x, y) !== '_' && r() < 0.5) place(`cliff_${v}`, x, y, w, h);
  });
  for (let y = -M; y < H + M; y++)
    for (let x = -M; x < W + M; x++) {
      const d = dist(x, y, W, H);
      if (d === 0) continue;
      const near = d <= (front(x, y) ? 3 : 2);
      const rocky = '#^'.includes(mat(x, y));
      if ((near && r() < 0.4) || (rocky && r() < 0.06)) place(`rock_${Math.floor(r() * 4)}`, x, y, 1, 1, true);
    }
  scatter(500, (x, y) => {
    const d = dist(x, y, W, H);
    if (d < 3) return;
    const m = mat(x, y);
    const k = r();
    if (m === '_') return;
    if (k < 0.25) place('dead_tree', x, y, 1, 1, true);
    else if (k < 0.55) place('cactus', x, y, 1, 1, true);
    else place('bush', x, y, 1, 1, true);
  });

  const wires = [];
  if (!mission) return { decor, wires };
  const chain = (all) => {
    const pts = all.filter(([x, y]) => standing.has(`${x},${y}`));
    pts.slice(1).forEach((p, i) => wires.push([pts[i], p]));
  };
  chain([...[...west].reverse(), [2, 23]]);
  chain([[20, 22], [28, 23], [36, 17], ...east]);
  return { decor, wires };
}
