// Builds public/assets/maps/depot_tunnels.json: «Туннели водовода» under the Депо (stage U) — a maze of concrete
// galleries round the great main: «Счётчики» on their old rounds, eels in the flooded stretch, Шунт the dry
// technician who calls for Верес, a broken «Счётчик» that may walk again, ladders up to the yard and the archive.
import { mapKit } from './map-kit.mjs';

const W = 44;
const H = 40;
const k = mapKit(W, H, 7704);
const { place, fill } = k;

fill(1, 1, W - 2, H - 2, '#');
// galleries: a ring, a cross and side bays
for (const [x0, y0, x1, y1] of [
  [3, 33, 40, 37], [3, 3, 40, 7], [3, 3, 7, 37], [36, 3, 40, 37], // the ring
  [19, 7, 24, 33], [7, 18, 36, 22], // the cross
  [10, 9, 16, 15], [27, 25, 33, 31], [10, 25, 16, 31], // bays
]) fill(x0, y0, x1, y1, 'F');
k.rim();

for (let x = 9; x <= 33; x += 4) place({ id: `main_${x}`, frame: 'big_pipe', x, y: 19, w: 2, h: 1, label: 'Главный водовод' });
for (const [x, y] of [[21, 12], [22, 28]]) place({ id: `valve_${x}_${y}`, frame: 'valve', x, y, label: 'Задвижка' });
place({ id: 'tunnel_yard_ladder', frame: 'ladder', x: 4, y: 35, label: 'Лестница во двор', dialogue: 'tunnel_up_yard' });
place({ id: 'tunnel_archive_ladder', frame: 'ladder', x: 39, y: 4, label: 'Лестница к архиву', dialogue: 'tunnel_up_archive' });
place({ id: 'shunt_nest', frame: 'pipes', x: 13, y: 11, label: 'Гнездо из ветоши', dialogue: 'shunt_nest' });
k.scenery([[1, 1, W - 2, H - 2]], { cactus: 0, dead_tree: 0, bush: 0 });

const COUNTERS = [{ flag: 'counter_pass' }];
const actors = [
  { id: 'player', sheet: 'hero_0', x: 5, y: 35, dir: 2 },
  ...[['counter_a', 22, 5, [[12, 5], [34, 5]]], ['counter_b', 38, 20, [[38, 10], [38, 30]]], ['counter_c', 20, 21, [[10, 21], [30, 21]]]].map(([id, x, y, patrol]) => ({ id, sheet: 'counter', x, y, dir: 2, label: '«Счётчик»', creature: 'counter', group: 'counters', peace: COUNTERS, patrol })),
  ...[['eel_a', 29, 27], ['eel_b', 31, 29], ['eel_c', 28, 30]].map(([id, x, y]) => ({ id, sheet: 'main_eel', x, y, dir: 6, label: 'Угорь водовода', creature: 'main_eel', group: 'eels' })),
  { id: 'shunt', sheet: 'shunt', x: 12, y: 13, dir: 3, label: 'Голос в трубе', dialogue: 'shunt', creature: 'shunt', group: 'shunt', peace: [{ notFlag: 'shunt_fight' }], if: [{ notFlag: 'pipe_voice' }] },
  { id: 'vedro_broken', sheet: 'vedro', x: 13, y: 28, dir: 1, label: 'Ведро', dialogue: 'vedro_broken', if: [{ notFlag: 'with_vedro' }, { notFlag: 'lost_vedro' }] },
];

k.write('depot_tunnels', 'Туннели водовода', {
  entries: { default: [5, 35], yard: [5, 35], archive: [38, 5] },
  actors,
  arrive: [{ if: [{ notFlag: 'tunnels_seen' }], effects: [{ type: 'flag', key: 'tunnels_seen' }], log: 'Туннели водовода: бетон, сырость, ровный гул воды в трубе. Где-то далеко кто-то зовёт: «Илья Андреич!»' }],
  cleared: [
    { group: 'shunt', if: [{ flag: 'shunt_fight' }, { notFlag: 'pipe_voice' }], effects: [{ type: 'flag', key: 'pipe_voice', value: 'killed' }, { type: 'flag', key: 'watcher_known' }, { type: 'give', item: 'bunker_key' }, { type: 'quest', quest: 'pipe_voice', stage: 'done' }], log: 'Шунт затихает у своей трубы. В кармане робы — ключ от сухого водосброса.' },
  ],
  triggers: [{ id: 'flood', x: 27, y: 25, w: 7, h: 7, repeat: true, if: [{ notFlag: 'flood_drained' }], effects: [{ type: 'flag', key: 'flood_wet' }], log: 'Вода по колено. Что-то скользкое трогает ногу.' }],
});
