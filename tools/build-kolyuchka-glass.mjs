// Builds public/assets/maps/kolyuchka_glass.json: «Старые теплицы» east of Колючка (docs/story/locations.md):
// three rusted greenhouse frames with a few panes left, dry beds, the seed store under a roof and a lock
// («Семена под стеклом»), rust mites on the iron.
import { mapKit } from './map-kit.mjs';

const W = 32;
const H = 26;
const k = mapKit(W, H, 4409);
const { place, fill, set } = k;

fill(3, 3, 28, 22, ':');
k.rim();
for (let x = 0; x <= 6; x++) for (const y of [12, 13]) set(x, y, ','); // the path from the farm's east gate
k.exit({ id: 'west', x: 0, y: 12, w: 1, h: 2, to: 'kolyuchka', entry: 'glass', label: 'Хутор' });

/** A greenhouse: a frame of glass walls with a doorway; panes left on the back walls. */
function greenhouse(id, x0, y0, x1, y1, door) {
  for (let x = x0; x <= x1; x++)
    for (let y = y0; y <= y1; y++) {
      const edge = x === x0 || x === x1 || y === y0 || y === y1;
      if (!edge || (x === door[0] && y === door[1]) || (x + y) % 5 === 0) continue;
      place({ id: `${id}_${x}_${y}`, frame: y === y0 || x === x0 ? 'glass_hi' : 'glass_lo', x, y, label: 'Рама теплицы' });
    }
  for (let y = y0 + 2; y < y1 - 1; y += 2) place({ id: `${id}_bed_${y}`, frame: 'cactus_bed', x: x0 + 2, y, w: 2, h: 1, label: 'Сухая грядка' });
}
greenhouse('gh1', 6, 3, 12, 9, [12, 6]);
greenhouse('gh2', 6, 15, 12, 21, [12, 18]);
greenhouse('gh3', 15, 10, 20, 17, [15, 13]);

// the seed store
k.building('seedvault', 23, 5, 28, 10, [[25, 10]], 'Стена хранилища', 'tin');
place({ id: 'seed_door', frame: 'door_closed', x: 25, y: 10, label: 'Дверь хранилища', dialogue: 'seed_door' });
place({ id: 'seed_box', frame: 'crate_small', x: 26, y: 6, label: 'Жестяной ящик с биркой', dialogue: 'seed_box' });
place({ id: 'seed_shelf', frame: 'shelf', x: 24, y: 6, label: 'Полка с пустыми банками' });
place({ id: 'glass_barrel', frame: 'barrel', x: 21, y: 20, label: 'Бочка для полива' });
k.scenery([[3, 3, 28, 22]], { cactus: 5, dead_tree: 3, bush: 6 });

const actors = [
  { id: 'player', sheet: 'hero_0', x: 2, y: 12, dir: 1 },
  ...[[16, 12], [18, 15], [9, 18]].map(([x, y], i) => ({ id: `mite_${i}`, sheet: 'rust_mite', creature: 'rust_mite', group: 'mites', x, y, dir: 2 })),
];

k.write('kolyuchka_glass', 'Старые теплицы', {
  entries: { default: [2, 12], west: [2, 12] },
  roads: { west: [12, 13] },
  actors,
  triggers: [{ id: 'glass_view', x: 1, y: 11, w: 3, h: 4, effects: [], log: 'Рамы довоенных теплиц торчат из песка, как рёбра. Где-то ещё блестит стекло.' }],
});
