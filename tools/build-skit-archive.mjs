// Builds public/assets/maps/skit_archive.json: «Архив „Росы“» (stage S) — rows of stacks, brother Свиток at his desk,
// the back room behind a grille where the letters of the Сургуч lie, and a duct from the works below.
import { mapKit } from './map-kit.mjs';

const W = 36;
const H = 32;
const k = mapKit(W, H, 7603);
const { place, fill, set } = k;

fill(3, 3, 32, 28, 'F');
for (let x = 0; x < 4; x++) for (const y of [14, 15]) set(x, y, '=');
k.rim();

for (let y = 12; y <= 26; y += 4) for (let x = 8; x <= 28; x += 2) if (x !== 18) place({ id: `stack_${x}_${y}`, frame: 'stacks', x, y, label: 'Стеллаж' });
// the back room
for (let x = 14; x <= 32; x++) if (x !== 22) place({ id: `back_wall_${x}`, frame: 'wall_lo', x, y: 9, label: 'Решётчатая стена' });
place({ id: 'archive_grate', frame: 'bars_closed', x: 22, y: 9, label: 'Решётка дальней комнаты', dialogue: 'archive_grate' });
place({ id: 'letter_shelf', frame: 'stacks', x: 26, y: 5, label: 'Полка с письмами', dialogue: 'letter_shelf' });
place({ id: 'archive_duct', frame: 'hatch', x: 30, y: 6, block: false, label: 'Вентиляционный люк', dialogue: 'archive_duct' });
place({ id: 'svitok_desk', frame: 'table', x: 8, y: 7, w: 2, h: 1, label: 'Стол хранителя' });
k.scenery([[3, 3, 32, 28]], { cactus: 0, dead_tree: 0, bush: 0 });

k.exit({ id: 'west', x: 0, y: 14, w: 1, h: 2, to: 'skit_yard', entry: 'east', label: 'Двор' });

const actors = [
  { id: 'player', sheet: 'hero_0', x: 2, y: 14, dir: 2 },
  { id: 'svitok', sheet: 'svitok', x: 9, y: 9, dir: 1, label: 'Брат Свиток', dialogue: 'svitok' },
];

k.write('skit_archive', 'Архив «Росы»', {
  entries: { default: [2, 14], west: [2, 14], duct: [29, 6] },
  roads: { west: [14, 15] },
  actors,
  triggers: [],
});
