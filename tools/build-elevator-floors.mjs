// Builds public/assets/maps/elevator_floors.json: «Этажи элеватора» (stage N) — Сизый's hall among the old grain
// bins, his mercenaries, the cage in the cellar with Ключник, Лейка's brother.
import { mapKit } from './map-kit.mjs';

const W = 36;
const H = 30;
const k = mapKit(W, H, 8005);
const { place, fill, set } = k;

fill(2, 2, 33, 27, 'F');
for (let y = 24; y < H; y++) for (const x of [17, 18]) set(x, y, '=');
k.rim();

for (const [x, y] of [[6, 5], [10, 5], [25, 5], [29, 5]]) place({ id: `bin_${x}`, frame: 'tank', x, y, label: 'Зерновой бункер' });
place({ id: 'cage', frame: 'bars_closed', x: 26, y: 20, label: 'Клетка должника', dialogue: 'debtor_cage' });
place({ id: 'sizy_table', frame: 'table', x: 17, y: 9, label: 'Стол Сизого' });
k.scenery([[2, 2, 33, 27]], { cactus: 0, dead_tree: 0, bush: 0 });

k.exit({ id: 'south', x: 17, y: H - 1, w: 2, h: 1, to: 'elevator_yard', entry: 'north', label: 'Двор' });

const THIRST = [{ notFlag: 'thirst_enemy' }];
const actors = [
  { id: 'player', sheet: 'hero_0', x: 17, y: 27, dir: 1 },
  { id: 'sizy', sheet: 'sizy', x: 17, y: 11, dir: 1, label: 'Сизый', dialogue: 'sizy', creature: 'sizy', group: 'thirst_top', peace: THIRST, if: [{ notFlag: 'sizy_dead' }] },
  ...[['merc_a', 12, 13], ['merc_b', 22, 13]].map(([id, x, y]) => ({ id, sheet: 'raider', x, y, dir: 2, label: 'Наёмник «Жажды»', dialogue: 'thirst_guard', creature: 'raider', group: 'thirst_top', peace: THIRST })),
  { id: 'klyuchnik', sheet: 'klyuchnik', x: 27, y: 21, dir: 5, label: 'Ключник', dialogue: 'klyuchnik', if: [{ notFlag: 'debtor' }] },
];

k.write('elevator_floors', 'Этажи элеватора', {
  entries: { default: [17, 27], south: [17, 27] },
  roads: { south: [17, 18] },
  actors,
  cleared: [{ group: 'thirst_top', if: [{ flag: 'thirst_enemy' }, { notFlag: 'sizy_dead' }], effects: [{ type: 'flag', key: 'sizy_dead' }, { type: 'flag', key: 'elevator_taken' }, { type: 'flag', key: 'open_cage' }], log: 'Сизый лежит у своего стола. «Жажда» осталась без головы, Элеватор — без хозяина.' }],
  triggers: [],
});
