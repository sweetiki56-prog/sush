// Builds public/assets/maps/sea_wrecks.json: «Кладбище судов» in the Salt sea (stage K) — hulks of pre-war ships
// aground in the crust. On the deck of «Отрада» Капитан Бакен commands a dead crew beside a radio; in the hold of
// another hulk the people of «Бархан» wait for help while salt spiders nest by its stern. East, the funnel down to the
// snake's lair (once someone shows the way).
import { mapKit } from './map-kit.mjs';

const W = 44;
const H = 40;
const k = mapKit(W, H, 7405);
const { place, fill, set } = k;

fill(2, 2, 41, 37, '_');
for (let x = 0; x < 8; x++) for (const y of [19, 20]) set(x, y, '=');
k.rim();

// «Отрада»: a hull outline with a boardwalk deck
fill(9, 6, 17, 12, '-');
for (let x = 8; x <= 18; x++) for (const y of [5, 13]) if (!(y === 13 && (x === 12 || x === 13))) place({ id: `otrada_${x}_${y}`, frame: y === 5 ? 'hull_hi' : 'hull_lo', x, y, label: 'Борт «Отрады»' });
for (let y = 6; y <= 12; y++) for (const x of [8, 18]) place({ id: `otrada_${x}_${y}`, frame: x === 8 ? 'hull_hi' : 'hull_lo', x, y, label: 'Борт «Отрады»' });
place({ id: 'otrada_mast', frame: 'mast', x: 13, y: 8, label: 'Мачта «Отрады»' });
place({ id: 'radio', frame: 'radio', x: 16, y: 6, label: 'Рация в рубке', dialogue: 'radio' });
for (const [x, y] of [[10, 7], [11, 11], [16, 11]]) place({ id: `crew_${x}_${y}`, frame: 'skeleton', x, y, block: false, label: 'Мёртвый матрос' });
// the hulk with the people of «Бархан» in its hold
for (let x = 27; x <= 36; x++) for (const y of [23, 31]) place({ id: `hulk_${x}_${y}`, frame: y === 23 ? 'hull_hi' : 'hull_lo', x, y, label: 'Борт остова' });
for (let y = 24; y <= 30; y++) for (const x of [27, 36]) if (!(x === 27 && y === 27)) place({ id: `hulk_${x}_${y}`, frame: x === 27 ? 'hull_hi' : 'hull_lo', x, y, label: 'Борт остова' });
fill(28, 24, 35, 30, '-');
place({ id: 'hold_hatch', frame: 'hatch', x: 26, y: 27, block: false, label: 'Люк в трюм', dialogue: 'hold_hatch' });
for (const [x, y] of [[33, 25], [31, 29]]) place({ id: `hold_web_${x}_${y}`, frame: 'salt_web', x, y, label: 'Соляная паутина' });
// ribs and hulks all over the crust
for (const [x, y] of [[22, 6], [5, 30], [15, 33], [36, 8], [24, 15]]) place({ id: `ribs_${x}_${y}`, frame: 'wreck_ribs', x, y, w: 2, h: 1, label: 'Рёбра затонувшего судна' });
for (const [x, y] of [[20, 26], [39, 16], [11, 23]]) place({ id: `anchor_${x}_${y}`, frame: 'anchor', x, y, label: 'Якорь' });
for (const [x, y] of [[6, 10], [30, 4], [40, 33], [20, 35]]) place({ id: `growth_${x}_${y}`, frame: 'crystal', x, y, label: 'Соляная друза' });
place({ id: 'sunken_chest', frame: 'crate', x: 22, y: 30, label: 'Сундук с затонувшего судна', dialogue: 'sunken_chest' });
place({ id: 'wagon_wreck', frame: 'wagon', x: 38, y: 21, w: 2, h: 1, label: 'Повозка «Бархана»' });
k.scenery([[2, 2, 41, 37]], { cactus: 0, dead_tree: 0, bush: 0 });

k.exit({ id: 'west', x: 0, y: 19, w: 1, h: 2, to: 'world', label: 'Карта мира' });
k.exit({ id: 'funnel', x: W - 1, y: 12, w: 1, h: 2, to: 'sea_lair', entry: 'rim', label: 'Воронка в соли', if: [{ flag: 'lair_known' }], closed: 'Дальше корка проваливается воронкой. Без знающего туда не спуститься.' });
k.clear(W - 4, 12, W - 1, 13, '_');

const actors = [
  { id: 'player', sheet: 'hero_0', x: 2, y: 19, dir: 2 },
  { id: 'baken', sheet: 'baken', x: 13, y: 10, dir: 1, label: 'Капитан Бакен', dialogue: 'baken' },
  ...[['nest_a', 38, 27], ['nest_b', 39, 30], ['nest_c', 37, 33], ['nest_d', 40, 25]].map(([id, x, y]) => ({ id, sheet: 'salt_spider', x, y, dir: 5, label: 'Соляной паук', creature: 'salt_spider', group: 'wreck_spiders' })),
  { id: 'tamara', sheet: 'tamara', x: 24, y: 28, dir: 2, label: 'Тамара Кочевая', dialogue: 'tamara', if: [{ flag: 'barkhan' }] },
  ...[['nomad_a', 23, 26], ['nomad_b', 25, 31]].map(([id, x, y]) => ({ id, sheet: 'nomad', x, y, dir: 2, label: 'Человек «Бархана»', dialogue: 'nomad', if: [{ flag: 'barkhan' }] })),
];

k.write('sea_wrecks', 'Кладбище судов', {
  entries: { default: [2, 19], west: [2, 19], funnel: [41, 12] },
  roads: { west: [19, 20] },
  actors,
  triggers: [{ id: 'wrecks_view', x: 1, y: 17, w: 4, h: 6, effects: [], log: 'Белая корка до горизонта, и из неё торчат рёбра кораблей. На палубе ближнего остова кто-то стоит и кричит команды пустоте.' }],
  cleared: [{ group: 'wreck_spiders', if: [{ notFlag: 'wreck_spiders_dead' }], effects: [{ type: 'flag', key: 'wreck_spiders_dead' }], log: 'Пауки у остова перебиты. Из трюма стучат: там услышали.' }],
});
