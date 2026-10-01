// Builds public/assets/maps/bone_camp.json: «Костяной круг: лагерь» (stage B) — a canyon floor behind a gate of bull
// ribs: hide tents, the ring of bone posts round Мать Трещина, Кремень with his warriors, the quiet Щебень, a dug-up
// patch by the ring. North the trail of trials climbs the canyon.
import { mapKit } from './map-kit.mjs';
import { HOSTAGE_HOOKS } from './hostage-hooks.mjs';

const W = 40;
const H = 36;
const k = mapKit(W, H, 7801);
const { place, fill, set } = k;

fill(4, 3, 35, 33, ':');
for (let y = 0; y < H; y++) for (const x of [19, 20]) set(x, y, y > 29 || y < 4 ? '=' : ':');
k.rim();

for (let x = 4; x <= 35; x++) if (x !== 19 && x !== 20) place({ id: `palisade_${x}`, frame: 'thorn_fence', x, y: 30, label: 'Ограда из колючки' });
place({ id: 'bone_gate_a', frame: 'bars_closed', x: 19, y: 30, label: 'Ворота из рёбер', dialogue: 'bone_gate' });
place({ id: 'bone_gate_b', frame: 'bars_closed', x: 20, y: 30, label: 'Ворота из рёбер', dialogue: 'bone_gate' });
// the ring of bone posts
for (let i = 0; i < 12; i++) {
  const a = (i / 12) * Math.PI * 2;
  const x = Math.round(20 + Math.cos(a) * 6);
  const y = Math.round(15 + Math.sin(a) * 5);
  if (x === 20 && y === 20) continue; // the way in
  place({ id: `ring_${i}`, frame: 'bone_ring', x, y, label: 'Круг костей' });
}
for (const [x, y] of [[7, 7], [11, 6], [30, 7], [33, 12], [8, 26], [31, 25], [27, 27]]) place({ id: `tent_${x}_${y}`, frame: 'tent', x, y, label: 'Шатёр Сухарей' });
place({ id: 'traitor_tent', frame: 'tent', x: 6, y: 21, label: 'Шатёр Щебня', dialogue: 'traitor_tent' });
place({ id: 'dug_bones', frame: 'skeleton', x: 27, y: 12, block: false, label: 'Разрытая земля', dialogue: 'dug_bones' });
place({ id: 'camp_fire', frame: 'campfire', x: 14, y: 24, label: 'Костёр', bench: 'fire' });
k.scenery([[4, 3, 35, 33]], { cactus: 2, dead_tree: 2, bush: 4 });

k.exit({ id: 'south', x: 19, y: H - 1, w: 2, h: 1, to: 'world', label: 'Карта мира' });
k.exit({ id: 'north', x: 19, y: 0, w: 2, h: 1, to: 'bone_trail', entry: 'south', label: 'Тропа испытаний' });

const FIGHT = [{ notFlag: 'bones_fight' }];
const actors = [
  { id: 'player', sheet: 'hero_0', x: 19, y: 33, dir: 1 },
  { id: 'bone_guard', sheet: 'suhar', x: 17, y: 32, dir: 3, label: 'Страж ворот', dialogue: 'bone_guard', creature: 'suhar', group: 'gate_guards', peace: [{ notFlag: 'circle_forced' }], if: [{ notFlag: 'circle_way' }] },
  { id: 'bone_guard_b', sheet: 'suhar', x: 22, y: 32, dir: 5, label: 'Страж ворот', dialogue: 'bone_guard', creature: 'suhar', group: 'gate_guards', peace: [{ notFlag: 'circle_forced' }], if: [{ notFlag: 'circle_way' }] },
  { id: 'tresh', sheet: 'tresh', x: 20, y: 14, dir: 2, label: 'Мать Трещина', dialogue: 'tresh', creature: 'tresh', group: 'elders', peace: FIGHT, if: [{ notFlag: 'tresh_dead' }] },
  { id: 'kremen_c', sheet: 'kremen', x: 28, y: 20, dir: 5, label: 'Кремень', dialogue: 'kremen_c', creature: 'kremen', group: 'elders', peace: FIGHT, if: [{ notFlag: 'kremen_dead' }] },
  { id: 'shcheben', sheet: 'shcheben', x: 8, y: 22, dir: 3, label: 'Щебень', dialogue: 'shcheben', creature: 'shcheben', group: 'traitor', peace: [{ notFlag: 'traitor_fight' }], if: [{ notFlag: 'traitor' }] },
  ...[['warrior_a', 12, 12, [[12, 12], [12, 20]]], ['warrior_b', 29, 16, [[29, 16], [24, 24]]]].map(([id, x, y, patrol]) => ({ id, sheet: 'suhar', x, y, dir: 2, label: 'Воин Сухарей', dialogue: 'suhar_warrior', creature: 'suhar', group: 'elders', peace: FIGHT, patrol })),
];

