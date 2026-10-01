// Builds public/assets/maps/ruins_cellar.json: «Подвалы» under the ruins (stage B) — the hideout of the Писарь (or
// his partner Оттиск): agents of the Сургуч, the hostage tied by a pillar, the ladder up to the streets.
import { mapKit } from './map-kit.mjs';

const W = 36;
const H = 30;
const k = mapKit(W, H, 7807);
const { place, fill } = k;

fill(2, 2, 33, 27, 'F');
k.rim();

for (const [x, y] of [[10, 8], [24, 8], [10, 18], [24, 18]]) place({ id: `pillar_${x}_${y}`, frame: 'wall_hi', x, y, label: 'Опора свода' });
for (const [x, y] of [[28, 5], [29, 6], [6, 22]]) place({ id: `crate_${x}_${y}`, frame: 'crate', x, y, label: 'Ящик' });
place({ id: 'wax_table', frame: 'table', x: 17, y: 6, label: 'Стол с печатями', dialogue: 'wax_table' });
place({ id: 'cellar_up', frame: 'ladder', x: 4, y: 25, label: 'Лестница наверх', dialogue: 'cellar_up' });
k.scenery([[2, 2, 33, 27]], { cactus: 0, dead_tree: 0, bush: 0 });

const HELD = [{ flag: 'hostage' }, { notFlag: 'hostage_way' }];
const FIGHT = [{ notFlag: 'cellar_fight' }];
const actors = [
  { id: 'player', sheet: 'hero_0', x: 5, y: 24, dir: 2 },
  { id: 'pisar_k', sheet: 'pisar', x: 17, y: 9, dir: 1, label: 'Писарь', dialogue: 'pisar_hideout', creature: 'pisar_k', group: 'agents', peace: FIGHT, if: [...HELD, { notFlag: 'kidnapper' }] },
  { id: 'ottisk', sheet: 'ottisk', x: 17, y: 9, dir: 1, label: 'Оттиск', dialogue: 'ottisk_hideout', creature: 'ottisk', group: 'agents', peace: FIGHT, if: [...HELD, { flag: 'kidnapper' }] },
  ...[['agent_a', 13, 12], ['agent_b', 21, 12], ['agent_c', 26, 20]].map(([id, x, y]) => ({ id, sheet: 'sealwax_agent', x, y, dir: 2, label: 'Человек Сургуча', dialogue: 'sealwax_agent', creature: 'sealwax_agent', group: 'agents', peace: FIGHT, if: HELD })),
  { id: 'hostage_lelya', sheet: 'lelya', x: 25, y: 9, dir: 6, label: 'Лёля Реле', dialogue: 'hostage_lelya', if: [{ flag: 'lelya_taken' }] },
  { id: 'hostage_marta', sheet: 'marta', x: 25, y: 9, dir: 6, label: 'Марта', dialogue: 'hostage_marta', if: [{ flag: 'marta_taken' }] },
];

const FREE = [{ type: 'flag', key: 'lelya_taken', value: false }, { type: 'flag', key: 'marta_taken', value: false }];
const END = [{ type: 'flag', key: 'mandate_known' }, { type: 'flag', key: 'chapter8_done' }, { type: 'quest', quest: 'bones', stage: 'done' }, { type: 'xp', amount: 300 }];

k.write('ruins_cellar', 'Подвалы Светлоречья', {
  entries: { default: [5, 24], ladder: [5, 24] },
  actors,
  cleared: [
    { group: 'agents', if: [{ flag: 'cellar_fight' }, { notFlag: 'hostage_way' }, { flag: 'printer_known' }], effects: [{ type: 'flag', key: 'hostage_way', value: 'stormed' }, ...FREE, ...END], log: 'Последний человек Сургуча падает между опорами. Вы режете верёвки.' },
    { group: 'agents', if: [{ flag: 'cellar_fight' }, { notFlag: 'hostage_way' }, { notFlag: 'printer_known' }], effects: [{ type: 'flag', key: 'hostage_way', value: 'stormed' }, { type: 'flag', key: 'printer_known' }, { type: 'flag', key: 'printer_way', value: 'scribe' }, { type: 'give', item: 'printer_letter' }, ...FREE, ...END], log: 'Последний человек Сургуча падает между опорами. На столе с печатями — письмо за подписью «Е. Штемпель». Нотариус. Вы режете верёвки.' },
  ],
  triggers: [],
});
