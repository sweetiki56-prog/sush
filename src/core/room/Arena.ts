// The arena: free-for-all rounds on "Пыльная чаша". Players bring any build (checked against the
// arena limits), ready up, and fight turn by turn with a clock; first to N round wins takes the match.
import { Combat } from '../combat/Combat';
import { barrelUnit, playerUnit } from '../combat/build';
import type { CombatEvent, Combatant } from '../combat/types';
import type { FlagValue } from '../types';
import { Fight } from './Fight';
import { eventLines, playerCommand, refusal, syncHp } from './FightRules';
import { loadoutState, validLoadout, type Loadout } from './loadout';
import type { ArenaPhase, ArenaStatus, Intent, ServerMsg } from './protocol';
import { Room, type Link, type Player, type RoomOptions } from './Room';

export class ArenaRoom extends Room {
  phase: ArenaPhase = 'lobby';
  round = 0;
  private loadouts = new Map<string, Loadout>();
  private ready = new Set<string>();
  private wins = new Map<string, number>();
  private kills = new Map<string, number>();
  private damage = new Map<string, number>();
  private left = 0;
  private winner: string | null = null;
  private lastRound: string | null = null;
  private lastAttacker: string | null = null;
  private flags: Record<string, FlagValue> = {}; // this round's blown barrels
  private sent = '';

  constructor(opts: RoomOptions) {
    super(opts);
  }

  private get rules() {
    return this.content.arena;
  }

  // ---------- players ----------
  joinArena(token: string, loadout: Loadout, link: Link | null): Player {
    const known = this.byToken(token);
    if (known) {
      if (link) this.connect(known, link);
      return known;
    }
    const p = this.addPlayer(token, loadoutState(loadout, this.content, this.spawnFor(this.players.size)), null);
    this.loadouts.set(p.id, loadout);
    p.game.log(`Арена «${this.map.name}». Жмите «Готов», когда соберутся все.`);
    if (this.fight) p.game.log('Идёт раунд: вы вступите в следующий.');
    this.broadcast({ t: 'spawn', actor: this.playerActor(p) }, p);
    if (link) this.connect(p, link);
    return p;
  }

  remove(pid: string): void {
    const u = this.fight?.combat.unit(pid);
    if (u) u.fled = true; // a quitter leaves the round; the fight goes on without them
    this.loadouts.delete(pid);
    this.ready.delete(pid);
    super.remove(pid);
    this.checkStart();
  }

  private spawnFor(i: number): { x: number; y: number; dir: number } {
    const s = this.map.spawns ?? [[2, 2]];
    const [x, y] = s[i % s.length];
    const dir = x < this.grid.width / 2 ? (y < this.grid.height / 2 ? 1 : 7) : y < this.grid.height / 2 ? 3 : 5;
    return { x, y, dir };
  }

  // ---------- snapshots ----------
  protected welcome(p: Player): ServerMsg {
    return {
      t: 'welcome',
      you: p.id,
      map: this.map.id ?? 'arena',
      mode: this.mode,
      code: this.code,
      state: p.game.state,
      actors: [...this.players.values()].map((q) => this.playerActor(q)),
      hostiles: [],
      players: this.playerInfo(),
      combat: this.fight ? this.fight.sync() : null,
      sneaking: false,
    };
  }

  protected welcomed(p: Player): void {
    this.send(p, this.status());
    for (const [key, value] of Object.entries(this.flags)) this.send(p, { t: 'flag', key, value });
  }

  status(): { t: 'arena' } & ArenaStatus {
    const obj = (m: Map<string, number>) => Object.fromEntries(m);
    const timed = this.phase === 'countdown' || this.phase === 'break';
    return {
      t: 'arena',
      phase: this.phase,
      round: this.round,
      rounds: this.rules.rounds,
      left: timed ? this.left : null,
      ready: [...this.ready],
      scores: obj(this.wins),
      kills: obj(this.kills),
      damage: obj(this.damage),
      winner: this.winner,
      lastRound: this.lastRound,
    };
  }

