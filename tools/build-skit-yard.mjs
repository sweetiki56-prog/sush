// Builds public/assets/maps/skit_yard.json: «Двор Скита» (stage S) — a concrete yard behind a wall with a barred
// gate and its knight, the dew catchers' white sails along the north wall, knights and novices, the hatch down to
// the old «Роса-1» works. The trial by strength is a bout outside the gate.
import { mapKit } from './map-kit.mjs';

const W = 40;
const H = 36;
const k = mapKit(W, H, 7601);
const { place, fill, set } = k;

fill(3, 3, 36, 32, '.');
fill(4, 3, 35, 27, 'F');
for (let y = 28; y < H; y++) for (const x of [19, 20]) set(x, y, '=');
for (let y = 0; y < 4; y++) for (const x of [19, 20]) set(x, y, '=');
for (let x = 36; x < W; x++) for (const y of [14, 15]) set(x, y, '=');
k.rim();

for (let x = 3; x <= 36; x++) {
  if (x === 19 || x === 20) continue;
  place({ id: `wall_s_${x}`, frame: 'wall_hi', x, y: 28, label: 'Стена Скита' });
}
place({ id: 'skit_gate_a', frame: 'bars_closed', x: 19, y: 28, label: 'Ворота Скита', dialogue: 'skit_gate_bars' });
place({ id: 'skit_gate_b', frame: 'bars_closed', x: 20, y: 28, label: 'Ворота Скита', dialogue: 'skit_gate_bars' });
for (let x = 6; x <= 34; x += 4) if (x !== 18 && x !== 22) place({ id: `sail_${x}`, frame: 'dew_sail', x, y: 5, label: 'Росоуловитель' });
place({ id: 'skit_hatch', frame: 'hatch', x: 30, y: 20, block: false, label: 'Спуск в «Росу-1»', dialogue: 'skit_hatch' });
for (const [x, y] of [[9, 14], [27, 12]]) place({ id: `jar_${x}_${y}`, frame: 'barrel', x, y, label: 'Бочка с росой' });
k.scenery([[3, 3, 36, 32]], { cactus: 1, dead_tree: 1, bush: 1 });

k.exit({ id: 'south', x: 19, y: H - 1, w: 2, h: 1, to: 'world', label: 'Карта мира' });
k.exit({ id: 'north', x: 19, y: 0, w: 2, h: 1, to: 'skit_cells', entry: 'south', label: 'Кельи и зал' });
k.exit({ id: 'east', x: W - 1, y: 14, w: 1, h: 2, to: 'skit_archive', entry: 'west', label: 'Архив «Росы»' });

const ORDER = [{ notFlag: 'order_enemy' }];
const actors = [
  { id: 'player', sheet: 'hero_0', x: 19, y: 33, dir: 1 },
  { id: 'gate_knight', sheet: 'dew_knight', x: 17, y: 30, dir: 3, label: 'Привратник Скита', dialogue: 'skit_gate' },
  { id: 'town_cat', sheet: 'cat_town', x: 11, y: 26, dir: 3, label: 'Кошка Скита', dialogue: 'street_cat' },
  { id: 'trial_knight', sheet: 'dew_knight', x: 24, y: 31, dir: 6, label: 'Рыцарь испытания', dialogue: 'trial_knight', creature: 'dew_knight_trial', group: 'trial', ring: 'arms', peace: [{ notFlag: 'ring_fight' }], if: [{ notFlag: 'skit_in' }] },
  ...[['knight_a', 12, 16, [[12, 16], [26, 16]]], ['knight_b', 26, 22, [[26, 22], [12, 22]]]].map(([id, x, y, patrol]) => ({ id, sheet: 'dew_knight', x, y, dir: 2, label: 'Рыцарь Росы', dialogue: 'dew_knight', creature: 'dew_knight', group: 'knights', peace: ORDER, patrol })),
  ...[['novice_a', 8, 9], ['novice_b', 31, 9]].map(([id, x, y]) => ({ id, sheet: 'novice', x, y, dir: 2, label: 'Послушник', dialogue: 'novice' })),
];

k.write('skit_yard', 'Двор Скита', {
  entries: { default: [19, 33], south: [19, 33], north: [19, 2], east: [37, 14], hatch: [30, 21] },
  roads: { south: [19, 20], north: [19, 20], east: [14, 15] },
  actors,
  arrive: [{ if: [{ notFlag: 'skit_started' }], effects: [{ type: 'flag', key: 'skit_started' }, { type: 'quest', quest: 'skit', stage: 'enter' }] }],
  triggers: [{ id: 'gate_view', x: 16, y: 31, w: 8, h: 4, effects: [], log: 'Скит: бетонная крепость на камне, по стенам — белые паруса росоуловителей. У решётки ждёт рыцарь в кирасе.' }],
});
