// Builds public/assets/maps/salt_mines.json: «Копи» of Соль (stage K) — the headframe over the shaft, carts and heaps,
// the overseer Клещ, Солевики in debt (old Пласт and his son Жила), and the far drift east where salt spiders spin
// their webs and Лада and Сол hide behind them.
import { mapKit } from './map-kit.mjs';

const W = 40;
const H = 34;
const k = mapKit(W, H, 7404);
const { place, fill, set } = k;

fill(3, 3, 36, 30, '_');
for (let y = 0; y < 12; y++) for (const x of [20, 21]) set(x, y, '=');
// the far drift: a corridor of rock walls to the east
fill(26, 20, 37, 31, ':');
k.rim();
for (let x = 25; x <= 37; x++) for (const y of [19]) if (x !== 27 && x !== 28) place({ id: `drift_n_${x}`, frame: `rock_${x % 4}`, x, y, label: 'Стена штрека' });
for (let y = 20; y <= 31; y++) if (y !== 24 && y !== 25) place({ id: `drift_w_${y}`, frame: `rock_${y % 4}`, x: 25, y, label: 'Стена штрека' });

place({ id: 'headframe', frame: 'headframe', x: 16, y: 7, w: 2, h: 2, label: 'Копёр над шахтой' });
for (const [x, y] of [[12, 10], [23, 10], [11, 16]]) place({ id: `cart_${x}_${y}`, frame: 'mine_cart', x, y, label: 'Вагонетка' });
for (const [x, y] of [[6, 6], [8, 12], [24, 5], [14, 22], [5, 27], [30, 7]]) place({ id: `heap_${x}_${y}`, frame: 'salt_pile', x, y, label: 'Куча соли' });
for (const [x, y] of [[4, 18], [22, 16], [33, 13]]) place({ id: `growth_${x}_${y}`, frame: 'crystal', x, y, label: 'Соляная друза' });
place({ id: 'overseer_desk', frame: 'table', x: 9, y: 4, w: 2, h: 1, label: 'Стол надсмотрщика' });
place({ id: 'debtors_bunk_a', frame: 'bunk', x: 4, y: 22, label: 'Нары должников' });
place({ id: 'debtors_bunk_b', frame: 'bunk', x: 4, y: 24, label: 'Нары должников' });
place({ id: 'fresh_tank', frame: 'tank', x: 12, y: 25, label: 'Бак с водой', dialogue: 'fresh_tank' });
// webs in the far drift
for (const [x, y] of [[29, 22], [33, 26], [30, 29]]) place({ id: `web_${x}_${y}`, frame: 'salt_web', x, y, label: 'Соляная паутина' });
k.scenery([[3, 3, 36, 30]], { cactus: 0, dead_tree: 0, bush: 0 });

k.exit({ id: 'north', x: 20, y: 0, w: 2, h: 1, to: 'salt_market', entry: 'south', label: 'Соляной рынок' });
// the Солевики's salt tunnel under the Солончаки, to the deep mines of Кристалл (stage V)
k.exit({ id: 'tunnel', x: 0, y: 12, w: 1, h: 2, to: 'crystal_deep', entry: 'tunnel', label: 'Соляной тоннель', if: [{ flag: 'salt_brother' }], closed: 'Узкий ход в соляной толще. Солевики пускают туда только своих.' });
k.clear(0, 12, 3, 13, '_');

const actors = [
  { id: 'player', sheet: 'hero_0', x: 20, y: 2, dir: 3 },
  { id: 'klesch', sheet: 'klesch', x: 10, y: 6, dir: 2, label: 'Надсмотрщик Клещ', dialogue: 'klesch', creature: 'overseer', group: 'mine_guards', peace: [{ notFlag: 'mines_fight' }], if: [{ notFlag: 'mine_guards_gone' }] },
  ...[['mine_guard_a', 14, 9], ['mine_guard_b', 7, 10]].map(([id, x, y]) => ({ id, sheet: 'guild_guard', x, y, dir: 3, label: 'Охрана копей', dialogue: 'guild_guard', creature: 'guild_guard', group: 'mine_guards', peace: [{ notFlag: 'mines_fight' }], if: [{ notFlag: 'mine_guards_gone' }] })),
  { id: 'plast', sheet: 'plast', x: 7, y: 21, dir: 1, label: 'Старый Пласт', dialogue: 'plast' },
  { id: 'zhila', sheet: 'zhila', x: 9, y: 23, dir: 2, label: 'Жила', dialogue: 'zhila' },
  ...[['debtor_a', 13, 13], ['debtor_b', 18, 19], ['debtor_c', 7, 26]].map(([id, x, y]) => ({ id, sheet: 'saltfolk', x, y, dir: 3, label: 'Солевик-должник', dialogue: 'salt_debtor' })),
  // the far drift: spiders, and behind them the runaways
  ...[['spider_a', 29, 24], ['spider_b', 32, 23], ['spider_c', 31, 27]].map(([id, x, y]) => ({ id, sheet: 'salt_spider', x, y, dir: 6, label: 'Соляной паук', creature: 'salt_spider', group: 'spiders' })),
  { id: 'lada', sheet: 'lada', x: 35, y: 29, dir: 6, label: 'Лада', dialogue: 'lada', if: [{ notFlag: 'salt_bride' }] },
  { id: 'sol', sheet: 'sol', x: 36, y: 28, dir: 6, label: 'Сол', dialogue: 'sol', if: [{ notFlag: 'salt_bride' }] },
];

k.write('salt_mines', 'Копи', {
  entries: { default: [20, 2], north: [20, 2], tunnel: [2, 12] },
  roads: { north: [20, 21] },
  actors,
  triggers: [{ id: 'drift_view', x: 24, y: 23, w: 2, h: 4, effects: [], log: 'Дальний штрек затянут белыми нитями. В глубине что-то шуршит — и кто-то шепчет.' }],
  cleared: [
    {
      group: 'mine_guards',
      if: [{ flag: 'mines_fight' }, { notFlag: 'mine_guards_gone' }],
      effects: [{ type: 'flag', key: 'mine_guards_gone' }, { type: 'flag', key: 'empty_water', value: 'freed' }, { type: 'quest', quest: 'empty_water', stage: 'done' }, { type: 'xp', amount: 150 }],
      log: 'Охрана копей лежит у вагонеток. Солевики выливают пресную воду из бака в песок и тянутся к старой трубе с рассолом.',
    },
    { group: 'spiders', if: [{ notFlag: 'mine_spiders_dead' }], effects: [{ type: 'flag', key: 'mine_spiders_dead' }], log: 'Последний паук сворачивается клубком. В дальнем штреке тихо.' },
  ],
});
