// What combat means for the mission room: player commands during a fight, and the consequences
// of combat events outside it (log lines, HP, kills, XP, loot, flags). The command handling and
// log lines are shared with the arena.
import type { Combat } from '../combat/Combat';
import { enemies, type CombatEvent } from '../combat/types';
import { boost } from '../combat/build';
import type { FightHost } from './Fight';
import type { MissionRoom } from './Mission';
import type { Intent } from './protocol';
import type { Player, Room } from './Room';

export const REVIVE_AP = 3;

/** A person's command in any fight (mission or arena). False when it is not a combat command. */
export function playerCommand(room: Room, p: Player, i: Intent): boolean {
  const f = room.fight!;
  const c = f.combat;
  switch (i.t) {
    case 'attack': {
      const t = c.unit(String(i.target));
      if (t && !t.dead && enemies(c.current, t)) f.act(p.id, () => c.attack(t.id));
      return true;
    }
    case 'throw':
      f.act(p.id, () => c.throwAt(String(i.item), { x: Number(i.x), y: Number(i.y) }));
      return true;
    case 'step': {
      if (!f.canAct(p.id)) return true;
      const path = c.pathfinder(p.id).find(c.current, [{ x: i.x, y: i.y }]);
      if (path?.length) f.act(p.id, () => c.move(path));
      return true;
    }
    case 'endTurn':
      f.act(p.id, () => c.endTurn());
      return true;
    case 'swapWeapon': {
      if (!f.canAct(p.id)) return true;
      const w = c.swapWeapon();
      p.game.setActive(w);
      p.game.log(`Оружие: ${room.content.weapons[w].name}.`);
      f.act(p.id, () => []);
      return true;
    }
    case 'useItem':
      useInFight(room, p, String(i.item));
      return true;
  }
  return false;
}

/** Bandages, antidote, stims, food: anything with a combat use or an effect. Grenades go by 'throw'. */
function useInFight(room: Room, p: Player, item: string): void {
  const f = room.fight!;
  const def = room.content.items[item];
  if (!def?.combat && !def?.buff && !def?.cureAddict) return p.game.log(room.content.weapons[item]?.thrown ? 'Выберите клетку, куда бросить.' : 'В бою не до этого.');
  if (!f.canAct(p.id) || f.combat.current.ap < 2 || !p.game.count(item)) return p.game.log('Сейчас не получится: нужен ваш ход и 2 ОД.');
  const heal = item === 'bandage' ? p.game.bandageHeal() : def.combat?.heal;
  p.game.consume(item, true);
  f.act(p.id, () => {
    const ev = f.combat.consume(item, def.combat ?? {}, heal);
    if (def.buff && ev[0]?.t === 'use') boost(f.combat.current, def.buff.mods);
    return ev;
  });
}

/** Log lines everybody reads about an attack, a throw or a stim ("Вы" for your own). */
export function eventLines(room: Room, c: Combat, e: CombatEvent): void {
  if (e.t === 'attack') {
    const from = c.unit(e.id)!;
    const w = c.weapons[e.weapon];
    const verdict = e.hit ? (e.crit ? 'критическое попадание!' : 'попадание.') : 'промах.';
    for (const q of room.players.values()) q.game.log(`${e.id === q.id ? 'Вы' : from.name}: ${w.name.toLowerCase()}, ${e.chance}%, бросок ${e.roll}: ${verdict}`);
  }
  if (e.t === 'throw') {
    const w = c.weapons[e.item];
    for (const q of room.players.values()) q.game.log(`${e.id === q.id ? 'Вы бросаете' : `${c.unit(e.id)!.name} бросает`} ${w.name.toLowerCase()}, ${e.chance}%, бросок ${e.roll}: ${e.hit ? 'точно в цель.' : 'мимо, отскок.'}`);
  }
  if (e.t === 'use') {
    const name = room.content.items[e.item]?.name ?? e.item;
    for (const q of room.players.values()) q.game.log(`${e.id === q.id ? 'Вы используете' : `${c.unit(e.id)!.name} использует`}: ${name}.`);
  }
  if (e.t === 'burning') for (const q of room.players.values()) q.game.log(e.id === q.id ? 'Вы горите!' : `${c.unit(e.id)!.name}: в огне!`);
  if (e.t === 'stunned') for (const q of room.players.values()) q.game.log(`${e.id === q.id ? 'Вы' : c.unit(e.id)!.name}: оглушение, следующий ход −${e.ap} ОД.`);
}

/** A refusal ("too far", "no ammo") concerns only the one who tried. True when handled. */
export function refusal(room: Room, c: Combat, events: CombatEvent[]): boolean {
  const e = events[0];
  if (events.length !== 1 || e.t !== 'log' || c.current.side !== 'player') return false;
  room.players.get(c.current.id)?.game.log(e.text);
  return true;
}

