// Builds public/assets/maps/elevator_yard.json: «Элеватор: двор» (stage N) — the fortress of «Жажда» under the grain
// tower: a wall of scrap, the gang's guards and dogs, the stolen Trust water truck; inside — the floors and the still.
import { mapKit } from './map-kit.mjs';

const W = 44;
const H = 40;
const k = mapKit(W, H, 8004);
const { place, fill, set } = k;

fill(3, 3, 40, 36, ':');
for (let y = 0; y < H; y++) for (const x of [21, 22]) set(x, y, '=');
k.rim();

for (let x = 4; x <= 39; x++) if (x !== 21 && x !== 22) place({ id: `scrap_${x}`, frame: x % 3 ? 'wall_lo' : 'scrap_pile', x, y: 30, label: 'Стена из лома' });
place({ id: 'elev_tower', frame: 'water_tower', x: 21, y: 6, label: 'Башня элеватора' });
place({ id: 'stolen_truck', frame: 'water_truck', x: 30, y: 18, w: 2, h: 1, label: 'Водовоз Треста', dialogue: 'stolen_truck' });
for (const [x, y] of [[9, 12], [12, 20], [33, 10]]) place({ id: `crate_${x}_${y}`, frame: 'crate', x, y, label: 'Ящик «Жажды»' });
place({ id: 'brewery_hatch', frame: 'hatch', x: 8, y: 25, block: false, label: 'Спуск в варочную', dialogue: 'brewery_hatch' });
k.scenery([[3, 3, 40, 36]], { cactus: 1, dead_tree: 2, bush: 2 });

k.exit({ id: 'south', x: 21, y: H - 1, w: 2, h: 1, to: 'world', label: 'Карта мира' });
k.exit({ id: 'north', x: 21, y: 0, w: 2, h: 1, to: 'elevator_floors', entry: 'south', label: 'Этажи элеватора' });

const THIRST = [{ notFlag: 'thirst_enemy' }];
const actors = [
  { id: 'player', sheet: 'hero_0', x: 21, y: 37, dir: 1 },
  ...[['thirst_gate_a', 19, 31], ['thirst_gate_b', 24, 31]].map(([id, x, y]) => ({ id, sheet: 'raider', x, y, dir: 6, label: 'Охрана «Жажды»', dialogue: 'thirst_guard', creature: 'raider', group: 'thirst', peace: THIRST })),
  ...[['thirst_a', 14, 16, [[14, 16], [14, 24]]], ['thirst_b', 28, 24, [[28, 24], [34, 24]]]].map(([id, x, y, patrol]) => ({ id, sheet: 'raider', x, y, dir: 2, label: 'Налётчик «Жажды»', dialogue: 'thirst_guard', creature: 'raider', group: 'thirst', peace: THIRST, patrol })),
  ...[['dog_a', 25, 26], ['dog_b', 17, 26]].map(([id, x, y]) => ({ id, sheet: 'jackal', x, y, dir: 2, label: 'Сторожевой шакал', creature: 'jackal', group: 'thirst', peace: THIRST })),
];

k.write('elevator_yard', 'Элеватор', {
  entries: { default: [21, 37], south: [21, 37], north: [21, 2], brewery: [8, 26] },
  roads: { south: [21, 22], north: [21, 22] },
  actors,
  arrive: [{ if: [{ notFlag: 'elevator_seen' }], effects: [{ type: 'flag', key: 'elevator_seen' }], log: 'Элеватор: бетонная башня над Мёртвыми полями, стена из лома, шакалы на цепях. Крепость «Жажды». Пахнет сладким — «Миражом».' }],
  cleared: [{ group: 'thirst', if: [{ flag: 'thirst_enemy' }, { notFlag: 'thirst_yard_down' }], effects: [{ type: 'flag', key: 'thirst_yard_down' }], log: 'Двор Элеватора взят. Наверху, на этажах, ещё держится Сизый.' }],
  triggers: [],
});
