// Builds public/assets/maps/depot_archive.json: «Архив Бригады» (stage U) — stacks of the Water Authority's
// drawings, the table where the plate of the Mandate is read, a copy of Верес's diary, the back hatch from the
// tunnels.
import { mapKit } from './map-kit.mjs';

const W = 32;
const H = 28;
const k = mapKit(W, H, 7703);
const { place, fill, set } = k;

fill(2, 2, 29, 25, 'F');
for (let x = 0; x < 3; x++) for (const y of [13, 14]) set(x, y, '=');
k.rim();

for (const x of [8, 12, 16, 20, 24]) for (const y of [5, 9]) place({ id: `stacks_${x}_${y}`, frame: 'stacks', x, y, label: 'Стеллажи Водоуправления' });
place({ id: 'plate_table', frame: 'table', x: 14, y: 16, label: 'Стол чертёжника', dialogue: 'plate_table' });
place({ id: 'diary_shelf', frame: 'stacks', x: 24, y: 17, label: 'Полка с дневниками', dialogue: 'diary_shelf' });
place({ id: 'archive_hatch', frame: 'hatch', x: 27, y: 23, block: false, label: 'Люк в туннели', dialogue: 'archive_hatch' });
k.scenery([[2, 2, 29, 25]], { cactus: 0, dead_tree: 0, bush: 0 });

k.exit({ id: 'west', x: 0, y: 13, w: 1, h: 2, to: 'depot_yard', entry: 'east', label: 'Двор депо' });

const actors = [{ id: 'player', sheet: 'hero_0', x: 2, y: 13, dir: 2 }];

k.write('depot_archive', 'Архив Бригады', {
  entries: { default: [2, 13], west: [2, 13], hatch: [27, 22] },
  roads: { west: [13, 14] },
  actors,
  arrive: [{ if: [{ notFlag: 'archive_seen' }], effects: [{ type: 'flag', key: 'archive_seen' }, { type: 'quest', quest: 'upper', stage: 'plate' }], log: 'Архив Бригады: стеллажи под потолок, чертежи в жестяных тубусах. Пахнет бумагой и машинным маслом.' }],
  triggers: [],
});
