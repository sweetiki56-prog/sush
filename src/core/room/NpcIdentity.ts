import type { MapActor, MapData } from '../../world/MapData';

/** Keep an authored person's ID; distinguish actors sharing a generic conversation. */
export function npcIdentityForActor(actor: MapActor, mapId: string, maps: Iterable<MapData>, dialogueNpcId?: string): string | undefined {
  if (actor.npcId) return actor.npcId;
  if (!dialogueNpcId) return undefined;
  let uses = 0;
  for (const map of maps) for (const other of map.actors) if (other.dialogue === actor.dialogue) uses++;
  if (uses <= 1 || actor.id === dialogueNpcId) return dialogueNpcId;
  return `${mapId}:${actor.id}`;
}
