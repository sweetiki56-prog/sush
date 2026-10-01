// Builds public/assets/maps/whisper_tower.json: «Вышка „Шептуна“» (stage U) — the summit: the lattice mast, the
// relay console under a tin shed, cables down to the bunker.
import { mapKit } from './map-kit.mjs';

const W = 32;
const H = 28;
const k = mapKit(W, H, 7706);
const { place, fill, set } = k;

fill(4, 4, 27, 23, ':');
for (let y = 20; y < H; y++) set(15, y, '=');
k.rim();
k.building('shed', 18, 8, 25, 14, [[21, 14]], 'Стена будки', 'tin');

place({ id: 'relay_mast', frame: 'relay_mast', x: 10, y: 10, label: 'Мачта ретранслятора' });
place({ id: 'relay_console', frame: 'relay_console', x: 21, y: 10, label: 'Пульт ретранслятора', dialogue: 'relay_console' });
place({ id: 'tower_cable', frame: 'pipes', x: 13, y: 16, label: 'Кабель в бункер' });
k.scenery([[4, 4, 27, 23]], { cactus: 0, dead_tree: 1, bush: 2 });

k.exit({ id: 'south', x: 15, y: H - 1, w: 1, h: 1, to: 'whisper_slope', entry: 'north', label: 'Склон' });

const actors = [{ id: 'player', sheet: 'hero_0', x: 15, y: 24, dir: 1 }];

k.write('whisper_tower', 'Вышка «Шептуна»', {
  entries: { default: [15, 24], south: [15, 24] },
  roads: { south: [15] },
  actors,
  triggers: [],
});
