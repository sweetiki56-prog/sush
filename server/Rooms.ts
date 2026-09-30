// Every room on the server and every connection: create or join by code, reconnect by token,
// feed clean intents to rooms, tick them, and forget rooms nobody has visited for a while.
import { CONTENT } from '../src/content';
import { MissionRoom } from '../src/core/room/Mission';
import type { Link } from '../src/core/room/Room';
import { newState } from '../src/core/state';
import type { GameStateData } from '../src/core/types';
import { PROTOCOL, type LobbyFrame, type ServerMsg } from '../src/core/room/protocol';
import { cleanIntent, validCharacter } from '../src/core/room/validate';
import type { MapData } from '../src/world/MapData';
import type { WorldGridData } from '../src/core/travel/Travel';
import { Store, type RoomSave } from './store';
import { ArenaRoom } from '../src/core/room/Arena';
import { validLoadout } from '../src/core/room/loadout';

export interface Socket {
  send(data: string): void;
  close(): void;
}

const RECONNECT_MS = 60_000; // a player who stays away longer leaves the room (co-op keeps their save)
const EMPTY_MS = 30 * 60_000; // an empty room is dropped from memory after this
const RATE = 60; // frames per second before we start dropping them
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

type AnyRoom = MissionRoom | ArenaRoom;

interface Hosted {
  room: AnyRoom;
  conns: Set<Conn>;
  saved: RoomSave | null; // co-op: the last save
  auto: RoomSave | null; // co-op: the save from before the last fight
  gone: Map<string, number>; // pid -> when the link dropped
  emptySince: number | null;
}

export class Conn {
  hosted: Hosted | null = null;
  pid = '';
  token = '';
  private frames = 0;
  private second = 0;
  readonly link: Link;

  constructor(readonly sock: Socket) {
    this.link = { send: (m) => this.send(m) };
  }

  send(m: ServerMsg): void {
    this.sock.send(JSON.stringify(m));
  }

  /** False when this connection is sending too much. */
  allow(now: number): boolean {
    if (now - this.second >= 1000) {
      this.second = now;
      this.frames = 0;
    }
    return ++this.frames <= RATE;
  }
}

export interface RoomsOptions {
  maps: { mission: MapData; arena: MapData; all?: Record<string, MapData>; world?: WorldGridData }; // all: every map by id; world: the world map
  store: Store;
  debug: boolean;
  now?: () => number;
}

export class Rooms {
  private rooms = new Map<string, Hosted>();

  constructor(private opts: RoomsOptions) {}

  private now(): number {
    return (this.opts.now ?? Date.now)();
  }

  get count(): number {
    return this.rooms.size;
  }

  open(sock: Socket): Conn {
    return new Conn(sock);
  }

  /** One frame from a client. A bug in one room must not take the others down: log it and go on. */
  frame(conn: Conn, data: string): void {
    try {
      this.handleFrame(conn, data);
    } catch (e) {
      console.error(`room ${conn.hosted?.room.code ?? '-'}: frame failed`, e);
    }
  }

  private handleFrame(conn: Conn, data: string): void {
    if (!conn.allow(this.now())) return;
    let raw: unknown;
    try {
      raw = JSON.parse(data);
    } catch {
      return;
    }
    // lobby frames first; anything else is an intent for the room
    const f = raw as LobbyFrame;
    const t: unknown = (raw as { t?: unknown } | null)?.t;
    if (t === 'hello') {
      if ((f as Extract<LobbyFrame, { t: 'hello' }>).v !== PROTOCOL) conn.send({ t: 'error', text: 'Версия игры устарела: обновите страницу.' });
      return;
    }
    if (t === 'create') return this.create(conn, f as Extract<LobbyFrame, { t: 'create' }>);
    if (t === 'join') return this.join(conn, f as Extract<LobbyFrame, { t: 'join' }>);
    if (t === 'restart') return this.restart(conn);
    if (t === 'leave') return this.leave(conn);
    const intent = cleanIntent(raw);
    if (!intent || !conn.hosted) return;
    conn.hosted.room.handle(conn.pid, intent);
  }

  closed(conn: Conn): void {
    const h = conn.hosted;
    if (!h) return;
    h.conns.delete(conn);
    conn.hosted = null;
    if (h.room.players.get(conn.pid)?.link === conn.link) {
      h.room.disconnect(conn.pid);
      h.gone.set(conn.pid, this.now());
    }
  }

  // ---------- rooms ----------
  private newCode(): string {
    for (;;) {
      let c = '';
      for (let i = 0; i < 5; i++) c += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
      if (!this.rooms.has(c) && !this.opts.store.load(c)) return c;
    }
  }

  private mission(code: string, save: RoomSave): Hosted {
    const h: Hosted = { room: null as unknown as AnyRoom, conns: new Set(), saved: save, auto: structuredClone(save), gone: new Map(), emptySince: null };
    h.room = new MissionRoom(
      {
        mode: 'coop',
        code,
        content: CONTENT,
        map: this.opts.maps.all?.[String(save.world.flags.at)] ?? this.opts.maps.mission,
        maps: this.opts.maps.all,
        worldMap: this.opts.maps.world,
        maxPlayers: 4,
        turnLimitMs: 60_000,
        debug: this.opts.debug,
        save: (r, slot) => {
          h.saved = Store.snapshot(r as MissionRoom, h.saved);
          if (slot === 'auto') h.auto = structuredClone(h.saved);
          this.opts.store.write(h.saved);
        },
      },
      save.world,
    );
    this.rooms.set(code, h);
    return h;
  }

