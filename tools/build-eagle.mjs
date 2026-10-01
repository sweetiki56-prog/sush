// Builds public/assets/maps/eagle_nest.json: «Орлиное гнездо» (stage U, hidden) — a post of the Высокий берег on a
// cliff over the pass: a searchlight, a radio mast, drones on their pads, captain Ярина Ветрова.
import { mapKit } from './map-kit.mjs';

const W = 32;
const H = 28;
const k = mapKit(W, H, 7709);
const { place, fill, set } = k;

fill(4, 4, 27, 23, ':');
for (let y = 20; y < H; y++) set(15, y, '=');
k.rim();
k.building('post', 6, 5, 14, 11, [[10, 11]], 'Стена поста', 'tin');

place({ id: 'nest_light', frame: 'searchlight', x: 22, y: 8, label: 'Прожектор' });
place({ id: 'nest_mast', frame: 'mast', x: 9, y: 7, label: 'Мачта связи' });
place({ id: 'nest_radio', frame: 'radio', x: 12, y: 7, label: 'Рация', dialogue: 'nest_radio' });
for (const [x, y] of [[20, 15], [24, 15]]) place({ id: `pad_${x}_${y}`, frame: 'crate', x, y, label: 'Площадка дрона' });
k.scenery([[4, 4, 27, 23]], { cactus: 0, dead_tree: 1, bush: 2 });

k.exit({ id: 'south', x: 15, y: H - 1, w: 1, h: 1, to: 'world', label: 'Карта мира' });

const actors = [
  { id: 'player', sheet: 'hero_0', x: 15, y: 24, dir: 1 },
  { id: 'yarina', sheet: 'yarina', x: 17, y: 12, dir: 3, label: 'Капитан Ветрова', dialogue: 'yarina' },
  ...[['shore_a', 21, 10], ['shore_b', 12, 17]].map(([id, x, y]) => ({ id, sheet: 'shore_soldier', x, y, dir: 2, label: 'Солдат Высокого берега', dialogue: 'shore_soldier' })),
  { id: 'ratmir', sheet: 'ratmir', x: 19, y: 18, dir: 4, label: 'Ратмир', dialogue: 'ratmir', if: [{ flag: 'defector', eq: 'returned' }] },
];

k.write('eagle_nest', 'Орлиное гнездо', {
  entries: { default: [15, 24], south: [15, 24] },
  roads: { south: [15] },
  actors,
  arrive: [{ if: [{ notFlag: 'eagle_seen' }], effects: [{ type: 'flag', key: 'eagle_seen' }], log: 'Скальная площадка над перевалом: прожектор, мачта, люди в стальной синеве. Высокий берег смотрит на Сушь сверху.' }],
  triggers: [],
});
