// Builds public/assets/maps/skit_depths.json: «Филиал „Роса-1“» under the Скит (stage S) — the dew catchers' works,
// the safe with the plans, sentry machines, the stairs up, a duct to the archive and the vent to «Роса-2».
import { mapKit } from './map-kit.mjs';

const W = 40;
const H = 36;
const k = mapKit(W, H, 7604);
const { place, fill } = k;

fill(2, 2, 37, 33, 'F');
k.rim();

for (const [x, y] of [[10, 10], [14, 10], [18, 10], [10, 16], [14, 16], [18, 16]]) place({ id: `machine_${x}_${y}`, frame: 'machine', x, y, label: 'Станок росоуловителей' });
for (const [x, y] of [[26, 14], [26, 20]]) place({ id: `sail_${x}_${y}`, frame: 'dew_sail', x, y, label: 'Недособранный парус' });
place({ id: 'dew_safe', frame: 'safe', x: 32, y: 7, label: 'Сейф с чертежами', dialogue: 'dew_safe' });
for (const [x, y] of [[34, 12], [8, 26]]) place({ id: `term_${x}_${y}`, frame: 'terminal', x, y, label: 'Мёртвый терминал' });
place({ id: 'stairs_up', frame: 'ladder', x: 20, y: 3, label: 'Лестница во двор', dialogue: 'stairs_up' });
place({ id: 'depths_duct', frame: 'hatch', x: 34, y: 28, block: false, label: 'Воздуховод к архиву', dialogue: 'depths_duct' });
place({ id: 'vent_up', frame: 'hatch', x: 4, y: 30, block: false, label: 'Вентшахта', dialogue: 'vent_rosa' });
k.scenery([[2, 2, 37, 33]], { cactus: 0, dead_tree: 0, bush: 0 });

const actors = [
  { id: 'player', sheet: 'hero_0', x: 20, y: 5, dir: 3 },
  ...[['sentry_a', 24, 8, [[24, 8], [30, 12]]], ['sentry_b', 12, 22, [[12, 22], [24, 26]]], ['sentry_c', 30, 24]].map(([id, x, y, patrol]) => ({ id, sheet: 'sentry', x, y, dir: 2, label: 'Сторожевая машина', creature: 'sentry', group: 'sentries', peace: [{ notFlag: 'depths_alarm' }], ...(patrol ? { patrol } : {}) })),
];

k.write('skit_depths', 'Филиал «Роса-1»', {
  entries: { default: [20, 5], stairs: [20, 5], vent: [5, 30], duct: [33, 28] },
  actors,
  arrive: [{ if: [{ notFlag: 'skit_in' }], effects: [{ type: 'flag', key: 'skit_in' }, { type: 'flag', key: 'skit_way', value: 'vents' }, { type: 'quest', quest: 'skit', stage: 'archive' }], log: 'Вентшахта выводит в гудящий подвал под Скитом. Ворота остались где-то наверху, за спиной рыцарей.' }],
  triggers: [],
});
