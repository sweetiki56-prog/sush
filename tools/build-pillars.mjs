// Builds public/assets/maps/three_pillars.json: the crossroads town of Chapter II (docs/story/locations.md «Три столба»).
// Three roads meet at three surviving power-line pylons: the «Сухая глотка» tavern with the ring, the market rows,
// the Trust post, the caravan without water, the ruins where Сенька hides. Who stands where follows the quest flags.
import { mapKit } from './map-kit.mjs';

const W = 44;
const H = 40;
const k = mapKit(W, H, 1812);
const { place, fill, set } = k;

// ---- terrain: three roads to the crossing, packed dirt around it ----
fill(10, 14, 34, 30, ':');
for (let x = 0; x <= 43; x++) for (const y of [19, 20]) set(x, y, '=');
for (let y = 0; y <= 20; y++) for (const x of [21, 22]) set(x, y, '=');
k.rim();

// ---- the «Сухая глотка»: walls, the bar, shelves, tables, the ring in the corner ----
k.building('tavern', 3, 24, 15, 34, [[15, 28], [15, 29]], 'Стена трактира', 'tin');
place({ id: 'counter', frame: 'counter', x: 5, y: 27, w: 2, h: 1, label: 'Стойка', dialogue: 'counter' });
place({ id: 'zoya_stash', frame: 'crate_small', x: 4, y: 26, label: 'Ящик под стойкой', dialogue: 'zoya_stash' });
for (const x of [5, 7, 9]) place({ id: `shelf_${x}`, frame: 'shelf', x, y: 25, label: 'Полка с бутылками' });
for (const [x, y] of [[8, 30], [11, 31], [5, 32], [9, 33]]) place({ id: `table_${x}_${y}`, frame: 'table', x, y, label: 'Стол' });
place({ id: 'ring', frame: 'ring', x: 10, y: 25, w: 3, h: 3, block: false, label: 'Ринг' });
place({ id: 'barrel_tavern', frame: 'barrel', x: 14, y: 33, label: 'Бочка с брагой' });

// ---- market rows: two stalls, a workbench, goods ----
place({ id: 'stall_remen', frame: 'stall', x: 6, y: 12, w: 2, h: 1, label: 'Прилавок оружейника', dialogue: 'remen_stall' });
place({ id: 'stall_nyura', frame: 'stall', x: 12, y: 12, w: 2, h: 1, label: 'Прилавок с едой', dialogue: 'nyura_stall' });
place({ id: 'workbench', frame: 'workbench', x: 16, y: 14, w: 2, h: 1, label: 'Верстак', dialogue: 'workbench', bench: 'workbench' });
place({ id: 'sacks_1', frame: 'sacks', x: 4, y: 14, label: 'Мешки' });
place({ id: 'sacks_2', frame: 'sacks', x: 15, y: 11, label: 'Мешки' });
place({ id: 'crates_market', frame: 'crate_small', x: 9, y: 14, label: 'Ящики с товаром' });

// ---- the crossing: three pylons, the board, the sign ----
for (const [x, y] of [[18, 16], [27, 17], [22, 24]]) place({ id: `pylon_${x}_${y}`, frame: 'pylon', x, y, label: 'Опора ЛЭП — один из трёх столбов', dialogue: 'pylon' });
place({ id: 'board_pillars', frame: 'board', x: 19, y: 22, label: 'Доска наград', dialogue: 'board_pillars' });
place({ id: 'sign', frame: 'sign', x: 3, y: 17, label: 'Указатель', dialogue: 'sign_pillars' });

// ---- the Trust post: a hut, the notice with the reward ----
place({ id: 'post_hut', frame: 'shack_b', x: 27, y: 10, w: 3, h: 3, label: 'Пост Треста' });
place({ id: 'notice', frame: 'notice', x: 25, y: 15, label: 'Объявление Треста', dialogue: 'notice' });
place({ id: 'post_barrel', frame: 'barrel', x: 31, y: 12, label: 'Бочка с водой Треста' });

// ---- the caravan without water ----
place({ id: 'hor_barrels', frame: 'barrel', x: 31, y: 25, label: 'Пустые бочки каравана', dialogue: 'hor_barrels' });
place({ id: 'hor_tank', frame: 'tank', x: 33, y: 23, w: 2, h: 2, label: 'Бочка-цистерна на колёсах' });
place({ id: 'hor_crates', frame: 'crate', x: 36, y: 26, label: 'Тюки каравана' });
place({ id: 'hor_tires', frame: 'tires', x: 29, y: 29, label: 'Запасные колёса' });

