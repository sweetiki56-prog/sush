// Builds public/assets/maps/arena.json: "Пыльная чаша", a dried reservoir for free-for-all fights.
// Roughly point-symmetric so no spawn is better than another. Run `npm run gen:map && npm run gen:assets`.
import { writeFileSync, mkdirSync } from 'node:fs';
import { rng, makeNoise } from './art/draw.mjs';
import { buildOuter, buildDecor, MARGIN, PAD } from './map-outer.mjs';

const W = 30;
const H = 30;
const r = rng(4242);
const noise = makeNoise(314);

// . sand   , scrub   : cracked dirt   F concrete   # rock (blocked)
const g = Array.from({ length: H }, () => Array(W).fill(':'));
const set = (x, y, c) => {
  if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = c;
};
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const n = noise(x * 0.2, y * 0.2);
    if (n > 0.64) g[y][x] = '.';
    else if (n < 0.26) g[y][x] = ',';
  }
// the old intake: a concrete apron in the middle and a cross of slabs
for (let y = 11; y <= 18; y++) for (let x = 11; x <= 18; x++) set(x, y, 'F');
for (let k = 4; k <= 25; k++) {
  if (noise(k * 0.5, 3) > 0.3) set(k, 14, 'F');
  if (noise(3, k * 0.5) > 0.3) set(15, k, 'F');
}
// rim
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const edge = Math.min(x, y, W - 1 - x, H - 1 - y);
    const depth = 1 + Math.floor(noise(x * 0.3 + 70, y * 0.3 + 70) * 2.2);
    if (edge < depth) g[y][x] = '#';
  }

const objects = [];
const occupied = new Set();
const key = (x, y) => `${x},${y}`;
function place(o) {
  const w = o.w ?? 1;
  const h = o.h ?? 1;
  for (let yy = o.y; yy < o.y + h; yy++)
    for (let xx = o.x; xx < o.x + w; xx++) {
      if (occupied.has(key(xx, yy))) throw new Error(`overlap at ${xx},${yy} for ${o.id}`);
      if (g[yy][xx] === '#') throw new Error(`${o.id} on rock at ${xx},${yy}`);
      occupied.add(key(xx, yy));
    }
  objects.push({ w, h, block: true, ...o });
}
/** Place a prop and its mirror through the map center. */
const pair = (o, mirror = {}) => {
  place(o);
  const w = o.w ?? 1;
  const h = o.h ?? 1;
  place({ ...o, ...mirror, id: `${o.id}_m`, x: W - o.x - w, y: H - o.y - h });
};

place({ id: 'intake', frame: 'tank', x: 14, y: 14, w: 2, h: 2, label: 'Водозабор' });
// broken concrete rings around the apron: cover with gaps
for (const [x, y] of [[11, 10], [12, 10], [17, 10], [10, 12], [10, 13]]) pair({ id: `wall_${x}_${y}`, frame: r() < 0.4 ? 'wall_broken' : 'wall_lo', x, y, label: 'Бетонный блок' });
pair({ id: 'car_a', frame: 'car_x', x: 5, y: 9, w: 2, h: 1, label: 'Остов седана' });
pair({ id: 'car_b', frame: 'car_y', x: 21, y: 5, w: 1, h: 2, label: 'Остов пикапа' });
pair({ id: 'car_c', frame: 'car_x_burnt', x: 8, y: 20, w: 2, h: 1, label: 'Сгоревший фургон' });
pair({ id: 'tires_a', frame: 'tires', x: 7, y: 5, label: 'Покрышки' });
pair({ id: 'crates_a', frame: 'crate', x: 18, y: 7, label: 'Ящик' });
pair({ id: 'crates_b', frame: 'crate_small', x: 4, y: 15, label: 'Ящики' });
pair({ id: 'fuel_a', frame: 'barrel_hazard', x: 12, y: 7, label: 'Бочка с горючим', explosive: true });
pair({ id: 'fuel_b', frame: 'barrel_hazard', x: 7, y: 14, label: 'Бочка с горючим', explosive: true });
pair({ id: 'barrel_a', frame: 'barrel', x: 20, y: 11, label: 'Ржавая бочка' });
pair({ id: 'rock_a', frame: 'rock_2', x: 5, y: 22, label: 'Скалы' });

// rocks along the rim, a few plants
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    if (g[y][x] !== '#' || occupied.has(key(x, y))) continue;
    const inner = Math.min(x, y, W - 1 - x, H - 1 - y) > 0;
    if (!inner || r() < 0.75) {
      occupied.add(key(x, y));
      objects.push({ id: `rock_${x}_${y}`, frame: `rock_${Math.floor(r() * 4)}`, x, y, w: 1, h: 1, block: true, label: 'Скалы', jx: Math.round((r() - 0.5) * 18), jy: Math.round((r() - 0.5) * 8) });
    }
  }
for (let n = 0, tries = 0; n < 8 && tries < 800; tries++) {
  const x = 3 + Math.floor(r() * (W - 6));
  const y = 3 + Math.floor(r() * (H - 6));
  if (occupied.has(key(x, y)) || g[y][x] === 'F' || Math.hypot(x - 15, y - 15) < 6) continue;
  place({ id: `bush_${x}_${y}`, frame: n % 3 ? 'bush' : 'cactus', x, y, block: n % 3 === 0, label: n % 3 ? 'Сухой куст' : 'Кактус' });
  n++;
}

// six spawns on a ring, facing the middle
const spawns = [[4, 4], [15, 3], [25, 4], [25, 25], [14, 26], [4, 25]];
for (const [x, y] of spawns) if (occupied.has(key(x, y)) || g[y][x] === '#') throw new Error(`spawn blocked at ${x},${y}`);

const ground = g.map((row) => row.join(''));
const outerGround = buildOuter(ground, W, H, noise, []);
const { decor, wires } = buildDecor(outerGround, W, H, { mission: false });
const out = { id: 'arena', name: 'Пыльная чаша', width: W, height: H, ground, objects, actors: [], triggers: [], spawns, outer: { margin: MARGIN, pad: PAD, ground: outerGround }, decor, wires };
mkdirSync('public/assets/maps', { recursive: true });
writeFileSync('public/assets/maps/arena.json', JSON.stringify(out, null, 1));
console.log(`arena: ${W}x${H}, ${objects.length} objects, ${decor.length} decor`);
console.log(ground.join('\n'));
