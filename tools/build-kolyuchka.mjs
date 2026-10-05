// Builds public/assets/maps/kolyuchka.json: the cactus farm on the tract (docs/story/locations.md «Колючка»).
// A thorn palisade with gates north and south, cactus beds on a drip line, resin vats, Прокоп's hut, the barn where
// Ласка hides, watchtowers, and the Сухари trail from the north-west. On the raid day Кремень waits at the trail;
// if it comes to a fight the farmers (and whoever the hero brought) fight beside the party under AI.
import { mapKit } from './map-kit.mjs';

const W = 36;
const H = 36;
const k = mapKit(W, H, 2203);
const { place, fill, set } = k;

// ---- terrain: the tract runs through the farm, packed dirt inside the palisade ----
const F = { x0: 6, y0: 8, x1: 29, y1: 28 };
fill(F.x0, F.y0, F.x1, F.y1, ':');
for (let y = 0; y < H; y++) for (const x of [17, 18]) set(x, y, '=');
// the Сухари trail: a dry wash from the north-west corner down to the palisade
for (let i = 0; i < 9; i++) for (const d of [0, 1]) set(1 + i, 2 + Math.round(i * 0.7) + d, ',');
k.rim();
for (let i = 0; i < 3; i++) set(1 + i, 2, ','); // the trail stays open through the rim

// ---- the palisade, gates where the tract passes ----
const gateAt = (x, y) => (x === 17 || x === 18) && (y === F.y0 || y === F.y1);
for (let x = F.x0; x <= F.x1; x++)
  for (let y = F.y0; y <= F.y1; y++) {
    const edge = x === F.x0 || x === F.x1 || y === F.y0 || y === F.y1;
    if (!edge || gateAt(x, y)) continue;
    place({ id: `fence_${x}_${y}`, frame: 'thorn_fence', x, y, label: 'Колючий частокол' });
  }
place({ id: 'gate_s', frame: 'gate', x: 17, y: F.y1 + 1, w: 2, h: 1, block: false, label: 'Южные ворота' });
place({ id: 'gate_n', frame: 'gate', x: 17, y: F.y0 - 1, w: 2, h: 1, block: false, label: 'Северные ворота' });

// ---- the farm ----
place({ id: 'hut_prokop', frame: 'shack_a', x: 8, y: 10, w: 3, h: 3, label: 'Хижина Прокопа' });
place({ id: 'barn', frame: 'shack_b', x: 23, y: 10, w: 3, h: 3, label: 'Амбар', dialogue: 'barn' });
for (const y of [17, 20, 23, 26]) {
  place({ id: `bed_w_${y}`, frame: 'cactus_bed', x: 9, y, w: 2, h: 1, label: 'Грядка кактусов', dialogue: 'cactus_bed' });
  place({ id: `bed_w2_${y}`, frame: 'cactus_bed', x: 12, y, w: 2, h: 1, label: 'Грядка кактусов', dialogue: 'cactus_bed' });
  place({ id: `bed_e_${y}`, frame: 'cactus_bed', x: 22, y, w: 2, h: 1, label: 'Грядка кактусов', dialogue: 'cactus_bed' });
  place({ id: `bed_e2_${y}`, frame: 'cactus_bed', x: 25, y, w: 2, h: 1, label: 'Грядка кактусов', dialogue: 'cactus_bed' });
}
place({ id: 'vat_1', frame: 'vat', x: 12, y: 13, label: 'Чан с живицей', dialogue: 'vat' });
place({ id: 'vat_2', frame: 'vat', x: 14, y: 13, label: 'Чан с живицей', dialogue: 'vat' });
place({ id: 'drip_tank', frame: 'tank', x: 20, y: 14, w: 2, h: 2, label: 'Бак капельника', dialogue: 'drip_tank' });
place({ id: 'campfire', frame: 'campfire', x: 14, y: 16, label: 'Костёр', dialogue: 'campfire_kol', bench: 'fire' });
place({ id: 'workbench', frame: 'workbench', x: 7, y: 15, w: 2, h: 1, label: 'Верстак', dialogue: 'workbench', bench: 'workbench' });
place({ id: 'tower_nw', frame: 'watchtower', x: 7, y: 9, label: 'Вышка часового' });
place({ id: 'tower_se', frame: 'watchtower', x: 28, y: 27, label: 'Вышка часового' });
place({ id: 'sacks_farm', frame: 'sacks', x: 27, y: 13, label: 'Мешки' });
place({ id: 'crate_farm', frame: 'crate_small', x: 26, y: 14, label: 'Ящики с живицей' });
// where the Сухари come down: traps can be set across the wash
place({ id: 'trail', frame: 'bush', x: 4, y: 5, block: false, label: 'Тропа Сухарей', dialogue: 'trail' });

k.exit({ id: 'glass', x: W - 1, y: 18, w: 1, h: 2, to: 'kolyuchka_glass', entry: 'west', label: 'Старые теплицы' });
k.scenery([[F.x0 - 1, F.y0 - 1, F.x1 + 1, F.y1 + 1], [0, 0, 11, 9]], { cactus: 12, dead_tree: 3, bush: 8 });
k.clear(F.x1, 18, W - 1, 19, ','); // the east wicket in the palisade and the path to the greenhouses

