// Builds public/assets/maps/whisper_bunker.json: «Бункер „Шептуна“» (stage U) — the concrete rooms under the mast:
// dark machines still on watch, the power panel that wakes the relay from below, the duty log of the «Счётчики».
import { mapKit } from './map-kit.mjs';

const W = 32;
const H = 28;
const k = mapKit(W, H, 7707);
const { place, fill } = k;

fill(2, 2, 29, 25, 'F');
k.rim();

place({ id: 'power_panel', frame: 'transformer', x: 24, y: 5, label: 'Щиток питания', dialogue: 'power_panel' });
place({ id: 'duty_log', frame: 'terminal', x: 8, y: 6, label: 'Журнал дежурств', dialogue: 'duty_log' });
for (const [x, y] of [[14, 6], [18, 6], [14, 14]]) place({ id: `cabinet_${x}_${y}`, frame: 'machine', x, y, label: 'Шкаф аппаратуры' });
place({ id: 'bunker_ladder', frame: 'ladder', x: 4, y: 23, label: 'Лестница наверх', dialogue: 'bunker_up' });
k.scenery([[2, 2, 29, 25]], { cactus: 0, dead_tree: 0, bush: 0 });

const actors = [
  { id: 'player', sheet: 'hero_0', x: 5, y: 23, dir: 2 },
  ...[['machine_a', 20, 12, [[20, 12], [26, 18]]], ['machine_b', 10, 18, [[10, 18], [20, 22]]]].map(([id, x, y, patrol]) => ({ id, sheet: 'bunker_machine', x, y, dir: 2, label: 'Машина бункера', creature: 'bunker_machine', group: 'bunker_machines', patrol })),
];

k.write('whisper_bunker', 'Бункер «Шептуна»', {
  entries: { default: [5, 23], door: [5, 23] },
  actors,
  triggers: [],
});
