// Builds public/assets/maps/elevator_brewery.json: «Варочная» under the Elevator (stage N) — Дед Куб's stills, the
// yellow barrels of «Суховей» he brews «Мираж» from, a ladder up to the yard.
import { mapKit } from './map-kit.mjs';

const W = 32;
const H = 28;
const k = mapKit(W, H, 8006);
const { place, fill } = k;

fill(2, 2, 29, 25, 'F');
k.rim();

for (const [x, y] of [[8, 7], [13, 7], [18, 7]]) place({ id: `still_${x}`, frame: 'still', x, y, label: 'Варочный куб', dialogue: 'still' });
place({ id: 'brew_barrels', frame: 'suhovey_stack', x: 23, y: 12, w: 2, h: 1, label: 'Жёлтые бочки', dialogue: 'brew_barrels' });
place({ id: 'brewery_up', frame: 'ladder', x: 4, y: 23, label: 'Лестница во двор', dialogue: 'brewery_up' });
k.scenery([[2, 2, 29, 25]], { cactus: 0, dead_tree: 0, bush: 0 });

const actors = [
  { id: 'player', sheet: 'hero_0', x: 5, y: 22, dir: 2 },
  { id: 'kub', sheet: 'kub', x: 13, y: 10, dir: 1, label: 'Дед Куб', dialogue: 'kub', if: [{ notFlag: 'mirage_brew' }] },
];

k.write('elevator_brewery', 'Варочная «Миража»', {
  entries: { default: [5, 22], ladder: [5, 22] },
  actors,
  triggers: [],
});
