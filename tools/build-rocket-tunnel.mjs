// A straight processional passage: four discoverable recesses, none required to reach the garden.
import { mapKit } from './map-kit.mjs';

const k = mapKit(36, 20, 8162);
k.fill(0, 0, 35, 19, '#');
k.fill(14, 1, 21, 18, 'F');
for (let y = 0; y < 20; y++) for (const x of [17, 18]) k.set(x, y, '=');
k.building('rocket_gallery_room', 3, 2, 13, 8, [[13, 6]], 'Каменная перегородка');
k.building('rocket_forbidden_room', 22, 2, 32, 8, [[22, 6]], 'Каменная перегородка');
k.building('rocket_archive_room', 3, 11, 13, 17, [[13, 14]], 'Каменная перегородка');
k.building('rocket_pantry_room', 22, 11, 32, 17, [[22, 14]], 'Каменная перегородка');
k.rim();
k.place({ id: 'rocket_early_archive', frame: 'rocket_mural', x: 8, y: 14, block: false, label: 'Старые журналы', dialogue: 'rocket_early_archive' });
k.place({ id: 'rocket_pantry', frame: 'crate', x: 27, y: 14, label: 'Кладовая', dialogue: 'rocket_pantry' });
k.place({ id: 'rocket_gallery', frame: 'rocket_statue', x: 8, y: 5, label: 'Галерея', dialogue: 'rocket_gallery' });
k.place({ id: 'rocket_forbidden', frame: 'door_closed', x: 27, y: 5, label: 'Запретная дверь', dialogue: 'rocket_forbidden' });
k.place({ id: 'rocket_mural_a', frame: 'rocket_mural', x: 15, y: 10, block: false, label: 'Фреска', dialogue: 'rocket_wall' });
k.place({ id: 'rocket_mural_b', frame: 'rocket_mural', x: 20, y: 10, block: false, label: 'Фреска', dialogue: 'rocket_wall' });
k.exit({ id: 'south', x: 17, y: 19, w: 2, h: 1, to: 'rocket_outpost', entry: 'tunnel', label: 'Внешний пост' });
k.exit({ id: 'north', x: 17, y: 0, w: 2, h: 1, to: 'rocket_sanctuary', entry: 'south', label: 'Дневной свет' });
k.write('rocket_tunnel', 'Путь Покорности', {
  entries: { default: [17, 17], south: [17, 17], north: [17, 2], archive: [27, 7] },
  roads: { south: [17, 18], north: [17, 18] },
  actors: [
    { id: 'player', sheet: 'hero_0', x: 17, y: 17, dir: 1 },
    { id: 'rocket_chain', sheet: 'rocket_guard', x: 19, y: 14, dir: 3, label: 'Цепь', dialogue: 'rocket_chain', creature: 'rocket_guard', group: 'rocket_guards', peace: [{ notFlag: 'rocket_blasphemer' }] },
  ],
  arrive: [{ if: [{ notFlag: 'rocket_tunnel_seen' }], effects: [{ type: 'quest', quest: 'rocket', stage: 'complex' }], log: 'Сарай скрывает бетонный ход. За стеной журчит вода, но коридор ведёт мимо четырёх запертых ниш.' }],
});
