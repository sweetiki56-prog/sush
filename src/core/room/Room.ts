// A room: players, their links, intents in, events out. The same class runs in the browser
// (solo, through a local link) and on the server (co-op, arena). Subclasses add the game mode.
import { Game } from '../Game';
import type { Rng } from '../rng';
import type { Content, EncounterAction, GameStateData } from '../types';
import type { DialogueRunner } from '../DialogueRunner';
import { Pathfinder, type Tile } from '../../iso/Pathfinder';
import { WALK_SPEED } from '../../config';
import type { MapData } from '../../world/MapData';
import type { WorldGridData } from '../travel/Travel';
import { Grid } from '../world/Grid';
import { Mover } from '../world/Mover';
import type { Fight } from './Fight';
import type { ActorSnap, Intent, PlayerInfo, RoomMode, ServerMsg } from './protocol';

export const SNEAK_SPEED = 2.1;
export const CHAT_MAX = 200;

/** Where messages for one player go (a WebSocket, or the local client in solo). */
export interface Link {
  send(msg: ServerMsg): void;
}

export interface Player {
  id: string;
  token: string;
  game: Game;
  mover: Mover;
  link: Link | null;
  sneaking: boolean;
  modal: boolean;
  talk: { runner: DialogueRunner; target: string } | null;
  pendingAlarm: string[] | null;
  lastEdge: number;
  downed: boolean;
  unsub: (() => void)[];
}

export interface RoomOptions {
  mode: RoomMode;
  code: string;
  content: Content;
  map: MapData;
  rng?: Rng;
  debug?: boolean; // accept debug intents (dev builds, tests)
  maxPlayers?: number;
  turnLimitMs?: number | null;
  /** Every map the room may move to, by map id (locations, encounters). */
  maps?: Record<string, MapData>;
  /** The world map grid (travel between places). */
  worldMap?: WorldGridData;
  /** Persist the room (solo: localStorage; server: a file). */
  save?: (room: Room, slot: 'main' | 'auto') => void;
}

export abstract class Room {
  readonly players = new Map<string, Player>();
  grid: Grid; // replaced when the room moves to another map
  readonly content: Content;
  readonly mode: RoomMode;
  readonly code: string;
  rng: Rng;
  fight: Fight | null = null;
  protected clock = 0; // ms since the room opened, advanced by tick()
  private inbox: [string, Intent][] = [];
  private busy = false;
  private dirty = new Set<string>();
  private sentInfo = new Map<string, string>();

  constructor(protected opts: RoomOptions) {
    this.content = opts.content;
    this.mode = opts.mode;
    this.code = opts.code;
    this.rng = opts.rng ?? Math.random;
    this.grid = new Grid(opts.map);
  }

  get map(): MapData {
    return this.opts.map;
  }

  /** Move the room onto another map: the grid is rebuilt from it (callers rebuild who stands there). */
  protected useMap(map: MapData): void {
    this.opts.map = map;
    this.grid = new Grid(map);
  }

  get turnLimitMs(): number | null {
    return this.opts.turnLimitMs ?? null;
  }

  get full(): boolean {
    return this.players.size >= (this.opts.maxPlayers ?? 1);
  }

  /** The first player: host of the room, source of shared rolls (tests rig its RNG). */
  get host(): Player | undefined {
    return this.players.values().next().value;
  }

  /** Room-wide roll: combat, monsters. Reads through the host's RNG so dev hooks can rig it. */
  roll(): number {
    return (this.host?.game.rng ?? this.rng)();
  }

  // ---------- players ----------
  protected nextId(): string {
    if (!this.players.has('player')) return 'player';
    for (let i = 2; ; i++) if (!this.players.has(`p${i}`)) return `p${i}`;
  }

  byToken(token: string): Player | undefined {
    return [...this.players.values()].find((p) => p.token === token);
  }