  protected flushMore(): void {
    const s = this.status();
    const key = JSON.stringify({ ...s, left: s.left === null });
    if (key === this.sent) return;
    this.sent = key;
    this.broadcast(s);
  }

  // ---------- intents ----------
  protected intent(p: Player, i: Intent): void {
    if (this.fight && this.fight.combat.unit(p.id)) {
      playerCommand(this, p, i);
      return;
    }
    switch (i.t) {
      case 'walk': {
        const pf = this.pathfinder(() => false);
        const path = pf.walkable(i.x, i.y) ? pf.find(p.mover.tile, [{ x: i.x, y: i.y }]) : null;
        if (path) this.walk(p, path);
        return;
      }
      case 'loadout':
        return this.setLoadout(p, i.loadout);
      case 'ready':
        if (i.on) this.ready.add(p.id);
        else this.ready.delete(p.id);
        return this.checkStart();
      case 'equip': {
        const sheet = Room.sheetOf(p);
        p.game.equip(i.slot, i.item);
        if (Room.sheetOf(p) !== sheet) this.redraw(p);
        return;
      }
    }
  }

  private setLoadout(p: Player, raw: unknown): void {
    const l = validLoadout(raw, this.content);
    if (!l) return p.game.log('Снаряжение не прошло проверку.');
    this.loadouts.set(p.id, l);
    const t = p.mover.tile;
    const sheet = Room.sheetOf(p);
    p.game.state = loadoutState(l, this.content, { x: t.x, y: t.y, dir: p.mover.dir });
    p.game.log(`Снаряжение: ${l.name}, уровень ${l.level}.`);
    p.game.events.emit('stats');
    p.game.events.emit('inventory');
    if (Room.sheetOf(p) !== sheet) this.redraw(p);
    this.infoChanged();
  }

  /** Everyone here is ready (two at least): count down, then fight. */
  private checkStart(): void {
    const live = [...this.players.values()].filter((p) => p.link);
    const go = live.length >= 2 && live.every((p) => this.ready.has(p.id));
    if (go && (this.phase === 'lobby' || this.phase === 'done')) {
      if (this.phase === 'done') this.newMatch();
      this.phase = 'countdown';
      this.left = this.rules.startCountdownMs;
    } else if (!go && this.phase === 'countdown') this.phase = this.round ? 'done' : 'lobby';
  }

  private newMatch(): void {
    this.round = 0;
    this.winner = null;
    this.lastRound = null;
    this.wins.clear();
    this.kills.clear();
    this.damage.clear();
  }

  // ---------- time ----------
  protected update(dtMs: number): void {
    for (let left = dtMs; left > 0; left -= 50) {
      const dt = Math.min(50, left);
      for (const p of this.players.values()) p.mover.update(dt / 1000);
    }
    if (this.phase !== 'countdown' && this.phase !== 'break') return;
    this.left -= dtMs;
    if (this.left <= 0) this.startRound();
  }

  protected enteredTile(): void {}

