// Builds public/assets/maps/salt_guild.json: «Гильдейский двор» of Соль (stage K) — a yard walled with salt blocks
// behind a barred gate and its keeper, Агата Крупица's office and Мерка's counting house under roofs, the Guild's
// store of sacks and crates, the Guild's guards. The only way is back south to the market.
import { mapKit } from './map-kit.mjs';

const W = 40;
const H = 32;
const k = mapKit(W, H, 7402);
const { place, fill, set } = k;

fill(3, 3, 36, 28, '_');
for (let y = 14; y < H; y++) for (const x of [20, 21]) set(x, y, '=');
fill(10, 14, 31, 16, '=');
k.rim();

// the yard wall with the barred gate
for (let x = 3; x <= 36; x++) {
  if (x === 20 || x === 21) continue;
  place({ id: `yard_wall_${x}`, frame: x % 7 === 3 ? 'salt_broken' : 'salt_lo', x, y: 24, label: 'Стена двора' });
}
place({ id: 'guild_gate_a', frame: 'bars_closed', x: 20, y: 24, label: 'Ворота двора', dialogue: 'guild_gate' });
place({ id: 'guild_gate_b', frame: 'bars_closed', x: 21, y: 24, label: 'Ворота двора', dialogue: 'guild_gate' });
// Крупица's office
k.building('office', 5, 4, 15, 12, [[15, 8]], 'Стена конторы', 'planks', 'salt');
place({ id: 'office_desk', frame: 'table', x: 8, y: 7, w: 2, h: 1, label: 'Стол гильдмейстера' });
place({ id: 'office_shelf', frame: 'shelf', x: 12, y: 5, label: 'Полка с договорами' });
place({ id: 'office_safe', frame: 'safe', x: 6, y: 10, label: 'Сейф Гильдии' });
// the counting house
k.building('counting', 25, 4, 35, 11, [[25, 8]], 'Стена счётной палаты', 'tin', 'salt');
place({ id: 'debt_book', frame: 'counter', x: 30, y: 6, w: 2, h: 1, label: 'Счётная книга', dialogue: 'debt_book' });
place({ id: 'count_shelf', frame: 'shelf', x: 34, y: 5, label: 'Полки с книгами' });
// the store
for (const [x, y] of [[18, 5], [18, 7], [20, 5]]) place({ id: `store_sacks_${x}_${y}`, frame: 'sacks', x, y, label: 'Мешки Гильдии' });
for (const [x, y] of [[22, 6], [22, 9], [17, 10]]) place({ id: `store_crate_${x}_${y}`, frame: 'crate', x, y, label: 'Ящики Гильдии' });
place({ id: 'yard_scales', frame: 'scales', x: 12, y: 19, label: 'Весы' });
place({ id: 'yard_wagon', frame: 'wagon', x: 26, y: 18, w: 2, h: 1, label: 'Повозка Гильдии' });
k.scenery([[3, 3, 36, 28]], { cactus: 0, dead_tree: 1, bush: 2 });

k.exit({ id: 'south', x: 20, y: H - 1, w: 2, h: 1, to: 'salt_market', entry: 'north', label: 'Соляной рынок' });

const GUILD = [{ notFlag: 'krupitsa_fight' }];
const actors = [
  { id: 'player', sheet: 'hero_0', x: 20, y: 29, dir: 1 },
  { id: 'gatekeeper', sheet: 'guild_guard', x: 18, y: 26, dir: 7, label: 'Привратник Гильдии', dialogue: 'guild_gatekeeper' },
  { id: 'krupitsa', sheet: 'krupitsa', x: 9, y: 9, dir: 1, label: 'Агата Крупица', dialogue: 'krupitsa', creature: 'krupitsa', group: 'guild', peace: GUILD, if: [{ notFlag: 'krupitsa_gone' }] },
  { id: 'merka', sheet: 'merka', x: 29, y: 8, dir: 1, label: 'Счетовод Мерка', dialogue: 'merka', if: [{ notFlag: 'merka_gone' }] },
  { id: 'guild_guard_a', sheet: 'guild_guard', x: 13, y: 15, dir: 3, label: 'Охрана Гильдии', dialogue: 'guild_guard', creature: 'guild_guard', group: 'guild', peace: GUILD, if: [{ notFlag: 'guild_guards_gone' }] },
  { id: 'guild_guard_b', sheet: 'guild_guard', x: 28, y: 15, dir: 5, label: 'Охрана Гильдии', dialogue: 'guild_guard', creature: 'guild_guard', group: 'guild', peace: GUILD, if: [{ notFlag: 'guild_guards_gone' }] },
  { id: 'clerk', sheet: 'debtor', x: 23, y: 13, dir: 2, label: 'Приказчик', dialogue: 'guild_clerk' },
];

k.write('salt_guild', 'Гильдейский двор', {
  entries: { default: [20, 29], south: [20, 29] },
  roads: { south: [20, 21] },
  actors,
  triggers: [],
  cleared: [
    {
      group: 'guild',
      if: [{ flag: 'krupitsa_fight' }, { notFlag: 'krupitsa_fate' }],
      effects: [{ type: 'flag', key: 'krupitsa_fate', value: 'dead' }, { type: 'flag', key: 'krupitsa_gone' }, { type: 'flag', key: 'guild_guards_gone' }, { type: 'flag', key: 'mines_known' }, { type: 'quest', quest: 'salt', stage: 'crystal' }],
      log: 'Крупица лежит у своего стола. Двор Гильдии пуст, только ветер гоняет соль. Гильдия этого не забудет.',
    },
  ],
});
