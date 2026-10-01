// Builds public/assets/maps/rosa_surface.json: «Роса-2»: поверхность (stage S) — half-buried blocks of a pre-war
// station, sister Ирга's camp in the lee of a wall, the hatch down to the labs.
import { mapKit } from './map-kit.mjs';

const W = 40;
const H = 36;
const k = mapKit(W, H, 7605);
const { place, fill, set } = k;

fill(3, 3, 36, 32, '_');
for (let x = 0; x < 8; x++) for (const y of [17, 18]) set(x, y, '=');
k.rim();

for (const [x, y] of [[14, 6], [24, 8], [28, 22]]) place({ id: `block_${x}_${y}`, frame: 'ruin', x, y, w: 3, h: 3, label: 'Засыпанный корпус' });
for (const [x, y] of [[8, 26], [33, 14]]) place({ id: `mast_${x}_${y}`, frame: 'pylon', x, y, label: 'Мачта станции' });
place({ id: 'irga_fire', frame: 'campfire', x: 10, y: 21, block: false, label: 'Костёр Ирги' });
place({ id: 'irga_bag', frame: 'bag', x: 12, y: 23, block: false, label: 'Мешок с травами' });
place({ id: 'rosa_hatch', frame: 'hatch', x: 26, y: 15, block: false, label: 'Спуск в лаборатории', dialogue: 'rosa_hatch' });
k.scenery([[3, 3, 36, 32]], { cactus: 2, dead_tree: 2, bush: 2 });

k.exit({ id: 'west', x: 0, y: 17, w: 1, h: 2, to: 'world', label: 'Карта мира' });

const actors = [
  { id: 'player', sheet: 'hero_0', x: 2, y: 17, dir: 2 },
  { id: 'irga', sheet: 'irga', x: 12, y: 20, dir: 5, label: 'Сестра Ирга', dialogue: 'irga', if: [{ notFlag: 'with_irga' }, { notFlag: 'lost_irga' }] },
];

k.write('rosa_surface', '«Роса-2»', {
  entries: { default: [2, 17], west: [2, 17], hatch: [26, 16] },
  roads: { west: [17, 18] },
  actors,
  triggers: [{ id: 'rosa_view', x: 1, y: 15, w: 4, h: 6, effects: [], log: '«Роса-2»: бетонные корпуса по крышу в песке, мачты без проводов. Над одной стеной вьётся дымок костра.' }],
});