  // ---------- rounds ----------
  private startRound(): void {
    const people = [...this.players.values()];
    if (people.length < 2) {
      this.phase = 'lobby';
      return;
    }
    this.round++;
    this.phase = 'fight';
    this.lastRound = null;
    this.flags = {};
    this.grid.reset();
    // shuffle who gets which spawn
    const order = [...people];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(this.roll() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    order.forEach((p, i) => {
      const at = this.spawnFor(i);
      p.game.state = loadoutState(this.loadouts.get(p.id)!, this.content, at);
      p.mover.teleport(at.x, at.y);
      p.mover.dir = at.dir;
      p.downed = false;
      p.game.events.emit('stats');
      p.game.events.emit('inventory');
    });
    for (const p of people) if (p.link) this.connect(p, p.link);
    const units: Combatant[] = people.map((p) => ({ ...playerUnit(p.game, p.mover.tile.x, p.mover.tile.y, p.id), team: p.id }));
    for (const o of this.grid.barrels(() => false)) units.push(barrelUnit(o.id, o.x, o.y));
    const combat = new Combat(units, this.content.weapons, {
      width: this.grid.width,
      height: this.grid.height,
      rng: () => this.roll(),
      blocked: (x, y) => this.grid.isSolid(x, y),
      opaque: (x, y) => this.grid.blocksSight(x, y),
      ammo: (it, u) => this.players.get(u.id)?.game.count(it) ?? 0,
      spendAmmo: (it, u) => void this.players.get(u.id)?.game.take(it),
    });
    this.logAll(`Раунд ${this.round}. Бой! Все против всех.`);
    this.lastAttacker = null;
    this.fight = new Fight(combat, {
      broadcast: (m) => this.broadcast(m),
      watchers: () => [...this.players.values()].filter((p) => p.link).map((p) => p.id),
      connected: (pid) => !!this.players.get(pid)?.link,
      consequences: (ev) => this.consequences(ev),
      finish: () => this.roundOver(),
      turnLimitMs: this.turnLimitMs ?? this.rules.turnMs,
    });
    this.fight.start();
  }

  private consequences(events: CombatEvent[]): void {
    const c = this.fight!.combat;
    if (refusal(this, c, events)) return;
    for (const e of events) {
      eventLines(this, c, e);
      switch (e.t) {
        case 'attack':
        case 'throw':
          this.lastAttacker = e.id;
          break;
        case 'damage': {
          syncHp(this, e.id, e.hp);
          const by = this.lastAttacker;
          if (by && by !== e.id && c.unit(e.id)?.side === 'player') this.damage.set(by, (this.damage.get(by) ?? 0) + e.amount);
          break;
        }
        case 'heal':
          syncHp(this, e.id, e.hp);
          break;
        case 'death': {
          const u = c.unit(e.id)!;
          if (u.side !== 'player') break;
          const by = this.lastAttacker;
          if (by && by !== e.id) this.kills.set(by, (this.kills.get(by) ?? 0) + 1);
          this.logAll(`${u.name} выбывает.`);
          break;
        }
        case 'explode':
          if (c.unit(e.id)?.side !== 'object') break;
          this.flags[`blown_${e.id}`] = true;
          this.grid.applyFlag(`blown_${e.id}`, true);
          this.broadcast({ t: 'flag', key: `blown_${e.id}`, value: true });
          this.logAll('Бочка взрывается!');
          break;
        case 'log':
          this.logAll(e.text);
          break;
      }
    }
  }

  private roundOver(): void {
    const c = this.fight!.combat;
    this.fight = null;
    for (const p of this.players.values()) {
      const u = c.unit(p.id);
      if (!u) continue;
      p.mover.teleport(u.x, u.y);
      p.game.state.player = { x: u.x, y: u.y, dir: p.mover.dir };
    }
    const w = c.winner && this.players.get(c.winner);
    if (w) {
      this.wins.set(w.id, (this.wins.get(w.id) ?? 0) + 1);
      this.lastRound = w.game.char.name;
      this.logAll(`Раунд ${this.round}: побеждает ${w.game.char.name}!`);
    } else {
      this.lastRound = 'ничья';
      this.logAll(`Раунд ${this.round}: ничья.`);
    }
    this.broadcast({ t: 'combatEnd', outcome: 'victory' });
    if (w && (this.wins.get(w.id) ?? 0) >= this.rules.rounds) {
      this.phase = 'done';
      this.winner = w.id;
      this.ready.clear();
      this.logAll(`Матч выиграл ${w.game.char.name}! Жмите «Готов» для реванша.`);
      return;
    }
    this.phase = 'break';
    this.left = this.rules.roundPauseMs;
  }
}
