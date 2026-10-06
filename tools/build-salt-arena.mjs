// Builds public/assets/maps/salt_arena.json: «Пыльная чаша» of Соль (stage K) — the pit at the bottom of a dried
// reservoir, stands of planks on salt blocks, the fighters' cages, Барыш and his book of bets, Шёпот in the stands.
// One opponent at a time stands in the pit (arena_1..3), then Молчун; bouts are fought with everyone's own weapons
// and nobody dies (`ring: 'arms'`), unless a blood bout is agreed.
import { mapKit } from './map-kit.mjs';

const W = 36;
const H = 36;
const k = mapKit(W, H, 7403);
const { place, fill, set } = k;

fill(3, 3, 32, 32, ':');
fill(11, 11, 24, 24, '.');
for (let x = 0; x < 11; x++) for (const y of [17, 18]) set(x, y, '=');
k.rim();

// the stands around the pit
for (const [x, y, i] of [[12, 7, 1], [19, 7, 2], [12, 27, 3], [19, 27, 4]]) place({ id: `stands_${i}`, frame: 'stands', x, y, w: 3, h: 1, label: 'Ряды' });
for (const y of [11, 13, 21, 23]) place({ id: `stands_e_${y}`, frame: 'salt_lo', x: 27, y, label: 'Бортик' });
// the fighters' cages on the east side
for (const y of [15, 16, 19, 20]) place({ id: `cage_${y}`, frame: 'bars_closed', x: 30, y, label: 'Клетка бойцов' });
// posts of the pit and the book of bets
for (const [x, y] of [[11, 11], [24, 11], [11, 24], [24, 24]]) place({ id: `post_${x}_${y}`, frame: 'barrel', x, y, label: 'Столб ринга' });
place({ id: 'bets', frame: 'table', x: 6, y: 14, w: 2, h: 1, label: 'Стол ставок' });
for (const [x, y] of [[5, 22], [28, 6], [6, 6]]) place({ id: `heap_${x}_${y}`, frame: 'salt_pile', x, y, label: 'Куча соли' });
k.scenery([[3, 3, 32, 32]], { cactus: 0, dead_tree: 0, bush: 1 });

k.exit({ id: 'west', x: 0, y: 17, w: 1, h: 2, to: 'salt_market', entry: 'east', label: 'Соляной рынок' });

const BOUT = [{ notFlag: 'ring_fight' }];
const PIT = [14, 15];
const actors = [
  { id: 'player', sheet: 'hero_0', x: 2, y: 17, dir: 2 },
  { id: 'barysh', sheet: 'barysh', x: 9, y: 15, dir: 2, label: 'Барыш', dialogue: 'barysh' },
  { id: 'shepot', sheet: 'shepot', x: 21, y: 9, dir: 1, label: 'Шёпот', dialogue: 'shepot', if: [{ notFlag: 'whisper_enemy' }, { notFlag: 'with_shepot' }, { notFlag: 'lost_shepot' }] },
  // the ladder: one opponent stands in the pit at a time
  { id: 'pit_1', sheet: 'pit_1', x: PIT[0], y: PIT[1], dir: 6, label: 'Сизый', dialogue: 'pit_fighter', creature: 'pit_1', group: 'bout', ring: 'arms', peace: BOUT, if: [{ notFlag: 'arena_1' }] },
  { id: 'pit_2', sheet: 'pit_2', x: PIT[0], y: PIT[1], dir: 6, label: 'Кочерга', dialogue: 'pit_fighter', creature: 'pit_2', group: 'bout', ring: 'arms', peace: BOUT, if: [{ flag: 'arena_1' }, { notFlag: 'arena_2' }] },
  { id: 'pit_3a', sheet: 'pit_3', x: 13, y: 14, dir: 6, label: 'Жмых-старший', dialogue: 'pit_fighter', creature: 'pit_3', group: 'bout', ring: 'arms', peace: BOUT, if: [{ flag: 'arena_2' }, { notFlag: 'arena_3' }] },
  { id: 'pit_3b', sheet: 'pit_3', x: 15, y: 16, dir: 6, label: 'Жмых-младший', dialogue: 'pit_fighter', creature: 'pit_3', group: 'bout', ring: 'arms', peace: BOUT, if: [{ flag: 'arena_2' }, { notFlag: 'arena_3' }] },
  // Молчун: in his cage till the ladder is climbed, in the pit after; a blood bout is another fight altogether
  { id: 'molchun_cage', npcId: 'molchun', sheet: 'molchun', x: 29, y: 17, dir: 6, label: 'Молчун', dialogue: 'molchun', if: [{ notFlag: 'arena_3' }, { notFlag: 'last_bout' }] },
  { id: 'molchun', sheet: 'molchun', x: PIT[0], y: PIT[1], dir: 6, label: 'Молчун', dialogue: 'molchun', creature: 'molchun', group: 'bout', ring: 'arms', peace: BOUT, if: [{ flag: 'arena_3' }, { notFlag: 'last_bout' }, { notFlag: 'death_bout' }] },
  { id: 'molchun_blood', sheet: 'molchun', x: PIT[0], y: PIT[1], dir: 6, label: 'Молчун', dialogue: 'molchun_blood', creature: 'molchun_blood', group: 'blood', peace: [{ notFlag: 'death_fight' }], if: [{ flag: 'death_bout' }, { notFlag: 'last_bout' }] },
  { id: 'vyun', sheet: 'molchun', x: 22, y: 9, dir: 5, label: 'Вьюн', dialogue: 'vyun', if: [{ flag: 'vyun_free' }] },
  ...[['crowd_a', 'nomad', 13, 9], ['crowd_b', 'caravan_guard', 16, 26], ['crowd_c', 'saltfolk', 22, 26], ['crowd_d', 'scavenger', 14, 26]].map(([id, sheet, x, y]) => ({ id, sheet, x, y, dir: 2, label: 'Зритель', dialogue: 'arena_crowd' })),
];

k.write('salt_arena', '«Пыльная чаша»', {
  entries: { default: [2, 17], west: [2, 17] },
  roads: { west: [17, 18] },
  actors,
  triggers: [{ id: 'pit_view', x: 1, y: 15, w: 4, h: 6, effects: [], log: '«Пыльная чаша»: дно высохшего водохранилища, ряды из досок на соляных блоках, клетки бойцов. Барыш у стола ставок машет рукой.' }],
  cleared: [
    {
      group: 'blood',
      if: [{ flag: 'death_fight' }, { notFlag: 'last_bout' }],
      effects: [{ type: 'flag', key: 'last_bout', value: 'killed' }, { type: 'flag', key: 'whisper_enemy' }, { type: 'caps', amount: 180 }, { type: 'quest', quest: 'last_bout', stage: 'done' }],
      log: 'Молчун падает на песок и больше не встаёт. Толпа ревёт. Барыш отсчитывает двойной приз. В рядах пусто: Шёпот ушла, не оглянувшись.',
    },
  ],
});
