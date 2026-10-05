// Builds public/assets/maps/rusty_well.json: terrain grid + placed objects.
// Deterministic: same seed => same map. Edit layout constants here, then run `npm run gen:map && npm run gen:assets`.
import { writeFileSync, mkdirSync } from 'node:fs';
import { rng, makeNoise } from './art/draw.mjs';
import { buildOuter, buildDecor, MARGIN, PAD } from './map-outer.mjs';

const W = 40;
const H = 40;
const r = rng(1977);
const noise = makeNoise(42);

// ---- terrain ----
// . sand   , scrub   : cracked dirt   = asphalt   F concrete floor   # rock (blocked)
const g = Array.from({ length: H }, () => Array(W).fill('.'));
const set = (x, y, c) => {
  if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = c;
};

for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const n = noise(x * 0.18, y * 0.18);
    if (n > 0.66) g[y][x] = ',';
    else if (n < 0.3) g[y][x] = ':';
  }

// settlement plaza of packed dirt
for (let y = 18; y <= 33; y++)
  for (let x = 5; x <= 20; x++) if (noise(x * 0.4 + 9, y * 0.4) > 0.28) set(x, y, ':');

// road: west edge -> village -> east, then north to the pump station
for (let x = 0; x <= 31; x++) {
  set(x, 25, '=');
  set(x, 26, '=');
}
for (let y = 13; y <= 26; y++) {
  set(30, y, '=');
  set(31, y, '=');
}

// station floor
const S = { x0: 26, y0: 4, x1: 36, y1: 12 };
for (let y = S.y0; y <= S.y1; y++) for (let x = S.x0; x <= S.x1; x++) set(x, y, 'F');

// rocky rim around the map, broken where the road leaves
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const edge = Math.min(x, y, W - 1 - x, H - 1 - y);
    const n = noise(x * 0.3 + 50, y * 0.3 + 50);
    const depth = 1 + Math.floor(n * 3.2);
    if (edge < depth && g[y][x] !== '=') g[y][x] = '#';
  }

// ---- objects ----
const objects = [];
const occupied = new Set();
const key = (x, y) => `${x},${y}`;
function place(o) {
  const w = o.w ?? 1;
  const h = o.h ?? 1;
  for (let yy = o.y; yy < o.y + h; yy++)
    for (let xx = o.x; xx < o.x + w; xx++) {
      if (occupied.has(key(xx, yy))) throw new Error(`overlap at ${xx},${yy} for ${o.id}`);
      occupied.add(key(xx, yy));
    }
  objects.push({ w, h, block: true, ...o });
}
const free = (x, y, w = 1, h = 1) => {
  for (let yy = y; yy < y + h; yy++)
    for (let xx = x; xx < x + w; xx++) {
      if (xx < 1 || yy < 1 || xx >= W - 1 || yy >= H - 1) return false;
      if (occupied.has(key(xx, yy))) return false;
      if ('=F#'.includes(g[yy][xx])) return false;
    }
  return true;
};

