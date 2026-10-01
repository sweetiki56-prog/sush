// Builds public/assets/maps/oath_cave.json: «Пещера клятвы» (stage B) — the dam guard's oath painted on the rock and
// the niche where Мать Трещина keeps the half of the key when she sleeps.
import { mapKit } from './map-kit.mjs';

const W = 32;
const H = 28;
const k = mapKit(W, H, 7803);
const { place, fill } = k;

fill(1, 1, W - 2, H - 2, '#');
fill(4, 4, 27, 23, 'F');
k.rim();

place({ id: 'key_niche', frame: 'niche', x: 15, y: 5, label: 'Ниша клятвы', dialogue: 'key_niche' });
for (const [x, y] of [[8, 5], [22, 5], [5, 12]]) place({ id: `mural_${x}_${y}`, frame: 'oath_mural', x, y, label: 'Роспись охраны плотины', dialogue: 'oath_mural' });
for (const [x, y] of [[10, 14], [21, 14]]) place({ id: `post_${x}_${y}`, frame: 'bone_ring', x, y, label: 'Кости' });
place({ id: 'cave_crawl_back', frame: 'hatch', x: 26, y: 22, block: false, label: 'Лаз наружу', dialogue: 'cave_crawl_back' });
k.scenery([[4, 4, 27, 23]], { cactus: 0, dead_tree: 0, bush: 0 });

const actors = [{ id: 'player', sheet: 'hero_0', x: 25, y: 21, dir: 7 }];

k.write('oath_cave', 'Пещера клятвы', {
  entries: { default: [25, 21], crawl: [25, 21] },
  actors,
  triggers: [],
});
