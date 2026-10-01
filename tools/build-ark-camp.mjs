// Builds public/assets/maps/ark_camp.json: «Ковчег: лагерь паломников» (stage N) — tents with empty flasks around a
// great wooden ship on piles in the dry delta; a mother waits for her daughter who went into the desert.
import { mapKit } from './map-kit.mjs';

const W = 40;
const H = 36;
const k = mapKit(W, H, 8007);
const { place, fill, set } = k;

fill(3, 3, 36, 32, '.');
for (let y = 0; y < H; y++) for (const x of [19, 20]) set(x, y, '=');
k.rim();

for (let x = 8; x <= 31; x += 3) if (x < 17 || x > 22) place({ id: `hull_${x}`, frame: 'hull_hi', x, y: 5, label: 'Борт Ковчега' });
for (const [x, y] of [[7, 14], [12, 18], [27, 14], [31, 19], [9, 25], [29, 26], [15, 28]]) place({ id: `tent_${x}_${y}`, frame: 'tent', x, y, label: 'Палатка паломников' });
for (const [x, y] of [[14, 12], [25, 22]]) place({ id: `fire_${x}`, frame: 'campfire', x, y, label: 'Костёр' });
k.scenery([[3, 3, 36, 32]], { cactus: 2, dead_tree: 1, bush: 3 });

k.exit({ id: 'south', x: 19, y: H - 1, w: 2, h: 1, to: 'world', label: 'Карта мира' });
k.exit({ id: 'north', x: 19, y: 0, w: 2, h: 1, to: 'ark_ship', entry: 'south', label: 'Ковчег' });

const actors = [
  { id: 'player', sheet: 'hero_0', x: 19, y: 33, dir: 1 },
  { id: 'agnia_mother', sheet: 'pilgrim', x: 11, y: 20, dir: 2, label: 'Мать Агнии', dialogue: 'agnia_mother' },
  { id: 'agnia', sheet: 'agnia', x: 13, y: 20, dir: 6, label: 'Агния', dialogue: 'agnia', if: [{ flag: 'stray', eq: 'found' }] },
  ...[['pilgrim_a', 16, 15], ['pilgrim_b', 24, 18], ['pilgrim_c', 22, 27]].map(([id, x, y]) => ({ id, sheet: 'pilgrim', x, y, dir: 2, label: 'Паломник', dialogue: 'pilgrim_talk', if: [{ notFlag: 'ark_left' }] })),
  ...[['fanatic_a', 17, 10], ['fanatic_b', 23, 10]].map(([id, x, y]) => ({ id, sheet: 'fanatic', x, y, dir: 2, label: 'Фанатик', dialogue: 'fanatic', creature: 'fanatic', group: 'fanatics', peace: [{ notFlag: 'fanatics_angry' }] })),
];

k.write('ark_camp', 'Ковчег', {
  entries: { default: [19, 33], south: [19, 33], north: [19, 2] },
  roads: { south: [19, 20], north: [19, 20] },
  actors,
  arrive: [{ if: [{ notFlag: 'ark_seen' }], effects: [{ type: 'flag', key: 'ark_seen' }], log: 'Ковчег: деревянное судно на сваях посреди сухой дельты. Вокруг — палатки и люди с пустыми флягами. Они ждут дождя.' }],
  cleared: [{ group: 'fanatics', if: [{ flag: 'fanatics_angry' }, { notFlag: 'fanatics_down' }], effects: [{ type: 'flag', key: 'fanatics_down' }], log: 'Фанатики лежат у сходней. Паломники отводят глаза.' }],
  triggers: [],
});