// village
place({ id: 'shack_marta', frame: 'shack_a', x: 7, y: 19, w: 3, h: 3, label: 'Лачуга Марты', dialogue: 'shack_marta' });
place({ id: 'shack_2', frame: 'shack_b', x: 15, y: 19, w: 3, h: 3, label: 'Жестяная хижина' });
place({ id: 'shack_3', frame: 'shack_b', x: 8, y: 29, w: 3, h: 3, label: 'Заколоченная хижина', dialogue: 'shack_hank' });
place({ id: 'pump', frame: 'pump_broken', x: 12, y: 22, w: 2, h: 2, label: 'Колодец с помпой', dialogue: 'pump' });
place({ id: 'campfire', frame: 'campfire', x: 15, y: 30, label: 'Костёр', dialogue: 'campfire', bench: 'fire' });
place({ id: 'workbench', frame: 'workbench', x: 12, y: 33, w: 2, h: 1, label: 'Верстак', dialogue: 'workbench', bench: 'workbench' });
// earning a living: scrap heaps that fill up again every day, the scorpion burrow in the north-west rocks
for (const [x, y] of [[3, 33], [6, 35], [14, 36]]) place({ id: `scrap_${x}_${y}`, frame: 'scrap_pile', x, y, label: 'Куча хлама', dialogue: 'scrap' });
place({ id: 'burrow', frame: 'burrow', x: 6, y: 6, block: false, label: 'Нора скорпионов' });
place({ id: 'board', frame: 'board', x: 16, y: 23, label: 'Доска у колодца', dialogue: 'board' });
place({ id: 'barrel_lame', frame: 'barrel_hazard', x: 35, y: 23, label: 'Бочка с горючим', explosive: true });
place({ id: 'hank_bag', frame: 'bag', x: 16, y: 32, block: false, label: 'Мешок Хэнка', dialogue: 'hank_bag' });
place({ id: 'sign', frame: 'sign', x: 4, y: 23, label: 'Указатель', dialogue: 'sign' });
place({ id: 'water_tank', frame: 'tank', x: 18, y: 23, w: 2, h: 2, label: 'Пустая цистерна' });
for (const [x, y] of [[10, 19], [11, 20], [14, 21], [18, 27], [6, 27]]) place({ id: `barrel_${x}_${y}`, frame: 'barrel', x, y, label: 'Ржавая бочка' });
place({ id: 'tires_1', frame: 'tires', x: 19, y: 20, label: 'Покрышки' });
place({ id: 'crates_1', frame: 'crate_small', x: 11, y: 28, label: 'Пустые ящики' });

// road side
place({ id: 'car_sedan', frame: 'car_x', x: 21, y: 23, w: 2, h: 1, label: 'Остов седана', dialogue: 'car_sedan' });
place({ id: 'car_pickup', frame: 'car_y', x: 33, y: 19, w: 1, h: 2, label: 'Остов пикапа', dialogue: 'car_pickup' });
place({ id: 'car_bus', frame: 'car_x_burnt', x: 24, y: 28, w: 2, h: 1, label: 'Сгоревший фургон' });
for (const [x, y] of [[20, 22], [28, 23], [36, 17], [2, 23]]) place({ id: `pylon_${x}_${y}`, frame: 'pylon', x, y, label: 'Опора ЛЭП' });
place({ id: 'skeleton', frame: 'skeleton', x: 26, y: 18, block: false, label: 'Скелет странника', dialogue: 'skeleton' });

// pump station walls
for (let x = S.x0; x <= S.x1; x++)
  for (let y = S.y0; y <= S.y1; y++) {
    const edge = x === S.x0 || x === S.x1 || y === S.y0 || y === S.y1;
    if (!edge) continue;
    if (x === 31 && y === S.y1) continue; // door slot
    const back = y === S.y0 || x === S.x0;
    const broken = !back && r() < 0.35;
    place({ id: `wall_${x}_${y}`, frame: back ? 'wall_hi' : broken ? 'wall_broken' : 'wall_lo', x, y, label: 'Бетонная стена' });
  }
place({ id: 'door', frame: 'door_closed', x: 31, y: S.y1, label: 'Дверь насосной', dialogue: 'door' });
place({ id: 'crate_valve', frame: 'crate', x: 29, y: 6, label: 'Ящик с запчастями', dialogue: 'crate' });
place({ id: 'machine', frame: 'machine', x: 32, y: 6, w: 2, h: 2, label: 'Мёртвый насосный агрегат', dialogue: 'machine' });
place({ id: 'barrel_in_1', frame: 'barrel', x: 35, y: 10, label: 'Ржавая бочка' });
place({ id: 'locker', frame: 'locker', x: 27, y: 8, label: 'Железный шкафчик', dialogue: 'locker' });
place({ id: 'station_hatch', frame: 'hatch', x: 34, y: 9, block: false, label: 'Люк в отстойник', dialogue: 'station_hatch' });
place({ id: 'fuel_barrel', frame: 'barrel_hazard', x: 21, y: 10, label: 'Бочка с маркировкой', dialogue: 'fuel_barrel', explosive: true });
place({ id: 'barrel_nest', frame: 'barrel_hazard', x: 27, y: 15, label: 'Бочка с горючим', explosive: true });
place({ id: 'barrel_out_2', frame: 'barrel', x: 37, y: 13, label: 'Ржавая бочка' });

