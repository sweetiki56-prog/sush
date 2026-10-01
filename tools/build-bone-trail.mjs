// Builds public/assets/maps/bone_trail.json: «Тропа испытаний» (stage B) — the canyon above the camp where the «сухая
// неделя» is kept by one flask at a stone; condors circle; a crawl in the rock leads into the cave of the oath.
import { mapKit } from './map-kit.mjs';
import { HOSTAGE_HOOKS } from './hostage-hooks.mjs';

const W = 40;
const H = 36;
const k = mapKit(W, H, 7802);
const { place, fill, set } = k;

fill(3, 3, 36, 32, '#');
const path = [[19, 35], [19, 26], [10, 26], [10, 16], [28, 16], [28, 7], [34, 7]];
for (let i = 1; i < path.length; i++) {
  const [ax, ay] = path[i - 1];
  const [bx, by] = path[i];
  for (let x = Math.min(ax, bx) - 2; x <= Math.max(ax, bx) + 2; x++) for (let y = Math.min(ay, by) - 2; y <= Math.max(ay, by) + 2; y++) set(x, y, ':');
}
fill(15, 12, 24, 20, ':'); // the stone's hollow
for (let y = 29; y < H; y++) set(19, y, '=');
k.rim();

place({ id: 'week_stone', frame: 'rock_2', x: 19, y: 15, label: 'Камень испытаний', dialogue: 'week_stone' });
place({ id: 'trial_fire', frame: 'campfire', x: 22, y: 18, label: 'Холодное кострище' });
place({ id: 'cave_crawl', frame: 'hatch', x: 35, y: 7, block: false, label: 'Лаз в скале', dialogue: 'cave_crawl' });
k.scenery([[3, 3, 36, 32]], { cactus: 0, dead_tree: 0, bush: 0 });

k.exit({ id: 'south', x: 19, y: H - 1, w: 1, h: 1, to: 'bone_camp', entry: 'north', label: 'Лагерь' });

const actors = [
  { id: 'player', sheet: 'hero_0', x: 19, y: 33, dir: 1 },
  ...[['condor_t1', 11, 22], ['condor_t2', 26, 9]].map(([id, x, y]) => ({ id, sheet: 'condor', x, y, dir: 4, label: 'Лысый кондор', creature: 'condor', group: 'condors_t' })),
];

k.write('bone_trail', 'Тропа испытаний', {
  entries: { default: [19, 33], south: [19, 33], crawl: [34, 8] },
  roads: { south: [19] },
  actors,
  arrive: [...HOSTAGE_HOOKS],
  triggers: [],
});
