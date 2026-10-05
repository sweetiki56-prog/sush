// Medical, ration and maintenance records share one readable archive map.
import { mapKit } from './map-kit.mjs';

const k = mapKit(26, 22, 8165);
k.fill(2, 2, 23, 19, 'F');
for (const y of [10, 11]) for (const x of [24, 25]) k.set(x, y, '=');
for (const x of [12, 13]) k.set(x, 21, '=');
k.rim();
for (const y of [10, 11]) k.set(25, y, '=');
for (const x of [12, 13]) k.set(x, 21, '=');
k.place({ id: 'rocket_medical', frame: 'locker', x: 7, y: 6, label: 'Медицинский журнал', dialogue: 'rocket_medical' });
k.place({ id: 'rocket_ledger', frame: 'locker', x: 17, y: 6, label: 'Книга пайков', dialogue: 'rocket_ledger' });
k.place({ id: 'rocket_project', frame: 'rocket_mural', x: 7, y: 15, block: false, label: 'Папка R.A.K.E.T.A.', dialogue: 'rocket_project' });
k.place({ id: 'rocket_dam_record', frame: 'radio', x: 18, y: 15, label: 'Служебная запись', dialogue: 'rocket_dam_record' });
k.exit({ id: 'south', x: 12, y: 21, w: 2, h: 1, to: 'rocket_tunnel', entry: 'archive', label: 'Туннель' });
k.exit({ id: 'east', x: 25, y: 10, w: 1, h: 2, to: 'rocket_palace', entry: 'east', label: 'Зал Ракеты' });
k.write('rocket_archive', 'Архив Обители', {
  entries: { default: [12, 18], south: [12, 18], west: [22, 10] },
  roads: { south: [12, 13], east: [10, 11] },
  actors: [
    { id: 'player', sheet: 'hero_0', x: 12, y: 18, dir: 1 },
    { id: 'rocket_chronicler', sheet: 'rocket_keeper', x: 13, y: 10, dir: 3, label: 'Летописец', dialogue: 'rocket_chronicler' },
  ],
  arrive: [{ if: [{ notFlag: 'rocket_archive_seen' }], effects: [{ type: 'quest', quest: 'rocket', stage: 'source' }], log: 'Полки тянутся через десятилетия. Среди дат — одна и та же отметина на левом ухе.' }],
});