// ---- ruins at the south edge: a hiding place, and where the Писарь keeps his reports ----
for (const [x, y] of [[29, 33], [30, 33], [31, 33], [35, 33], [36, 33], [29, 34], [29, 36], [37, 34], [37, 36]]) place({ id: `ruin_${x}_${y}`, frame: 'wall_broken', x, y, label: 'Развалины' });
place({ id: 'scribe_cache', frame: 'bag', x: 36, y: 35, block: false, label: 'Груда кирпичей', dialogue: 'scribe_cache' });

k.scenery([[2, 9, 38, 38]], { cactus: 8, dead_tree: 3, bush: 8 });
k.clear(33, 37, 34, H - 1, ':'); // the path down to the substation ruins

// ---- people ----
const actors = [
  { id: 'player', sheet: 'hero_0', x: 2, y: 19, dir: 1 },
  { id: 'zoya', sheet: 'zoya', x: 6, y: 26, dir: 3, label: 'Зоя Кружка', dialogue: 'zoya' },
  { id: 'luka', sheet: 'luka', x: 8, y: 31, dir: 5, label: 'Лука Кривоногий', dialogue: 'luka', if: [{ notFlag: 'luka_gone' }] },
  { id: 'gvozd', sheet: 'gvozd', x: 13, y: 28, dir: 7, label: 'Гвоздь', dialogue: 'gvozd', if: [{ notFlag: 'gvozd_out' }] },
  // the boxer: drugged with «Мираж» until someone stops it; a bout is a fight on the ring (ring_fight)
  { id: 'bugai', sheet: 'bugai', x: 11, y: 26, dir: 3, label: 'Бугай', dialogue: 'bugai', creature: 'boxer_mirage', group: 'ring', ring: true, if: [{ notFlag: 'bugai_clean' }, { notFlag: 'bugai_dead' }], peace: [{ notFlag: 'ring_fight' }] },
  { id: 'bugai_clean', npcId: 'bugai', sheet: 'bugai', x: 11, y: 26, dir: 3, label: 'Бугай', dialogue: 'bugai', creature: 'boxer', group: 'ring', ring: true, if: [{ flag: 'bugai_clean' }, { notFlag: 'bugai_dead' }], peace: [{ notFlag: 'ring_fight' }] },
  { id: 'remen', sheet: 'remen', x: 7, y: 11, dir: 3, label: 'Оружейник Ремень', dialogue: 'remen' },
  { id: 'nyura', sheet: 'nyura', x: 13, y: 11, dir: 3, label: 'Нюра', dialogue: 'nyura' },
  // her boy, and his father's dog once someone brings it home («Пёс сборщика»)
  { id: 'mityay', sheet: 'mityay', x: 14, y: 13, dir: 3, label: 'Митяй', dialogue: 'mityay' },
  { id: 'rzhavchik_home', sheet: 'dog_rzhavchik', x: 14, y: 14, dir: 4, label: 'Ржавчик', dialogue: 'rzhavchik_home', if: [{ flag: 'rzhavchik', eq: 'home' }] },
  { id: 'town_cat', sheet: 'cat_town', x: 6, y: 20, dir: 2, label: 'Кошка у трактира', dialogue: 'street_cat' },
  { id: 'town_dog', sheet: 'dog_town', x: 16, y: 18, dir: 5, label: 'Дворовый пёс', dialogue: 'street_dog' },
  // the Trust post: the sergeant and a collector; hostile if the Trust hunts the hero and it comes to a fight
  { id: 'mytny', sheet: 'mytny', x: 25, y: 14, dir: 3, label: 'Сержант Мытный', dialogue: 'mytny', creature: 'sergeant', group: 'post', peace: [{ notFlag: 'post_fight' }] },
  { id: 'post_guard', sheet: 'collector', x: 29, y: 14, dir: 3, label: 'Сборщик Треста', dialogue: 'collector_post', creature: 'collector', group: 'post', peace: [{ notFlag: 'post_fight' }] },
  // the Писарь stands by the board until his business with the hero is done
  { id: 'pisar', sheet: 'pisar', x: 24, y: 22, dir: 5, label: 'Писарь', dialogue: 'pisar', creature: 'scribe', group: 'scribe', if: [{ notFlag: 'scribe_gone' }], peace: [{ notFlag: 'pisar_fight' }], from: [22, 0] },
  // the caravan without water: Хорь, his two guards and the «debtors»
  { id: 'hor', sheet: 'hor', x: 31, y: 27, dir: 5, label: 'Хорь, голова каравана', dialogue: 'hor', creature: 'hor', group: 'hor', if: [{ notFlag: 'hor_gone' }], peace: [{ notFlag: 'hor_fight' }] },
  { id: 'hor_guard_a', sheet: 'caravan_guard', x: 33, y: 28, dir: 5, label: 'Охранник Хоря', dialogue: 'hor_guard', creature: 'caravan_guard', group: 'hor', if: [{ notFlag: 'hor_gone' }], peace: [{ notFlag: 'hor_fight' }] },
  { id: 'hor_guard_b', sheet: 'caravan_guard', x: 29, y: 26, dir: 3, label: 'Охранник Хоря', dialogue: 'hor_guard', creature: 'caravan_guard', group: 'hor', if: [{ notFlag: 'hor_gone' }], peace: [{ notFlag: 'hor_fight' }] },
  ...[[35, 29], [36, 30], [34, 30]].map(([x, y], i) => ({ id: `debtor_${i}`, sheet: 'debtor', x, y, dir: 5, label: 'Путник из каравана', dialogue: 'debtor', if: [{ notFlag: 'debtors_left' }], from: [43, 20] })),
  // Сенька hides in the ruins once Зоя asks after him, until his fate is decided
  { id: 'senka', sheet: 'senka', x: 33, y: 35, dir: 1, label: 'Сенька', dialogue: 'senka', if: [{ flag: 'courier_asked' }, { notFlag: 'senka_gone' }] },
];