// scatter: rocks on '#', cacti, dead trees, scrub bushes
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    if (g[y][x] !== '#' || occupied.has(key(x, y))) continue;
    const inner = Math.min(x, y, W - 1 - x, H - 1 - y) > 0;
    if (!inner || r() < 0.75) {
      occupied.add(key(x, y));
      const jx = Math.round((r() - 0.5) * 18);
      const jy = Math.round((r() - 0.5) * 8);
      objects.push({ id: `rock_${x}_${y}`, frame: `rock_${Math.floor(r() * 4)}`, x, y, w: 1, h: 1, block: true, label: 'Скалы', jx, jy });
    }
  }
const scatter = (n, frame, label, block = true) => {
  let tries = 0;
  while (n > 0 && tries++ < 2000) {
    const x = 2 + Math.floor(r() * (W - 4));
    const y = 2 + Math.floor(r() * (H - 4));
    if (!free(x, y) || !free(x - 1, y - 1, 3, 3)) continue;
    if (x >= 5 && x <= 21 && y >= 18 && y <= 33) continue; // keep village clear
    place({ id: `${frame}_${x}_${y}`, frame, x, y, label, block });
    n--;
  }
};
scatter(14, 'cactus', 'Кактус');
scatter(5, 'dead_tree', 'Мёртвое дерево');
scatter(12, 'bush', 'Сухой куст', false);

