// Builds public/assets/maps/depot_yard.json: «Депо „Узловое“: двор» (stage U) — the yard of the old junction at
// the mouth of the water-main tunnels: stalled freight cars on two tracks, the brigadier Сверло, the archive behind
// a locked door to the east, the workshops to the north, the grate down into the tunnels.
import { mapKit } from './map-kit.mjs';

const W = 40;
const H = 36;
const k = mapKit(W, H, 7701);
const { place, fill, set } = k;

fill(3, 3, 36, 32, ':');
for (const y of [11, 21]) for (let x = 3; x <= 36; x++) set(x, y, '=');
for (let y = 0; y < H; y++) for (const x of [19, 20]) set(x, y, '=');
for (let x = 34; x < W; x++) for (const y of [14, 15]) set(x, y, '=');
k.rim();

for (const [x, y] of [[5, 10], [9, 10], [24, 10], [29, 10], [6, 20], [25, 20], [30, 20]]) place({ id: `car_${x}_${y}`, frame: 'railcar', x, y, w: 2, h: 1, label: 'Замерший вагон' });
for (let y = 4; y <= 31; y++) if (y !== 14) place({ id: `fence_${y}`, frame: y % 3 ? 'wall_lo' : 'wall_hi', x: 34, y, label: 'Ограда архива' });
place({ id: 'archive_door', frame: 'door_closed', x: 34, y: 14, label: 'Дверь архива Бригады', dialogue: 'archive_door' });
place({ id: 'tunnel_gate', frame: 'bars_closed', x: 30, y: 28, label: 'Решётка туннелей', dialogue: 'tunnel_gate' });
for (const [x, y] of [[12, 26], [14, 27]]) place({ id: `pipe_${x}_${y}`, frame: 'big_pipe', x, y, w: 2, h: 1, label: 'Труба водовода' });
for (const [x, y] of [[8, 16], [26, 26], [16, 5]]) place({ id: `barrel_${x}_${y}`, frame: 'barrel', x, y, label: 'Бочка солярки' });
place({ id: 'draisine_depot', frame: 'draisine', x: 15, y: 21, label: 'Дрезина', dialogue: 'draisine' });
place({ id: 'depot_sign', frame: 'sign', x: 22, y: 31, label: 'Табличка «Узловое»', dialogue: 'depot_sign' });
k.scenery([[3, 3, 36, 32]], { cactus: 2, dead_tree: 2, bush: 4 });

k.exit({ id: 'south', x: 19, y: H - 1, w: 2, h: 1, to: 'world', label: 'Карта мира' });
k.exit({ id: 'north', x: 19, y: 0, w: 2, h: 1, to: 'depot_shops', entry: 'south', label: 'Мастерские' });
k.exit({ id: 'east', x: W - 1, y: 14, w: 1, h: 2, to: 'depot_archive', entry: 'west', label: 'Архив Бригады', if: [{ flag: 'open_archive_door' }], closed: 'Архив Бригады заперт: Сверло пускает только своих.' });

const actors = [
  { id: 'player', sheet: 'hero_0', x: 19, y: 33, dir: 1 },
  { id: 'sverlo', sheet: 'sverlo', x: 17, y: 17, dir: 3, label: 'Бригадир Сверло', dialogue: 'sverlo' },
  { id: 'kran', sheet: 'fedot', x: 27, y: 24, dir: 5, label: 'Кран', dialogue: 'kran', if: [{ notFlag: 'fedot_gone' }] },
  { id: 'town_cat', sheet: 'cat_town', x: 13, y: 24, dir: 1, label: 'Деповская кошка', dialogue: 'street_cat' },
  { id: 'town_dog', sheet: 'dog_town', x: 22, y: 26, dir: 5, label: 'Пёс Бригады', dialogue: 'street_dog' },
  ...[['brigadier_a', 12, 14, [[12, 14], [12, 18]]], ['brigadier_b', 23, 15]].map(([id, x, y, patrol]) => ({ id, sheet: 'brigadier', x, y, dir: 2, label: 'Бригадник', dialogue: 'brigadier', ...(patrol ? { patrol } : {}) })),
];

k.write('depot_yard', 'Депо «Узловое»', {
  entries: { default: [19, 33], south: [19, 33], north: [19, 2], east: [33, 14], tunnel: [30, 27], rail: [15, 23] },
  roads: { south: [19, 20], north: [19, 20], east: [14, 15] },
  actors,
  arrive: [{ if: [{ notFlag: 'upper_started' }], effects: [{ type: 'flag', key: 'upper_started' }, { type: 'quest', quest: 'upper', stage: 'north' }] }],
  triggers: [{ id: 'depot_view', x: 16, y: 29, w: 8, h: 5, effects: [], log: 'Депо «Узловое»: ржавые вагоны на двух путях, гул насосов под землёй. Из туннелей тянет сыростью — впервые за всю дорогу.' }],
});
