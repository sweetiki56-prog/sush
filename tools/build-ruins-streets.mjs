// Builds public/assets/maps/ruins_streets.json: «Руины Светлоречья: улицы» (stage B) — an avenue of broken ministry
// colonnades, the city hall with the land registry, marauders and feral machines, the draisine's stop, a hatch down
// to the cellars where the Сургуч keeps its hostage.
import { mapKit } from './map-kit.mjs';
import { HOSTAGE_HOOKS } from './hostage-hooks.mjs';

const W = 44;
const H = 40;
const k = mapKit(W, H, 7804);
const { place, fill, set } = k;

fill(3, 3, 40, 36, '.');
for (let y = 0; y < H; y++) for (const x of [21, 22]) set(x, y, '=');
for (let x = 3; x < W; x++) for (const y of [19, 20]) set(x, y, '=');
k.rim();
k.building('city_hall', 6, 5, 16, 13, [[11, 13]], 'Стена мэрии', 'tin');

for (const [x, y] of [[25, 6], [31, 6], [25, 12], [31, 12], [6, 24], [12, 24], [27, 25], [33, 25], [6, 31], [27, 31]]) place({ id: `col_${x}_${y}`, frame: 'colonnade', x, y, w: 2, h: 1, label: 'Колоннада министерства' });
place({ id: 'land_registry', frame: 'stacks', x: 9, y: 7, label: 'Земельные книги', dialogue: 'land_registry' });
place({ id: 'hall_table', frame: 'table', x: 13, y: 9, label: 'Стол регистратора' });
place({ id: 'draisine_ruins', frame: 'draisine', x: 36, y: 21, label: 'Дрезина', dialogue: 'draisine_station' });
place({ id: 'cellar_hatch', frame: 'hatch', x: 17, y: 28, block: false, label: 'Спуск в подвалы', dialogue: 'cellar_hatch' });
place({ id: 'chamber_door', frame: 'door_closed', x: 8, y: 12, label: 'Дверь Палаты мер и печатей', dialogue: 'chamber_door' });
for (const [x, y] of [[35, 33], [15, 34], [38, 9]]) place({ id: `car_${x}_${y}`, frame: 'car_x_burnt', x, y, label: 'Сгоревшая машина' });
k.scenery([[3, 3, 40, 36]], { cactus: 2, dead_tree: 4, bush: 6 });

k.exit({ id: 'south', x: 21, y: H - 1, w: 2, h: 1, to: 'world', label: 'Карта мира' });
k.exit({ id: 'north', x: 21, y: 0, w: 2, h: 1, to: 'ruins_museum', entry: 'south', label: 'Музей Водоуправления' });
k.exit({ id: 'east', x: W - 1, y: 19, w: 1, h: 2, to: 'ruins_library', entry: 'west', label: 'Библиотека' });

const actors = [
  { id: 'player', sheet: 'hero_0', x: 21, y: 37, dir: 1 },
  ...[['marauder_a', 30, 16, [[30, 16], [36, 16]]], ['marauder_b', 34, 28, [[34, 28], [28, 34]]], ['marauder_c', 9, 28]].map(([id, x, y, patrol]) => ({ id, sheet: 'marauder', x, y, dir: 2, label: 'Мародёр', creature: 'marauder', group: 'marauders', ...(patrol ? { patrol } : {}) })),
  ...[['wild_a', 12, 17, [[6, 17], [16, 17]]], ['wild_b', 36, 10]].map(([id, x, y, patrol]) => ({ id, sheet: 'wild_machine', x, y, dir: 2, label: 'Дикая машина', creature: 'wild_machine', group: 'wild', ...(patrol ? { patrol } : {}) })),
];

k.write('ruins_streets', 'Руины Светлоречья', {
  entries: { default: [21, 37], south: [21, 37], north: [21, 2], east: [41, 19], rail: [36, 23], cellar: [17, 29], chamber: [9, 13] },
  roads: { south: [21, 22], north: [21, 22], east: [19, 20] },
  actors,
  arrive: [{ if: [{ notFlag: 'ruins_seen' }], effects: [{ type: 'flag', key: 'ruins_seen' }], log: 'Светлоречье: проспект колоннад, министерства без крыш. Двести лет назад здесь решали, кому течь воде.' }, ...HOSTAGE_HOOKS],
  triggers: [],
});
