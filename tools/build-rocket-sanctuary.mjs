// Tiny walled oasis; the limited cistern is visible, not a new Deep Water.
import { mapKit } from './map-kit.mjs';

const k = mapKit(32, 28, 8163);
k.fill(3, 3, 28, 24, 'F');
for (let y = 0; y < 28; y++) for (const x of [15, 16]) k.set(x, y, '=');
k.rim();
k.place({ id: 'rocket_fountain', frame: 'rocket_basin', x: 15, y: 13, block: false, label: 'Чаша источника', dialogue: 'rocket_fountain' });
for (const [x, y] of [[5, 7], [25, 9], [6, 18], [25, 19]]) k.place({ id: `rocket_tree_${x}_${y}`, frame: 'bush', x, y, label: 'Сад Обители' });
k.place({ id: 'rocket_water_meter', frame: 'machine', x: 23, y: 13, label: 'Счётчик воды', dialogue: 'rocket_meter' });
k.exit({ id: 'south', x: 15, y: 27, w: 2, h: 1, to: 'rocket_tunnel', entry: 'north', label: 'Путь Покорности' });
k.exit({ id: 'north', x: 15, y: 0, w: 2, h: 1, to: 'rocket_palace', entry: 'south', label: 'Зал Ракеты' });
k.write('rocket_sanctuary', 'Закрытый сад', {
  entries: { default: [15, 24], south: [15, 24], north: [15, 2] },
  roads: { south: [15, 16], north: [15, 16] },
  actors: [
    { id: 'player', sheet: 'hero_0', x: 15, y: 24, dir: 1 },
    { id: 'rocket_bowl_keeper', sheet: 'rocket_keeper', x: 19, y: 11, dir: 3, label: 'Хранитель Миски', dialogue: 'rocket_keeper' },
    { id: 'rocket_garden_guard', sheet: 'rocket_guard', x: 24, y: 17, dir: 4, label: 'Страж сада', dialogue: 'rocket_guard', creature: 'rocket_guard', group: 'rocket_guards', peace: [{ notFlag: 'rocket_blasphemer' }] },
  ],
  arrive: [{ if: [{ notFlag: 'rocket_sanctuary_seen' }], effects: [{ type: 'quest', quest: 'rocket', stage: 'audience' }], log: 'Свет. Тонкая струя воды. Небольшой сад за высокой стеной — не мираж, но и не море.' }],
});
