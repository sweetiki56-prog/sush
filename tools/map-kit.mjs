// Shared scaffolding for town map builders: a terrain grid, placing objects without overlaps, a rocky rim
// broken where roads leave, scattered scenery, actor checks and writing the map JSON with its wasteland ring.
import { writeFileSync, mkdirSync } from 'node:fs';
import { rng, makeNoise } from './art/draw.mjs';
import { buildOuter, buildDecor, MARGIN, PAD } from './map-outer.mjs';

/**
 * Terrain chars: . sand   , scrub   : cracked dirt   = asphalt   F floor   # rock (blocked).
 * `seed` drives the noise and every random choice.
 */
export function mapKit(W, H, seed) {
  const r = rng(seed);
  const noise = makeNoise(seed + 7);
  const g = Array.from({ length: H }, () => Array(W).fill('.'));
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const n = noise(x * 0.18, y * 0.18);
      if (n > 0.66) g[y][x] = ',';
      else if (n < 0.3) g[y][x] = ':';
    }
  const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const set = (x, y, c) => inside(x, y) && (g[y][x] = c);
  const fill = (x0, y0, x1, y1, c) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c);
  };
  const objects = [];
  const exits = [];
  const roofs = [];
  const occupied = new Set();
  const key = (x, y) => `${x},${y}`;

  function place(o) {
    const w = o.w ?? 1;
    const h = o.h ?? 1;
    for (let yy = o.y; yy < o.y + h; yy++)
      for (let xx = o.x; xx < o.x + w; xx++) {
        if (occupied.has(key(xx, yy))) throw new Error(`overlap at ${xx},${yy} for ${o.id}`);
        occupied.add(key(xx, yy));
      }
    objects.push({ w, h, block: true, ...o });
  }

  const free = (x, y, w = 1, h = 1) => {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) {
        if (xx < 1 || yy < 1 || xx >= W - 1 || yy >= H - 1) return false;
        if (occupied.has(key(xx, yy))) return false;
        if ('=F#'.includes(g[yy][xx])) return false;
      }
    return true;
  };

  /** Rocky rim around the map; road tiles stay open so the ways out are clear. */
  function rim() {
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const edge = Math.min(x, y, W - 1 - x, H - 1 - y);
        const depth = 1 + Math.floor(noise(x * 0.3 + 50, y * 0.3 + 50) * 3.2);
        if (edge < depth && g[y][x] !== '=') g[y][x] = '#';
      }
  }

  /** A walled building on a floor: tall walls at the back (north, west), low ones in front, gaps for doors. */
  /** A way out: `to` is 'world' or the id of the next area's map (see MapExit in src/world/MapData.ts). */
  function exit(o) {
    exits.push(o);
  }

  /** A walled building on a floor; `roof` puts a roof over it that melts when someone walks in; `wall` is the
   * material's frame prefix (`wall` concrete, `salt` cut salt blocks). */
  function building(id, x0, y0, x1, y1, doors, label = 'Стена', roof = null, wall = 'wall') {
    if (roof) roofs.push({ id, x0, y0, x1, y1, style: roof });
    fill(x0, y0, x1, y1, 'F');
    const gap = new Set(doors.map(([x, y]) => key(x, y)));
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++) {
        const edge = x === x0 || x === x1 || y === y0 || y === y1;
        if (!edge || gap.has(key(x, y))) continue;
        const back = y === y0 || x === x0;
        place({ id: `${id}_wall_${x}_${y}`, frame: back ? `${wall}_hi` : r() < 0.2 ? `${wall}_broken` : `${wall}_lo`, x, y, label });
      }
  }

  /** Rocks on the rim, then cacti, dead trees and scrub away from the `keep` rectangles. */
  function scenery(keep, counts = { cactus: 10, dead_tree: 4, bush: 10 }) {
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (g[y][x] !== '#' || occupied.has(key(x, y))) continue;
        const inner = Math.min(x, y, W - 1 - x, H - 1 - y) > 0;
        if (!inner || r() < 0.75) {
          occupied.add(key(x, y));
          objects.push({ id: `rock_${x}_${y}`, frame: `rock_${Math.floor(r() * 4)}`, x, y, w: 1, h: 1, block: true, label: 'Скалы', jx: Math.round((r() - 0.5) * 18), jy: Math.round((r() - 0.5) * 8) });
        }
      }
    const kept = (x, y) => keep.some(([x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1);
    const labels = { cactus: 'Кактус', dead_tree: 'Мёртвое дерево', bush: 'Сухой куст' };
    for (const [frame, n0] of Object.entries(counts)) {
      let n = n0;
      for (let tries = 0; n > 0 && tries < 3000; tries++) {
        const x = 2 + Math.floor(r() * (W - 4));
        const y = 2 + Math.floor(r() * (H - 4));
        if (kept(x, y) || !free(x, y) || !free(x - 1, y - 1, 3, 3)) continue;
        place({ id: `${frame}_${x}_${y}`, frame, x, y, label: labels[frame], block: frame !== 'bush' });
        n--;
      }
    }
  }

  /** Carve a way through after the scenery is set (keeps the old random layout): objects gone, ground `c`. */
  function clear(x0, y0, x1, y1, c) {
    for (let i = objects.length - 1; i >= 0; i--) {
      const o = objects[i];
      if (o.x + o.w - 1 < x0 || o.x > x1 || o.y + o.h - 1 < y0 || o.y > y1) continue;
      for (let yy = o.y; yy < o.y + o.h; yy++) for (let xx = o.x; xx < o.x + o.w; xx++) occupied.delete(key(xx, yy));
      objects.splice(i, 1);
    }
    fill(x0, y0, x1, y1, c);
  }

  /** Every actor stands (and walks) on open ground. */
  function checkActors(actors) {
    const solid = new Set();
    for (const o of objects) if (o.block !== false) for (let yy = o.y; yy < o.y + o.h; yy++) for (let xx = o.x; xx < o.x + o.w; xx++) solid.add(key(xx, yy));
    for (const a of actors)
      for (const [x, y] of [[a.x, a.y], ...(a.patrol ?? []), ...(a.from ? [a.from] : [])]) {
        if (solid.has(key(x, y))) throw new Error(`actor ${a.id} stands on an object at ${x},${y}`);
        if (g[y][x] === '#') throw new Error(`actor ${a.id} stands on rock at ${x},${y}`);
      }
  }

  function write(id, name, rest) {
    checkActors(rest.actors ?? []);
    const ground = g.map((row) => row.join(''));
    const o = rest.roads ?? {};
    delete rest.roads;
    const outerGround = buildOuter(ground, W, H, noise, o.west ?? [], o);
    const { decor, wires } = buildDecor(outerGround, W, H);
    const out = { id, name, width: W, height: H, ground, objects, triggers: [], exits, roofs, ...rest, outer: { margin: MARGIN, pad: PAD, ground: outerGround }, decor, wires };
    mkdirSync('public/assets/maps', { recursive: true });
    writeFileSync(`public/assets/maps/${id}.json`, JSON.stringify(out, null, 1));
    console.log(`${id}: ${W}x${H}, ${objects.length} objects, ${(rest.actors ?? []).length} actors`);
    console.log(ground.join('\n'));
  }

  return { W, H, r, noise, g, set, fill, place, free, rim, building, exit, scenery, clear, write, occupied, key };
}
