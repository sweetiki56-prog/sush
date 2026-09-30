// Builds public/assets/maps/zap_sewers.json: «Стоки» under Запруда — the water-bearers' tunnels: the old aqueduct from
// outside the wall, the ladder up to the Lower city's hatch, the grate under «Сухой док»; the bearers' landing, rats.
import { mapKit } from './map-kit.mjs';

const W = 36;
const H = 24;
const k = mapKit(W, H, 9105);
const { place, fill } = k;

fill(0, 0, W - 1, H - 1, '#');
fill(1, 11, 33, 13, 'F'); // the main tunnel
fill(17, 3, 19, 11, 'F'); // up to the Lower city
fill(30, 13, 32, 21, 'F'); // down to the dock
fill(8, 14, 14, 18, ':'); // the bearers' landing
fill(24, 5, 29, 10, ':'); // the rats' side tunnel
fill(22, 8, 24, 11, 'F');

place({ id: 'ladder_up', frame: 'ladder', x: 18, y: 2, label: 'Лестница к люку Нижнего города' });
place({ id: 'ladder_dock', frame: 'ladder', x: 31, y: 22, label: 'Лестница к решётке «Сухого дока»' });
for (const x of [4, 12, 24]) place({ id: `sewer_pipes_${x}`, frame: 'pipes', x, y: 10, w: 2, h: 1, label: 'Трубы' });
place({ id: 'bearer_barrels', frame: 'barrel', x: 9, y: 15, label: 'Фляги водоносов' });
place({ id: 'bearer_sacks', frame: 'sacks', x: 13, y: 17, label: 'Мешки водоносов' });
k.scenery([[0, 0, W - 1, H - 1]], { cactus: 0, dead_tree: 0, bush: 0 });

k.exit({ id: 'aqueduct', x: 1, y: 12, w: 1, h: 1, to: 'zap_lower', entry: 'aqueduct_out', label: 'Водовод — за стену' });
k.exit({ id: 'up', x: 18, y: 3, w: 1, h: 1, to: 'zap_lower', entry: 'hatch', label: 'Нижний город', effects: [{ type: 'flag', key: 'zap_in' }] });
k.exit({ id: 'dock', x: 31, y: 21, w: 1, h: 1, to: 'zap_dock', entry: 'grate', label: '«Сухой док»', if: [{ flag: 'dock_known' }], closed: 'Решётка сверху заперта изнутри.' });

const actors = [
  { id: 'player', sheet: 'hero_0', x: 2, y: 12, dir: 1 },
  ...[['foma', 'bearer', 10, 16, 'Водонос Фома'], ['nina', 'lejka', 12, 15, 'Водоноска Нина'], ['tikhon', 'tikhon', 11, 17, 'Водонос Тихон']].map(([id, sheet, x, y, label]) => ({ id, sheet, x, y, dir: 1, label, dialogue: id, if: [{ flag: 'lejka_asked' }, ...(id === 'tikhon' ? [{ notFlag: 'tikhon_gone' }] : [])] })),
  ...[[26, 6], [28, 8], [25, 9]].map(([x, y], i) => ({ id: `rat_${i}`, sheet: 'rat', creature: 'rat', group: 'rats', x, y, dir: 6 })),
];

k.write('zap_sewers', 'Стоки', {
  entries: { default: [2, 12], aqueduct: [2, 12], lower: [18, 4], grate: [31, 20] },
  actors,
  triggers: [{ id: 'sewer_view', x: 1, y: 11, w: 3, h: 3, effects: [], log: 'Стоки Запруды: сухие туннели с тёмной полосой по стенам — здесь когда-то текла вода. Где-то впереди пищат крысы.' }],
});
