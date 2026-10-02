// Builds literny_tunnel.json: treasury rail tunnel guarded by Water Authority counters.
import { mapKit } from './map-kit.mjs';
const W = 44, H = 26;
const k = mapKit(W, H, 8103);
const { place, fill, set } = k;
fill(1, 1, W - 2, H - 2, '#'); fill(2, 7, 41, 19, 'F');
for (let x = 2; x < W - 2; x++) for (const y of [12, 14]) set(x, y, '=');
k.rim();
place({ id: 'literny_panel', frame: 'terminal', x: 8, y: 9, label: 'Пульт охраны тоннеля', dialogue: 'literny_panel' });
for (let y = 12; y <= 14; y++) { set(0, y, 'F'); set(W - 1, y, 'F'); }
k.exit({ id: 'west', x: 0, y: 12, w: 1, h: 3, to: 'world', label: 'Карта мира' });
k.exit({ id: 'east', x: W - 1, y: 12, w: 1, h: 3, to: 'literny_train', entry: 'west', label: 'Бронепоезд «Литерный»' });
const peace = [{ flag: 'literny_pass' }];
k.write('literny_tunnel', 'Тоннель «Литерного»', {
  entries: { default: [3, 13], west: [3, 13], east: [40, 13] },
  actors: [{ id: 'player', sheet: 'hero_0', x: 3, y: 13, dir: 3 },
    { id: 'literny_counter_a', sheet: 'counter', x: 17, y: 10, dir: 3, label: 'Казначейский «Счётчик»', creature: 'counter', group: 'literny_counters', peace },
    { id: 'literny_counter_b', sheet: 'counter', x: 27, y: 17, dir: 7, label: 'Казначейский «Счётчик»', creature: 'counter', group: 'literny_counters', peace },
    { id: 'literny_counter_c', sheet: 'counter', x: 36, y: 10, dir: 3, label: 'Казначейский «Счётчик»', creature: 'counter', group: 'literny_counters', peace }],
  arrive: [{ if: [{ notFlag: 'literny_seen' }], effects: [{ type: 'flag', key: 'literny_seen' }, { type: 'quest', quest: 'literny', stage: 'found' }], log: 'Рельсы блестят, будто поезд прошёл вчера. В темноте одновременно поворачиваются три линзы.' }], triggers: [],
});
