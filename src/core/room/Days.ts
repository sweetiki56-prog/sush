// Days at the Rusty Well: resting at the campfire moves the world to the next morning. Guests come by
// schedule (their presence is a flag the cast follows), traders restock, burrows breed, daily limits reset.
import { lineOfSight } from '../../iso/LineOfSight';
import type { Player } from './Room';
import type { MissionRoom } from './Mission';
import { fresh } from './Trade';

export const NIGHT_MS = 8 * 3600_000;
const DANGER = 6; // tiles: an awake hostile this close and in sight keeps everyone awake

export function today(room: MissionRoom): number {
  return Number(room.world.flags.day ?? 1);
}

/** Sleep till morning: refused while something awake and hostile is close. */
export function rest(room: MissionRoom, p: Player): void {
  if (room.fight) return;
  const people = [...room.players.values()];
  const near = room.hostiles.alive.some((h) => {
    const t = h.mover.tile;
    return !h.asleep && people.some((q) => Math.hypot(t.x - q.mover.tile.x, t.y - q.mover.tile.y) < DANGER && lineOfSight((x, y) => room.grid.blocksSight(x, y), t, q.mover.tile));
  });
  if (near) return p.game.log('Какой тут сон: рядом бродят твари.');
  const day = newDay(room, p);
  for (const q of people) {
    q.game.tick(NIGHT_MS);
    q.game.state.hp = q.game.maxHp;
    q.game.log(`Ночь у костра. Утро дня ${day}: раны затянулись.`);
    q.game.events.emit('stats');
  }
  room.save();
}

/** The world turns to the next day (a night's sleep or midnight on the road): every place's schedule moves on. */
export function newDay(room: MissionRoom, p: Player): number {
  const g = p.game;
  const day = today(room) + 1;
  g.setFlag('day', day);
  const maps = Object.values(room.allMaps());
  for (const k of new Set(maps.flatMap((m) => m.daily ?? []))) if (room.world.flags[k]) g.setFlag(k, false);
  for (const id of Object.keys(room.content.jobs)) if (room.world.flags[`job_${id}`] === 'done') g.setFlag(`job_${id}`, false); // repeatable work comes back
  for (const v of maps.flatMap((m) => m.visits ?? [])) g.setFlag(v.flag, day >= v.from && (day - v.from) % v.every < v.stay);
  const stock = (room.world.stock ??= {});
  for (const [id, s] of Object.entries(stock)) {
    const def = room.content.traders[id];
    if (def && day - (s.day ?? 1) >= def.restock) stock[id] = { ...fresh(def), day };
  }
  room.respawn();
  if (!room.onRoad) room.runHooks(p, room.map.arrive); // a morning here: what was due today happens
  return day;
}
