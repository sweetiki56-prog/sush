// Secret Obitel: severe concrete checkpoint, with a shabby shed hiding the descent.
import { mapKit } from './map-kit.mjs';

const k = mapKit(28, 26, 8161);
k.fill(3, 3, 24, 22, ':');
for (let y = 20; y < 26; y++) for (const x of [13, 14]) k.set(x, y, '=');
k.rim();
k.building('rocket_shed', 10, 4, 18, 10, [[14, 10]], 'Стена сарая', 'tin');
k.place({ id: 'rocket_hatch', frame: 'hatch', x: 14, y: 7, block: false, label: 'Люк под ковром', dialogue: 'rocket_hatch' });
k.place({ id: 'rocket_chest', frame: 'locker', x: 18, y: 17, label: 'Ящик паломника', dialogue: 'rocket_chest' });
k.place({ id: 'rocket_duct', frame: 'hatch', x: 23, y: 12, block: false, label: 'Технический лаз', dialogue: 'rocket_duct' });
k.place({ id: 'rocket_mark', frame: 'rocket_plaque', x: 14, y: 15, block: false, label: 'Знак Обители', dialogue: 'rocket_mark' });
for (const x of [4, 22]) k.place({ id: `rocket_tower_${x}`, frame: 'searchlight', x, y: 7, label: 'Прожектор' });
k.exit({ id: 'south', x: 13, y: 25, w: 2, h: 1, to: 'world', label: 'Карта мира' });
k.write('rocket_outpost', 'Внешний пост Обители', {
  entries: { default: [13, 22], south: [13, 22], tunnel: [14, 8] },
  roads: { south: [13, 14] },
  actors: [
    { id: 'player', sheet: 'hero_0', x: 13, y: 22, dir: 1 },
    { id: 'rocket_psar', sheet: 'rocket_guard', x: 11, y: 18, dir: 3, label: 'Псарь', dialogue: 'rocket_psar', creature: 'rocket_guard', group: 'rocket_guards', peace: [{ notFlag: 'rocket_blasphemer' }] },
    { id: 'rocket_post_guard', sheet: 'rocket_guard', x: 19, y: 12, dir: 4, label: 'Страж Обители', dialogue: 'rocket_guard', creature: 'rocket_guard', group: 'rocket_guards', peace: [{ notFlag: 'rocket_blasphemer' }] },
  ],
  arrive: [{ if: [{ notFlag: 'rocket_post_seen' }], effects: [{ type: 'flag', key: 'rocket_post_seen' }, { type: 'quest', quest: 'rocket', stage: 'post' }], log: 'За низким сараем стоят прожекторы и двое стражей. Слишком много охраны для пустого двора.' }],
});
