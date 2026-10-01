// Builds public/assets/maps/rosa_deep.json: «Роса-2»: капсулы (stage S) — the last capsule of the first «Верблюд»,
// Пётр the lab hand who never left, and the vent that runs under the salt to the Скит.
import { mapKit } from './map-kit.mjs';

const W = 36;
const H = 32;
const k = mapKit(W, H, 7607);
const { place, fill } = k;

fill(2, 2, 33, 29, 'F');
k.rim();

place({ id: 'capsule', frame: 'capsule', x: 16, y: 12, w: 1, h: 2, label: 'Капсула', dialogue: 'capsule' });
for (const [x, y] of [[10, 8], [22, 8], [10, 20]]) place({ id: `dead_capsule_${x}_${y}`, frame: 'capsule', x, y, w: 1, h: 2, label: 'Пустая капсула' });
for (const [x, y] of [[26, 16], [6, 12]]) place({ id: `term_${x}_${y}`, frame: 'terminal', x, y, label: 'Терминал' });
place({ id: 'deep_ladder', frame: 'ladder', x: 4, y: 26, label: 'Лестница в лаборатории', dialogue: 'deep_up' });
place({ id: 'vent_skit', frame: 'hatch', x: 30, y: 26, block: false, label: 'Вентшахта под солью', dialogue: 'vent_skit' });
k.scenery([[2, 2, 33, 29]], { cactus: 0, dead_tree: 0, bush: 0 });

const actors = [
  { id: 'player', sheet: 'hero_0', x: 5, y: 26, dir: 1 },
  { id: 'petr', sheet: 'petr', x: 20, y: 18, dir: 5, label: 'Лаборант', dialogue: 'petr' },
  { id: 'camel_first', sheet: 'camel_first', x: 18, y: 14, dir: 5, label: '«Верблюд» из капсулы', dialogue: 'camel_first', if: [{ flag: 'capsule', eq: 'woken' }] },
];

k.write('rosa_deep', 'Капсулы «Росы-2»', {
  entries: { default: [5, 26], ladder: [5, 26], vent: [29, 26] },
  actors,
  triggers: [],
});
