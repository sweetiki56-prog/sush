// Co-op rooms on disk: the shared world and every player's own state, keyed by their token.
// Written a moment after the room asks (writes are coalesced), so a busy fight costs one write.
import { mkdirSync, readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import path from 'node:path';
import type { GameStateData } from '../src/core/types';
import type { MissionRoom, WorldData } from '../src/core/room/Mission';

export interface RoomSave {
  code: string;
  world: WorldData;
  players: Record<string, GameStateData>; // token -> state (shared parts stripped)
}

const CODE = /^[A-Z0-9]{5}$/;

export class Store {
  private pending = new Map<string, NodeJS.Timeout>();

  constructor(private dir: string) {
    mkdirSync(dir, { recursive: true });
  }

  /** A deep copy of the room as it stands now. */
  static snapshot(room: MissionRoom, previous?: RoomSave | null): RoomSave {
    const players: Record<string, GameStateData> = { ...(previous?.players ?? {}) };
    for (const p of room.players.values()) {
      const s = structuredClone(p.game.state);
      s.flags = {};
      s.quests = {};
      players[p.token] = s;
    }
    return { code: room.code, world: structuredClone(room.world), players };
  }

  private file(code: string): string {
    return path.join(this.dir, `${code}.json`);
  }

  load(code: string): RoomSave | null {
    if (!CODE.test(code) || !existsSync(this.file(code))) return null;
    try {
      return JSON.parse(readFileSync(this.file(code), 'utf8')) as RoomSave;
    } catch {
      return null;
    }
  }

  /** Write soon; a later call for the same room replaces the pending one. */
  write(save: RoomSave): void {
    clearTimeout(this.pending.get(save.code));
    this.pending.set(
      save.code,
      setTimeout(() => {
        this.pending.delete(save.code);
        const tmp = `${this.file(save.code)}.tmp`;
        try {
          mkdirSync(this.dir, { recursive: true }); // someone may have cleaned the folder meanwhile
          writeFileSync(tmp, JSON.stringify(save));
          renameSync(tmp, this.file(save.code));
        } catch (e) {
          console.error(`save ${save.code} failed:`, e); // a lost save must not take the server down
        }
      }, 500),
    );
  }

  /** A player's saved state, with the world's shared parts put back. */
  static playerState(save: RoomSave, token: string): GameStateData | null {
    const s = save.players[token];
    if (!s) return null;
    const out = structuredClone(s);
    out.flags = save.world.flags;
    out.quests = save.world.quests;
    out.stats = save.world.stats;
    out.stock = save.world.stock;
    out.travel = save.world.travel;
    return out;
  }
}
