// Builds literny_train.json: the sealed treasury train and its headquarters carriage.
import { mapKit } from './map-kit.mjs';
const W = 44, H = 28;
const k = mapKit(W, H, 8104);
const { place, fill, set } = k;
fill(1, 1, W - 2, H - 2, '#'); fill(2, 6, 41, 21, 'F');
for (let x = 2; x < W - 2; x++) for (const y of [13, 15]) set(x, y, '=');
k.rim();
for (const [id, x] of [['engine', 7], ['vault', 17], ['staff', 27]]) place({ id: `literny_${id}`, frame: id === 'engine' ? 'railcar' : 'wagon', x, y: 10, w: 2, h: 1, label: id === 'staff' ? 'Штабной вагон' : 'Вагон казначейства' });
place({ id: 'seal_mark_12', frame: 'press', x: 31, y: 18, label: 'Двенадцатый оттиск', dialogue: 'seal_mark_12' });
place({ id: 'drop_stamp_safe', frame: 'safe', x: 36, y: 18, label: 'Сейф законных штампов', dialogue: 'drop_stamp_safe' });
place({ id: 'literny_manifest', frame: 'stacks', x: 24, y: 19, label: 'Ведомость «Литерного»', dialogue: 'literny_manifest' });
for (let y = 13; y <= 15; y++) set(0, y, 'F');
k.exit({ id: 'west', x: 0, y: 13, w: 1, h: 3, to: 'literny_tunnel', entry: 'east', label: 'Тоннель' });
k.write('literny_train', 'Бронепоезд «Литерный»', { entries: { default: [3, 14], west: [3, 14] }, actors: [{ id: 'player', sheet: 'hero_0', x: 3, y: 14, dir: 3 }], triggers: [] });
