// Builds public/assets/maps/pillars_ruins.json: «Южные развалины» of Три столба, the pre-war substation south of the
// crossroads (docs/story/locations.md): the locked transformer house with copper coils (under a roof), the children's
// hideout among broken walls («Медная жила»), a jackal den, scrap.
import { mapKit } from './map-kit.mjs';

const W = 34;
const H = 28;
const k = mapKit(W, H, 3317);
const { place, fill, set } = k;

fill(4, 4, 30, 24, ':');
for (let y = 0; y <= 7; y++) for (const x of [16, 17]) set(x, y, '='); // the old service road from the crossroads
k.rim();
k.exit({ id: 'north', x: 16, y: 0, w: 2, h: 1, to: 'three_pillars', entry: 'ruins', label: 'Перекрёсток' });

// the transformer house: locked, copper inside
k.building('vault', 20, 8, 26, 13, [[23, 13]], 'Стена трансформаторной', 'tin');
place({ id: 'vault_door', frame: 'door_closed', x: 23, y: 13, label: 'Дверь трансформаторной', dialogue: 'vault_door' });
place({ id: 'transformer', frame: 'transformer', x: 21, y: 9, w: 2, h: 2, label: 'Трансформатор' });
for (const [x, y, i] of [[24, 9, 1], [25, 11, 2], [21, 11, 3]]) place({ id: `coil_${i}`, frame: 'coil', x, y, label: 'Катушка медной проволоки', dialogue: 'coil' });

// the children's hideout among broken walls
for (const [x, y] of [[5, 15], [6, 15], [7, 15], [11, 15], [5, 16], [5, 19], [11, 17], [11, 19], [6, 20], [10, 20]]) place({ id: `ruin_${x}_${y}`, frame: 'wall_broken', x, y, label: 'Развалины подстанции' });
place({ id: 'kids_stash', frame: 'bag', x: 7, y: 18, block: false, label: 'Моток медной проволоки', dialogue: 'kids_stash' });

// the jackal den and scrap
place({ id: 'den', frame: 'burrow', x: 27, y: 21, label: 'Нора шакалов' });
for (const [x, y] of [[13, 9], [9, 24], [28, 5]]) place({ id: `scrap_${x}_${y}`, frame: 'scrap_pile', x, y, label: 'Куча хлама', dialogue: 'scrap' });
place({ id: 'pylon_stub', frame: 'pylon', x: 12, y: 5, label: 'Опора подстанции, без проводов' });
for (const [x, y] of [[3, 10], [29, 16]]) place({ id: `ruinbig_${x}_${y}`, frame: 'ruin', x, y, w: 2, h: 2, label: 'Развалины' });
place({ id: 'tires_r', frame: 'tires', x: 18, y: 19, label: 'Покрышки' });
k.scenery([[4, 4, 30, 24]], { cactus: 6, dead_tree: 2, bush: 6 });

const actors = [
  { id: 'player', sheet: 'hero_0', x: 16, y: 2, dir: 3 },
  ...[['shnyr', 'shnyr', 8, 17, 'Шнырь'], ['galka', 'galka', 9, 18, 'Галка']].map(([id, sheet, x, y, label]) => ({ id, sheet, x, y, dir: 1, label, dialogue: 'kids', if: [{ notFlag: 'copper_kids_gone' }] })),
  ...[[25, 20], [28, 23]].map(([x, y], i) => ({ id: `den_jackal_${i}`, sheet: 'jackal', creature: 'jackal', group: 'den', x, y, dir: 6 })),
];

k.write('pillars_ruins', 'Южные развалины', {
  entries: { default: [16, 2], north: [16, 2] },
  roads: { north: [16, 17] },
  actors,
  triggers: [],
});