// ---- actors & triggers ----
// Chapter I finale: once the water is back the Trust walks in from the west road; Hank hides meanwhile.
// They talk while `peace` holds and turn hostile where they stand when it breaks.
const TRUST_HERE = [{ flag: 'quest_complete' }, { notFlag: 'trust_left' }];
const TRUST_PEACE = [{ notFlag: 'trust_fight' }];
const actors = [
  { id: 'player', sheet: 'hero_0', x: 3, y: 26, dir: 1 },
  { id: 'marta', sheet: 'marta', x: 14, y: 24, dir: 3, label: 'Старейшина Марта', dialogue: 'marta', if: [{ notFlag: 'marta_taken' }] },
  { id: 'hank', sheet: 'hank', x: 15, y: 33, dir: 5, label: 'Бродяга Хэнк', dialogue: 'hank', if: [{ notFlag: 'hank_hid' }, { notFlag: 'hank_taken' }, { notFlag: 'met_hank' }] },
  // companions sent home wait by the fire (stage V)
  { id: 'hank_home', sheet: 'hank', x: 15, y: 33, dir: 5, label: 'Хэнк', dialogue: 'comp_hank', if: [{ flag: 'met_hank' }, { notFlag: 'with_hank' }, { notFlag: 'lost_hank' }] },
  { id: 'rzhavchik_wait', sheet: 'dog_rzhavchik', x: 13, y: 32, dir: 2, label: 'Ржавчик', dialogue: 'comp_rzhavchik', if: [{ flag: 'met_rzhavchik' }, { notFlag: 'with_rzhavchik' }, { notFlag: 'lost_rzhavchik' }] },
  { id: 'shluz', sheet: 'shluz', x: 11, y: 24, dir: 1, label: 'Инспектор Шлюз', dialogue: 'shluz', creature: 'inspector', group: 'trust', if: TRUST_HERE, peace: TRUST_PEACE, from: [0, 25] },
  { id: 'collector_a', sheet: 'collector', x: 9, y: 24, dir: 1, label: 'Сборщик Треста', dialogue: 'collector', creature: 'collector', group: 'trust', if: TRUST_HERE, peace: TRUST_PEACE, from: [0, 26] },
  { id: 'collector_b', sheet: 'collector', x: 12, y: 26, dir: 3, label: 'Сборщик Треста', dialogue: 'collector', creature: 'collector', group: 'trust', if: TRUST_HERE, peace: TRUST_PEACE, from: [1, 26] },
  // Ржавчик, the collector's dog, lives off Hank's fire until someone feeds him (stage R: «Пёс сборщика»)
  { id: 'rzhavchik', sheet: 'dog_rzhavchik', x: 13, y: 31, dir: 2, label: 'Тощий пёс', dialogue: 'rzhavchik', if: [{ notFlag: 'rzhavchik' }, { notFlag: 'dog_follows' }] },
  { id: 'town_cat', sheet: 'cat_town', x: 12, y: 25, dir: 3, label: 'Кошка у колодца', dialogue: 'street_cat' },
  // guests on their days (visits below): the Guild caravan and Сипуха the Полусухая
  { id: 'birjuk', sheet: 'birjuk', x: 7, y: 25, dir: 1, label: 'Караванщик Бирюк', dialogue: 'birjuk', if: [{ flag: 'caravan_here' }, { notFlag: 'birjuk_gone' }], from: [0, 26] },
  { id: 'sych', sheet: 'caravan_guard', x: 5, y: 26, dir: 0, label: 'Охранник Сыч', dialogue: 'caravan_guard', if: [{ flag: 'caravan_here' }, { notFlag: 'sych_exposed' }], from: [0, 25] },
  // the day's ambush on the caravan: they block the road and talk first
  ...[['raider_boss', 'raider_boss', 4, 28, 'Главарь налётчиков', 'raider_boss'], ['raider_a', 'raider', 2, 27, 'Налётчик «Жажды»', 'raider'], ['raider_b', 'raider', 5, 29, 'Налётчик «Жажды»', 'raider']].map(
    ([id, creature, x, y, label, dialogue]) => ({ id, sheet: 'raider', creature, group: 'raiders', x, y, dir: 1, label, dialogue, if: [{ flag: 'ambush' }, { notFlag: 'ambush_off' }], peace: [{ notFlag: 'ambush_fight' }], from: [0, 26], respawn: true }),
  ),
  // Кривой hides in the north rocks while his bounty is up; if Marta takes him in he guards the boarded shack
  { id: 'krivoy', sheet: 'krivoy', x: 10, y: 4, dir: 2, label: 'Кривой', dialogue: 'krivoy', creature: 'deserter', group: 'krivoy', if: [{ flag: 'job_krivoy', eq: 'active' }, { notFlag: 'krivoy_left' }, { notFlag: 'krivoy_settled' }], peace: [{ notFlag: 'krivoy_fight' }] },
  { id: 'krivoy_village', sheet: 'krivoy', x: 11, y: 32, dir: 7, label: 'Кривой', dialogue: 'krivoy_village', if: [{ flag: 'krivoy_settled' }] },
  // a named beast by the pickup from the third day
  { id: 'lame_reaper', sheet: 'scorpion_lame', creature: 'lame_reaper', group: 'lame', x: 36, y: 22, dir: 3, if: [{ flag: 'day', gte: 3 }] },
  { id: 'sipuha', sheet: 'sipuha', x: 5, y: 22, dir: 1, label: 'Сипуха', dialogue: 'sipuha', if: [{ flag: 'sipuha_here' }, { notFlag: 'sipuha_banned' }], from: [0, 25] },
  // the burrow breeds: three scorpions every morning from the second day
  ...[[5, 8], [8, 7], [7, 4]].map(([x, y], i) => ({ id: `burrow_${i}`, sheet: 'scorpion', creature: 'scorpion', group: 'burrow', x, y, dir: 2, if: [{ flag: 'day', gte: 2 }], respawn: true })),
  // hostiles: the lone patroller by the burnt van, and the nest by the pump station wall
  { id: 'scorp_road', sheet: 'scorpion', creature: 'scorpion', group: 'road', x: 24, y: 30, dir: 6, patrol: [[24, 30], [28, 31], [21, 31]] },
  { id: 'scorp_big', sheet: 'scorpion_big', creature: 'scorpion_big', group: 'nest', x: 26, y: 16, dir: 1 },
  { id: 'scorp_a', sheet: 'scorpion', creature: 'scorpion', group: 'nest', x: 28, y: 14, dir: 2 },
  { id: 'scorp_b', sheet: 'scorpion', creature: 'scorpion', group: 'nest', x: 35, y: 17, dir: 3 },
];
// the west road out: closed until the Trust's business is settled; leaving by it ends Chapter I
const exits = [
  { id: 'road_w', x: 0, y: 25, w: 1, h: 2, to: 'world', label: 'Карта мира', if: [{ flag: 'trust_outcome' }], closed: 'Дорога уходит на запад, в марево. Сначала дело.', effects: [{ type: 'flag', key: 'chapter1_done' }] },
];
const roofs = [{ id: 'station', x0: S.x0, y0: S.y0, x1: S.x1, y1: S.y1, style: 'tin' }];
const triggers = [
  { id: 'nest_view', x: 27, y: 18, w: 9, h: 4, if: [{ notFlag: 'nest_cleared' }], effects: [{ type: 'quest', quest: 'nest', stage: 'seen' }], log: 'У стены насосной что-то шевелится. Скорпионы. Три, один размером с бочку.' },
  { id: 'station_approach', x: 28, y: 13, w: 7, h: 4, if: [{ flag: 'quest_accepted' }], effects: [{ type: 'quest', quest: 'water', stage: 'open_door' }], log: 'Впереди насосная станция. Бетон, ржавчина и тишина.' },
];

