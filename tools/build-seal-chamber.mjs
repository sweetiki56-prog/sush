// Builds seal_chamber.json: the hidden archive and press room of the Sealwax.
import { mapKit } from './map-kit.mjs';
const W = 38, H = 30;
const k = mapKit(W, H, 8105);
const { place, fill, set } = k;
fill(1, 1, W - 2, H - 2, '#'); fill(4, 4, 33, 25, 'F'); k.rim();
for (const [x, y] of [[6, 6], [10, 6], [6, 11], [10, 11], [26, 6], [30, 6]]) place({ id: `seal_stacks_${x}_${y}`, frame: 'stacks', x, y, label: 'Архив Сургуча' });
place({ id: 'seal_press', frame: 'press', x: 18, y: 9, label: 'Печатный пресс', dialogue: 'seal_press' });
place({ id: 'chamber_ledger', frame: 'card_catalog', x: 29, y: 17, label: 'Книга Палаты', dialogue: 'chamber_ledger' });
place({ id: 'printer_table', frame: 'table', x: 18, y: 17, w: 2, h: 2, label: 'Стол Печатника' });
for (const x of [18, 19]) set(x, H - 1, 'F');
k.exit({ id: 'south', x: 18, y: H - 1, w: 2, h: 1, to: 'ruins_streets', entry: 'chamber', label: 'Руины Светлоречья' });
const peace = [{ notFlag: 'sealwax_enemy' }];
k.write('seal_chamber', 'Палата мер и печатей', {
  entries: { default: [18, 24], south: [18, 24] },
  actors: [{ id: 'player', sheet: 'hero_0', x: 18, y: 24, dir: 1 },
    { id: 'printer_chamber', sheet: 'ottisk', x: 18, y: 15, dir: 5, label: 'Печатник', dialogue: 'printer_chamber', creature: 'ottisk', group: 'sealwax', peace, if: [{ notFlag: 'sealwax_done' }] },
    ...[[13, 16], [24, 16], [14, 10]].map(([x, y], i) => ({ id: `seal_scribe_${i}`, sheet: 'sealwax_agent', x, y, dir: 5, label: 'Писец Сургуча', creature: 'sealwax_agent', group: 'sealwax', peace, if: [{ notFlag: 'sealwax_done' }] }))],
  cleared: [{ group: 'sealwax', if: [{ flag: 'sealwax_enemy' }, { notFlag: 'sealwax_crushed' }], effects: [{ type: 'flag', key: 'sealwax_crushed' }, { type: 'flag', key: 'chamber_open' }, { type: 'quest', quest: 'seal_chamber', stage: 'done' }], log: 'Палата затихает. Пресс остановлен; архив и книга пайщиков открыты.' }], triggers: [],
});
