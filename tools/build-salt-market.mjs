// Builds public/assets/maps/salt_market.json: «Соляной рынок» of Соль (stage K) — the salt-block gate from the east
// road, the Guild's shop and beam scales with the weigher, stalls and salt heaps, the smuggler Хруст and the back
// yard where «Жажда» takes the sacks, the caravan master Ефрем. Ways north to the Guild yard, east to the arena,
// south to the mines.
import { mapKit } from './map-kit.mjs';

const W = 40;
const H = 34;
const k = mapKit(W, H, 7401);
const { place, fill, set } = k;

fill(3, 3, 36, 30, '_');
for (let x = 0; x < W; x++) for (const y of [17, 18]) set(x, y, '=');
for (let y = 0; y < 17; y++) for (const x of [20, 21]) set(x, y, '=');
for (let y = 19; y < H; y++) for (const x of [20, 21]) set(x, y, '=');
k.rim();

// the gate from the road: two salt towers, a gap for the road
for (const y of [13, 14, 15, 16, 19, 20, 21, 22]) place({ id: `gate_wall_${y}`, frame: 'salt_hi', x: 4, y, label: 'Стена из соляных блоков' });
// the Guild's shop
k.building('shop', 6, 4, 13, 10, [[13, 7]], 'Стена лавки', 'planks', 'salt');
place({ id: 'shop_counter', frame: 'counter', x: 8, y: 6, w: 2, h: 1, label: 'Прилавок Гильдии' });
place({ id: 'shop_shelf', frame: 'shelf', x: 11, y: 5, label: 'Полка с товаром' });
// the Guild's beam scales on the road, with the weigher
place({ id: 'guild_scales', frame: 'beam_scales', x: 13, y: 20, w: 2, h: 1, label: 'Весы Гильдии', dialogue: 'guild_scales' });
place({ id: 'weights', frame: 'crate_small', x: 16, y: 21, label: 'Гири весовщика' });
// stalls, heaps and sacks
for (const [x, y, i] of [[24, 12, 1], [29, 12, 2], [24, 22, 3], [9, 24, 4]]) place({ id: `stall_${i}`, frame: 'stall', x, y, w: 2, h: 1, label: 'Лавка' });
for (const [x, y] of [[33, 10], [27, 8], [16, 11], [7, 14]]) place({ id: `heap_${x}_${y}`, frame: 'salt_pile', x, y, label: 'Куча соли' });
for (const [x, y] of [[31, 21], [17, 26]]) place({ id: `sacks_${x}_${y}`, frame: 'sacks', x, y, label: 'Мешки с солью' });
place({ id: 'salt_notice', frame: 'notice', x: 23, y: 15, label: 'Доска Гильдии', dialogue: 'salt_notice' });
// Ефрем's wagon by the west wall
place({ id: 'efrem_wagon', frame: 'wagon', x: 6, y: 26, w: 2, h: 1, label: 'Повозка Ефрема' });
// the back yard behind the stalls: a fence of salt, the buyer waits there
for (const x of [29, 30, 31, 32, 33, 34, 35, 36]) place({ id: `yard_wall_${x}`, frame: 'salt_lo', x, y: 25, label: 'Ограда заднего двора' });
place({ id: 'yard_crates', frame: 'crate', x: 35, y: 29, label: 'Ящики' });
k.scenery([[3, 3, 36, 30]], { cactus: 0, dead_tree: 1, bush: 1 });

k.exit({ id: 'west', x: 0, y: 17, w: 1, h: 2, to: 'world', label: 'Карта мира' });
k.exit({ id: 'north', x: 20, y: 0, w: 2, h: 1, to: 'salt_guild', entry: 'south', label: 'Гильдейский двор' });
k.exit({ id: 'east', x: W - 1, y: 17, w: 1, h: 2, to: 'salt_arena', entry: 'west', label: '«Пыльная чаша»' });
k.exit({ id: 'south', x: 20, y: H - 1, w: 2, h: 1, to: 'salt_mines', entry: 'north', label: 'Копи', if: [{ flag: 'mines_known' }], closed: 'Дорога в копи перегорожена шлагбаумом Гильдии. Без дела туда не пускают.' });

const actors = [
  { id: 'player', sheet: 'hero_0', x: 2, y: 17, dir: 2 },
  { id: 'shopkeeper', sheet: 'nyura', x: 8, y: 7, dir: 1, label: 'Лавочница Гильдии', dialogue: 'salt_shop' },
  { id: 'weigher', sheet: 'weigher', x: 15, y: 19, dir: 3, label: 'Весовщик Гильдии', dialogue: 'weigher' },
  { id: 'khrust', sheet: 'khrust', x: 27, y: 23, dir: 5, label: 'Хруст', dialogue: 'khrust' },
  { id: 'ukho', sheet: 'raider', x: 32, y: 28, dir: 6, label: 'Покупатель', dialogue: 'ukho', if: [{ flag: 'salt_smuggle_asked' }, { notFlag: 'salt_smuggle' }] },
  { id: 'efrem', sheet: 'efrem', x: 9, y: 27, dir: 1, label: 'Караванщик Ефрем', dialogue: 'efrem' },
  { id: 'lada_home', sheet: 'lada', x: 7, y: 28, dir: 1, label: 'Лада', dialogue: 'lada_home', if: [{ flag: 'salt_bride', eq: 'returned' }] },
  { id: 'market_guard', sheet: 'guild_guard', x: 18, y: 14, dir: 3, label: 'Охрана Гильдии', dialogue: 'guild_guard', patrol: [[18, 14], [30, 15], [30, 20], [18, 20]] },
  { id: 'porter', sheet: 'saltfolk', x: 18, y: 25, dir: 2, label: 'Солевик-носильщик', dialogue: 'salt_porter' },
  ...[['sfolk_a', 'nomad', 26, 14], ['sfolk_b', 'pilgrim', 11, 21], ['sfolk_c', 'caravan_guard', 33, 16]].map(([id, sheet, x, y]) => ({ id, sheet, x, y, dir: 2, label: 'Покупатель', dialogue: 'salt_folk' })),
];

k.write('salt_market', 'Соляной рынок', {
  entries: { default: [2, 17], west: [2, 17], north: [20, 2], east: [37, 17], south: [20, 31] },
  roads: { west: [17, 18], east: [17, 18], north: [20, 21], south: [20, 21] },
  actors,
  // Chapter IV begins at the gate of Соль
  arrive: [{ if: [{ notFlag: 'salt_started' }], effects: [{ type: 'flag', key: 'salt_started' }, { type: 'quest', quest: 'salt', stage: 'guild' }] }],
  triggers: [{ id: 'gate_view', x: 1, y: 15, w: 5, h: 6, effects: [], log: 'Соль: стены из белых блоков, крыши из корки, над рынком — стрела копра. Где-то за рынком ревёт толпа «Пыльной чаши».' }],
});
