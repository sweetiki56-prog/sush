// Builds public/assets/maps/khlebnoe_ruins.json: «Руины Хлебного» (stage N) — the dead village under its bell
// tower, where Пономарь rings for vespers; the depot of «Суховей» barrels with cart tracks to the Elevator.
import { mapKit } from './map-kit.mjs';

const W = 40;
const H = 36;
const k = mapKit(W, H, 8002);
const { place, fill, set } = k;

fill(3, 3, 36, 32, ':');
for (let y = 22; y < H; y++) for (const x of [19, 20]) set(x, y, '=');
k.rim();

place({ id: 'bell_tower', frame: 'bell_tower', x: 19, y: 9, label: 'Колокольня' });
for (const [x, y] of [[7, 7], [11, 13], [28, 8], [31, 15], [8, 22], [30, 24]]) place({ id: `ruin_${x}_${y}`, frame: 'ruin', x, y, label: 'Развалины дома' });
place({ id: 'suhovey_store', frame: 'suhovey_stack', x: 26, y: 19, w: 2, h: 1, label: 'Склад бочек', dialogue: 'suhovey_store' });
k.scenery([[3, 3, 36, 32]], { cactus: 0, dead_tree: 4, bush: 3 });

k.exit({ id: 'south', x: 19, y: H - 1, w: 2, h: 1, to: 'dead_fields', entry: 'north', label: 'Мёртвые поля' });

const actors = [
  { id: 'player', sheet: 'hero_0', x: 19, y: 33, dir: 1 },
  { id: 'ponomar', sheet: 'ponomar', x: 20, y: 11, dir: 3, label: 'Пономарь', dialogue: 'ponomar', if: [{ notFlag: 'bell' }] },
  ...[['mite_a', 25, 22], ['mite_b', 28, 21], ['mite_c', 24, 25]].map(([id, x, y]) => ({ id, sheet: 'rust_mite', x, y, dir: 2, label: 'Ржавый клещ', creature: 'rust_mite', group: 'mites' })),
];

k.write('khlebnoe_ruins', 'Руины Хлебного', {
  entries: { default: [19, 33], south: [19, 33] },
  roads: { south: [19, 20] },
  actors,
  arrive: [{ if: [{ notFlag: 'khlebnoe_seen' }], effects: [{ type: 'flag', key: 'khlebnoe_seen' }, { type: 'quest', quest: 'bell', stage: 'asked' }], log: 'Хлебное: пустые дома, колокольня без креста. Где-то наверху тихо, по одному удару, звонит колокол.' }],
  triggers: [],
});
