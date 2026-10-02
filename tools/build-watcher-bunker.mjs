// Builds watcher_bunker.json: Veres's private office inside the rock above Deep Water.
import { mapKit } from './map-kit.mjs';
const W = 36, H = 28;
const k = mapKit(W, H, 8102);
const { place, fill, set } = k;
fill(1, 1, W - 2, H - 2, '#');
fill(4, 4, 31, 23, 'F');
k.rim();
place({ id: 'watcher_terminal', frame: 'terminal', x: 25, y: 7, label: 'Пульт резервного допуска', dialogue: 'watcher_terminal' });
place({ id: 'watcher_desk', frame: 'table', x: 11, y: 8, w: 2, h: 2, label: 'Стол Смотрителя', dialogue: 'watcher_desk' });
place({ id: 'watcher_archive', frame: 'stacks', x: 6, y: 7, label: 'Личный архив' });
place({ id: 'watcher_voice', frame: 'radio', x: 19, y: 16, label: 'Аппарат записи', dialogue: 'watcher_voice' });
place({ id: 'watcher_photo', frame: 'board', x: 29, y: 18, label: 'Фотография Светлой', dialogue: 'watcher_photo' });
place({ id: 'watcher_safe', frame: 'safe', x: 7, y: 19, label: 'Шкаф допуска' });
for (const x of [17, 18]) set(x, H - 1, 'F');
k.exit({ id: 'south', x: 17, y: H - 1, w: 2, h: 1, to: 'world', label: 'Карта мира' });
k.write('watcher_bunker', 'Бункер Смотрителя', {
  entries: { default: [17, 22], south: [17, 22] }, actors: [{ id: 'player', sheet: 'hero_0', x: 17, y: 22, dir: 1 }],
  arrive: [{ if: [{ notFlag: 'watcher_seen' }], effects: [{ type: 'flag', key: 'watcher_seen' }, { type: 'quest', quest: 'watcher', stage: 'found' }], log: 'За сухим водосбросом — кабинет, законсервированный двести лет назад. На пульте всё ещё горит одна зелёная лампа.' }], triggers: [],
});
