// Builds public/assets/maps/dam_control.json: «Зал пульта» (stage F) — the console with the slot for the Mandate,
// windows over the blue water of Глубокое, Председатель Затвор with his guard and, when unmasked, the Printer.
import { mapKit } from './map-kit.mjs';

const W = 36;
const H = 28;
const k = mapKit(W, H, 7904);
const { place, fill } = k;

fill(2, 2, 33, 25, 'F');
k.rim();

place({ id: 'dam_console', frame: 'relay_console', x: 17, y: 5, label: 'Пульт Заслона', dialogue: 'dam_console' });
for (const x of [6, 10, 24, 28]) place({ id: `window_${x}`, frame: 'glass_hi', x, y: 2, label: 'Окно на Глубокое' });
for (const [x, y] of [[7, 10], [27, 10]]) place({ id: `cab_${x}`, frame: 'machine', x, y, label: 'Шкаф автоматики' });
place({ id: 'control_down', frame: 'ladder', x: 4, y: 23, label: 'Лестница в машинный зал', dialogue: 'control_down' });
k.scenery([[2, 2, 33, 25]], { cactus: 0, dead_tree: 0, bush: 0 });

const FIGHT = [{ notFlag: 'control_fight' }];
const HERE = [{ notFlag: 'trial_way' }];
const actors = [
  { id: 'player', sheet: 'hero_0', x: 5, y: 22, dir: 2 },
  { id: 'zatvor_dam', sheet: 'zatvor', x: 17, y: 9, dir: 1, label: 'Председатель Затвор', dialogue: 'zatvor_dam', creature: 'zatvor_c', group: 'council', peace: FIGHT, if: HERE },
  { id: 'stempel_dam', sheet: 'shtempel', x: 20, y: 9, dir: 1, label: 'Нотариус Штемпель', dialogue: 'stempel_dam', creature: 'stempel_c', group: 'council', peace: FIGHT, if: [...HERE, { flag: 'printer_known' }] },
  ...[['guard_a', 13, 12], ['guard_b', 22, 12]].map(([id, x, y]) => ({ id, sheet: 'zap_guard', x, y, dir: 2, label: 'Стражник Башни', dialogue: 'trust_soldier', creature: 'zap_guard', group: 'council', peace: FIGHT, if: HERE })),
];

k.write('dam_control', 'Зал пульта', {
  entries: { default: [5, 22], ladder: [5, 22] },
  actors,
  arrive: [{ if: [{ notFlag: 'control_seen' }], effects: [{ type: 'flag', key: 'control_seen' }, { type: 'quest', quest: 'dam', stage: 'trial' }], log: 'Зал пульта. За стеклом — Глубокое, синее до самого края. У пульта ждёт Председатель Затвор.' }],
  cleared: [{ group: 'council', if: [{ flag: 'control_fight' }, { notFlag: 'trial_way' }], effects: [{ type: 'flag', key: 'trial_way', value: 'fought' }, { type: 'quest', quest: 'dam', stage: 'choice' }, { type: 'xp', amount: 300 }], log: 'Стража лежит. Пульт свободен — и тубус в руке тяжелеет.' }],
  triggers: [],
});
