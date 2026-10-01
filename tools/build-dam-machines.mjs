// Builds public/assets/maps/dam_machines.json: «Машинный зал» (stage F) — turbines under the crest, the dam's own
// sentries still on watch, the panel that stands them down, the stairs to the control room. The sentries rise on an
// alarm (the crest stormed overhead, the panel smashed); a quiet way in leaves them walking their rounds.
import { mapKit } from './map-kit.mjs';

const W = 40;
const H = 32;
const k = mapKit(W, H, 7903);
const { place, fill, set } = k;

fill(2, 2, 37, 29, 'F');
for (let y = 27; y < H; y++) for (const x of [19, 20]) set(x, y, '=');
k.rim();

for (const [x, y] of [[8, 8], [15, 8], [24, 8], [31, 8]]) place({ id: `turbine_${x}`, frame: 'turbine', x, y, w: 2, h: 2, label: 'Турбина' });
place({ id: 'sentry_panel', frame: 'transformer', x: 33, y: 22, label: 'Щиток охраны', dialogue: 'sentry_panel' });
for (const [x, y] of [[6, 16], [30, 16]]) place({ id: `pipe_${x}`, frame: 'big_pipe', x, y, w: 2, h: 1, label: 'Водовод' });
place({ id: 'machines_up', frame: 'ladder', x: 20, y: 3, label: 'Лестница в зал пульта', dialogue: 'machines_up' });
k.scenery([[2, 2, 37, 29]], { cactus: 0, dead_tree: 0, bush: 0 });

k.exit({ id: 'south', x: 19, y: H - 1, w: 2, h: 1, to: 'dam_crest', entry: 'north', label: 'Гребень' });

const actors = [
  { id: 'player', sheet: 'hero_0', x: 19, y: 28, dir: 1 },
  ...[['dam_sentry_a', 12, 14, [[12, 14], [26, 14]]], ['dam_sentry_b', 26, 20, [[26, 20], [12, 20]]]].map(([id, x, y, patrol]) => ({ id, sheet: 'dam_sentry', x, y, dir: 2, label: 'Сторожевая машина плотины', creature: 'dam_sentry', group: 'dam_sentries', peace: [{ notFlag: 'hall_alarm' }], patrol })),
];

k.write('dam_machines', 'Машинный зал', {
  entries: { default: [19, 28], south: [19, 28], aqueduct: [4, 27] },
  roads: { south: [19, 20] },
  actors,
  arrive: [
    { if: [{ flag: 'dam_way', eq: 'storm' }, { notFlag: 'hall_alarm' }, { notFlag: 'machines_way' }], effects: [{ type: 'flag', key: 'hall_alarm' }], log: 'Сирена воет под сводами: штурм гребня поднял машины плотины.' },
    { if: [{ notFlag: 'machines_seen' }], effects: [{ type: 'flag', key: 'machines_seen' }, { type: 'quest', quest: 'dam', stage: 'machines' }], log: 'Машинный зал гудит, хотя турбины стоят двести лет. Между ними ходят сторожевые машины Водоуправления.' },
  ],
  cleared: [{ group: 'dam_sentries', if: [{ notFlag: 'machines_way' }], effects: [{ type: 'flag', key: 'machines_way', value: 'fight' }, { type: 'quest', quest: 'dam', stage: 'trial' }, { type: 'xp', amount: 250 }], log: 'Последняя машина плотины гаснет. Лестница в зал пульта свободна.' }],
  triggers: [],
});