/** A person's HP after a hit, a heal or a revive, written back to their game. */
export function syncHp(room: Room, id: string, hp: number): void {
  const q = room.players.get(id);
  if (!q) return;
  q.game.state.hp = hp;
  q.downed = hp <= 0;
  q.game.events.emit('stats');
}

export class FightRules {
  private lastAttacker: string | null = null;

  constructor(private room: MissionRoom) {}

  host(): FightHost {
    const r = this.room;
    return {
      broadcast: (m) => r.broadcast(m),
      watchers: () => [...r.players.values()].filter((p) => p.link).map((p) => p.id),
      connected: (pid) => !!r.players.get(pid)?.link,
      consequences: (ev) => this.consequences(ev),
      finish: (o) => {
        this.lastAttacker = null;
        r.combatOver(r.fight!.combat, o);
      },
      turnLimitMs: r.turnLimitMs,
    };
  }

  /** Intents while a fight is on. Everything that is not a combat command waits. */
  command(p: Player, i: Intent): void {
    if (i.t === 'revive') return this.revive(p, String(i.target));
    if (this.room.ring && (i.t === 'useItem' || i.t === 'throw')) return p.game.log('На ринге — только кулаки.');
    playerCommand(this.room, p, i);
  }

  /** Co-op: bandage a downed ally next to you back onto their feet (Медицина roll). */
  private revive(p: Player, target: string): void {
    const f = this.room.fight!;
    const c = f.combat;
    const me = c.current;
    const t = c.unit(target);
    if (!f.canAct(p.id) || !t || t.side !== 'player' || !t.dead || t.id === p.id) return;
    if (Math.max(Math.abs(t.x - me.x), Math.abs(t.y - me.y)) > 1) return p.game.log('Нужно подойти вплотную.');
    if (me.ap < REVIVE_AP) return p.game.log(`Нужно ${REVIVE_AP} ОД.`);
    if (!p.game.count('bandage')) return p.game.log('Нужны бинты.');
    p.game.take('bandage');
    const ok = p.game.check({ skill: 'medic' }, 10).success;
    f.act(p.id, () => c.revive(me, t, ok ? 3 + Math.floor(p.game.skill('medic') / 10) : 0, REVIVE_AP));
  }

  private consequences(events: CombatEvent[]): void {
    const r = this.room;
    const c = r.fight!.combat;
    if (refusal(r, c, events)) return;
    for (const e of events) {
      eventLines(r, c, e);
      switch (e.t) {
        case 'attack':
        case 'throw':
          this.lastAttacker = e.id;
          break;
        case 'poisoned':
          r.players.get(e.id)?.game.log('Жало пробило кожу. Вы отравлены!');
          break;
        case 'damage':
        case 'heal':
        case 'revive':
          syncHp(r, e.id, e.hp);
          break;
        case 'death':
          this.death(e.id);
          break;
        case 'explode':
          if (c.unit(e.id)?.side !== 'object') break;
          r.host?.game.setFlag(`blown_${e.id}`);
          r.logAll('Бочка взрывается!');
          break;
        case 'flee': {
          const h = r.hostiles.byId(e.id);
          if (!h) break;
          h.gone = true;
          r.host?.game.setFlag(`fled_${e.id}`);
          r.logAll((h.def.fleeText ?? '{name} убегает в пустошь.').replace('{name}', h.def.name));
          break;
        }
        case 'log':
          r.logAll(e.text);
          break;
      }
    }
  }

  private death(id: string): void {
    const r = this.room;
    const c = r.fight!.combat;
    const u = c.unit(id)!;
    if (u.side === 'object') return;
    if (u.side === 'player') {
      const q = r.players.get(id);
      if (q && c.humans.some((h) => !h.dead)) {
        q.downed = true;
        r.logAll(`${u.name} падает без сознания!`);
      }
      return;
    }
    const h = r.hostiles.byId(id);
    if (h) h.dead = true;
    if (h?.ally) {
      r.host?.game.setFlag(`dead_${id}`);
      return r.logAll(`${u.name} погибает.`);
    }
    const killer = r.players.get(this.lastAttacker ?? '') ?? r.host!;
    killer.game.setFlag(`dead_${id}`);
    if (h) r.jobKill(killer, h);
    r.world.stats.kills++;
    r.logAll(`${u.name} мёртв.`);
    for (const q of r.players.values()) if (c.unit(q.id)) q.game.addXp(u.xp);
    // a road battle: the spoils wait in a pile for everyone, the fallen's main weapon among them
    if (r.world.travel?.encounter) {
      const gun = u.weapons[0];
      r.addLoot(r.content.items[gun] && !u.loot[gun] ? { ...u.loot, [gun]: 1 } : u.loot);
    }
    else for (const [it, n] of Object.entries(u.loot)) killer.game.give(it, n);
  }
}