// ---- people ----
const RAID = [{ flag: 'raid_now' }, { notFlag: 'raid_outcome' }];
const FIGHT = [{ flag: 'raid_fight' }, { notFlag: 'raid_outcome' }];
const PEACE_TIME = [{ notFlag: 'raid_fight' }];
const actors = [
  { id: 'player', sheet: 'hero_0', x: 17, y: 33, dir: 1 },
  { id: 'prokop', sheet: 'prokop', x: 11, y: 14, dir: 3, label: 'Прокоп', dialogue: 'prokop' },
  { id: 'iva', sheet: 'iva', x: 13, y: 12, dir: 3, label: 'Ива', dialogue: 'iva', if: [...PEACE_TIME, { notFlag: 'iva_locked' }] },
  { id: 'laska', sheet: 'laska', x: 24, y: 13, dir: 3, label: 'Девчонка у амбара', dialogue: 'laska', if: [{ flag: 'laska_met' }, { notFlag: 'laska_gone' }] },
  { id: 'town_cat', sheet: 'cat_town', x: 16, y: 15, dir: 1, label: 'Кошка у капельника', dialogue: 'street_cat' },
  { id: 'town_dog', sheet: 'dog_town', x: 23, y: 22, dir: 3, label: 'Сторожевой пёс', dialogue: 'street_dog' },
  // farmers: at work in peace, the militia when the raid comes to a fight
  ...[[16, 21], [20, 25], [11, 25]].map(([x, y], i) => ({ id: `farmer_${i}`, sheet: 'farmer', x, y, dir: 3, label: 'Хуторянин', dialogue: 'farmer', if: PEACE_TIME })),
  // the militia come out through the north gate to stand with the hero at the trail
  ...[[12, 7], [14, 6], [13, 5]].map(([x, y], i) => ({ id: `militia_${i}`, sheet: 'farmer', x, y, dir: 1, label: 'Ополченец', creature: 'militia', group: 'militia', ally: true, if: FIGHT })),
  // Хорь's freed «debtors» joined the militia; the guards hired at Три столба
  ...[[15, 7], [11, 5]].map(([x, y], i) => ({ id: `freed_${i}`, sheet: 'debtor', x, y, dir: 1, label: 'Спасённый путник', creature: 'militia', group: 'militia', ally: true, if: [...FIGHT, { flag: 'raid_freed' }] })),
  ...[[16, 6], [14, 4]].map(([x, y], i) => ({ id: `hired_${i}`, sheet: 'caravan_guard', x, y, dir: 1, label: 'Наёмник из Трёх столбов', creature: 'caravan_guard', group: 'militia', ally: true, if: [...FIGHT, { flag: 'raid_guards' }] })),
  // the raid: Кремень and his warriors at the trail; they talk first
  { id: 'kremen', sheet: 'kremen', x: 8, y: 6, dir: 2, label: 'Кремень', dialogue: 'kremen', creature: 'kremen', group: 'raid', if: RAID, peace: PEACE_TIME, from: [1, 2] },
  ...[[6, 5], [10, 6], [9, 4]].map(([x, y], i) => ({ id: `suhar_${i}`, sheet: 'suhar', x, y, dir: 2, label: 'Воин-Сухарь', dialogue: 'suhar', creature: 'suhar', group: 'raid', if: RAID, peace: PEACE_TIME, from: [1, 2] })),
];

const triggers = [];
k.exit({ id: 'road_s', x: 17, y: 35, w: 2, h: 1, to: 'world', label: 'Карта мира' });
k.exit({ id: 'road_n', x: 17, y: 0, w: 2, h: 1, to: 'world', label: 'Карта мира' });

// beating off the raid: the Сухари leave (Кремень is spared: a blow that would kill makes him withdraw)
const cleared = [
  {
    group: 'raid',
    if: [{ flag: 'raid_fight' }, { notFlag: 'raid_outcome' }],
    effects: [{ type: 'flag', key: 'raid_outcome', value: 'fought' }, { type: 'flag', key: 'raid_fight', value: false }, { type: 'inc', key: 'rep_circle', by: 10 }, { type: 'quest', quest: 'tract', stage: 'notary' }],
    log: 'Сухари уходят вверх по сухому руслу, унося раненых. Кремень оборачивается на гребне и поднимает копьё — не угроза, обещание.',
  },
];

// the raid day: in the morning spent here, or on arrival that day; too late and the farm fought alone
const arrive = [
  { if: [{ flag: 'raid_day' }, { flag: 'day', gteFlag: 'raid_day' }, { flag: 'day', ltFlag: 'raid_late' }, { notFlag: 'raid_now' }, { notFlag: 'raid_outcome' }], effects: [{ type: 'flag', key: 'raid_now' }], log: 'С северо-запада, по сухому руслу, спускаются Сухари. Впереди — рослый воин с копьём.' },
  { if: [{ flag: 'raid_late' }, { flag: 'day', gteFlag: 'raid_late' }, { notFlag: 'raid_now' }, { notFlag: 'raid_outcome' }], effects: [{ type: 'flag', key: 'raid_outcome', value: 'burned' }, { type: 'quest', quest: 'tract', stage: 'notary' }], log: 'Над хутором ещё тянет гарью. Сухари приходили без вас: хуторяне отбились, но половина грядок сгорела.' },
];

k.write('kolyuchka', 'Колючка', {
  entries: { default: [17, 33], road_s: [17, 33], road_n: [17, 2], glass: [33, 18] },
  roads: { north: [17, 18], south: [17, 18] },
  actors,
  triggers,
  cleared,
  arrive,
});
