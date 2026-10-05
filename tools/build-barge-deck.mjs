// Builds public/assets/maps/barge_deck.json: the deck of «Стрежень», a river barge aground in the dry bed and a
// village of scavengers now (docs/story/locations.md): Якорь's forge, the lottery hall of his nephew Кныш, the blind
// navigator's cabin (all under roofs), a mast stub, the gangway down to the riverbed.
import { mapKit } from './map-kit.mjs';

const W = 34;
const H = 24;
const k = mapKit(W, H, 7002);
const { place, fill } = k;

fill(0, 0, W - 1, H - 1, '.');
k.rim();
const D = { x0: 4, y0: 3, x1: 30, y1: 19 };
fill(D.x0, D.y0, D.x1, D.y1, '-');
fill(1, 10, D.x0, 11, '-'); // the gangway
// the hull: high plates on the far sides, a low rail on the near ones, the gangway gap
for (let x = D.x0; x <= D.x1; x++)
  for (let y = D.y0; y <= D.y1; y++) {
    const edge = x === D.x0 || x === D.x1 || y === D.y0 || y === D.y1;
    if (!edge || (x === D.x0 && (y === 10 || y === 11))) continue;
    place({ id: `hull_${x}_${y}`, frame: y === D.y0 || x === D.x0 ? 'hull_hi' : 'hull_lo', x, y, label: 'Борт' });
  }
k.exit({ id: 'gangway', x: 1, y: 10, w: 2, h: 2, to: 'barge_bed', entry: 'gangway', label: 'Сходни в русло' });

// Якорь's forge
k.building('forge', 7, 5, 13, 10, [[10, 10]], 'Стена кузни', 'hull');
place({ id: 'workbench', frame: 'workbench', x: 8, y: 6, w: 2, h: 1, label: 'Верстак Якоря', dialogue: 'workbench', bench: 'workbench' });
place({ id: 'forge_hearth', frame: 'machine', x: 11, y: 6, w: 2, h: 2, label: 'Горн из бочки' });
// the lottery hall: five sealed crates along the back wall
k.building('lottery', 16, 5, 23, 10, [[19, 10]], 'Стена лотерейного зала', 'planks');
for (const x of [17, 18, 20, 21, 22]) place({ id: `lottery_${x}`, frame: 'crate', x, y: 6, label: 'Лотерейный ящик', dialogue: 'lottery_crates' });
place({ id: 'lottery_bench', frame: 'table', x: 22, y: 9, label: 'Лавка зазывалы', dialogue: 'lottery_bench' });
// the navigator's cabin
k.building('cabin', 23, 13, 28, 18, [[23, 15]], 'Стена рубки', 'hull');
place({ id: 'cabin_table', frame: 'table', x: 26, y: 17, label: 'Стол с лоциями' });
place({ id: 'cabin_shelf', frame: 'shelf', x: 27, y: 14, label: 'Полка штурмана' });
// the deck
place({ id: 'mast', frame: 'mast', x: 16, y: 14, label: 'Обломок мачты' });
for (const [x, y] of [[6, 17], [8, 17], [14, 18]]) place({ id: `barrel_${x}_${y}`, frame: 'barrel', x, y, label: 'Бочка' });
place({ id: 'deck_sacks', frame: 'sacks', x: 20, y: 17, label: 'Мешки с хламом' });
place({ id: 'deck_scrap', frame: 'scrap_pile', x: 11, y: 16, label: 'Куча хлама', dialogue: 'scrap' });
k.scenery([[0, 0, W - 1, H - 1]], { cactus: 0, dead_tree: 0, bush: 0 });

const actors = [
  { id: 'player', sheet: 'hero_0', x: 6, y: 10, dir: 1 },
  { id: 'yakor', sheet: 'yakor', x: 10, y: 8, dir: 3, label: 'Якорь', dialogue: 'yakor' },
  { id: 'knysh', sheet: 'knysh', x: 19, y: 8, dir: 3, label: 'Кныш', dialogue: 'knysh' },
  { id: 'efim', sheet: 'efim', x: 26, y: 15, dir: 5, label: 'Штурман Ефим', dialogue: 'efim' },
  { id: 'scav_a', sheet: 'scavenger', x: 12, y: 13, dir: 1, label: 'Старьёвщик', dialogue: 'barge_scav' },
  { id: 'scav_b', sheet: 'scavenger', x: 20, y: 15, dir: 3, label: 'Старьёвщица', dialogue: 'barge_scav' },
  { id: 'town_cat', sheet: 'cat_town', x: 8, y: 14, dir: 6, label: 'Палубная кошка', dialogue: 'street_cat' },
];

k.write('barge_deck', 'Баржа «Стрежень»', {
  entries: { default: [6, 10], gangway: [6, 10] },
  actors,
  triggers: [{ id: 'deck_view', x: 5, y: 9, w: 3, h: 4, effects: [], log: 'Палуба «Стрежня» скрипит под ногами. Пахнет окалиной и дымом: где-то стучит молот.' }],
});
