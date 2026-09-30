// A mission room with fake clients, for room-level tests.
import { readFileSync } from 'node:fs';
import { CONTENT, MAP_IDS } from '../../src/content';
import { MissionRoom } from '../../src/core/room/Mission';
import type { Intent, ServerMsg } from '../../src/core/room/protocol';
import { BuildDraft } from '../../src/core/character/BuildDraft';
import { newState } from '../../src/core/state';
import { mulberry32 } from '../../src/core/rng';
import type { MapData } from '../../src/world/MapData';
import type { WorldGridData } from '../../src/core/travel/Travel';

export const MAP = JSON.parse(readFileSync('public/assets/maps/rusty_well.json', 'utf8')) as MapData;
export const ARENA = JSON.parse(readFileSync('public/assets/maps/arena.json', 'utf8')) as MapData;
export const WORLD = JSON.parse(readFileSync('public/assets/maps/world_low.json', 'utf8')) as WorldGridData;
// every town map and area besides the Rusty Well's village
export const TOWNS: Record<string, MapData> = Object.fromEntries(MAP_IDS.filter((id) => id !== 'rusty_well' && id !== 'arena' && !id.startsWith('enc_')).map((id) => [id, JSON.parse(readFileSync(`public/assets/maps/${id}.json`, 'utf8')) as MapData]));
export const FIELDS: Record<string, MapData> = Object.fromEntries([...new Set(Object.values(CONTENT.travel.battlefields))].map((id) => [id, JSON.parse(readFileSync(`public/assets/maps/${id}.json`, 'utf8')) as MapData]));

export function premadeState(i: number) {
  const d = new BuildDraft(CONTENT.character);
  d.applyPremade(CONTENT.character.premades[i]);
  return newState(d.build(), CONTENT);
}

/** A fake client: records messages and acknowledges combat batches on request. */
export class Client {
  msgs: ServerMsg[] = [];
  id = '';
  constructor(private room: MissionRoom) {}
  link = { send: (m: ServerMsg) => void this.msgs.push(m) };
  of<T extends ServerMsg['t']>(t: T): Extract<ServerMsg, { t: T }>[] {
    return this.msgs.filter((m) => m.t === t) as Extract<ServerMsg, { t: T }>[];
  }
  last<T extends ServerMsg['t']>(t: T): Extract<ServerMsg, { t: T }> | undefined {
    return this.of(t).at(-1);
  }
  do(i: Intent) {
    this.room.handle(this.id, i);
  }
  ack() {
    const c = this.last('combat');
    if (c) this.do({ t: 'ack', seq: c.seq });
  }
}

export function room(players = 1, rng = mulberry32(7)) {
  const first = premadeState(0);
  const r = new MissionRoom(
    { mode: players > 1 ? 'coop' : 'solo', code: 'TEST', content: CONTENT, map: MAP, maps: { rusty_well: MAP, arena: ARENA, ...TOWNS, ...FIELDS }, worldMap: WORLD, rng, debug: true, maxPlayers: 4, turnLimitMs: players > 1 ? 30_000 : null },
    { flags: first.flags, quests: first.quests, stats: first.stats },
  );
  const clients: Client[] = [];
  for (let i = 0; i < players; i++) {
    const c = new Client(r);
    c.id = r.join(`tok${i}`, i === 0 ? first : premadeState(i % 3), c.link).id;
    clients.push(c);
  }
  return { r, clients };
}

/** Advance room time in 50 ms steps until the check passes (or give up). */
export function until(r: MissionRoom, ok: () => boolean, ms = 60_000) {
  for (let t = 0; t < ms && !ok(); t += 50) r.tick(50);
  return ok();
}

/** Like `until`, with nobody else on the world map (a meeting would stop the party and its clock). */
export function untilAlone(r: MissionRoom, ok: () => boolean, ms = 120_000) {
  return until(r, () => {
    if (r.world.travel?.parties) r.world.travel.parties.length = 0;
    return ok();
  }, ms);
}
