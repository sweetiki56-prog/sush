// Builds public/assets/maps/depot_shops.json: «Мастерские» of the Депо (stage U) — one long hall: the main pump
// that feeds Запруда, Дед Манометр at his bench, Лёля Реле under a dead motor, the Бригада's storekeeper.
import { mapKit } from './map-kit.mjs';

const W = 40;
const H = 32;
const k = mapKit(W, H, 7702);
const { place, fill, set } = k;

fill(3, 3, 36, 28, ':');
for (let y = 24; y < H; y++) for (const x of [19, 20]) set(x, y, '=');
k.rim();
k.building('hall', 4, 4, 35, 23, [[19, 23], [20, 23]], 'Стена мастерских', 'tin');

place({ id: 'main_pump', frame: 'main_pump', x: 17, y: 8, w: 2, h: 2, label: 'Главный насос', dialogue: 'main_pump' });
for (const [x, y] of [[8, 7], [12, 7], [28, 7]]) place({ id: `machine_${x}_${y}`, frame: 'machine', x, y, label: 'Станок' });
place({ id: 'workbench', frame: 'workbench', x: 8, y: 14, w: 2, h: 1, label: 'Верстак Бригады', dialogue: 'workbench', bench: 'workbench' });
for (const [x, y] of [[30, 12], [31, 17]]) place({ id: `crate_${x}_${y}`, frame: 'crate', x, y, label: 'Ящик с запчастями' });
place({ id: 'shops_pipes', frame: 'pipes', x: 23, y: 6, label: 'Трубы' });
k.scenery([[3, 3, 36, 28]], { cactus: 0, dead_tree: 1, bush: 3 });

k.exit({ id: 'south', x: 19, y: H - 1, w: 2, h: 1, to: 'depot_yard', entry: 'north', label: 'Двор депо' });

const actors = [
  { id: 'player', sheet: 'hero_0', x: 19, y: 29, dir: 1 },
  { id: 'manometr', sheet: 'manometr', x: 11, y: 15, dir: 3, label: 'Дед Манометр', dialogue: 'manometr' },
  { id: 'lelya', sheet: 'lelya', x: 22, y: 11, dir: 6, label: 'Лёля Реле', dialogue: 'lelya', if: [{ notFlag: 'with_lelya' }, { notFlag: 'lost_lelya' }] },
  { id: 'depot_trader', sheet: 'brigadier', x: 28, y: 15, dir: 5, label: 'Кладовщик Бригады', dialogue: 'depot_trader' },
];

k.write('depot_shops', 'Мастерские Депо', {
  entries: { default: [19, 29], south: [19, 29] },
  roads: { south: [19, 20] },
  actors,
  triggers: [],
});
