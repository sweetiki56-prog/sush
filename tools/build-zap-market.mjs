// Builds public/assets/maps/zap_market.json: «Капельный рынок» of Запруда — stalls and money-changers, the Notary's
// office and the Mint under roofs, the Trust's recruiting office, the guarded way up to the Upper city.
import { mapKit } from './map-kit.mjs';

const W = 40;
const H = 34;
const k = mapKit(W, H, 9102);
const { place, fill, set } = k;

fill(3, 3, 36, 30, ':');
for (let y = 0; y < H; y++) for (const x of [20, 21]) set(x, y, '=');
fill(14, 14, 27, 22, '=');
k.rim();

// the Notary's office
k.building('notary', 4, 5, 12, 12, [[12, 9]], 'Стена конторы', 'tin');
place({ id: 'notary_registry', frame: 'counter', x: 5, y: 7, w: 2, h: 1, label: 'Реестр печатей', dialogue: 'notary_registry' });
place({ id: 'notary_safe', frame: 'safe', x: 10, y: 6, label: 'Сейф Нотариуса', dialogue: 'notary_safe' });
place({ id: 'notary_shelf', frame: 'shelf', x: 8, y: 6, label: 'Полка с папками' });
// the Mint
k.building('mint', 27, 5, 36, 12, [[27, 9]], 'Стена Монетного двора', 'tin');
place({ id: 'mint_press', frame: 'press', x: 33, y: 7, label: 'Монетный пресс', dialogue: 'mint_press' });
place({ id: 'mint_scales', frame: 'scales', x: 30, y: 6, label: 'Весы Монетного двора', dialogue: 'mint_scales' });
place({ id: 'mint_crates', frame: 'crate', x: 35, y: 10, label: 'Ящики с заготовками' });
// the Trust's office
k.building('trust_office', 4, 19, 11, 25, [[11, 22]], 'Стена конторы Треста', 'tin');
place({ id: 'trust_desk', frame: 'table', x: 6, y: 21, label: 'Стол вербовщика' });
// stalls
for (const [x, y, i] of [[15, 25, 1], [23, 25, 2], [15, 11, 3], [24, 11, 4]]) place({ id: `stall_${i}`, frame: 'stall', x, y, w: 2, h: 1, label: 'Лавка' });
place({ id: 'market_notice', frame: 'notice', x: 18, y: 17, label: 'Доска объявлений', dialogue: 'market_notice' });
for (const [x, y] of [[37, 17], [2, 28]]) place({ id: `wtower_${x}_${y}`, frame: 'water_tower', x, y, label: 'Водонапорная башня' });
k.scenery([[3, 3, 36, 30]], { cactus: 0, dead_tree: 1, bush: 2 });

k.exit({ id: 'south', x: 20, y: H - 1, w: 2, h: 1, to: 'zap_lower', entry: 'north', label: 'Нижний город' });
k.exit({ id: 'north', x: 20, y: 0, w: 2, h: 1, to: 'zap_upper', entry: 'south', label: 'Верхний город', if: [{ flag: 'upper_ok' }], closed: 'Стража Верхнего города не пускает без бумаги.' });

const WANTED = [{ notFlag: 'zap_wanted' }];
const actors = [
  { id: 'player', sheet: 'hero_0', x: 20, y: 31, dir: 1 },
  { id: 'shtempel', sheet: 'shtempel', x: 8, y: 9, dir: 1, label: 'Нотариус Штемпель', dialogue: 'notary' },
  { id: 'gravyor', sheet: 'gravyor', x: 31, y: 9, dir: 3, label: 'Мастер Гравёр', dialogue: 'gravyor' },
  { id: 'apprentice', sheet: 'senka', x: 34, y: 11, dir: 5, label: 'Подмастерье', dialogue: 'apprentice' },
  { id: 'recruiter', sheet: 'collector', x: 8, y: 22, dir: 1, label: 'Вербовщик Треста', dialogue: 'recruiter', creature: 'collector', group: 'office', peace: WANTED },
  { id: 'changer', sheet: 'scavenger', x: 16, y: 24, dir: 3, label: 'Меняла', dialogue: 'changer' },
  { id: 'upper_guard', sheet: 'zap_guard', x: 22, y: 3, dir: 3, label: 'Стража Верхнего города', dialogue: 'upper_gate', creature: 'zap_guard', group: 'upper_gate', peace: WANTED },
  // the Trust's inspector waits here once the forgery is out
  { id: 'shluz_z', sheet: 'shluz', x: 19, y: 19, dir: 3, label: 'Инспектор Шлюз', dialogue: 'shluz_z', creature: 'inspector', group: 'shluz', if: [{ flag: 'bounty_on' }, { notFlag: 'forgery_fate' }], peace: [{ notFlag: 'shluz_fight' }] },
  ...[['mfolk_a', 'pilgrim', 26, 20], ['mfolk_b', 'debtor', 13, 16]].map(([id, sheet, x, y]) => ({ id, sheet, x, y, dir: 2, label: 'Покупатель', dialogue: 'zap_folk' })),
];

k.write('zap_market', 'Капельный рынок', {
  entries: { default: [20, 31], south: [20, 31], north: [20, 2] },
  roads: { south: [20, 21], north: [20, 21] },
  actors,
  triggers: [],
  cleared: [{ group: 'shluz', if: [{ flag: 'shluz_fight' }, { notFlag: 'bounty_done' }], effects: [{ type: 'flag', key: 'bounty_done', value: 'fought' }, { type: 'flag', key: 'zap_wanted' }, { type: 'quest', quest: 'zapruda', stage: 'choice' }], log: 'Шлюз уходит, зажимая рану. Стража Запруды теперь ищет вас везде.' }],
});
