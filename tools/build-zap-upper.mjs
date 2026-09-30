// Builds public/assets/maps/zap_upper.json: «Верхний город и Башня» of Запруда — the Trust's Tower over the Council
// hall, the archive of the Tower, Ада Затвор's house with her greenhouse, patrols.
import { mapKit } from './map-kit.mjs';

const W = 40;
const H = 34;
const k = mapKit(W, H, 9103);
const { place, fill, set } = k;

fill(3, 3, 36, 30, 'F');
for (let y = 16; y < H; y++) for (const x of [20, 21]) set(x, y, '=');
k.rim();

place({ id: 'tower', frame: 'tower', x: 17, y: 3, w: 3, h: 3, label: 'Башня Треста' });
k.building('council', 12, 7, 24, 14, [[18, 14]], 'Стена зала Совета', 'tin');
for (const [x, y] of [[14, 9], [21, 9]]) place({ id: `council_table_${x}`, frame: 'table', x, y, label: 'Стол Совета' });
k.building('archive', 28, 8, 35, 14, [[28, 11]], 'Стена архива', 'tin');
place({ id: 'archive_door', frame: 'door_closed', x: 28, y: 11, label: 'Дверь архива', dialogue: 'archive_door' });
for (const x of [30, 32]) place({ id: `archive_shelf_${x}`, frame: 'shelf', x, y: 9, label: 'Полки архива' });
place({ id: 'archive_case', frame: 'locker', x: 34, y: 10, label: 'Шкаф с мандатами', dialogue: 'archive_case' });
k.building('ada_house', 4, 18, 11, 25, [[11, 21]], 'Стена дома Ады', 'tin');
place({ id: 'ada_herbs', frame: 'cactus_bed', x: 5, y: 19, w: 2, h: 1, label: 'Оранжерея Ады', dialogue: 'ada_herbs' });
place({ id: 'ada_shelf', frame: 'shelf', x: 9, y: 19, label: 'Полка со склянками' });
for (const [x, y] of [[37, 4], [2, 29]]) place({ id: `wtower_${x}_${y}`, frame: 'water_tower', x, y, label: 'Водонапорная башня' });
k.scenery([[3, 3, 36, 30]], { cactus: 0, dead_tree: 0, bush: 0 });

k.exit({ id: 'south', x: 20, y: H - 1, w: 2, h: 1, to: 'zap_market', entry: 'north', label: 'Капельный рынок' });

const WANTED = [{ notFlag: 'zap_wanted' }];
const actors = [
  { id: 'player', sheet: 'hero_0', x: 20, y: 31, dir: 1 },
  { id: 'zatvor', sheet: 'zatvor', x: 18, y: 10, dir: 3, label: 'Председатель Затвор', dialogue: 'zatvor' },
  { id: 'steward', sheet: 'kulik', x: 15, y: 12, dir: 3, label: 'Распорядитель Совета', dialogue: 'steward' },
  { id: 'kulik', sheet: 'kulik', x: 26, y: 11, dir: 1, label: 'Писарь архива Кулик', dialogue: 'kulik' },
  { id: 'ada', sheet: 'ada', x: 8, y: 22, dir: 1, label: 'Ада Затвор', dialogue: 'ada', if: [{ notFlag: 'ada_jailed' }] },
  ...[['upper_guard_a', 24, 20, [[24, 20], [33, 20], [33, 26]]], ['upper_guard_b', 14, 24, [[14, 24], [14, 17]]]].map(([id, x, y, patrol]) => ({ id, sheet: 'zap_guard', x, y, dir: 2, label: 'Стражник Башни', dialogue: 'zap_guard', creature: 'zap_guard', group: id, peace: WANTED, patrol })),
];

k.write('zap_upper', 'Верхний город', {
  entries: { default: [20, 31], south: [20, 31] },
  roads: { south: [20, 21] },
  actors,
  triggers: [{ id: 'upper_view', x: 18, y: 29, w: 6, h: 4, effects: [], log: 'Верхний город: бетон подметён, у дверей — стража. Над залом Совета — Башня Треста с баком воды на крыше.' }],
});
