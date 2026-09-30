// Battles on the road: the party drops onto a battlefield of the ground where it met the enemy, the enemy's
// fighters on the far side and any friendly party (a caravan we help or guard) beside us under AI.
// After a victory the spoils wait in a pile; then everyone is back on the world map at the same spot.
import type { MapActor } from '../../world/MapData';
import type { PartyState, Parties } from '../travel/Parties';
import type { MissionRoom } from './Mission';
import type { Player } from './Room';
import { GANGS_TO_ANGER, partiesOf } from './Road';

export const FOE_PREFIX = 'enc_';
export const ALLY_PREFIX = 'ally_';
export const HEAD_START_MIN = 60; // a party left behind stands this long before it moves again
const HELP_PAY = 25; // a caravan's thanks for the rescue
const HELP_REP = 5;

/** Fight `foe` on the ground where it stands; `ally` fights on our side; `foesFirst` for an ambush or a failed getaway. */
export function startBattle(room: MissionRoom, ps: Parties, foe: PartyState, foesFirst: boolean, ally?: PartyState): void {
  const t = room.world.travel!;
  const ground = room.worldMap!.rows[Math.floor(foe.y)]?.[Math.floor(foe.x)] ?? '.';
  const fieldId = room.content.travel.battlefields[ground] ?? 'enc_sand';
  const field = room.allMaps()[fieldId];
  const host = room.host;
  if (!field || !host) return;
  room.save();
  room.save('auto'); // a defeat loads the road before the meeting
  clearBattleFlags(room);
  t.encounter = foe.id;
  t.ally = ally?.id;
  for (const p of [foe, ally]) if (p) p.fight = undefined; // whatever they were fighting is now our battle
  const actor = (creature: string, id: string, [x, y]: [number, number], friend: boolean): MapActor => {
    const def = room.content.creatures[creature];
    return { id, sheet: def.sheet, creature, group: friend ? 'allies' : 'encounter', x, y, dir: friend ? 5 : 1, label: def.name, ...(friend ? { ally: true } : {}) };
  };
  const foeSpots = field.foes ?? [[field.width - 4, 4]];
  const foes = foe.members.slice(0, foeSpots.length).map((c, i) => actor(c, `${FOE_PREFIX}${i}`, foeSpots[i], false));
  const allySpots = (field.spawns ?? []).slice(room.players.size);
  const allies = (ally?.members ?? []).slice(0, allySpots.length).map((c, i) => actor(c, `${ALLY_PREFIX}${i}`, allySpots[i], true));
  room.logAll(`${ps.tpl(foe).name}: бой!${ally ? ` На вашей стороне: ${ps.tpl(ally).name}.` : ''}`);
  room.goTo(fieldId, 'hero', [...foes, ...allies]);
  room.startCombat(host, [...foes, ...allies].map((a) => a.id), { foesFirst });
}

function clearBattleFlags(room: MissionRoom): void {
  const ours = (k: string) => [FOE_PREFIX, ALLY_PREFIX].some((p) => k.startsWith(`dead_${p}`) || k.startsWith(`fled_${p}`));
  for (const k of Object.keys(room.world.flags)) if (ours(k)) delete room.world.flags[k];
}

/** The fight on the road is over: after a victory the spoils wait in a pile; an escape leaves at once. */
export function afterBattle(room: MissionRoom, outcome: 'victory' | 'escape'): void {
  if (outcome === 'escape') room.pile = null; // no time to pick through the dead
  if (!room.pile || !Object.keys(room.pile).length) return endBattle(room);
  room.logAll('Трофеи сложены в кучу. Возьмите нужное — и в путь.');
  room.broadcast({ t: 'loot', items: room.pile });
}

/** Someone takes one kind of item from the pile, or everything. */
export function takeLoot(room: MissionRoom, p: Player, item?: string): void {
  const pile = room.pile;
  if (!pile) return;
  for (const it of item ? [item] : Object.keys(pile)) {
    const n = pile[it];
    if (!n) continue;
    p.game.give(it, n);
    delete pile[it];
  }
  room.broadcast({ t: 'loot', items: pile });
}

/** Who of a party's fighters is still standing after the battle (by their index in `members`). */
function survivors(room: MissionRoom, p: PartyState, prefix: string): string[] {
  const out = new Set(room.hostiles.list.filter((h) => h.id.startsWith(prefix) && (h.dead || h.gone || room.world.flags[`fled_${h.id}`])).map((h) => Number(h.id.slice(prefix.length))));
  return p.members.filter((_, i) => !out.has(i));
}

/** The battle on the road is over: both sides count their dead, and the party is back on the world map. */
export function endBattle(room: MissionRoom): void {
  const t = room.world.travel!;
  const ps = partiesOf(room)!;
  const foe = t.encounter ? ps.byId(t.encounter) : undefined;
  const ally = t.ally ? ps.byId(t.ally) : undefined;
  let won = true;
  if (foe) {
    const left = survivors(room, foe, FOE_PREFIX);
    won = !left.length;
    if (won) {
      ps.remove(foe.id);
      const unique = room.content.travel.uniques?.find((u) => u.id === foe.id);
      if (unique) {
        room.host?.game.setFlag(`gone_${foe.id}`); // one of a kind: for good
        if (unique.beaten) room.host?.game.apply(unique.beaten);
      }
      room.logAll(`${ps.tpl(foe).name}: больше не побеспокоят.`);
      if (ps.tpl(foe).kind === 'bandits') {
        room.host?.game.apply([{ type: 'inc', key: 'road_gangs_beaten' }]);
        if (room.world.flags.road_gangs_beaten === GANGS_TO_ANGER) room.logAll('По дорогам шепчут: Сизый с Элеватора назначил цену за вашу голову. Банд станет больше.');
      }
    } else {
      foe.members = left;
      ps.part(foe.id, HEAD_START_MIN * 2, HEAD_START_MIN);
    }
  }
  if (ally) {
    const left = survivors(room, ally, ALLY_PREFIX);
    const tpl = ps.tpl(ally);
    if (!left.length) {
      ps.remove(ally.id);
      room.logAll(`${tpl.name}: никто не уцелел.`);
    } else {
      ally.members = left;
      ps.part(ally.id, 24 * 60); // friends now
      // a rescued caravan pays; a guarded one pays at its gates (see Road.ts)
      if (won && t.escort?.party !== ally.id && tpl.kind === 'caravan') {
        room.host?.game.apply([
          { type: 'caps', amount: HELP_PAY },
          { type: 'inc', key: `rep_${tpl.faction ?? 'guild'}`, by: HELP_REP },
          { type: 'log', text: `Караванщик жмёт руку: «Без вас бы нас тут и закопали». ${HELP_PAY} капель.` },
        ]);
      }
    }
  }
  if (t.escort && !ps.byId(t.escort.party)) {
    room.logAll('Караван погиб. Платить некому.');
    t.escort = undefined;
  }
  clearBattleFlags(room);
  t.encounter = undefined;
  t.ally = undefined;
  if (room.pile) room.broadcast({ t: 'loot', items: null });
  room.pile = null;
  room.host?.game.setFlag('at', 'world');
  for (const q of room.players.values()) q.game.state.travel = t;
  room.logAll('Вы возвращаетесь на дорогу.');
  room.resyncAll();
  room.save();
}