k.write('bone_camp', 'Костяной круг', {
  entries: { default: [19, 33], south: [19, 33], north: [19, 2] },
  roads: { south: [19, 20], north: [19, 20] },
  actors,
  arrive: [
    { if: [{ notFlag: 'bones_started' }], effects: [{ type: 'flag', key: 'bones_started' }, { type: 'quest', quest: 'bones', stage: 'canyon' }] },
    { if: [{ flag: 'scribe_outcome', eq: 'killed' }, { notFlag: 'kidnapper' }], effects: [{ type: 'flag', key: 'kidnapper', value: 'ottisk' }] },
    { if: [{ flag: 'quiet_floor', eq: 'ally' }, { notFlag: 'printer_known' }, { notFlag: 'ada_letter_got' }], effects: [{ type: 'flag', key: 'ada_letter_got' }, { type: 'give', item: 'ada_letter' }, { type: 'flag', key: 'printer_known' }, { type: 'flag', key: 'printer_way', value: 'ada' }], log: 'У ворот ждёт гонец из Запруды с письмом от Ады Затвор: «Яд мне дал нотариус Штемпель. Своей рукой. Он — тот, кого вы ищете».' },
    ...HOSTAGE_HOOKS,
  ],
  cleared: [
    { group: 'gate_guards', if: [{ flag: 'circle_forced' }, { notFlag: 'circle_way' }], effects: [{ type: 'flag', key: 'circle_way', value: 'forced' }, { type: 'flag', key: 'bones_enemy' }, { type: 'flag', key: 'open_bone_gate_a' }, { type: 'flag', key: 'open_bone_gate_b' }, { type: 'quest', quest: 'bones', stage: 'key' }], log: 'Стража ворот лежит. Рёбра ворот скрипят и расходятся. Круг смотрит на вас молча.' },
    { group: 'elders', if: [{ flag: 'bones_fight' }, { notFlag: 'key_whole' }], effects: [{ type: 'flag', key: 'key_way', value: 'taken' }, { type: 'flag', key: 'key_whole' }, { type: 'flag', key: 'bones_enemy' }, { type: 'give', item: 'key_half' }, { type: 'quest', quest: 'bones', stage: 'printer' }, { type: 'xp', amount: 250 }], log: 'Мать Трещина падает у круга костей. С её шеи вы снимаете шнурок с половиной пластины. Сухари этого не забудут.' },
    { group: 'traitor', if: [{ flag: 'traitor_fight' }, { notFlag: 'traitor' }], effects: [{ type: 'flag', key: 'traitor', value: 'killed' }, { type: 'quest', quest: 'traitor', stage: 'done' }, { type: 'give', item: 'printer_letter' }, { type: 'flag', key: 'seal_mark_11' }], log: 'Под рубахой Щебня — оттиск красного сургуча и сложенное письмо с подписью «Е. Штемпель».' },
  ],
  triggers: [{ id: 'camp_view', x: 15, y: 31, w: 10, h: 4, effects: [], log: 'Костяной круг: каньон, рёбра быков вместо ворот, дым шатров. Сухари смотрят на чужака без страха.' }],
});
