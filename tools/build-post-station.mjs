// Builds post_station.json: the collapsed southern station where Veres's last courier died.
import { mapKit } from './map-kit.mjs';

const W = 34, H = 28;
const k = mapKit(W, H, 8101);
const { place, fill, set } = k;
fill(3, 3, 30, 24, ':');
for (let y = 0; y < H; y++) for (const x of [16, 17]) set(x, y, ',');
k.rim();
k.building('station', 6, 7, 27, 20, [[16, 20]], 'Стена почтовой станции', 'planks');
place({ id: 'courier_mummy', frame: 'skeleton', x: 10, y: 10, block: false, label: 'Последний гонец', dialogue: 'courier_mummy' });
place({ id: 'courier_counter', frame: 'counter', x: 20, y: 10, w: 2, h: 1, label: 'Почтовая стойка' });
place({ id: 'courier_safe', frame: 'safe', x: 24, y: 9, label: 'Пустой сейф', dialogue: 'courier_safe' });
place({ id: 'courier_bags', frame: 'sacks', x: 13, y: 16, label: 'Истлевшие мешки' });
place({ id: 'courier_hatch', frame: 'hatch', x: 8, y: 17, block: false, label: 'Провал в подвал' });
k.scenery([[3, 3, 30, 24]], { cactus: 4, dead_tree: 4, bush: 5 });
for (const x of [16, 17]) set(x, H - 1, ',');
k.exit({ id: 'south', x: 16, y: H - 1, w: 2, h: 1, to: 'world', label: 'Карта мира' });
k.write('post_station', 'Последняя почтовая станция', {
  entries: { default: [16, 23], south: [16, 23] }, roads: { south: [16, 17] },
  actors: [{ id: 'player', sheet: 'hero_0', x: 16, y: 23, dir: 1 }],
  arrive: [{ if: [{ notFlag: 'courier_seen' }], effects: [{ type: 'flag', key: 'courier_seen' }, { type: 'quest', quest: 'last_courier', stage: 'found' }], log: 'Южная почтовая станция: крыша провалилась, сейф вынесен. Под стойкой темнеет старый подвал.' }], triggers: [],
});
