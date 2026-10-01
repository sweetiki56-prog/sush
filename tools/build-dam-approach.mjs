// Builds public/assets/maps/dam_approach.json: «Заслон: подступы» (stage F) — the gorge below the dam where the
// sides of the siege camp by their banners: the Круг's militia, the Сухари, the knights of the Order, the Солевики,
// an envoy of the Высокий берег; the hatch of the Бригада's water main leads under the crest.
import { mapKit } from './map-kit.mjs';

const W = 44;
const H = 40;
const k = mapKit(W, H, 7901);
const { place, fill, set } = k;

fill(3, 3, 40, 36, ':');
for (let y = 0; y < H; y++) for (const x of [21, 22]) set(x, y, '=');
k.rim();

// every side of the siege camps under its banner; who of them fights beside the hero is told by the flags
const camp = (id, label, x, y) => {
  place({ id: `banner_${id}`, frame: `banner_${id}`, x, y, label });
  place({ id: `fire_${id}`, frame: 'campfire', x: x + 2, y: y + 1, label: 'Костёр' });
};
camp('circle', 'Знамя Круга колодцев', 7, 26);
camp('dry', 'Знамя Сухарей', 33, 27);
camp('order', 'Знамя Ордена Росы', 7, 12);
camp('salt', 'Знамя Солевиков', 33, 12);
camp('shore', 'Знамя Высокого берега', 37, 4);
place({ id: 'aqueduct_hatch', frame: 'hatch', x: 6, y: 34, block: false, label: 'Люк водовода', dialogue: 'aqueduct_hatch' });
for (const [x, y] of [[15, 18], [28, 19], [17, 31]]) place({ id: `tent_${x}_${y}`, frame: 'tent', x, y, label: 'Палатка' });
k.scenery([[3, 3, 40, 36]], { cactus: 1, dead_tree: 2, bush: 4 });

k.exit({ id: 'south', x: 21, y: H - 1, w: 2, h: 1, to: 'world', label: 'Карта мира' });
k.exit({ id: 'north', x: 21, y: 0, w: 2, h: 1, to: 'dam_crest', entry: 'south', label: 'Гребень плотины' });

const actors = [
  { id: 'player', sheet: 'hero_0', x: 21, y: 37, dir: 1 },
  { id: 'militia_lead', sheet: 'farmer', x: 9, y: 28, dir: 2, label: 'Ополченец Круга', dialogue: 'dam_militia', if: [{ flag: 'ally_circle' }] },
  { id: 'dry_lead', sheet: 'kremen', x: 31, y: 29, dir: 6, label: 'Кремень', dialogue: 'dam_dry', if: [{ flag: 'ally_dry' }] },
  { id: 'order_lead', sheet: 'dew_knight', x: 9, y: 14, dir: 2, label: 'Рыцарь Росы', dialogue: 'dam_order', if: [{ flag: 'ally_order' }] },
  { id: 'salt_lead', sheet: 'granit', x: 31, y: 14, dir: 6, label: 'Солевик', dialogue: 'dam_salt', if: [{ flag: 'ally_salt' }] },
  { id: 'yarina_dam', sheet: 'yarina', x: 34, y: 7, dir: 5, label: 'Капитан Ветрова', dialogue: 'yarina_dam', if: [{ flag: 'shore_known' }] },
];

const ALLY = (key, test) => ({ if: [{ notFlag: key }, ...test], effects: [{ type: 'flag', key }] });
k.write('dam_approach', 'Подступы к Заслону', {
  entries: { default: [21, 37], south: [21, 37], north: [21, 2], gates: [21, 37] },
  roads: { south: [21, 22], north: [21, 22] },
  actors,
  arrive: [
    { if: [{ notFlag: 'dam_started' }], effects: [{ type: 'flag', key: 'dam_started' }, { type: 'quest', quest: 'dam', stage: 'siege' }], log: 'Заслон: бетонная стена поперёк ущелья, а за ней — синее, как на открытке. Внизу, у подножия, лагеря всех, кто пришёл за этой водой.' },
    ALLY('ally_circle', [{ flag: 'threat_told', eq: 'circle' }]),
    ALLY('ally_circle', [{ flag: 'militia_warned' }]),
    ALLY('ally_dry', [{ notFlag: 'bones_enemy' }, { flag: 'key_whole' }]),
    ALLY('ally_order', [{ flag: 'order_ally' }]),
    ALLY('ally_salt', [{ flag: 'salt_promise', eq: 'protect' }]),
    ALLY('ally_salt', [{ flag: 'salt_promise', eq: 'sections' }]),
    ALLY('shore_known', [{ flag: 'second_dam_hint' }]),
    ALLY('shore_known', [{ flag: 'defector', eq: 'saved' }]),
    ALLY('shore_known', [{ flag: 'defector', eq: 'returned' }]),
  ],
  triggers: [],
});
