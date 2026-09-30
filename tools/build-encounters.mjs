// Builds the battlefields of the road: small maps by terrain where world-map encounters are fought
// (docs/story/world.md «Правила пути»). Each has cover of its kind, the hero's side (south-west) and the
// foe's (north-east). Deterministic. Run by `npm run gen:map`, then `npm run gen:assets` bakes their grounds.
import { writeFileSync } from 'node:fs';
import { rng, makeNoise } from './art/draw.mjs';
import { buildOuter, buildDecor, MARGIN, PAD } from './map-outer.mjs';

const W = 24;
const H = 24;
const HERO = [[4, 19], [3, 20], [5, 21], [2, 18], [6, 20], [3, 22]];
const FOE = [[19, 4], [20, 3], [18, 5], [21, 5], [17, 3], [19, 6], [16, 4]];

const FIELDS = {
  enc_road: { name: 'Тракт', seed: 11, base: ':', band: '=', props: [['car_x_burnt', 2, 1, 1], ['car_y', 1, 2, 1], ['tires', 1, 1, 2], ['barrel', 1, 1, 2], ['bush', 1, 1, 4]] },
  enc_sand: { name: 'Пески', seed: 22, base: '.', props: [['cactus', 1, 1, 6], ['bush', 1, 1, 6], ['rock_1', 1, 1, 3], ['dead_tree', 1, 1, 2]] },
  enc_rocks: { name: 'Скалы', seed: 33, base: ':', rocky: 0.62, props: [['rock_0', 1, 1, 8], ['rock_2', 1, 1, 8], ['rock_3', 1, 1, 6], ['dead_tree', 1, 1, 2]] },
  enc_ravine: { name: 'Трещины', seed: 44, base: ':', cracks: true, props: [['rock_1', 1, 1, 5], ['barrel', 1, 1, 2], ['bush', 1, 1, 4], ['tires', 1, 1, 1]] },
  enc_dead: { name: 'Мёртвые поля', seed: 55, base: ',', props: [['dead_tree', 1, 1, 10], ['skeleton', 1, 1, 3, false], ['barrel_hazard', 1, 1, 2], ['rock_0', 1, 1, 3]] },
};

const LABEL = { car_x_burnt: 'Сгоревший фургон', car_y: 'Остов пикапа', tires: 'Покрышки', barrel: 'Ржавая бочка', bush: 'Сухой куст', cactus: 'Кактус', dead_tree: 'Мёртвое дерево', skeleton: 'Кости', barrel_hazard: 'Бочка с горючим' };

export const BATTLEFIELDS = Object.keys(FIELDS);

for (const [id, f] of Object.entries(FIELDS)) {
  const r = rng(f.seed);
  const noise = makeNoise(f.seed);
  const g = Array.from({ length: H }, () => Array(W).fill(f.base));
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const n = noise(x * 0.25, y * 0.25);
      if (n > 0.68) g[y][x] = f.base === '.' ? ',' : '.';
      if (f.rocky && n > f.rocky && Math.hypot(x - 12, y - 12) < 9) g[y][x] = '#';
    }
  if (f.band) for (let k = 0; k < W; k++) for (const d of [0, 1]) g[Math.min(H - 1, Math.max(0, Math.round(k * 0.9) + d))][k] = f.band; // a road from the north-west corner down across
  if (f.cracks) for (let k = 4; k < 20; k++) if (noise(k * 0.4, 9) > 0.35) g[Math.round(12 + Math.sin(k / 3) * 3)][k] = '#';
  // rim
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const edge = Math.min(x, y, W - 1 - x, H - 1 - y);
      if (edge < 1 + Math.floor(noise(x * 0.3 + 70, y * 0.3 + 70) * 1.6) && g[y][x] !== '=') g[y][x] = '#';
    }
  // the sides stay open: the hero's corner and the foe's
  for (const [x, y] of [...HERO, ...FOE]) g[y][x] = f.base === '#' ? ':' : g[y][x] === '#' ? f.base : g[y][x];

  const objects = [];
  const occupied = new Set();
  const key = (x, y) => `${x},${y}`;
  const clear = (x, y) => [...HERO, ...FOE].every(([sx, sy]) => Math.hypot(sx - x, sy - y) > 1.5);
  for (const [frame, w, h, count, block = true] of f.props)
    for (let n = 0, tries = 0; n < count && tries < 400; tries++) {
      const x = 2 + Math.floor(r() * (W - 4 - w));
      const y = 2 + Math.floor(r() * (H - 4 - h));
      let ok = true;
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (occupied.has(key(xx, yy)) || g[yy][xx] === '#' || !clear(xx, yy)) ok = false;
      if (!ok) continue;
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) occupied.add(key(xx, yy));
      objects.push({ id: `${frame}_${x}_${y}`, frame, x, y, w, h, block, label: LABEL[frame] ?? 'Скалы', ...(frame === 'barrel_hazard' ? { explosive: true } : {}) });
      n++;
    }
  // rocks on blocked ground
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (g[y][x] !== '#' || occupied.has(key(x, y))) continue;
      occupied.add(key(x, y));
      objects.push({ id: `rock_${x}_${y}`, frame: `rock_${Math.floor(r() * 4)}`, x, y, w: 1, h: 1, block: true, label: 'Скалы', jx: Math.round((r() - 0.5) * 18), jy: Math.round((r() - 0.5) * 8) });
    }

  const ground = g.map((row) => row.join(''));
  const outerGround = buildOuter(ground, W, H, noise, []);
  const { decor, wires } = buildDecor(outerGround, W, H, { mission: false });
  const entries = { default: HERO[0], hero: HERO[0] };
  const out = { id, name: f.name, width: W, height: H, entries, spawns: HERO, foes: FOE, ground, objects, actors: [], triggers: [], outer: { margin: MARGIN, pad: PAD, ground: outerGround }, decor, wires };
  writeFileSync(`public/assets/maps/${id}.json`, JSON.stringify(out, null, 1));
}
console.log(`battlefields: ${BATTLEFIELDS.join(', ')}`);
