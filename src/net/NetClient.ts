// The client side of a room: sends intents, hands the room's messages to the scenes in order,
// and keeps this player's Game (the room's own object in solo, a mirror online).
import { Emitter } from '../core/Emitter';
import { Game } from '../core/Game';
import type { Content } from '../core/types';
import type { Intent, LobbyFrame, PlayerInfo, RoomMode, ServerMsg } from '../core/room/protocol';

export type Welcome = Extract<ServerMsg, { t: 'welcome' }>;
export type NetEvents = { [K in ServerMsg['t']]: [Extract<ServerMsg, { t: K }>] } & { closed: [reason: string] };

export interface Transport {
  send(i: Intent): void;
  /** Online: frames the server handles itself (restart, leave). */
  frame?(f: LobbyFrame): void;
  /** Solo: the room lives in this page, so its player's Game is shared instead of mirrored. */
  localGame?(pid: string): Game | undefined;
  /** Advance the room clock (solo); online the server keeps time. */
  tick(dtMs: number): void;
  close(): void;
}

export class NetClient {
  readonly events = new Emitter<NetEvents>();
  game: Game | null = null;
  you = '';
  mode: RoomMode = 'solo';
  code = '';
  players: PlayerInfo[] = [];
  welcome: Welcome | null = null;
  private transport: Transport | null = null;
  private queue: ServerMsg[] = [];
  private holds = 0;

  constructor(private content: Content) {}

  attach(t: Transport): void {
    this.transport = t;
  }

  get local(): boolean {
    return !!this.transport?.localGame;
  }

  send(i: Intent): void {
    this.transport?.send(i);
  }

  frame(f: LobbyFrame): void {
    this.transport?.frame?.(f);
  }

  tick(dtMs: number): void {
    this.transport?.tick(dtMs);
  }

  close(): void {
    this.transport?.close();
    this.transport = null;
  }

  /** Messages wait while a combat batch is being animated, so the world never runs ahead of the picture. */
  receive(m: ServerMsg): void {
    if (this.holds) this.queue.push(m);
    else this.process(m);
  }

  hold(): void {
    this.holds++;
  }

  release(): void {
    this.holds = Math.max(0, this.holds - 1);
    while (!this.holds && this.queue.length) this.process(this.queue.shift()!);
  }

  name(pid: string): string {
    return this.players.find((p) => p.id === pid)?.name ?? pid;
  }

  private process(m: ServerMsg): void {
    const g = this.game;
    switch (m.t) {
      case 'welcome':
        this.you = m.you;
        this.mode = m.mode;
        this.code = m.code;
        this.players = m.players;
        this.game = this.transport?.localGame?.(m.you) ?? this.adopt(m);
        this.welcome = m;
        break;
      case 'you':
        if (g && g.state !== m.state) {
          g.state = m.state;
          g.events.emit('sync');
        }
        break;
      case 'gev':
        if (!g || this.local) break;
        if (m.ev === 'check') g.events.emit('check', m.label, m.result);
        if (m.ev === 'quest') g.events.emit('quest', m.quest, m.stage);
        if (m.ev === 'gained') g.events.emit('gained', m.item);
        if (m.ev === 'level') g.events.emit('level', m.level);
        break;
      case 'players':
        this.players = m.list;
        break;
    }
    this.events.emit(m.t, m as never);
  }

  /** Online: keep one Game object for the whole session; snapshots replace its state. */
  private adopt(m: Welcome): Game {
    if (!this.game) return new Game(this.content, Math.random, m.state);
    this.game.state = m.state;
    this.game.events.emit('sync');
    return this.game;
  }
}