  /** Add a player with a ready game state (validated by the caller). */
  protected addPlayer(token: string, state: GameStateData, link: Link | null): Player {
    const id = this.nextId();
    const game = new Game(this.content, this.rng, state);
    game.party = () => [...this.players.values()].map((q) => q.game);
    const pos = state.player;
    const p: Player = {
      id,
      token,
      game,
      mover: new Mover(pos.x, pos.y, pos.dir, WALK_SPEED),
      link,
      sneaking: false,
      modal: false,
      talk: null,
      pendingAlarm: null,
      lastEdge: -1e9,
      downed: false,
      unsub: [],
    };
    p.mover.onTile = (t) => this.enteredTile(p, t);
    const mark = () => this.dirty.add(id);
    const ev = game.events;
    p.unsub.push(
      ev.on('log', mark),
      ev.on('inventory', mark),
      ev.on('stats', mark),
      ev.on('flag', (k, v) => this.flagChanged?.(p, k, v)),
      ev.on('quest', (quest, stage) => {
        this.questChanged?.(p, quest, stage);
        this.send(p, { t: 'gev', ev: 'quest', quest, stage });
      }),
      ev.on('check', (label, result) => this.send(p, { t: 'gev', ev: 'check', label, result })),
      ev.on('gained', (item) => this.send(p, { t: 'gev', ev: 'gained', item })),
      ev.on('level', (level) => this.send(p, { t: 'gev', ev: 'level', level })),
      ev.on('open', (kind, id) => this.send(p, { t: 'window', kind, id })),
      ev.on('rest', () => this.rested?.(p)),
      ev.on('travel', () => this.traveled?.(p)),
      ev.on('goto', (map, entry) => this.moved?.(p, map, entry)),
      ev.on('encounter', (a) => this.encountered?.(p, a)),
    );
    this.players.set(id, p);
    return p;
  }

  /** A client comes back (or its link changes): same player, fresh snapshot. */
  connect(p: Player, link: Link): void {
    p.link = link;
    this.send(p, this.welcome(p));
    this.welcomed?.(p);
    this.infoChanged();
  }

  disconnect(pid: string): void {
    const p = this.players.get(pid);
    if (!p) return;
    p.link = null;
    this.fight?.drop(pid);
    this.infoChanged();
    this.flush();
  }

  /** Drop a player for good (left, kicked, or gone too long). */
  remove(pid: string): void {
    const p = this.players.get(pid);
    if (!p) return;
    p.unsub.forEach((u) => u());
    this.fight?.drop(pid);
    this.players.delete(pid);
    this.broadcast({ t: 'despawn', id: pid });
    this.infoChanged();
    this.flush();
  }

  // ---------- messages ----------
  send(p: Player, msg: ServerMsg): void {
    p.link?.send(msg);
  }

  broadcast(msg: ServerMsg, except?: Player): void {
    for (const p of this.players.values()) if (p !== except) this.send(p, msg);
  }

  /** Log a line for every player (the same words for all). */
  logAll(text: string): void {
    for (const p of this.players.values()) p.game.log(text);
  }

  /** Intents are queued, so a client answering inside a broadcast never re-enters the room. */
  handle(pid: string, intent: Intent): void {
    this.inbox.push([pid, intent]);
    this.drain(() => {});
  }

  tick(dtMs: number): void {
    this.drain(() => {
      this.clock += dtMs;
      this.update(dtMs);
      this.fight?.tick(dtMs);
    });
  }

  private drain(first: () => void): void {
    if (this.busy) return;
    this.busy = true;
    try {
      first();
      while (this.inbox.length) {
        const [pid, intent] = this.inbox.shift()!;
        const p = this.players.get(pid);
        if (p) this.dispatch(p, intent);
      }
      this.flush();
    } finally {
      this.busy = false;
    }
  }

  private dispatch(p: Player, i: Intent): void {
    switch (i.t) {
      case 'ack':
        return this.fight?.ack(p.id, i.seq);
      case 'modal':
        p.modal = i.open;
        return;
      case 'resync':
        if (p.link) this.connect(p, p.link);
        return;
      case 'chat': {
        const text = String(i.text ?? '').trim().slice(0, CHAT_MAX);
        if (text) this.broadcast({ t: 'chat', from: p.game.char.name, text });
        return;
      }
      case 'spendSkills':
        p.game.spendSkillPoints(i.plan ?? {});
        return this.infoChanged();
      case 'takePerk':
        p.game.takePerk(String(i.id));
        return this.infoChanged();
      case 'debug':
        if (this.opts.debug) this.debug(p, i.op);
        return;
      default:
        this.intent(p, i);
    }
  }