  private arena(code: string): Hosted {
    const h: Hosted = { room: null as unknown as AnyRoom, conns: new Set(), saved: null, auto: null, gone: new Map(), emptySince: null };
    h.room = new ArenaRoom({ mode: 'arena', code, content: CONTENT, map: this.opts.maps.arena, maxPlayers: 6, turnLimitMs: CONTENT.arena.turnMs, debug: this.opts.debug });
    this.rooms.set(code, h);
    return h;
  }

  private create(conn: Conn, f: Extract<LobbyFrame, { t: 'create' }>): void {
    if (conn.hosted) this.leave(conn);
    const token = typeof f.token === 'string' ? f.token.slice(0, 64) : '';
    if (!token) return conn.send({ t: 'error', text: 'Нет токена игрока.' });
    const code = this.newCode();
    if (f.mode === 'arena') {
      this.arena(code);
      return this.join(conn, { t: 'join', code, token, loadout: f.loadout });
    }
    const character = validCharacter(f.character, CONTENT.character);
    if (!character) return conn.send({ t: 'error', text: 'Персонаж не прошёл проверку.' });
    const state = newState(character, CONTENT);
    this.mission(code, { code, world: { flags: state.flags, quests: state.quests, stats: state.stats, stock: state.stock, travel: state.travel }, players: {} });
    this.enter(conn, this.rooms.get(code)!, token, state);
  }

  private join(conn: Conn, f: Extract<LobbyFrame, { t: 'join' }>): void {
    const code = String(f.code ?? '').toUpperCase().trim();
    const token = typeof f.token === 'string' ? f.token.slice(0, 64) : '';
    if (!token) return conn.send({ t: 'error', text: 'Нет токена игрока.' });
    let h = this.rooms.get(code);
    if (!h) {
      const save = this.opts.store.load(code);
      if (!save) return conn.send({ t: 'error', text: `Комната ${code || '?'} не найдена.` });
      h = this.mission(code, save);
    }
    if (conn.hosted && conn.hosted !== h) this.leave(conn);
    const room = h.room;
    if (room.byToken(token)) return this.enter(conn, h, token, null);
    if (room.full) return conn.send({ t: 'error', text: 'Комната заполнена.' });
    if (room instanceof ArenaRoom) {
      const loadout = validLoadout(f.loadout, CONTENT);
      if (!loadout) return conn.send({ t: 'error', text: 'Снаряжение не прошло проверку.' });
      conn.send({ t: 'joined', code, mode: room.mode });
      this.attach(conn, h, token, room.joinArena(token, loadout, conn.link).id);
      return;
    }
    let state = h.saved ? Store.playerState(h.saved, token) : null;
    if (!state) {
      const character = validCharacter(f.character, CONTENT.character);
      if (!character) return conn.send({ t: 'error', text: 'Персонаж не прошёл проверку.' });
      state = newState(character, CONTENT);
    }
    this.enter(conn, h, token, state);
  }

  /** Put a connection into a co-op room: a new player, or the same player back. */
  private enter(conn: Conn, h: Hosted, token: string, state: GameStateData | null): void {
    const room = h.room as MissionRoom;
    conn.send({ t: 'joined', code: room.code, mode: room.mode });
    const known = room.byToken(token);
    const p = known ? known : room.join(token, state!, null);
    this.attach(conn, h, token, p.id);
    room.connect(p, conn.link);
    room.save('main');
  }

  private attach(conn: Conn, h: Hosted, token: string, pid: string): void {
    for (const other of h.conns) if (other !== conn && other.pid === pid) {
      other.hosted = null; // the same player opened another tab: the old one lets go
      h.conns.delete(other);
      other.send({ t: 'left' });
      other.sock.close();
    }
    conn.hosted = h;
    conn.pid = pid;
    conn.token = token;
    h.conns.add(conn);
    h.gone.delete(pid);
    h.emptySince = null;
  }

  private leave(conn: Conn): void {
    const h = conn.hosted;
    if (!h) return;
    h.room.save('main');
    this.closed(conn);
    h.room.remove(conn.pid);
    h.gone.delete(conn.pid);
    conn.send({ t: 'left' });
  }

  /** Co-op, everyone down: rebuild the room from its pre-fight save and bring everyone back in. */
  private restart(conn: Conn): void {
    const h = conn.hosted;
    if (!h || !(h.room instanceof MissionRoom) || !h.room.defeated || !h.auto) return;
    const auto = structuredClone(h.auto);
    const conns = [...h.conns];
    const fresh = this.mission(h.room.code, auto);
    fresh.conns = new Set();
    for (const c of conns) {
      const state = Store.playerState(auto, c.token);
      if (!state) continue;
      const p = (fresh.room as MissionRoom).join(c.token, state, null);
      this.attach(c, fresh, c.token, p.id);
    }
    for (const c of fresh.conns) {
      const p = fresh.room.players.get(c.pid)!;
      fresh.room.connect(p, c.link);
    }
  }

  tick(dtMs: number): void {
    const now = this.now();
    for (const [code, h] of this.rooms) {
      try {
        h.room.tick(dtMs);
      } catch (e) {
        console.error(`room ${code}: tick failed`, e);
      }
      for (const [pid, at] of h.gone) {
        if (now - at < RECONNECT_MS) continue;
        h.gone.delete(pid);
        if (h.room.players.get(pid)?.link) continue;
        h.room.save('main');
        h.room.remove(pid);
      }
      if (h.conns.size) h.emptySince = null;
      else if ((h.emptySince ??= now) && now - h.emptySince > EMPTY_MS) this.rooms.delete(code);
    }
  }
}
