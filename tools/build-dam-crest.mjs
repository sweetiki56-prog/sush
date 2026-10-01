// Builds public/assets/maps/dam_crest.json: «Гребень Заслона» (stage F) — the concrete crest with the Trust's army,
// Инспектор Шлюз at the gate of the machine hall; allies of the siege stand by the stairs when they came.
import { mapKit } from './map-kit.mjs';

const W = 44;
const H = 32;
const k = mapKit(W, H, 7902);
const { place, fill, set } = k;

fill(3, 3, 40, 28, 'F');
for (let y = 24; y < H; y++) for (const x of [21, 22]) set(x, y, '=');
for (let y = 0; y < 4; y++) for (const x of [21, 22]) set(x, y, '=');
k.rim();

for (const x of [6, 12, 30, 36]) place({ id: `sluice_${x}`, frame: 'sluice_gate', x, y: 5, label: 'Затвор шлюза' });
for (let x = 3; x <= 40; x++) if (x !== 21 && x !== 22 && ![6, 12, 30, 36].includes(x)) place({ id: `parapet_${x}`, frame: 'wall_hi', x, y: 4, label: 'Парапет' });
place({ id: 'hall_door_a', frame: 'door_closed', x: 21, y: 4, label: 'Ворота машинного зала', dialogue: 'hall_door' });
place({ id: 'hall_door_b', frame: 'door_closed', x: 22, y: 4, label: 'Ворота машинного зала', dialogue: 'hall_door' });
for (const [x, y] of [[10, 12], [33, 12]]) place({ id: `banner_t_${x}`, frame: 'banner_trust', x, y, label: 'Знамя Треста' });
for (const [x, y] of [[15, 16], [28, 16], [8, 20]]) place({ id: `crate_${x}_${y}`, frame: 'crate', x, y, label: 'Ящик Треста' });
k.scenery([[3, 3, 40, 28]], { cactus: 0, dead_tree: 0, bush: 0 });

k.exit({ id: 'south', x: 21, y: H - 1, w: 2, h: 1, to: 'dam_approach', entry: 'north', label: 'Подступы' });
k.exit({ id: 'north', x: 21, y: 0, w: 2, h: 1, to: 'dam_machines', entry: 'south', label: 'Машинный зал', if: [{ flag: 'open_hall_door_a' }], closed: 'Ворота машинного зала заперты.' });

const FIGHT = [{ notFlag: 'crest_fight' }];
const ARMY = [{ notFlag: 'dam_way' }];
const actors = [
  { id: 'player', sheet: 'hero_0', x: 21, y: 29, dir: 1 },
  { id: 'shluz_dam', sheet: 'shluz', x: 22, y: 8, dir: 1, label: 'Инспектор Шлюз', dialogue: 'shluz_dam', creature: 'shluz_c', group: 'trust_army', peace: FIGHT, if: [{ notFlag: 'shluz_dead' }, { notFlag: 'shluz_ally' }] },
  ...[['trust_a', 14, 10], ['trust_b', 29, 10], ['trust_c', 22, 14]].map(([id, x, y]) => ({ id, sheet: 'zap_guard', x, y, dir: 2, label: 'Солдат Треста', dialogue: 'trust_soldier', creature: 'zap_guard', group: 'trust_army', peace: FIGHT, if: ARMY })),
  ...[['ally_c1', 17, 24, 'farmer', 'militia', 'ally_circle'], ['ally_d1', 26, 24, 'suhar', 'suhar', 'ally_dry'], ['ally_o1', 15, 22, 'dew_knight', 'dew_knight', 'ally_order'], ['ally_s1', 28, 22, 'salt_guard', 'salt_fighter', 'ally_salt']].map(([id, x, y, sheet, creature, flag]) => ({ id, sheet, x, y, dir: 1, label: 'Союзник', creature, group: 'siege_allies', ally: true, if: [{ flag }, { notFlag: 'dam_way' }] })),
];

const IN = (way) => [{ type: 'flag', key: 'dam_way', value: way }, { type: 'flag', key: 'open_hall_door_a' }, { type: 'flag', key: 'open_hall_door_b' }, { type: 'quest', quest: 'dam', stage: 'machines' }, { type: 'xp', amount: 250 }];
k.write('dam_crest', 'Гребень Заслона', {
  entries: { default: [21, 29], south: [21, 29], north: [21, 6] },
  roads: { south: [21, 22], north: [21, 22] },
  actors,
  arrive: [{ if: [{ notFlag: 'crest_seen' }], effects: [{ type: 'flag', key: 'crest_seen' }, { type: 'quest', quest: 'dam', stage: 'crest' }], log: 'Гребень плотины: бетон, ветер и солдаты Треста в два ряда. У ворот машинного зала — Инспектор Шлюз.' }],
  cleared: [{ group: 'trust_army', if: [{ flag: 'crest_fight' }, { notFlag: 'dam_way' }], effects: IN('storm'), log: 'Гребень взят. Ворота машинного зала распахнуты настежь.' }],
  triggers: [],
});