const triggers = [];
// ways out: the three roads lead to the world map
k.exit({ id: 'road_w', x: 0, y: 19, w: 1, h: 2, to: 'world', label: 'Карта мира' });
k.exit({ id: 'road_n', x: 21, y: 0, w: 2, h: 1, to: 'world', label: 'Карта мира' });
k.exit({ id: 'road_e', x: 43, y: 19, w: 1, h: 2, to: 'world', label: 'Карта мира' });
k.exit({ id: 'ruins', x: 33, y: H - 1, w: 2, h: 1, to: 'pillars_ruins', entry: 'north', label: 'Южные развалины' });

// the Trust's post, the Писарь and Хорь's men turned on the hero: what their fall means
const cleared = [
  { group: 'post', if: [{ flag: 'post_fight' }, { notFlag: 'post_cleared' }], effects: [{ type: 'flag', key: 'post_cleared' }, { type: 'inc', key: 'rep_trust', by: -20 }], log: 'Пост Треста у перекрёстка пуст. Об этом узнают в Запруде.' },
  { group: 'scribe', if: [{ flag: 'pisar_fight' }, { notFlag: 'scribe_outcome' }], effects: [{ type: 'flag', key: 'scribe_outcome', value: 'killed' }, { type: 'flag', key: 'sealwax_watch' }, { type: 'give', item: 'scribe_note' }, { type: 'flag', key: 'notary_known' }, { type: 'quest', quest: 'tract', stage: 'prokop' }], log: 'В кармане Писаря — записка под красным сургучом с оттиском руки: «Запруда, Нижний город, Нотариальная контора. Передать лично».' },
  { group: 'hor', if: [{ flag: 'hor_fight' }, { notFlag: 'caravan_dry' }], effects: [{ type: 'flag', key: 'caravan_dry', value: 'fought' }, { type: 'flag', key: 'hor_gone' }, { type: 'inc', key: 'rep_guild', by: -5 }, { type: 'quest', quest: 'caravan_dry', stage: 'freed' }], log: 'Люди Хоря лежат в пыли. «Должники» смотрят на вас и не верят.' },
];

// the chapter begins on the first arrival
const arrive = [{ if: [{ notFlag: 'tract_started' }], effects: [{ type: 'flag', key: 'tract_started' }, { type: 'quest', quest: 'tract', stage: 'rumors' }], log: 'Три опоры ЛЭП торчат над перекрёстком, как кости. Под ними — «Сухая глотка», ряды и пост Треста.' }];

k.write('three_pillars', 'Три столба', {
  entries: { default: [2, 19], road_w: [2, 19], road_n: [21, 2], road_e: [41, 19], ruins: [33, 37] },
  roads: { west: [19, 20], east: [19, 20], north: [21, 22] },
  actors,
  triggers,
  cleared,
  arrive,
});
