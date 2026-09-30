// Builds public/assets/maps/barge_post.json: the post station ruins south of the barge along the riverbed
// (docs/story/locations.md). The courier who carried the Mandate died here two hundred years ago; the safe where
// the tube lay is empty now. Looters pick over the mailbags.
import { mapKit } from './map-kit.mjs';

const W = 30;
const H = 24;
const k = mapKit(W, H, 7003);
const { place, fill, set } = k;

fill(3, 3, 26, 20, ':');
for (let y = 0; y <= 7; y++) for (const x of [14, 15]) set(x, y, ','); // the path up the riverbed
k.rim();
for (let y = 0; y <= 2; y++) for (const x of [14, 15]) set(x, y, ',');
k.exit({ id: 'north', x: 14, y: 0, w: 2, h: 1, to: 'barge_bed', entry: 'south', label: 'Мёртвое русло' });

k.building('post', 8, 8, 20, 15, [[14, 15]], 'Стена почтовой станции', 'planks');
place({ id: 'post_safe', frame: 'safe', x: 18, y: 9, label: 'Сейф почтовой станции', dialogue: 'post_safe' });
place({ id: 'post_counter', frame: 'counter', x: 10, y: 10, w: 2, h: 1, label: 'Стойка почты' });
place({ id: 'mailbags', frame: 'sacks', x: 12, y: 13, label: 'Почтовые мешки', dialogue: 'mailbags' });
place({ id: 'post_shelf', frame: 'shelf', x: 15, y: 9, label: 'Ячейки для писем' });
place({ id: 'post_car', frame: 'car_y', x: 23, y: 5, w: 1, h: 2, label: 'Почтовый фургон' });
place({ id: 'post_tires', frame: 'tires', x: 5, y: 18, label: 'Покрышки' });
k.scenery([[3, 3, 26, 20]], { cactus: 4, dead_tree: 3, bush: 6 });

const actors = [
  { id: 'player', sheet: 'hero_0', x: 14, y: 2, dir: 3 },
  ...[[22, 17], [24, 19]].map(([x, y], i) => ({ id: `looter_${i}`, sheet: 'raider', creature: 'raider', group: 'looters', x, y, dir: 6, patrol: i ? undefined : [[22, 17], [17, 18], [22, 19]] })),
];

k.write('barge_post', 'Почтовая станция', {
  entries: { default: [14, 2], north: [14, 2] },
  roads: { north: [14, 15] },
  actors,
  triggers: [{ id: 'post_view', x: 13, y: 1, w: 4, h: 3, effects: [], log: 'Почтовая станция у Мёртвого русла: провалившаяся крыша, мешки в пыли. У фургона кто-то роется.' }],
});
