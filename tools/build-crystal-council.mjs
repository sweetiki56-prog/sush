// Builds public/assets/maps/crystal_council.json: «Совет пластов» of Кристалл (stage V) — the hall with the Wall of
// names, Старший Кварц and the councillors, the archive niches along the walls.
import { mapKit } from './map-kit.mjs';

const W = 36;
const H = 32;
const k = mapKit(W, H, 7502);
const { place, fill, set } = k;

fill(3, 3, 32, 28, '.');
fill(8, 7, 27, 22, 'F');
for (let y = 22; y < H; y++) for (const x of [17, 18]) set(x, y, '=');
k.rim();

place({ id: 'wall_names', frame: 'wall_names', x: 16, y: 6, w: 3, h: 1, label: 'Стена имён', dialogue: 'wall_of_names' });
for (const [x, y] of [[6, 5], [6, 9], [6, 13], [6, 17], [29, 5], [29, 9], [29, 13], [29, 17]]) place({ id: `niche_${x}_${y}`, frame: 'niche', x, y, label: 'Ниша-архив', dialogue: 'name_niches' });
for (const [x, y, v] of [[12, 4, 'a'], [23, 4, 'b'], [4, 24, 'b'], [31, 24, 'a']]) place({ id: `vein_${x}_${y}`, frame: `vein_${v}`, x, y, label: 'Светящаяся жила' });
for (const [x, y] of [[12, 14], [23, 14]]) place({ id: `bench_${x}_${y}`, frame: 'bunk', x, y, label: 'Скамья Совета' });
k.scenery([[3, 3, 32, 28]], { cactus: 0, dead_tree: 0, bush: 0 });

k.exit({ id: 'south', x: 17, y: H - 1, w: 2, h: 1, to: 'crystal_gate', entry: 'north', label: 'Верхние ярусы' });

const actors = [
  { id: 'player', sheet: 'hero_0', x: 17, y: 29, dir: 1 },
  { id: 'kvarts', sheet: 'kvarts', x: 17, y: 9, dir: 1, label: 'Старший Кварц', dialogue: 'quartz' },
  ...[['councilor_a', 13, 11], ['councilor_b', 22, 11], ['councilor_c', 11, 17]].map(([id, x, y]) => ({ id, sheet: 'councilor', x, y, dir: 2, label: 'Советник пластов', dialogue: 'councilor' })),
  { id: 'gorech_council', npcId: 'gorech', sheet: 'gorech', x: 24, y: 17, dir: 5, label: 'Горечь', dialogue: 'gorech', if: [{ flag: 'bitter_blood', eq: 'reconciled' }] },
];

k.write('crystal_council', 'Совет пластов', {
  entries: { default: [17, 29], south: [17, 29] },
  roads: { south: [17, 18] },
  actors,
  triggers: [{ id: 'hall_view', x: 14, y: 24, w: 8, h: 4, effects: [], log: 'Зал Совета пластов: своды из соли, в нишах — свитки на тонких пластинах. Во всю стену — тысячи выцарапанных имён.' }],
});
