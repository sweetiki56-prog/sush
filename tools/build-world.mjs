// Builds public/assets/maps/world_low.json: the terrain grid of Низовье for the world map, from the
// landmarks in docs/story/world.md. Deterministic. Run by `npm run gen:map`.
import { writeFileSync } from 'node:fs';
import { makeNoise } from './art/draw.mjs';

const W = 64;
const H = 48;
const noise = makeNoise(203);
// . sand  | riverbed  : cracks  ^ rocks  x dead fields  _ salt  ~ delta  = road
const g = Array.from({ length: H }, () => Array(W).fill('.'));
const set = (x, y, c) => x >= 0 && y >= 0 && x < W && y < H && (g[y][x] = c);

/** The dry Светлая: from the north gap down to the delta, past Запруда's bank, the barge and the Ark. */
const riverX = (y) => Math.round(29.5 + Math.sin(y / 6.5) * 1.3 + (y > 30 ? (y - 30) * 0.15 : 0));

for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const n = noise(x * 0.15, y * 0.15);
    if (x < 3 + n * 5 || (y < 3 + n * 3 && Math.abs(x - riverX(y)) > 3) || (x < 12 && y > 17 && y < 24 && n > 0.45)) g[y][x] = '^';
    else if (x > 55 + n * 5) g[y][x] = '_';
    else if (y > 44 + n * 2) g[y][x] = '~';
    else if (((x - 45) / 8.5) ** 2 + ((y - 30) / 6.5) ** 2 < 1 + (n - 0.5) * 0.5) g[y][x] = 'x';
  }
// cracks along the old banks and around the north-east ravine
for (let y = 0; y < H; y++) {
  const rx = riverX(y);
  for (let d = -3; d <= 3; d++) if (Math.abs(d) > 1 && noise(rx + d, y * 0.5) > 0.4 && g[y][rx + d] === '.') set(rx + d, y, ':');
  for (let d = -1; d <= 1; d++) set(rx + d, y, '|');
}
for (let y = 12; y < 19; y++) for (let x = 33; x < 40; x++) if (noise(x * 0.4, y * 0.4) > 0.35) set(x, y, ':');

/** Roads as polylines between cells (docs/story/world.md «Дороги»). */
export const ROADS = [
  [[14, 36], [16, 32], [18, 28]], // Ржавый колодец — Три столба
  [[18, 28], [19, 24], [20, 19], [23, 14], [26, 10]], // тракт: Колючка, Запруда
  [[18, 28], [24, 27], [31, 25], [38, 23], [45, 23], [51, 25], [63, 25]], // восточная дорога: Баржа, Элеватор, к Соли
];
for (const line of ROADS)
  for (let i = 1; i < line.length; i++) {
    const [ax, ay] = line[i - 1];
    const [bx, by] = line[i];
    const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
    for (let k = 0; k <= n; k++) {
      const x = Math.round(ax + ((bx - ax) * k) / n);
      const y = Math.round(ay + ((by - ay) * k) / n);
      if (g[y][x] !== '|') set(x, y, '=');
    }
  }

const rows = g.map((r) => r.join(''));
writeFileSync('public/assets/maps/world_low.json', JSON.stringify({ id: 'world_low', name: 'Низовье', width: W, height: H, rows, roads: ROADS }, null, 1));
console.log(`world: ${W}x${H}`);
