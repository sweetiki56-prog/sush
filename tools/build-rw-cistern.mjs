// Builds public/assets/maps/rw_cistern.json: «Отстойник НС-2», the open settling basin behind the pump station of the
// Rusty Well, reached by the ladder from the station's hatch (docs/story/locations.md). A concrete catwalk along
// dry silt, pipes, the control panel, the bypass valve that can send water to the village well past the Trust's
// seal («Колодец под печатью»), a drowned worker's bag; rust mites on the iron.
import { mapKit } from './map-kit.mjs';

const W = 26;
const H = 22;
const k = mapKit(W, H, 5101);
const { place, fill } = k;

fill(0, 0, W - 1, H - 1, ':');
k.rim();
fill(3, 3, 20, 4, 'F'); // the catwalk from the ladder
fill(19, 4, 20, 15, 'F'); // and down to the valve
fill(21, 14, 22, 16, 'F');

place({ id: 'ladder', frame: 'ladder', x: 3, y: 2, label: 'Лестница наверх, в насосную' });
k.exit({ id: 'up', x: 4, y: 3, w: 1, h: 1, to: 'rusty_well', entry: 'station', label: 'Насосная НС-2' });
for (const x of [6, 10, 14]) place({ id: `pipes_${x}`, frame: 'pipes', x, y: 2, w: 2, h: 1, label: 'Трубы от скважины' });
place({ id: 'cistern_panel', frame: 'machine', x: 16, y: 5, w: 2, h: 2, label: 'Щит управления', dialogue: 'cistern_panel' });
place({ id: 'bypass_valve', frame: 'valve', x: 22, y: 15, label: 'Обводной вентиль', dialogue: 'bypass_valve' });
place({ id: 'cistern_bag', frame: 'bag', x: 11, y: 13, block: false, label: 'Сумка в иле', dialogue: 'cistern_bag' });
place({ id: 'cistern_skeleton', frame: 'skeleton', x: 12, y: 13, block: false, label: 'Кости рабочего' });
for (const [x, y] of [[7, 9], [8, 16], [15, 18]]) place({ id: `barrel_${x}_${y}`, frame: 'barrel', x, y, label: 'Ржавая бочка' });
k.scenery([[0, 0, W - 1, H - 1]], { cactus: 0, dead_tree: 0, bush: 0 });

const actors = [
  { id: 'player', sheet: 'hero_0', x: 4, y: 3, dir: 3 },
  // rust mites crawl over the iron near the valve
  ...[[14, 10], [12, 16], [17, 17]].map(([x, y], i) => ({ id: `mite_${i}`, sheet: 'rust_mite', creature: 'rust_mite', group: 'mites', x, y, dir: 2 })),
];

k.write('rw_cistern', 'Отстойник НС-2', {
  entries: { default: [4, 3], ladder: [4, 3] },
  actors,
  triggers: [{ id: 'cistern_view', x: 3, y: 3, w: 3, h: 2, effects: [], log: 'Бетонная чаша отстойника под открытым небом. На дне — сухой ил и кости. От скважины идут трубы, у дальней стены — колесо вентиля.' }],
});
