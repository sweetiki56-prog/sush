// Builds public/assets/maps/zap_lower.json: «Нижний город» of Запруда (docs/story/locations.md №4) — the south wall
// with the gate grille and two collectors, the aqueduct mouth outside the wall (the water-bearers' way in), shanties,
// Лейка's house, widow Агафья's well, the square with the speakers' platform, a hatch down to the sewers.
import { mapKit } from './map-kit.mjs';

const W = 44;
const H = 40;
const k = mapKit(W, H, 9101);
const { place, fill, set } = k;

fill(3, 3, 40, 30, ':');
for (let y = 0; y < H; y++) for (const x of [20, 21]) set(x, y, '='); // the street from the gate to the market
fill(15, 13, 26, 19, ':'); // the square
k.rim();

// the city wall and the gate grille
for (let x = 0; x < W; x++) if (x !== 20 && x !== 21) place({ id: `wall_${x}`, frame: 'wall_hi', x, y: 32, label: 'Стена Запруды' });
place({ id: 'gate_a', frame: 'bars_closed', x: 20, y: 32, label: 'Решётка южных ворот', dialogue: 'zap_gate_bars' });
place({ id: 'gate_b', frame: 'bars_closed', x: 21, y: 32, label: 'Решётка южных ворот', dialogue: 'zap_gate_bars' });
place({ id: 'aqueduct', frame: 'hatch', x: 34, y: 36, block: false, label: 'Устье старого водовода', dialogue: 'aqueduct' });

// Лейка's house, the widow's well, shanties
k.building('lejka_house', 5, 20, 11, 25, [[11, 22]], 'Стена дома Лейки', 'planks');
place({ id: 'lejka_barrels', frame: 'barrel', x: 6, y: 21, label: 'Бочки водоносов' });
place({ id: 'widow_well', frame: 'pump_fixed', x: 30, y: 23, w: 2, h: 2, label: 'Колодец вдовы', dialogue: 'widow_well' });
for (const [x, y, f] of [[4, 4, 'shack_a'], [9, 5, 'shack_b'], [28, 4, 'shack_a'], [33, 7, 'shack_b'], [35, 25, 'shack_a'], [4, 12, 'shack_b'], [30, 13, 'shack_a'], [13, 25, 'shack_b']])
  place({ id: `shanty_${x}_${y}`, frame: f, x, y, w: 3, h: 3, label: 'Лачуга Нижнего города' });
// the square: the platform and the notice of the new water tax
place({ id: 'podium', frame: 'podium', x: 17, y: 14, w: 2, h: 2, label: 'Помост на площади', dialogue: 'podium' });
place({ id: 'tax_notice', frame: 'notice', x: 23, y: 13, label: 'Объявление о водяной подати', dialogue: 'tax_notice' });
place({ id: 'lower_hatch', frame: 'hatch', x: 37, y: 12, block: false, label: 'Люк в стоки', dialogue: 'lower_hatch' });
for (const [x, y] of [[39, 4], [3, 17]]) place({ id: `wtower_${x}_${y}`, frame: 'water_tower', x, y, label: 'Водонапорная башня' });
k.scenery([[3, 3, 40, 31]], { cactus: 2, dead_tree: 2, bush: 4 });

k.exit({ id: 'north', x: 20, y: 0, w: 2, h: 1, to: 'zap_market', entry: 'south', label: 'Капельный рынок' });
k.exit({ id: 'south', x: 20, y: H - 1, w: 2, h: 1, to: 'world', label: 'Карта мира' });
k.exit({ id: 'dock', x: W - 1, y: 20, w: 1, h: 2, to: 'zap_dock', entry: 'gate', label: '«Сухой док»', if: [{ flag: 'dock_known' }], closed: 'За восточной стеной — «Сухой док». Туда попадают не по своей воле.' });
k.clear(W - 3, 20, W - 1, 21, ':');

const WANTED = [{ notFlag: 'zap_wanted' }];
const actors = [
  { id: 'player', sheet: 'hero_0', x: 20, y: 37, dir: 1 },
  ...[['gate_col_a', 19, 34], ['gate_col_b', 22, 34]].map(([id, x, y]) => ({ id, sheet: 'collector', x, y, dir: 6, label: 'Сборщик на воротах', dialogue: 'zap_gate', creature: 'collector', group: 'gate', peace: WANTED })),
  { id: 'lejka', sheet: 'lejka', x: 8, y: 22, dir: 1, label: 'Лейка', dialogue: 'lejka' },
  { id: 'agafya', sheet: 'agafya', x: 32, y: 26, dir: 5, label: 'Вдова Агафья', dialogue: 'agafya' },
  { id: 'town_cat', sheet: 'cat_town', x: 17, y: 23, dir: 1, label: 'Уличная кошка', dialogue: 'street_cat' },
  { id: 'town_dog', sheet: 'dog_town', x: 29, y: 23, dir: 4, label: 'Пёс водоносов', dialogue: 'street_dog' },
  { id: 'zasov', sheet: 'zasov', x: 10, y: 30, dir: 2, label: 'Засов', dialogue: 'zasov', if: [{ notFlag: 'hank_debt' }] },
  { id: 'kosoy', sheet: 'kosoy', x: 22, y: 16, dir: 5, label: 'Косой', dialogue: 'kosoy', if: [{ notFlag: 'dry_riot' }] },
  { id: 'lower_guard', sheet: 'zap_guard', x: 25, y: 9, dir: 3, label: 'Стражник Башни', dialogue: 'zap_guard', creature: 'zap_guard', group: 'lower_guard', peace: WANTED, patrol: [[25, 9], [25, 20], [17, 20]] },
  ...[['folk_a', 'debtor', 14, 8], ['folk_b', 'pilgrim', 27, 18], ['folk_c', 'farmer', 12, 18]].map(([id, sheet, x, y]) => ({ id, sheet, x, y, dir: 2, label: 'Житель Нижнего города', dialogue: 'zap_folk' })),
];

k.write('zap_lower', 'Нижний город', {
  entries: { default: [20, 37], road_s: [20, 37], gate: [20, 30], north: [20, 2], hatch: [37, 13], dock: [40, 20], aqueduct_out: [33, 36] },
  roads: { south: [20, 21], north: [20, 21] },
  actors,
  // Chapter III begins at the gate
  arrive: [{ if: [{ notFlag: 'zap_started' }], effects: [{ type: 'flag', key: 'zap_started' }, { type: 'quest', quest: 'zapruda', stage: 'gate' }] }],
  triggers: [{ id: 'gate_view', x: 18, y: 35, w: 6, h: 3, effects: [], log: 'Стена Запруды, решётка южных ворот и двое сборщиков с книгой. Над крышами — водонапорные башни и серый палец Башни Треста.' }],
});
