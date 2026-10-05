// Builds public/assets/maps/crystal_gate.json: «Верхние ярусы» of Кристалл (stage V) — terraces cut in the salt, glowing
// veins, the copper grille of the gate and its warden; outside the gate Гранит waits; inside, Слюда's stall and the
// ways to the Council, the baths and the deep mines.
import { mapKit } from './map-kit.mjs';

const W = 44;
const H = 40;
const k = mapKit(W, H, 7501);
const { place, fill, set } = k;

fill(2, 2, 41, 37, '_');
for (let y = 19; y < H; y++) for (const x of [21, 22]) set(x, y, '=');
fill(4, 3, 39, 16, '.');
for (let y = 0; y < 19; y++) for (const x of [21, 22]) set(x, y, ':');
for (let x = 0; x < W; x++) for (const y of [9, 10]) if (x < 8 || x > 35) set(x, y, ':');
k.rim();

// the wall of salt across the terraces, with the gate
for (let x = 2; x <= 41; x++) {
  if (x === 21 || x === 22) continue;
  place({ id: `gate_wall_${x}`, frame: x % 6 === 0 ? 'vein_a' : 'salt_hi', x, y: 18, label: x % 6 === 0 ? 'Светящаяся жила' : 'Стена из соли' });
}
place({ id: 'crystal_gate_a', frame: 'bars_closed', x: 21, y: 18, label: 'Ворота Кристалла', dialogue: 'crystal_gate_bars' });
place({ id: 'crystal_gate_b', frame: 'bars_closed', x: 22, y: 18, label: 'Ворота Кристалла', dialogue: 'crystal_gate_bars' });
// inside: veins, niches, Слюда's stall
for (const [x, y, v] of [[6, 4, 'a'], [14, 3, 'b'], [30, 4, 'a'], [37, 6, 'b'], [5, 14, 'b'], [38, 14, 'a']]) place({ id: `vein_${x}_${y}`, frame: `vein_${v}`, x, y, label: 'Светящаяся жила' });
for (const [x, y] of [[10, 5], [33, 5]]) place({ id: `niche_${x}_${y}`, frame: 'niche', x, y, label: 'Ниша-гробница' });
place({ id: 'slyuda_stall', frame: 'stall', x: 27, y: 12, w: 2, h: 1, label: 'Прилавок Слюды' });
for (const [x, y] of [[15, 12], [9, 11]]) place({ id: `heap_${x}_${y}`, frame: 'salt_pile', x, y, label: 'Куча соли' });
// outside: the terrace where people wait
for (const [x, y] of [[8, 24], [34, 26], [14, 32], [30, 33]]) place({ id: `growth_${x}_${y}`, frame: 'crystal', x, y, label: 'Соляная друза' });
place({ id: 'waiting_wagon', frame: 'wagon', x: 9, y: 29, w: 2, h: 1, label: 'Повозка у ворот' });
k.scenery([[2, 2, 41, 37]], { cactus: 0, dead_tree: 0, bush: 0 });

k.exit({ id: 'south', x: 21, y: H - 1, w: 2, h: 1, to: 'world', label: 'Карта мира' });
k.exit({ id: 'north', x: 21, y: 0, w: 2, h: 1, to: 'crystal_council', entry: 'south', label: 'Совет пластов' });
k.exit({ id: 'east', x: W - 1, y: 9, w: 1, h: 2, to: 'crystal_baths', entry: 'west', label: 'Рассольные бани' });
k.exit({ id: 'west', x: 0, y: 9, w: 1, h: 2, to: 'crystal_deep', entry: 'east', label: 'Глубокие копи' });
for (const [x0, x1] of [[0, 3], [W - 4, W - 1]]) k.clear(x0, 9, x1, 10, ':');
k.clear(21, 0, 22, 2, ':');

const actors = [
  { id: 'player', sheet: 'hero_0', x: 21, y: 37, dir: 1 },
  { id: 'warden', sheet: 'salt_guard', x: 20, y: 20, dir: 3, label: 'Страж ворот', dialogue: 'crystal_warden' },
  { id: 'warden_b', sheet: 'salt_guard', x: 23, y: 20, dir: 3, label: 'Страж ворот', dialogue: 'crystal_warden' },
  { id: 'granit', sheet: 'granit', x: 26, y: 23, dir: 3, label: 'Гранит', dialogue: 'granit', if: [{ notFlag: 'with_granit' }, { notFlag: 'lost_granit' }] },
  { id: 'slyuda', sheet: 'slyuda', x: 27, y: 13, dir: 2, label: 'Слюда', dialogue: 'slyuda' },
  { id: 'town_cat', sheet: 'cat_town', x: 17, y: 24, dir: 3, label: 'Кошка на соляном уступе', dialogue: 'street_cat' },
  { id: 'town_dog', sheet: 'dog_town', x: 30, y: 24, dir: 7, label: 'Пёс у ворот', dialogue: 'street_dog' },
  ...[['cfolk_a', 'saltfolk', 12, 8], ['cfolk_b', 'councilor', 32, 10], ['cfolk_c', 'saltfolk', 17, 14]].map(([id, sheet, x, y]) => ({ id, sheet, x, y, dir: 2, label: 'Солевик', dialogue: 'crystal_folk' })),
];

k.write('crystal_gate', 'Верхние ярусы', {
  entries: { default: [21, 37], south: [21, 37], north: [21, 2], east: [41, 9], west: [2, 9] },
  roads: { south: [21, 22], north: [21, 22], east: [9, 10], west: [9, 10] },
  actors,
  arrive: [{ if: [{ notFlag: 'crystal_started' }], effects: [{ type: 'flag', key: 'crystal_started' }, { type: 'quest', quest: 'crystal', stage: 'gate' }] }],
  triggers: [{ id: 'gate_view', x: 18, y: 34, w: 8, h: 5, effects: [], log: 'Кристалл: город вырублен прямо в соляной толще. Жилы в стенах светятся мягко, как вода под луной. У медной решётки — стража в белом.' }],
});
