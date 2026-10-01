// Builds public/assets/maps/ark_ship.json: «Ковчег» on board (stage N) — the deck of planks, the prophet's cabin with
// a pre-war radio that hisses the forecasts of the «Шептун», Отец Облако himself.
import { mapKit } from './map-kit.mjs';

const W = 36;
const H = 28;
const k = mapKit(W, H, 8008);
const { place, fill, set } = k;

fill(3, 3, 32, 24, 'F');
for (let y = 20; y < H; y++) for (const x of [17, 18]) set(x, y, '=');
k.rim();
k.building('cabin', 22, 5, 30, 12, [[26, 12]], 'Стена каюты', 'tin');

place({ id: 'ark_radio', frame: 'radio', x: 27, y: 7, label: 'Приёмник', dialogue: 'ark_radio' });
for (const [x, y] of [[6, 6], [6, 12], [12, 6], [12, 16]]) place({ id: `cask_${x}_${y}`, frame: 'barrel', x, y, label: 'Пустая бочка «для дождя»' });
place({ id: 'ark_mast', frame: 'mast', x: 16, y: 10, label: 'Мачта' });
k.scenery([[3, 3, 32, 24]], { cactus: 0, dead_tree: 0, bush: 0 });

k.exit({ id: 'south', x: 17, y: H - 1, w: 2, h: 1, to: 'ark_camp', entry: 'north', label: 'Лагерь' });

const actors = [
  { id: 'player', sheet: 'hero_0', x: 17, y: 25, dir: 1 },
  { id: 'oblako', sheet: 'oblako', x: 19, y: 14, dir: 2, label: 'Отец Облако', dialogue: 'oblako' },
];

k.write('ark_ship', 'Палуба Ковчега', {
  entries: { default: [17, 25], south: [17, 25] },
  roads: { south: [17, 18] },
  actors,
  triggers: [],
});
