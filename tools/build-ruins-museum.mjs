// Builds public/assets/maps/ruins_museum.json: «Музей Водоуправления» (stage B) — a hall of models and pumps, the
// automaton Хранитель-4 still keeping its «санитарный день», the case with the Rod of the Watcher.
import { mapKit } from './map-kit.mjs';

const W = 36;
const H = 30;
const k = mapKit(W, H, 7805);
const { place, fill, set } = k;

fill(3, 3, 32, 26, '.');
for (let y = 22; y < H; y++) for (const x of [17, 18]) set(x, y, '=');
k.rim();
k.building('hall', 4, 3, 31, 21, [[17, 21], [18, 21]], 'Стена музея', 'tin');

place({ id: 'rod_case', frame: 'display_case', x: 17, y: 7, label: 'Витрина «Жезл Смотрителя»', dialogue: 'rod_case' });
for (const [x, y] of [[9, 7], [25, 7], [9, 14], [25, 14]]) place({ id: `case_${x}_${y}`, frame: 'display_case', x, y, label: 'Витрина', dialogue: 'museum_case' });
place({ id: 'model_pump', frame: 'main_pump', x: 12, y: 10, w: 2, h: 2, label: 'Модель насосной станции' });
place({ id: 'model_mast', frame: 'pylon', x: 23, y: 11, label: 'Модель опоры ЛЭП' });
k.scenery([[3, 3, 32, 26]], { cactus: 0, dead_tree: 1, bush: 2 });

k.exit({ id: 'south', x: 17, y: H - 1, w: 2, h: 1, to: 'ruins_streets', entry: 'north', label: 'Улицы' });

const actors = [
  { id: 'player', sheet: 'hero_0', x: 17, y: 27, dir: 1 },
  { id: 'curator', sheet: 'curator', x: 18, y: 13, dir: 3, label: 'Хранитель-4', dialogue: 'curator', creature: 'curator_bot', group: 'curator', peace: [{ notFlag: 'museum_fight' }], if: [{ notFlag: 'curator_down' }] },
];

k.write('ruins_museum', 'Музей Водоуправления', {
  entries: { default: [17, 27], south: [17, 27] },
  roads: { south: [17, 18] },
  actors,
  cleared: [{ group: 'curator', if: [{ flag: 'museum_fight' }, { notFlag: 'museum' }], effects: [{ type: 'flag', key: 'museum', value: 'fought' }, { type: 'flag', key: 'curator_down' }, { type: 'give', item: 'watcher_rod' }, { type: 'quest', quest: 'museum', stage: 'done' }], log: 'Хранитель-4 оседает и договаривает: «…санитарный… день…». Витрина открыта.' }],
  triggers: [],
});
