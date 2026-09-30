import type { Condition, Effect, Hook } from '../core/types';

export interface MapObject {
  id: string;
  frame: string;
  x: number;
  y: number;
  w: number;
  h: number;
  block: boolean;
  label?: string;
  dialogue?: string;
  jx?: number; // px nudge, breaks the tile lattice
  jy?: number;
  explosive?: boolean; // becomes a 1 HP combat target that blows up
  bench?: 'workbench' | 'fire'; // crafting next to it follows its recipes
}

export interface MapActor {
  id: string;
  sheet: string;
  x: number;
  y: number;
  dir: number;
  label?: string;
  dialogue?: string;
  creature?: string; // hostile: key in creatures.json
  group?: string; // hostiles that wake and fight together
  patrol?: [number, number][]; // waypoints walked in real time
  if?: Condition[]; // on the map only while these flags hold (checked live: they come and go)
  peace?: Condition[]; // a creature that talks: a peaceful NPC while these hold, a hostile after
  from?: [number, number]; // appears there and walks to x, y; leaves the same way
  respawn?: boolean; // comes back every morning, whatever happened to it (burrows breed)
  ally?: boolean; // a creature on the players' side, fighting under AI (caravan guards on the road)
  ring?: boolean; // a fight with it is a bout on the ring: fists only, nobody dies
}

export interface MapTrigger {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  if?: Condition[];
  effects: Effect[];
  log?: string;
  repeat?: boolean; // fires on every entry (a reminder), not once
}

/** A way out at the edge of a map (or a hatch, a gangway): the next area of the town, or the world map. */
export interface MapExit {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  to: string; // 'world' or a map id
  entry?: string; // where the party comes out on that map
  label: string; // «Карта мира», «Южные развалины»
  if?: Condition[]; // open only while these hold
  closed?: string; // said when it is not open yet
  effects?: Effect[]; // what leaving by it means (the chapter ends)
}

/** A building with an inside: its roof hides the room until one of us walks in. */
export interface MapRoof {
  id: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  style: 'tin' | 'planks' | 'hull';
}

/** What happens once a group of hostiles has nobody left standing (checked after fights and blasts). */
export interface MapCleared {
  group: string;
  if?: Condition[]; // also guards against firing twice: the effects should make it false
  effects: Effect[];
  log?: string;
}

/** Scenery outside the playable grid: drawn and depth-sorted, never picked or blocking. */
export interface MapDecor {
  frame: string;
  x: number;
  y: number;
  w: number;
  h: number;
  jx?: number; // px nudge, breaks the tile lattice
  jy?: number;
}

export interface MapData {
  id?: string; // 'rusty_well', 'arena', an encounter map…
  entries?: Record<string, [number, number]>; // where a party arrives from the world map (by side or road)
  name: string;
  width: number;
  height: number;
  ground: string[];
  objects: MapObject[];
  actors: MapActor[];
  triggers: MapTrigger[];
  exits?: MapExit[];
  roofs?: MapRoof[];
  cleared?: MapCleared[];
  arrive?: Hook[]; // on arriving here, and every morning spent here (the day of a raid)
  /** Guests: the flag holds on days where day ≥ from and (day − from) % every < stay. */
  visits?: { flag: string; every: number; from: number; stay: number }[];
  daily?: string[]; // flags set back to nothing every morning (daily limits, the day's ambush)
  outer: { margin: number; pad: number; ground: string[] };
  decor: MapDecor[];
  wires: [[number, number], [number, number]][];
  spawns?: [number, number][]; // arena: where fighters start a round; battlefields: the hero's side
  foes?: [number, number][]; // battlefields: where the other party stands
}

export interface SheetMeta {
  w: number;
  h: number;
  footX: number;
  footY: number;
  poses: string[];
}

export interface GenMeta {
  groundOffsetX: number;
  groundOffsetY: number;
  grounds?: Record<string, { key: string; offX: number; offY: number }>; // per map id
  sheets: Record<string, SheetMeta>;
}

export const HARD_GROUND = new Set(['=', 'F']);
