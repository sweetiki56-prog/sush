// Runs a Combat inside a room: monster turns, human input, turn timers, and pacing by client animations.
// Every batch of events goes to all clients; the fight goes on once each has acknowledged it
// (or after a timeout), so animations never fall behind the rules.
import type { Combat } from '../combat/Combat';
import { nextAction } from '../combat/ai';
import type { CombatEvent, Outcome } from '../combat/types';
import type { CombatSync, ServerMsg } from './protocol';

export const ANIM_TIMEOUT = 20_000;

export interface FightHost {
  broadcast(msg: ServerMsg): void;
  /** Players whose clients watch the fight (every connected one). */
  watchers(): string[];
  connected(pid: string): boolean;
  /** Apply what the events mean outside the fight: flags, XP, loot, HP, log lines. */
  consequences(events: CombatEvent[]): void;
  finish(outcome: Outcome): void;
  /** Time limit for a human turn, null = none (solo). */
  turnLimitMs: number | null;
}

export class Fight {
  seq = 0;
  private phase: 'anim' | 'input' | 'over' = 'anim';
  private pending = new Set<string>();
  private animLeft = 0;
  private timer: number | null = null;
  private timerTurn = '';

  constructor(
    readonly combat: Combat,
    private host: FightHost,
  ) {}

  start(): void {
    this.send(this.combat.start());
    if (!this.pending.size) this.step();
  }

  get over(): boolean {
    return this.phase === 'over';
  }

  /** Is it this player's turn, with the room ready for a command? */
  canAct(pid: string): boolean {
    return this.phase === 'input' && this.combat.current.id === pid;
  }

  sync(): CombatSync {
    return { ...this.combat.snapshot(), timer: this.phase === 'input' ? this.timer : null, busy: this.phase !== 'input' };
  }

  /** A human command; false when it is not this player's moment. */
  act(pid: string, action: () => CombatEvent[]): boolean {
    if (!this.canAct(pid)) return false;
    this.send(action());
    if (!this.pending.size) this.step();
    return true;
  }

  ack(pid: string, seq: number): void {
    if (this.phase !== 'anim' || seq !== this.seq || !this.pending.delete(pid)) return;
    if (!this.pending.size) this.step();
  }

  /** A client left: stop waiting for it. */
  drop(pid: string): void {
    this.ack(pid, this.seq);
  }

  tick(dtMs: number): void {
    if (this.phase === 'anim') {
      this.animLeft -= dtMs;
      if (this.animLeft <= 0) {
        this.pending.clear();
        this.step();
      }
      return;
    }
    if (this.phase !== 'input') return;
    const cur = this.combat.current;
    if (!this.host.connected(cur.id)) return void this.act(cur.id, () => this.combat.endTurn());
    if (this.timer === null) return;
    this.timer -= dtMs;
    if (this.timer <= 0) this.act(cur.id, () => [{ t: 'log', text: `${cur.name}: время хода вышло.` }, ...this.combat.endTurn()]);
  }

  private send(events: CombatEvent[]): void {
    this.host.consequences(events);
    this.seq++;
    this.phase = 'anim';
    this.pending = new Set(this.host.watchers());
    this.animLeft = ANIM_TIMEOUT;
    this.host.broadcast({ t: 'combat', seq: this.seq, events, sync: this.sync() });
  }

  /** Animations are done: play monster turns until a human has to decide, or the fight ends. */
  private step(): void {
    for (let guard = 0; guard < 500; guard++) {
      const next = this.decide();
      if (!next) return;
      this.send(next);
      if (this.pending.size) return;
    }
  }

  private decide(): CombatEvent[] | null {
    const c = this.combat;
    if (c.outcome) {
      this.phase = 'over';
      this.host.finish(c.outcome);
      return null;
    }
    const u = c.current;
    if (u.side === 'player') {
      // the last foe may have just fallen (or run off): end it now, not after "end turn"
      const done = c.checkOutcome();
      if (done.length) return done;
      if (u.ap > 0 && !u.dead && this.host.connected(u.id)) {
        this.waitFor(u.id);
        return null;
      }
      return c.endTurn();
    }
    const ev: CombatEvent[] = [];
    for (let n = 0; n < 12 && !c.outcome; n++) {
      const a = nextAction(c, u);
      if (a.kind === 'end') break;
      if (a.kind === 'move') ev.push(...c.move(a.path));
      else {
        u.weapon = a.weapon;
        ev.push(...c.attack(a.target));
      }
      ev.push(...c.checkOutcome());
    }
    if (!c.outcome) ev.push(...c.endTurn());
    return ev;
  }

  private waitFor(pid: string): void {
    const key = `${this.combat.round}:${pid}`;
    if (key !== this.timerTurn) {
      this.timerTurn = key;
      this.timer = this.host.turnLimitMs;
    }
    this.phase = 'input';
    this.seq++;
    this.host.broadcast({ t: 'combat', seq: this.seq, events: [], sync: this.sync() });
  }
}
