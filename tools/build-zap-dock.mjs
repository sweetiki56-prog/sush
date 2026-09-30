// Builds public/assets/maps/zap_dock.json: «Сухой док», the prison in the basin of the old river dock — barred cells,
// the warden's post and the chest of what was taken away, a grate down to the sewers, the gate to the Lower city.
import { mapKit } from './map-kit.mjs';

const W = 34;
const H = 26;
const k = mapKit(W, H, 9104);
const { place, fill } = k;

fill(2, 2, 31, 23, 'F');
k.rim();

/** A cell: walls and a barred door on its south side. */
function cell(id, x0, door) {
  k.building(id, x0, 2, x0 + 5, 7, [[door, 7]], 'Стена камеры');
  place({ id: `${id}_door`, frame: 'bars_closed', x: door, y: 7, label: 'Решётка камеры', dialogue: id === 'cell_a' ? 'cell_door' : 'cell_other' });
  place({ id: `${id}_bunk`, frame: 'bunk', x: x0 + 1, y: 3, label: 'Нары' });
}
cell('cell_a', 3, 6);
cell('cell_b', 10, 13);
cell('cell_c', 17, 20);
place({ id: 'warden_table', frame: 'table', x: 21, y: 12, label: 'Стол надзирателя' });
place({ id: 'dock_stash', frame: 'crate', x: 25, y: 11, label: 'Ящик с изъятым', dialogue: 'dock_stash' });
place({ id: 'dock_grate', frame: 'hatch', x: 28, y: 20, block: false, label: 'Решётка в стоки', dialogue: 'dock_grate' });
for (const [x, y] of [[4, 18], [9, 20], [14, 17]]) place({ id: `dock_barrel_${x}`, frame: 'barrel', x, y, label: 'Бочка' });
k.scenery([[0, 0, W - 1, H - 1]], { cactus: 0, dead_tree: 0, bush: 0 });
k.clear(16, 22, 17, H - 1, 'F');

k.exit({ id: 'gate', x: 16, y: H - 1, w: 2, h: 1, to: 'zap_lower', entry: 'dock', label: 'Нижний город', if: [{ flag: 'bounty_done' }], closed: 'Ворота дока на засове. Стража у ворот не отводит глаз.' });

const CALM = [{ notFlag: 'dock_riot' }];
const actors = [
  { id: 'player', sheet: 'hero_0', x: 5, y: 5, dir: 3 },
  { id: 'warden', sheet: 'sych_warden', x: 20, y: 11, dir: 5, label: 'Надзиратель Сыч', dialogue: 'warden', creature: 'zap_guard', group: 'dock_guards', peace: CALM },
  ...[['dock_guard_a', 12, 14], ['dock_guard_b', 24, 17]].map(([id, x, y]) => ({ id, sheet: 'zap_guard', x, y, dir: 1, label: 'Стражник дока', dialogue: 'zap_guard', creature: 'dock_guard', group: 'dock_guards', peace: CALM })),
  // the next cell: calm prisoners to talk to, or the riot fighting beside the hero
  // a cellmate who has been here long enough to know the ways out, and the next cell
  { id: 'cellmate', sheet: 'prisoner', x: 7, y: 4, dir: 5, label: 'Сокамерник', dialogue: 'prisoners', if: CALM },
  { id: 'prisoner_b', sheet: 'prisoner', x: 14, y: 5, dir: 3, label: 'Заключённый', dialogue: 'cell_other', if: CALM },
  ...[['rioter_a', 12, 9], ['rioter_b', 14, 9], ['rioter_c', 19, 9], ['rioter_d', 8, 10]].map(([id, x, y]) => ({ id, sheet: 'prisoner', x, y, dir: 3, label: 'Бунтовщик', creature: 'prisoner', group: 'rioters', ally: true, if: [{ flag: 'dock_riot' }, { notFlag: 'bounty_done' }] })),
];

const cleared = [
  {
    group: 'dock_guards',
    if: [{ flag: 'dock_riot' }, { notFlag: 'bounty_done' }],
    effects: [{ type: 'flag', key: 'bounty_done', value: 'riot' }, { type: 'flag', key: 'riot_heat', value: 1 }, { type: 'quest', quest: 'zapruda', stage: 'choice' }],
    log: 'Стража дока лежит или бежит. Заключённые выламывают ворота — бунт выплёскивается в Нижний город.',
  },
];

k.write('zap_dock', '«Сухой док»', {
  entries: { default: [5, 5], cell: [5, 5], gate: [16, 23], grate: [27, 20] },
  roads: { south: [16, 17] },
  actors,
  triggers: [],
  cleared,
});
