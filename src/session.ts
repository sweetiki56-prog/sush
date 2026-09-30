// Shared runtime session: the connection to a room (local for solo, a server online) plus UI signals.
// Created empty; the menu fills it with a new character, a loaded save, or an online room.
import type { Game } from './core/Game';
import { Emitter } from './core/Emitter';
import { clearSave, loadGame, saveGame, type Slot } from './core/SaveSystem';
import { newState } from './core/state';
import type { CharacterData } from './core/character/defs';
import type { GameStateData } from './core/types';
import { MissionRoom } from './core/room/Mission';
import type { Intent } from './core/room/protocol';
import { CONTENT } from './content';
import type { MapData } from './world/MapData';
import type { WorldGridData } from './core/travel/Travel';
import type { CombatView } from './world/CombatView';
import { NetClient } from './net/NetClient';
import { LocalTransport } from './net/LocalTransport';

export interface Hover {
  label: string;
  interact: boolean;
}

export type UiEvents = {
  hover: [hover: Hover | null];
  modal: [open: boolean];
  combat: [view: CombatView | null];
};

export class Session {
  net: NetClient | null = null;
  private local: LocalTransport | null = null;
  readonly ui = new Emitter<UiEvents>();
  maps: Record<string, MapData> = {}; // every map by id, loaded by the boot scene
  worldMap: WorldGridData | null = null; // the world map of Низовье

  /** The Rusty Well: the menu drifts over it, a new game starts in it. */
  get map(): MapData | null {
    return this.maps.rusty_well ?? null;
  }
  modal = false; // any window open: world ignores clicks
  started = false; // world is live and accepts input

  get game(): Game {
    const g = this.net?.game;
    if (!g) throw new Error('no game: start a new one, load a save or join a room first');
    return g;
  }

  get hasGame(): boolean {
    return !!this.net?.game;
  }

  /** Solo play: this page runs the room. */
  get solo(): boolean {
    return !!this.local;
  }

  startNew(character: CharacterData): void {
    clearSave();
    this.openLocal(newState(character, CONTENT));
    this.save();
  }

  /** Load a slot; false when it is empty or from an older version. */
  load(slot: Slot = 'main'): boolean {
    const state = loadGame(undefined, slot);
    if (!state) return false;
    this.openLocal(state);
    return true;
  }

  private openLocal(state: GameStateData): void {
    if (!this.map) throw new Error('map not loaded');
    this.net?.close();
    const room = new MissionRoom(
      {
        mode: 'solo',
        code: 'solo',
        content: CONTENT,
        map: this.maps[String(state.flags.at)] ?? this.map,
        maps: this.maps,
        worldMap: this.worldMap ?? undefined,
        debug: import.meta.env.DEV,
        save: (r, slot) => r.host && saveGame(r.host.game.state, undefined, slot),
      },
      { flags: state.flags, quests: state.quests, stats: state.stats, stock: state.stock, travel: state.travel },
    );
    this.net = new NetClient(CONTENT);
    this.local = new LocalTransport(room, this.net);
    this.local.join('local', state);
  }

  /** Online: take over a client already connected to a server room. */
  adopt(net: NetClient): void {
    this.net?.close();
    this.local = null;
    this.net = net;
  }

  send(i: Intent): void {
    this.net?.send(i);
  }

  setModal(open: boolean): void {
    this.modal = open;
    this.ui.emit('modal', open);
    this.send({ t: 'modal', open });
  }

  /** Solo saves to this browser; an online room is saved by the server. */
  save(slot: Slot = 'main'): void {
    this.local?.save(slot);
  }
}

let session_: Session | null = null;
export function session(): Session {
  return (session_ ??= new Session());
}
