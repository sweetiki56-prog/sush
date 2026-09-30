// Builds public/assets/maps/crystal_deep.json: «Глубокие копи» of Кристалл (stage V) — drifts in the salt with spiders,
// a stone tablet from before the Fire, a cache under a fallen prop, the camp of the Горькие behind a collapse, and the
// salt tunnel to the mines of Соль for a «солёный брат».
import { mapKit } from './map-kit.mjs';

const W = 44;
const H = 40;
const k = mapKit(W, H, 7504);
const { place, fill, set } = k;

fill(2, 2, 41, 37, ':');
for (let x = 36; x < W; x++) for (const y of [9, 10]) set(x, y, ':');
k.rim();

// the collapse walling off the camp, with a gap by the east wall
for (let y = 16; y <= 36; y++) if (y !== 18 && y !== 19) place({ id: `collapse_${y}`, frame: `rock_${y % 4}`, x: 27, y, label: 'Обвал' });
for (let x = 28; x <= 40; x++) if (x !== 33 && x !== 34) place({ id: `collapse_n_${x}`, frame: `rock_${x % 4}`, x, y: 15, label: 'Обвал' });
// the camp of the Горькие
place({ id: 'bitter_fire', frame: 'campfire', x: 34, y: 26, block: false, label: 'Костёр из соляного угля' });
place({ id: 'bitter_stash', frame: 'crate', x: 38, y: 32, label: 'Ниша за шкурой', dialogue: 'bitter_stash' });
place({ id: 'bitter_altar', frame: 'salt_pile', x: 31, y: 20, label: 'Алтарь Горьких', dialogue: 'bitter_altar' });
for (const [x, y] of [[36, 22], [30, 30], [39, 25]]) place({ id: `bitter_bunk_${x}_${y}`, frame: 'bunk', x, y, label: 'Лежанка' });
// the drifts
place({ id: 'name_tablet', frame: 'niche', x: 10, y: 6, label: 'Табличка в штреке', dialogue: 'name_tablet' });
place({ id: 'hammer_cache', frame: 'crate', x: 5, y: 33, label: 'Ящик под крепью', dialogue: 'hammer_cache' });
place({ id: 'tunnel_mouth', frame: 'ladder', x: 3, y: 20, label: 'Соляной тоннель', dialogue: 'salt_tunnel' });
for (const [x, y] of [[8, 14], [18, 9], [20, 25], [14, 31], [23, 17]]) place({ id: `growth_${x}_${y}`, frame: 'crystal', x, y, label: 'Соляная друза' });
for (const [x, y] of [[15, 20], [11, 26]]) place({ id: `web_${x}_${y}`, frame: 'salt_web', x, y, label: 'Соляная паутина' });
for (const [x, y, v] of [[6, 3, 'a'], [24, 3, 'b'], [4, 11, 'b']]) place({ id: `vein_${x}_${y}`, frame: `vein_${v}`, x, y, label: 'Светящаяся жила' });
k.scenery([[2, 2, 41, 37]], { cactus: 0, dead_tree: 0, bush: 0 });

k.exit({ id: 'east', x: W - 1, y: 9, w: 1, h: 2, to: 'crystal_gate', entry: 'west', label: 'Верхние ярусы' });
k.clear(W - 4, 9, W - 1, 10, ':');

const BITTER = [{ notFlag: 'bitter_fight' }];
const CAMP = [{ notFlag: 'bitter_gone' }, { notFlag: 'bitter_left' }];
const actors = [
  { id: 'player', sheet: 'hero_0', x: 41, y: 9, dir: 6 },
  ...[['deep_spider_a', 13, 22], ['deep_spider_b', 16, 27]].map(([id, x, y]) => ({ id, sheet: 'salt_spider', x, y, dir: 2, label: 'Соляной паук', creature: 'salt_spider', group: 'deep_spiders' })),
  { id: 'gorech', sheet: 'gorech', x: 35, y: 27, dir: 6, label: 'Горечь', dialogue: 'gorech', creature: 'gorech', group: 'bitter', peace: BITTER, if: CAMP },
  ...[['bitter_a', 32, 25], ['bitter_b', 37, 28]].map(([id, x, y]) => ({ id, sheet: 'bitter', x, y, dir: 6, label: 'Горький', dialogue: 'gorech', creature: 'bitter', group: 'bitter', peace: BITTER, if: CAMP })),
];

const WON = (extra) => [{ type: 'flag', key: 'bitter_way', value: 'fought' }, { type: 'flag', key: 'bitter_gone' }, { type: 'flag', key: 'stolen_back' }, { type: 'quest', quest: 'crystal', stage: 'promise' }, { type: 'xp', amount: 150 }, ...extra];
k.write('crystal_deep', 'Глубокие копи', {
  entries: { default: [41, 9], east: [41, 9], tunnel: [4, 21] },
  roads: { east: [9, 10] },
  actors,
  triggers: [{ id: 'camp_view', x: 28, y: 17, w: 3, h: 4, effects: [], log: 'За обвалом — огонь из соляного угля и тени с кувалдами. Лагерь Горьких.' }],
  cleared: [
    { group: 'bitter', if: [{ flag: 'bitter_fight' }, { notFlag: 'bitter_way' }, { flag: 'tube_stolen' }], effects: WON([{ type: 'give', item: 'tube' }, { type: 'flag', key: 'bitter_blood', value: 'fought' }]), log: 'Горькие бегут в темноту штреков. В нише за костром — ваш тубус.' },
    { group: 'bitter', if: [{ flag: 'bitter_fight' }, { notFlag: 'bitter_way' }, { notFlag: 'tube_stolen' }], effects: WON([{ type: 'give', item: 'quartz_scroll' }, { type: 'flag', key: 'bitter_blood', value: 'fought' }]), log: 'Горькие бегут в темноту штреков. В нише за костром — свиток Совета.' },
  ],
});
