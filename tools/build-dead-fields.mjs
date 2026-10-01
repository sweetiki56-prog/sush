// Builds public/assets/maps/dead_fields.json: «Мёртвые поля» (stage N) — grey cracked fields where the «Суховей»
// fell, dead orchards, the farm Свинцовый on the poisoned soil with its glade of lead flowers and its hidden water,
// a herd of the dry drifting toward it. North the road goes on to the ruins of Хлебное.
import { mapKit } from './map-kit.mjs';

const W = 44;
const H = 40;
const k = mapKit(W, H, 8001);
const { place, fill, set } = k;

fill(3, 3, 40, 36, ':');
for (let y = 0; y < H; y++) for (const x of [21, 22]) set(x, y, '=');
k.rim();
k.building('svinec', 6, 6, 15, 13, [[10, 13]], 'Стена хутора', 'tin');

for (const [x, y] of [[8, 16], [10, 17], [12, 16], [9, 19], [11, 20], [13, 18]]) place({ id: `flower_${x}_${y}`, frame: 'lead_flower', x, y, block: false, label: 'Свинцовый цветок', dialogue: 'lead_glade' });
place({ id: 'hidden_barrel', frame: 'barrel', x: 7, y: 8, label: 'Бочка под рогожей', dialogue: 'hidden_barrel' });
for (const [x, y] of [[28, 8], [31, 10], [34, 7], [29, 14], [33, 15], [27, 26], [33, 29]]) place({ id: `tree_${x}_${y}`, frame: 'dead_tree', x, y, label: 'Мёртвая яблоня' });
k.scenery([[3, 3, 40, 36]], { cactus: 0, dead_tree: 2, bush: 3 });

k.exit({ id: 'south', x: 21, y: H - 1, w: 2, h: 1, to: 'world', label: 'Карта мира' });
k.exit({ id: 'north', x: 21, y: 0, w: 2, h: 1, to: 'khlebnoe_ruins', entry: 'south', label: 'Руины Хлебного' });

const actors = [
  { id: 'player', sheet: 'hero_0', x: 21, y: 37, dir: 1 },
  { id: 'gvozdar', sheet: 'gvozdar', x: 11, y: 15, dir: 3, label: 'Староста Гвоздарь', dialogue: 'gvozdar', if: [{ notFlag: 'svinec_empty' }] },
  ...[['farmer_a', 14, 11], ['farmer_b', 8, 11]].map(([id, x, y]) => ({ id, sheet: 'farmer', x, y, dir: 2, label: 'Хуторянин', dialogue: 'svinec_farmer', if: [{ notFlag: 'svinec_empty' }] })),
  ...[['herd_a', 33, 22], ['herd_b', 36, 24], ['herd_c', 34, 26]].map(([id, x, y]) => ({ id, sheet: 'dryman', x, y, dir: 6, label: 'Сухостой', creature: 'dryman', group: 'herd', peace: [{ notFlag: 'herd_fight' }], if: [{ notFlag: 'herd' }] })),
];

k.write('dead_fields', 'Мёртвые поля', {
  entries: { default: [21, 37], south: [21, 37], north: [21, 2] },
  roads: { south: [21, 22], north: [21, 22] },
  actors,
  arrive: [{ if: [{ notFlag: 'fields_seen' }], effects: [{ type: 'flag', key: 'fields_seen' }], log: 'Мёртвые поля: серая пыль, мёртвые сады. На отравленной земле — хутор, и над ним цветут синеватые свинцовые цветы.' }],
  cleared: [{ group: 'herd', if: [{ flag: 'herd_fight' }, { notFlag: 'herd' }], effects: [{ type: 'flag', key: 'herd', value: 'burned' }, { type: 'quest', quest: 'herd', stage: 'done' }, { type: 'flag', key: 'svinec_grateful' }], log: 'Огонь и пули остановили стадо у самой изгороди. Хутор цел.' }],
  triggers: [],
});
