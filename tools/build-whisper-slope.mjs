// Builds public/assets/maps/whisper_slope.json: «„Шептун“: склон» (stage U) — a switchback path up a bare peak,
// humming guy wires, bald condors on the rocks, the steel door of the bunker under the mast.
import { mapKit } from './map-kit.mjs';

const W = 40;
const H = 36;
const k = mapKit(W, H, 7705);
const { place, fill, set } = k;

fill(2, 2, 37, 33, '#');
// the switchbacks
const path = [[19, 35], [19, 29], [8, 29], [8, 21], [30, 21], [30, 13], [12, 13], [12, 6], [19, 6], [19, 0]];
for (let i = 1; i < path.length; i++) {
  const [ax, ay] = path[i - 1];
  const [bx, by] = path[i];
  for (let x = Math.min(ax, bx) - 1; x <= Math.max(ax, bx) + 1; x++) for (let y = Math.min(ay, by) - 1; y <= Math.max(ay, by) + 1; y++) set(x, y, ':');
  for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) set(x, y, '=');
}
fill(26, 24, 34, 30, ':'); // the ledge by the bunker
k.rim();

place({ id: 'bunker_door', frame: 'door_closed', x: 32, y: 26, label: 'Стальная дверь бункера', dialogue: 'bunker_door' });
for (const [x, y] of [[10, 25], [26, 17], [15, 9]]) place({ id: `wire_${x}_${y}`, frame: 'pylon', x, y, label: 'Гудящая растяжка' });
k.scenery([[2, 2, 37, 33]], { cactus: 0, dead_tree: 2, bush: 2 });

k.exit({ id: 'south', x: 19, y: H - 1, w: 1, h: 1, to: 'world', label: 'Карта мира' });
k.exit({ id: 'north', x: 19, y: 0, w: 1, h: 1, to: 'whisper_tower', entry: 'south', label: 'Вышка' });

const actors = [
  { id: 'player', sheet: 'hero_0', x: 19, y: 33, dir: 1 },
  ...[['condor_a', 9, 22], ['condor_b', 29, 15], ['condor_c', 28, 20]].map(([id, x, y]) => ({ id, sheet: 'condor', x, y, dir: 4, label: 'Лысый кондор', creature: 'condor', group: 'condors' })),
];

k.write('whisper_slope', 'Склон «Шептуна»', {
  entries: { default: [19, 33], south: [19, 33], north: [19, 2], bunker: [31, 27] },
  roads: { south: [19], north: [19] },
  actors,
  arrive: [{ if: [{ notFlag: 'whisper_seen' }], effects: [{ type: 'flag', key: 'whisper_seen' }], log: 'Ветер поёт в растяжках вышки — тихо, на несколько голосов. Поэтому её и зовут «Шептун».' }],
  triggers: [],
});