// what a group left for dead means
const cleared = [
  { group: 'nest', if: [{ notFlag: 'nest_cleared' }], effects: [{ type: 'flag', key: 'nest_cleared' }, { type: 'quest', quest: 'nest', stage: 'cleared' }] },
  {
    group: 'trust',
    if: [{ flag: 'trust_fight' }, { notFlag: 'trust_outcome' }],
    effects: [{ type: 'flag', key: 'trust_outcome', value: 'fight' }, { type: 'flag', key: 'hank_hid', value: false }, { type: 'quest', quest: 'inspector', stage: 'gone' }],
    log: 'Отряд Треста разбит. Над дорогой оседает пыль.',
  },
  { group: 'raiders', if: [{ flag: 'ambush_fight' }, { notFlag: 'ambush_won' }], effects: [{ type: 'flag', key: 'ambush_won' }, { type: 'flag', key: 'job_escort_n', value: 1 }], log: 'Налётчики разбиты. Караван может ехать.' },
];

for (const a of actors) {
  for (const [x, y] of [[a.x, a.y], ...(a.patrol ?? []), ...(a.from ? [a.from] : [])]) {
    if (occupied.has(key(x, y))) throw new Error(`actor ${a.id} stands on an object at ${x},${y}`);
    if (g[y][x] === '#') throw new Error(`actor ${a.id} stands on rock at ${x},${y}`);
  }
}

const ground = g.map((row) => row.join(''));
const outerGround = buildOuter(ground, W, H, noise);
const { decor, wires } = buildDecor(outerGround, W, H);
const visits = [
  { flag: 'caravan_here', every: 3, from: 2, stay: 1 },
  { flag: 'sipuha_here', every: 4, from: 3, stay: 1 },
];
// flags cleared every morning: daily limits and the day's ambush
const daily = ['water_drawn', 'scrap_dug', 'dog_fed_today', 'ambush', 'ambush_off', 'ambush_fight', 'ambush_won', 'job_escort_n'];
const out = { id: 'rusty_well', name: 'Ржавый колодец', entries: { default: [3, 26], road: [2, 25], station: [33, 10] }, width: W, height: H, ground, objects, actors, triggers, exits, roofs, cleared, visits, daily, outer: { margin: MARGIN, pad: PAD, ground: outerGround }, decor, wires };
mkdirSync('public/assets/maps', { recursive: true });
writeFileSync('public/assets/maps/rusty_well.json', JSON.stringify(out, null, 1));
console.log(`map: ${W}x${H}, ${objects.length} objects, ${decor.length} decor, ${wires.length} wires`);
console.log(ground.join('\n'));
