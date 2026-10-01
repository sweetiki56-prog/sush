// Builds public/assets/maps/rosa_lab.json: «Роса-2»: лаборатории (stage S) — cages and dead terminals, the rejects
// of «Проект Верблюд» that still live here, a corridor of gas, a door marked with red wax, chalk notes on the walls.
import { mapKit } from './map-kit.mjs';

const W = 40;
const H = 36;
const k = mapKit(W, H, 7606);
const { place, fill } = k;

fill(2, 2, 37, 33, 'F');
k.rim();

for (const [x, y] of [[6, 6], [8, 6], [10, 6], [6, 12], [8, 12], [10, 12]]) place({ id: `cage_${x}_${y}`, frame: 'bars_open', x, y, label: 'Клетка' });
for (const [x, y] of [[20, 5], [24, 5], [28, 5], [32, 20]]) place({ id: `term_${x}_${y}`, frame: 'terminal', x, y, label: 'Мёртвый терминал' });
place({ id: 'chalk_notes', frame: 'notice', x: 16, y: 18, label: 'Записи мелом на стене', dialogue: 'chalk_notes' });
place({ id: 'lab_door', frame: 'door_closed', x: 30, y: 10, label: 'Дверь лаборатории', dialogue: 'lab_door' });
place({ id: 'gas_valve', frame: 'valve', x: 20, y: 28, label: 'Вентиль газовой магистрали', dialogue: 'gas_valve' });
place({ id: 'lab_ladder_up', frame: 'ladder', x: 4, y: 30, label: 'Лестница наверх', dialogue: 'lab_up' });
place({ id: 'lab_ladder_down', frame: 'ladder', x: 34, y: 30, label: 'Лестница к капсулам', dialogue: 'lab_down' });
k.scenery([[2, 2, 37, 33]], { cactus: 0, dead_tree: 0, bush: 0 });

const actors = [
  { id: 'player', sheet: 'hero_0', x: 5, y: 29, dir: 1 },
  ...[['reject_a', 22, 14], ['reject_b', 26, 18], ['reject_c', 18, 22]].map(([id, x, y]) => ({ id, sheet: 'camel_reject', x, y, dir: 2, label: '«Верблюд»-брак', creature: 'camel_reject', group: 'rejects' })),
];

k.write('rosa_lab', 'Лаборатории «Росы-2»', {
  entries: { default: [5, 29], stairs: [5, 29], ladder: [33, 30] },
  actors,
  triggers: [
    { id: 'gas', x: 24, y: 24, w: 8, h: 8, if: [{ notFlag: 'gas_vented' }], repeat: true, effects: [{ type: 'hp', amount: -6 }], log: 'Сладковатый газ режет горло. Где-то рядом должен быть вентиль.' },
  ],
  cleared: [{ group: 'rejects', if: [{ notFlag: 'rejects_dead' }], effects: [{ type: 'flag', key: 'rejects_dead' }], log: 'Последний «Верблюд»-брак затихает у клеток. Он был когда-то человеком — почти.' }],
});
