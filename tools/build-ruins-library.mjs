// Builds public/assets/maps/ruins_library.json: «Библиотека и архив» (stage B) — card catalogues, stacks, the book
// on the «Суховей» with torn pages, the cabinet of the dam's drawings.
import { mapKit } from './map-kit.mjs';

const W = 36;
const H = 30;
const k = mapKit(W, H, 7806);
const { place, fill, set } = k;

fill(2, 2, 33, 27, 'F');
for (let x = 0; x < 3; x++) for (const y of [14, 15]) set(x, y, '=');
k.rim();

for (const x of [8, 12, 16, 20, 24, 28]) for (const y of [5, 10]) place({ id: `stacks_${x}_${y}`, frame: 'stacks', x, y, label: 'Стеллажи' });
for (const [x, y] of [[8, 20], [10, 20], [12, 20]]) place({ id: `catalog_${x}_${y}`, frame: 'card_catalog', x, y, label: 'Карточный каталог', dialogue: 'card_catalog' });
place({ id: 'suhovey_book', frame: 'table', x: 20, y: 18, label: 'Раскрытая книга', dialogue: 'suhovey_book' });
place({ id: 'drawings_cabinet', frame: 'locker', x: 28, y: 22, label: 'Шкаф чертежей', dialogue: 'drawings_cabinet' });
k.scenery([[2, 2, 33, 27]], { cactus: 0, dead_tree: 0, bush: 0 });

k.exit({ id: 'west', x: 0, y: 14, w: 1, h: 2, to: 'ruins_streets', entry: 'east', label: 'Улицы' });

const actors = [{ id: 'player', sheet: 'hero_0', x: 2, y: 14, dir: 2 }];

k.write('ruins_library', 'Библиотека Светлоречья', {
  entries: { default: [2, 14], west: [2, 14] },
  roads: { west: [14, 15] },
  actors,
  triggers: [],
});
