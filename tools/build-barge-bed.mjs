// Builds public/assets/maps/barge_bed.json: «Мёртвое русло», the dry bed of the Светлая at the ford of the east
// road (docs/story/locations.md). Boardwalks cross the sand where the eels cannot reach; the barge «Стрежень» lies
// aground on the east side with a gangway up; under its stern the eel queen sits on her clutch
// («Угорь под палубой»). The riverbed runs on south to the post station.
import { mapKit } from './map-kit.mjs';

const W = 40;
const H = 30;
const k = mapKit(W, H, 7001);
const { place, fill, set, occupied, key } = k;

fill(0, 0, W - 1, H - 1, '.');
fill(0, 0, W - 1, 3, ':'); // the old banks
fill(0, 26, 15, H - 1, ':');
k.rim();
fill(0, 14, 31, 15, '-'); // the boardwalk over the ford, up to the gangway
fill(18, 15, 19, H - 1, '-'); // and south along the bed to the post station

// the barge's side: a wall of hull plates, the rest of her is out of reach
fill(31, 5, W - 1, 22, '#');
for (let y = 5; y <= 22; y++) for (let x = 31; x < W; x++) occupied.add(key(x, y));
for (let y = 5; y <= 22; y++) if (y !== 14 && y !== 15) place({ id: `hull_w_${y}`, frame: 'hull_hi', x: 30, y, label: 'Борт баржи «Стрежень»' });
for (let x = 31; x < W - 1; x++) place({ id: `hull_s_${x}`, frame: 'hull_lo', x, y: 23, label: 'Корма баржи' });
for (const x of [30, 31]) for (const y of [14, 15]) set(x, y, '-'); // the gangway foot

k.exit({ id: 'road_w', x: 0, y: 14, w: 1, h: 2, to: 'world', label: 'Карта мира' });
k.exit({ id: 'gangway', x: 31, y: 14, w: 1, h: 2, to: 'barge_deck', entry: 'gangway', label: 'Сходни на баржу' });
k.exit({ id: 'south', x: 18, y: H - 1, w: 2, h: 1, to: 'barge_post', entry: 'north', label: 'Почтовая станция' });

// the queen's clutch under the stern
place({ id: 'eel_nest', frame: 'eggs', x: 35, y: 26, block: false, label: 'Кладка угрей', dialogue: 'eel_nest' });
place({ id: 'anchor', frame: 'anchor', x: 8, y: 20, label: 'Якорь баржи' });
place({ id: 'bed_skeleton', frame: 'skeleton', x: 24, y: 9, block: false, label: 'Кости у брода' });
place({ id: 'bed_car', frame: 'car_x_burnt', x: 10, y: 6, w: 2, h: 1, label: 'Остов грузовика' });
k.scenery([[0, 4, 30, 26]], { cactus: 4, dead_tree: 4, bush: 8 });

const QUEEN = [{ notFlag: 'eel_fight' }];
const HERE = [{ notFlag: 'eel' }];
const actors = [
  { id: 'player', sheet: 'hero_0', x: 2, y: 14, dir: 1 },
  // eels under the open sand: they never move, they bite whoever comes close
  ...[[9, 10], [14, 20], [23, 11], [25, 19], [5, 23]].map(([x, y], i) => ({ id: `eel_${i}`, sheet: 'sand_eel', creature: 'sand_eel', group: `eel_${i}`, x, y, dir: 2 })),
  // the queen and her brood: they only hiss until someone goes for them
  { id: 'eel_queen', sheet: 'eel_queen', creature: 'eel_queen', group: 'queen', x: 34, y: 25, dir: 4, label: 'Матка угрей', dialogue: 'eel_queen', if: HERE, peace: QUEEN },
  ...[[32, 26], [37, 25]].map(([x, y], i) => ({ id: `brood_${i}`, sheet: 'sand_eel', creature: 'sand_eel', group: 'queen', x, y, dir: 4, label: 'Угорь из выводка', dialogue: 'eel_queen', if: HERE, peace: QUEEN })),
];

// the queen dead: the stern is safe
const cleared = [
  { group: 'queen', if: [{ flag: 'eel_fight' }, { notFlag: 'eel' }], effects: [{ type: 'flag', key: 'eel', value: 'killed' }, { type: 'quest', quest: 'eel', stage: 'done' }], log: 'Матка угрей затихает. Песок под кормой больше не шевелится.' },
];

k.write('barge_bed', 'Мёртвое русло', {
  entries: { default: [2, 14], road_w: [2, 14], gangway: [29, 14], south: [18, 27] },
  roads: { west: [14, 15], south: [18, 19] },
  actors,
  triggers: [{ id: 'bed_view', x: 1, y: 13, w: 3, h: 4, effects: [], log: 'Мёртвое русло Светлой. Дощатый настил через брод, на востоке — ржавый борт баржи. Песок кое-где вздрагивает сам по себе.' }],
  cleared,
});
