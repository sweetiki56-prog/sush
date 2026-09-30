// Builds public/assets/maps/sea_lair.json: «Логово змея» under the Кладбище судов (stage K, secret) — a funnel sunk
// in the salt, crystal growths and bones, the wagons «Бархан» lost to it, and the salt snake that dives through the
// crust and comes up under your feet.
import { mapKit } from './map-kit.mjs';

const W = 30;
const H = 30;
const k = mapKit(W, H, 7406);
const { place, fill, set } = k;

fill(2, 2, 27, 27, '_');
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const d = Math.hypot(x - 16, y - 15);
    if (d < 6) set(x, y, ':');
    if (d < 3) set(x, y, '.');
  }
for (let x = 0; x < 6; x++) for (const y of [14, 15]) set(x, y, '=');
k.rim();

for (let a = 0; a < 12; a++) {
  const x = Math.round(16 + Math.cos(a * 0.52) * 9);
  const y = Math.round(15 + Math.sin(a * 0.52) * 9);
  if (x > 3 && y > 2 && x < W - 3 && y < H - 3 && !(y >= 13 && y <= 16 && x < 10)) place({ id: `growth_${a}`, frame: 'crystal', x, y, label: 'Соляная друза' });
}
for (const [x, y] of [[12, 19], [19, 11], [21, 19], [11, 11]]) place({ id: `bones_${x}_${y}`, frame: 'skeleton', x, y, block: false, label: 'Кости' });
for (const [x, y] of [[20, 22], [9, 6]]) place({ id: `lost_wagon_${x}_${y}`, frame: 'wagon', x, y, w: 2, h: 1, label: 'Повозка «Бархана»' });
k.scenery([[2, 2, 27, 27]], { cactus: 0, dead_tree: 0, bush: 0 });

k.exit({ id: 'rim', x: 0, y: 14, w: 1, h: 2, to: 'sea_wrecks', entry: 'funnel', label: 'Кладбище судов' });

const actors = [
  { id: 'player', sheet: 'hero_0', x: 2, y: 14, dir: 2 },
  { id: 'snake', sheet: 'salt_snake', x: 17, y: 15, dir: 6, label: 'Соляной змей', creature: 'salt_snake', group: 'snake', if: [{ notFlag: 'snake_dead' }] },
];

k.write('sea_lair', 'Логово змея', {
  entries: { default: [2, 14], rim: [2, 14] },
  roads: { west: [14, 15] },
  actors,
  triggers: [{ id: 'lair_view', x: 1, y: 12, w: 4, h: 6, effects: [], log: 'Воронка уходит вниз белыми уступами. На дне лежат повозки «Бархана». Соль под ногами дрожит, будто под ней кто-то дышит.' }],
  cleared: [{ group: 'snake', if: [{ notFlag: 'snake_dead' }], effects: [{ type: 'flag', key: 'snake_dead' }, { type: 'xp', amount: 300 }], log: 'Змей выгибается дугой и затихает, наполовину в соли. Чешуя у него — как старая броня, и снимается пластами.' }],
});
