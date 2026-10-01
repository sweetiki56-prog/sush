// Builds public/assets/maps/skit_cells.json: «Кельи и зал» of the Скит (stage S) — the hall where Кассиан receives,
// brother Стужа by the banner, the novices' cells, one of them Иван's.
import { mapKit } from './map-kit.mjs';

const W = 36;
const H = 32;
const k = mapKit(W, H, 7602);
const { place, fill, set } = k;

fill(3, 3, 32, 28, 'F');
for (let y = 28; y < H; y++) for (const x of [17, 18]) set(x, y, '=');
k.rim();

k.building('ivan_cell', 4, 17, 11, 24, [[11, 20]], 'Стена кельи', 'tin');
place({ id: 'ivan_bunk', frame: 'bunk', x: 5, y: 19, label: 'Нары послушника', dialogue: 'ivan_bunk' });
for (const [x, y] of [[24, 18], [24, 21], [28, 18], [28, 21]]) place({ id: `cot_${x}_${y}`, frame: 'bunk', x, y, label: 'Нары' });
place({ id: 'banner_sail', frame: 'dew_sail', x: 23, y: 6, label: 'Знамя-парус' });
place({ id: 'hall_table', frame: 'table', x: 14, y: 6, w: 2, h: 1, label: 'Стол настоятеля' });
place({ id: 'trial_terminal', frame: 'terminal', x: 8, y: 7, label: 'Пульт испытаний' });
k.scenery([[3, 3, 32, 28]], { cactus: 0, dead_tree: 0, bush: 0 });

k.exit({ id: 'south', x: 17, y: H - 1, w: 2, h: 1, to: 'skit_yard', entry: 'north', label: 'Двор' });

const actors = [
  { id: 'player', sheet: 'hero_0', x: 17, y: 29, dir: 1 },
  { id: 'kassian', sheet: 'kassian', x: 15, y: 8, dir: 1, label: 'Настоятель Кассиан', dialogue: 'kassian' },
  { id: 'stuzha', sheet: 'stuzha', x: 22, y: 9, dir: 3, label: 'Брат Стужа', dialogue: 'stuzha', creature: 'stuzha', group: 'stuzha', peace: [{ notFlag: 'stuzha_fight' }], if: [{ notFlag: 'stuzha_way' }] },
  { id: 'ivan', sheet: 'ivan', x: 8, y: 21, dir: 2, label: 'Послушник Иван', dialogue: 'ivan', if: [{ notFlag: 'unaccounted' }] },
  ...[['novice_c', 26, 20], ['novice_d', 20, 14]].map(([id, x, y]) => ({ id, sheet: 'novice', x, y, dir: 2, label: 'Послушник', dialogue: 'novice' })),
];

k.write('skit_cells', 'Кельи и зал', {
  entries: { default: [17, 29], south: [17, 29] },
  roads: { south: [17, 18] },
  actors,
  triggers: [],
  cleared: [{ group: 'stuzha', if: [{ flag: 'stuzha_fight' }, { notFlag: 'stuzha_way' }], effects: [{ type: 'flag', key: 'stuzha_way', value: 'duel' }, { type: 'quest', quest: 'skit', stage: 'choice' }, { type: 'xp', amount: 150 }], log: 'Стужа опускается на колено и отбрасывает разрядник. — Мандат твой, — хрипит он. — Пока.' }],
});
