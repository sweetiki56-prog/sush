// Builds public/assets/maps/crystal_baths.json: «Рассольные бани» of Кристалл (stage V) — the brine pool and its copper
// pipe from the deep, the sick elders on their benches, the healer Щёлочь and Ртуть's stall of human goods.
import { mapKit } from './map-kit.mjs';

const W = 36;
const H = 32;
const k = mapKit(W, H, 7503);
const { place, fill, set } = k;

fill(3, 3, 32, 28, '.');
for (let x = 0; x < 8; x++) for (const y of [15, 16]) set(x, y, ':');
k.rim();

place({ id: 'brine_pool', frame: 'brine_pool', x: 15, y: 12, w: 2, h: 2, label: 'Рассольная купель' });
place({ id: 'bath_pipe', frame: 'pipes', x: 19, y: 9, label: 'Стык трубы', dialogue: 'bath_pipe' });
for (const [x, y] of [[20, 8], [21, 7], [22, 6]]) place({ id: `pipe_${x}_${y}`, frame: 'pipes', x, y, label: 'Медная труба' });
for (const [x, y] of [[9, 20], [9, 22], [9, 24], [24, 20]]) place({ id: `bench_${x}_${y}`, frame: 'bunk', x, y, label: 'Скамья больных' });
place({ id: 'rtut_stall', frame: 'stall', x: 25, y: 23, w: 2, h: 1, label: 'Прилавок Ртути' });
for (const [x, y, v] of [[6, 5, 'a'], [28, 5, 'b'], [30, 26, 'a']]) place({ id: `vein_${x}_${y}`, frame: `vein_${v}`, x, y, label: 'Светящаяся жила' });
k.scenery([[3, 3, 32, 28]], { cactus: 0, dead_tree: 0, bush: 0 });

k.exit({ id: 'west', x: 0, y: 15, w: 1, h: 2, to: 'crystal_gate', entry: 'east', label: 'Верхние ярусы' });
k.clear(0, 15, 3, 16, ':');

const actors = [
  { id: 'player', sheet: 'hero_0', x: 2, y: 15, dir: 2 },
  { id: 'shcholoch', sheet: 'shcholoch', x: 11, y: 21, dir: 2, label: 'Целительница Щёлочь', dialogue: 'shcholoch' },
  { id: 'rtut', sheet: 'rtut', x: 26, y: 24, dir: 6, label: 'Меняла Ртуть', dialogue: 'rtut', if: [{ notFlag: 'rtut_gone' }] },
  ...[['elder_a', 10, 23], ['elder_b', 25, 21]].map(([id, x, y]) => ({ id, sheet: 'kvarts', x, y, dir: 1, label: 'Старик в банях', dialogue: 'crystal_folk' })),
];

k.write('crystal_baths', 'Рассольные бани', {
  entries: { default: [2, 15], west: [2, 15] },
  roads: { west: [15, 16] },
  actors,
  triggers: [{ id: 'baths_view', x: 1, y: 13, w: 4, h: 6, effects: [], log: 'Рассольные бани: пар над купелью пахнет морем, которого нет. На скамьях лежат старики и не встают.' }],
});
