// Builds public/assets/maps/gates_post.json: «Перевал „Ворота“» (stage U) — the Trust's post on the only road to
// the dam: a striped boom across the road, the guard booth of Лукич, a searchlight, guards; north of the boom the
// road climbs on to «Заслон», closed to all until Chapter IX.
import { mapKit } from './map-kit.mjs';

const W = 40;
const H = 32;
const k = mapKit(W, H, 7708);
const { place, fill, set } = k;

fill(8, 4, 31, 29, ':');
for (let y = 0; y < H; y++) for (const x of [19, 20]) set(x, y, '=');
k.rim();

for (let x = 8; x <= 31; x++) if (x < 18 || x > 21) place({ id: `wall_${x}`, frame: 'wall_hi', x, y: 10, label: 'Стена заставы' });
place({ id: 'boom', frame: 'barrier', x: 18, y: 10, w: 1, h: 2, label: 'Шлагбаум', dialogue: 'boom' });
place({ id: 'boom_post', frame: 'wall_hi', x: 21, y: 10, label: 'Стена заставы' });
place({ id: 'boom_b', frame: 'bars_closed', x: 19, y: 10, label: 'Шлагбаум', dialogue: 'boom' });
place({ id: 'boom_c', frame: 'bars_closed', x: 20, y: 10, label: 'Шлагбаум', dialogue: 'boom' });
place({ id: 'booth', frame: 'booth', x: 23, y: 14, label: 'Будка сторожа' });
place({ id: 'draisine_gates', frame: 'draisine', x: 12, y: 26, label: 'Дрезина', dialogue: 'draisine_station' });
place({ id: 'gates_light', frame: 'searchlight', x: 14, y: 12, label: 'Прожектор' });
for (const [x, y] of [[12, 20], [27, 22]]) place({ id: `crate_${x}_${y}`, frame: 'crate', x, y, label: 'Ящик Треста' });
k.scenery([[8, 4, 31, 29]], { cactus: 2, dead_tree: 1, bush: 3 });

k.exit({ id: 'south', x: 19, y: H - 1, w: 2, h: 1, to: 'world', label: 'Карта мира' });
k.exit({ id: 'north', x: 19, y: 0, w: 2, h: 1, to: 'dam_approach', entry: 'gates', label: 'Дорога к Заслону', if: [{ flag: 'boom_up' }], closed: 'Шлагбаум опущен: проход к плотине закрыт.' });

const actors = [
  { id: 'player', sheet: 'hero_0', x: 19, y: 28, dir: 1 },
  { id: 'lukich', sheet: 'lukich', x: 22, y: 16, dir: 5, label: 'Сторож Лукич', dialogue: 'lukich' },
  ...[['gate_guard_a', 16, 13], ['gate_guard_b', 24, 12]].map(([id, x, y]) => ({ id, sheet: 'zap_guard', x, y, dir: 2, label: 'Стражник заставы', dialogue: 'gate_guard', creature: 'zap_guard', group: 'gate_guards', peace: [{ notFlag: 'gates_fight' }] })),
];

k.write('gates_post', 'Перевал «Ворота»', {
  entries: { default: [19, 28], south: [19, 28], rail: [13, 27], north: [19, 3] },
  roads: { south: [19, 20] },
  actors,
  arrive: [{ if: [{ notFlag: 'gates_seen' }], effects: [{ type: 'flag', key: 'gates_seen' }], log: 'Перевал «Ворота»: застава Треста поперёк единственной дороги к плотине. За шлагбаумом дорога уходит вверх, в ущелье.' }],
  cleared: [{ group: 'gate_guards', if: [{ flag: 'gates_fight' }, { notFlag: 'boom_up' }], effects: [{ type: 'flag', key: 'boom_up' }, { type: 'flag', key: 'boom_way', value: 'forced' }, { type: 'flag', key: 'open_boom_b' }, { type: 'flag', key: 'open_boom_c' }], log: 'Стража заставы лежит. Шлагбаум задран к небу — дорога к Заслону открыта.' }],
  triggers: [],
});
