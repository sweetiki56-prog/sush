// Ceremony in a converted service hall; the dog is a peaceful actor, never a boss unit.
import { mapKit } from './map-kit.mjs';

const k = mapKit(32, 26, 8164);
k.fill(2, 2, 29, 23, 'F');
for (let y = 0; y < 26; y++) for (const x of [15, 16]) k.set(x, y, '=');
k.rim();
for (const y of [16, 17]) for (const x of [30, 31]) k.set(x, y, '=');
k.place({ id: 'rocket_throne', frame: 'rocket_basin', x: 16, y: 7, block: false, label: 'Старое насосное основание', dialogue: 'rocket_throne' });
k.place({ id: 'rocket_statue_a', frame: 'rocket_statue', x: 7, y: 11, label: 'Статуя Ракеты', dialogue: 'rocket_gallery' });
k.place({ id: 'rocket_statue_b', frame: 'rocket_statue', x: 25, y: 11, label: 'Статуя Ракеты', dialogue: 'rocket_gallery' });
k.exit({ id: 'south', x: 15, y: 25, w: 2, h: 1, to: 'rocket_sanctuary', entry: 'north', label: 'Сад' });
k.exit({ id: 'east', x: 31, y: 16, w: 1, h: 2, to: 'rocket_archive', entry: 'west', label: 'Архив' });
k.write('rocket_palace', 'Зал Ракеты', {
  entries: { default: [15, 22], south: [15, 22], east: [28, 16] },
  roads: { south: [15, 16], east: [16, 17] },
  actors: [
    { id: 'player', sheet: 'hero_0', x: 15, y: 22, dir: 1 },
    { id: 'rocket_dog_actor', sheet: 'rocket_dog', x: 16, y: 9, dir: 2, label: 'Ракета', dialogue: 'rocket_audience', if: [{ notFlag: 'rocket_blasphemer' }] },
    { id: 'rocket_tolm', sheet: 'rocket_tolm', x: 20, y: 11, dir: 3, label: 'Толмач', dialogue: 'rocket_tolm' },
    { id: 'rocket_hall_guard', sheet: 'rocket_guard', x: 24, y: 17, dir: 4, label: 'Страж зала', dialogue: 'rocket_guard', creature: 'rocket_guard', group: 'rocket_guards', peace: [{ notFlag: 'rocket_blasphemer' }] },
  ],
  arrive: [{ if: [{ notFlag: 'rocket_palace_seen' }], effects: [{ type: 'quest', quest: 'rocket', stage: 'audience' }], log: 'На месте старого пульта сидит чёрно-подпалая собака с надрезом на левом ухе. Остальные ждут её движения.' }],
});
