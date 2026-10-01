// Builds public/assets/maps/silence_house.json: «Приют Тишины» (stage N) — an old hospital at the edge of the Dead
// fields: wards with bunks, a herb garden, Матушка Кора and Тимофей Книжник; when the Trust comes to «burn the
// sickness», captain Сухоруков and his collectors stand at the gate.
import { mapKit } from './map-kit.mjs';

const W = 40;
const H = 32;
const k = mapKit(W, H, 8003);
const { place, fill, set } = k;

fill(3, 3, 36, 28, ':');
for (let y = 22; y < H; y++) for (const x of [19, 20]) set(x, y, '=');
k.rim();
k.building('ward', 5, 4, 26, 15, [[15, 15], [16, 15]], 'Стена больницы', 'tin');

for (const [x, y] of [[7, 6], [10, 6], [13, 6], [7, 10], [10, 10], [13, 10]]) place({ id: `bunk_${x}_${y}`, frame: 'bunk', x, y, label: 'Койка' });
place({ id: 'books', frame: 'shelf', x: 22, y: 6, label: 'Книги Полусухих', dialogue: 'silence_books' });
for (const [x, y] of [[29, 8], [31, 9], [33, 8], [29, 12], [32, 12]]) place({ id: `herb_${x}_${y}`, frame: 'cactus_bed', x, y, label: 'Грядка трав' });
k.scenery([[3, 3, 36, 28]], { cactus: 1, dead_tree: 2, bush: 3 });

k.exit({ id: 'south', x: 19, y: H - 1, w: 2, h: 1, to: 'world', label: 'Карта мира' });

const RAID = [{ flag: 'silence_raid', eq: 'coming' }];
const actors = [
  { id: 'player', sheet: 'hero_0', x: 19, y: 29, dir: 1 },
  { id: 'kora', sheet: 'kora', x: 18, y: 9, dir: 2, label: 'Матушка Кора', dialogue: 'kora', if: [{ notFlag: 'silence_gone' }] },
  { id: 'timofey', sheet: 'timofey', x: 22, y: 9, dir: 3, label: 'Тимофей Книжник', dialogue: 'timofey', if: [{ notFlag: 'with_timofey' }, { notFlag: 'lost_timofey' }] },
  ...[['halfdry_a', 9, 12], ['halfdry_b', 31, 14]].map(([id, x, y]) => ({ id, sheet: 'halfdry', x, y, dir: 2, label: 'Полусухой', dialogue: 'halfdry', if: [{ notFlag: 'silence_gone' }] })),
  { id: 'suhorukov', sheet: 'raid_captain', x: 19, y: 20, dir: 1, label: 'Капитан Сухоруков', dialogue: 'suhorukov', creature: 'raid_captain', group: 'raid', peace: [{ notFlag: 'raid_fight' }], if: RAID },
  ...[['raid_a', 16, 21], ['raid_b', 23, 21], ['raid_c', 20, 23]].map(([id, x, y]) => ({ id, sheet: 'collector', x, y, dir: 1, label: 'Сборщик Треста', dialogue: 'raid_collector', creature: 'collector', group: 'raid', peace: [{ notFlag: 'raid_fight' }], if: RAID })),
];

k.write('silence_house', 'Приют Тишины', {
  entries: { default: [19, 29], south: [19, 29] },
  roads: { south: [19, 20] },
  actors,
  arrive: [
    { if: [{ notFlag: 'silence_seen' }], effects: [{ type: 'flag', key: 'silence_seen' }], log: 'Приют Тишины: бывшая больница, грядки трав, люди с серой, как кора, кожей. Здесь говорят медленно и тихо.' },
    { if: [{ flag: 'chapter2_done' }, { notFlag: 'silence_raid' }, { flag: 'silence_seen' }], effects: [{ type: 'flag', key: 'silence_raid', value: 'coming' }, { type: 'quest', quest: 'silence_raid', stage: 'asked' }], log: 'У ворот приюта — серые шинели. Трест пришёл «жечь заразу».' },
  ],
  cleared: [{ group: 'raid', if: [{ flag: 'raid_fight' }, { flag: 'silence_raid', eq: 'coming' }], effects: [{ type: 'flag', key: 'silence_raid', value: 'fought' }, { type: 'quest', quest: 'silence_raid', stage: 'done' }, { type: 'xp', amount: 150 }, { type: 'flag', key: 'trust_grudge' }], log: 'Облава отбита. Полусухие молча собирают у ворот брошенные факелы.' }],
  triggers: [],
});
