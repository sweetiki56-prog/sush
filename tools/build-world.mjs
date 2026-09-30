// Builds public/assets/maps/world_low.json: the terrain grid of the world map — Низовье in columns 0–63 and the
// Солончаки east of it (stage K) — from the landmarks in docs/story/world.md. Deterministic. Run by `npm run gen:map`.
import { writeFileSync } from 'node:fs';
import { makeNoise } from './art/draw.mjs';

const W = 112;
const LOW_W = 64; // Низовье; the Солончаки lie east of it
const H = 48;
const noise = makeNoise(203);
// . sand  | riverbed  : cracks  ^ rocks  x dead fields  _ salt  ~ delta  = road  s the Salt sea's crust
const g = Array.from({ length: H }, () => Array(W).fill('.'));
const set = (x, y, c) => x >= 0 && y >= 0 && x < W && y < H && (g[y][x] = c);

/** The dry Светлая: from the north gap down to the delta, past Запруда's bank, the barge and the Ark. */
const riverX = (y) => Math.round(29.5 + Math.sin(y / 6.5) * 1.3 + (y > 30 ? (y - 30) * 0.15 : 0));

for (let y = 0; y < H; y++)
  for (let x = 0; x < LOW_W; x++) {
    const n = noise(x * 0.15, y * 0.15);
    if (x < 3 + n * 5 || (y < 3 + n * 3 && Math.abs(x - riverX(y)) > 3) || (x < 12 && y > 17 && y < 24 && n > 0.45)) g[y][x] = '^';
    else if (x > 55 + n * 5) g[y][x] = '_';
    else if (y > 44 + n * 2) g[y][x] = '~';
    else if (((x - 45) / 8.5) ** 2 + ((y - 30) / 6.5) ** 2 < 1 + (n - 0.5) * 0.5) g[y][x] = 'x';
  }
/** The Солончаки: salt flats, the Salt sea's crust between Соль and Кристалл, the mine hills over Соль, the Скит's highlands. */
for (let y = 0; y < H; y++)
  for (let x = LOW_W; x < W; x++) {
    const n = noise(x * 0.15, y * 0.15);
    const blob = (cx, cy, rx, ry, rough) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1 + (n - 0.5) * rough;
    const rocks = [blob(74, 19, 5, 2.2, 0.6), blob(101, 40, 4, 2, 0.8), blob(68, 35, 2.5, 2, 0.8), blob(82, 43, 4, 1.6, 0.8)];
    if (y < 3 + n * 3 || (x > 82 + noise(y * 0.5 + 20, 3) * 12 && y < 4 + noise(x * 0.3 + 40, 7) * 9) || x > 108 - n * 2 || rocks.some(Boolean)) g[y][x] = '^';
    else if (blob(93, 28, 15, 11, 0.5)) g[y][x] = 's';
    else if (y > 44 + n * 2 && x < 72) g[y][x] = '~';
    else g[y][x] = noise(x * 0.45 + 50, y * 0.45) > 0.74 ? ':' : '_';
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
  [[18, 28], [24, 27], [31, 25], [38, 23], [45, 23], [51, 25], [63, 25], [68, 24], [74, 24]], // восточная дорога: Баржа, Элеватор, Соль
  [[74, 24], [79, 26], [85, 29], [92, 31]], // соляной путь: Соль — Кладбище судов
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
writeFileSync('public/assets/maps/world_low.json', JSON.stringify({ id: 'world_low', name: 'Низовье и Солончаки', width: W, height: H, rows, roads: ROADS }, null, 1));
console.log(`world: ${W}x${H}`);