  /** Mode-specific intents. */
  protected abstract intent(p: Player, i: Intent): void;
  protected abstract update(dtMs: number): void;
  protected abstract welcome(p: Player): ServerMsg;
  protected abstract enteredTile(p: Player, t: Tile): void;
  /** Right after a (re)connected client got its snapshot. */
  protected welcomed?(p: Player): void;
  protected flagChanged?(p: Player, key: string, value: unknown): void;
  /** Someone asked to sleep till morning. */
  protected rested?(p: Player): void;
  /** Someone set out for the world map. */
  protected traveled?(p: Player): void;
  protected moved?(p: Player, map: string, entry?: string): void;
  /** A meeting on the road was decided in its talk. */
  protected encountered?(p: Player, action: EncounterAction): void;
  protected questChanged?(p: Player, quest: string, stage: string): void;

  protected debug(p: Player, op: Extract<Intent, { t: 'debug' }>['op']): void {
    if (op.op === 'teleport') this.place(p, op.x, op.y);
    if (op.op === 'rig') {
      let n = 0;
      const rigged = () => op.values[Math.min(n++, op.values.length - 1)];
      for (const q of this.players.values()) q.game.rng = rigged;
    }
    if (op.op === 'give') p.game.give(op.item, op.qty);
    if (op.op === 'xp') p.game.addXp(op.amount);
    if (op.op === 'flag') p.game.setFlag(op.key, op.value);
  }

  /** Send changed player states and the player list. */
  flush(): void {
    for (const id of this.dirty) {
      const p = this.players.get(id);
      if (p) this.send(p, { t: 'you', state: p.game.state });
    }
    if (this.dirty.size) this.infoChanged();
    this.dirty.clear();
    this.flushMore();
  }

  protected flushMore(): void {}

  protected markAll(): void {
    for (const id of this.players.keys()) this.dirty.add(id);
  }

  playerInfo(): PlayerInfo[] {
    return [...this.players.values()].map((p) => ({
      id: p.id,
      name: p.game.char.name,
      look: p.game.char.look,
      level: p.game.char.level,
      hp: p.game.state.hp,
      maxHp: p.game.maxHp,
      connected: !!p.link,
      downed: p.downed,
    }));
  }

  /** Broadcast the player list if anything in it changed. */
  protected infoChanged(): void {
    const list = this.playerInfo();
    const key = JSON.stringify(list);
    if (this.sentInfo.get('list') === key) return;
    this.sentInfo.set('list', key);
    this.broadcast({ t: 'players', list });
  }

  // ---------- movement ----------
  playerAt(x: number, y: number, except?: Player): Player | undefined {
    for (const p of this.players.values()) {
      if (p === except) continue;
      const t = p.mover.tile;
      if (t.x === x && t.y === y) return p;
    }
    return undefined;
  }

  protected pathfinder(blocked: (x: number, y: number) => boolean): Pathfinder {
    return new Pathfinder(this.grid.width, this.grid.height, (x, y) => this.grid.isSolid(x, y) || blocked(x, y));
  }

  /** Walk a player along a path, telling everyone. */
  protected walk(p: Player, path: Tile[], onArrive?: () => void): void {
    p.mover.walk(path, onArrive);
    if (path.length) this.broadcast({ t: 'walk', id: p.id, path, speed: p.mover.speed });
  }

  place(p: Player, x: number, y: number, dir = p.mover.dir): void {
    p.mover.teleport(x, y);
    p.mover.dir = dir;
    p.game.state.player = { x, y, dir };
    this.broadcast({ t: 'place', id: p.id, x, y, dir });
  }

  /** Snap a walking player to the tile under its feet (fights start on whole tiles). */
  protected halt(p: Player): void {
    const t = p.mover.tile;
    this.place(p, t.x, t.y);
  }

  /** The sprite sheet for a player: their look, in the armor they wear. */
  static sheetOf(p: Player): string {
    const armor = p.game.armor;
    const look = armor ? (armor.look ?? p.game.state.equipped.armor) : null;
    return `hero_${p.game.char.look}${look ? `_${look}` : ''}`;
  }

  protected playerActor(p: Player): ActorSnap {
    const t = p.mover.tile;
    return { id: p.id, kind: 'player', sheet: Room.sheetOf(p), x: t.x, y: t.y, dir: p.mover.dir, path: [...p.mover.path], speed: p.mover.speed, label: p.game.char.name };
  }

  /** The player's sprite changed (armor, look): draw them anew for everyone. */
  protected redraw(p: Player): void {
    this.broadcast({ t: 'despawn', id: p.id });
    this.broadcast({ t: 'spawn', actor: this.playerActor(p) });
  }

  save(slot: 'main' | 'auto' = 'main'): void {
    this.opts.save?.(this, slot);
  }
}
