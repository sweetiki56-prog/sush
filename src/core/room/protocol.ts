// Messages between a client (the Phaser scenes) and a room (in the browser for solo, on the server online).
// Clients send intents; the room decides and reports what happened. Plain JSON both ways.
import type { CombatSnap } from '../combat/Combat';
import type { CombatEvent, Outcome } from '../combat/types';
import type { AttrId, CharacterData, SkillId } from '../character/defs';
import type { FlagValue, GameStateData } from '../types';
import type { Tile } from '../../iso/Pathfinder';
import type { CheckResult } from '../SkillCheck';

export const PROTOCOL = 1;

export type RoomMode = 'solo' | 'coop' | 'arena';

/** Hand 1, hand 2, armor, or a charm (a charm toggles in and out of a free charm place). */
export type EquipSlot = 'weapon' | 'alt' | 'armor' | 'charm';
export const EQUIP_SLOTS: EquipSlot[] = ['weapon', 'alt', 'armor', 'charm'];

export type DebugOp =
  | { op: 'teleport'; x: number; y: number }
  | { op: 'combat'; ids: string[] }
  | { op: 'rig'; values: number[] }
  | { op: 'give'; item: string; qty: number }
  | { op: 'xp'; amount: number }
  | { op: 'goto'; map: string; entry?: string }
  | { op: 'flag'; key: string; value: FlagValue } // set a shared flag (tests: skip ahead in the story)
  | { op: 'quiet'; on: boolean } // an empty world map: nobody else on the road (tests of places, not of meetings)
  | { op: 'party'; tpl: string; dx: number; dy: number; members?: string[]; route?: string }; // world map: a party standing next to ours (a caravan on a route)

export type Intent =
  | { t: 'walk'; x: number; y: number }
  | { t: 'interact'; id: string } // walk up to an NPC or object and talk to / use it
  | { t: 'engage'; id: string } // attack a hostile outside combat
  | { t: 'choose'; i: number } // dialogue answer (index among the shown ones)
  | { t: 'useItem'; item: string }
  | { t: 'sneak'; on: boolean }
  | { t: 'modal'; open: boolean } // a window is open: nobody spots this player meanwhile
  | { t: 'attack'; target: string }
  | { t: 'throw'; item: string; x: number; y: number } // a grenade at a tile
  | { t: 'equip'; slot: EquipSlot; item: string | null } // put an item into a slot, or empty it
  | { t: 'step'; x: number; y: number } // move in combat
  | { t: 'endTurn' }
  | { t: 'swapWeapon' }
  | { t: 'ack'; seq: number } // finished animating a combat batch
  | { t: 'spendSkills'; plan: Partial<Record<SkillId, number>> }
  | { t: 'takePerk'; id: string }
  | { t: 'seen'; chapter?: number } // the chapter-complete screen was shown (1 by default)
  | { t: 'give'; to: string; item: string } // hand an item to another player
  | { t: 'revive'; target: string } // lift a downed ally in combat
  | { t: 'craft'; recipe: string } // make something at the bench or fire you stand next to
  | { t: 'travel'; x?: number; y?: number; to?: string } // world map: head for a cell or a location
  | { t: 'enter'; loc: string; area: string } // world map: walk into this area (a map id) of the town the party stands at
  | { t: 'halt' } // world map: stop
  | { t: 'camp' } // world map: make camp till morning
  | { t: 'take'; item?: string } // after a road battle: take one kind of item from the spoils, or all of them
  | { t: 'lootDone' } // done with the spoils: back on the road
  | { t: 'stay' } // co-op: not leaving town yet (cancels the departure countdown)
  | { t: 'trade'; trader: string; buy: Record<string, number>; sell: Record<string, number> } // a deal with a trader close by
  | { t: 'chat'; text: string }
  | { t: 'resync' } // the scene (re)started: send a fresh snapshot
  | { t: 'loadout'; loadout: unknown } // arena: a new build (checked by the room)
  | { t: 'ready'; on: boolean } // arena: ready for the next round
  | { t: 'debug'; op: DebugOp };

export type ActorKind = 'player' | 'npc' | 'hostile' | 'ally'; // ally: a companion (talks outside a fight)

export interface ActorSnap {
  id: string;
  kind: ActorKind;
  sheet: string;
  x: number; // tile
  y: number;
  dir: number;
  path: Tile[]; // still walking this
  speed: number;
  label: string;
  dialogue?: string;
}

/** Another party as the hero sees it on the world map. */
export interface MapParty {
  id: string;
  kind: string;
  name: string;
  x: number;
  y: number;
  word: string; // strength compared with the hero
  heading?: string; // where a caravan or patrol is going
  chasing: boolean; // after the hero
  sheet: string; // who walks at its head on the map (the first fighter's sprite sheet)
  count: number;
}

export interface HostileSnap {
  id: string;
  name: string;
  asleep: boolean;
  lured: boolean;
  dead: boolean;
  gone: boolean;
}

export interface PlayerInfo {
  id: string;
  name: string;
  look: number;
  level: number;
  hp: number;
  maxHp: number;
  connected: boolean;
  downed: boolean;
}

export interface DialogueMsg {
  id: string;
  speaker: string;
  npcId?: string;
  portrait?: string;
  text: string;
  options: string[];
  /** Optional content references for client-side localization; old clients still use text/options. */
  nodeId?: string;
  optionIndices?: number[];
  checks?: ({ skill?: SkillId; attr?: AttrId; chance: number } | null)[];
}

export interface CombatSync extends CombatSnap {
  timer: number | null; // ms left in the current human turn, null = no limit
  busy: boolean; // the room is waiting for animations
}

export type ArenaPhase = 'lobby' | 'countdown' | 'fight' | 'break' | 'done';

export interface ArenaStatus {
  phase: ArenaPhase;
  round: number;
  rounds: number; // round wins that take the match
  left: number | null; // ms until the countdown or the break ends
  ready: string[];
  scores: Record<string, number>; // pid -> round wins
  kills: Record<string, number>;
  damage: Record<string, number>;
  winner: string | null; // pid of the match winner
  lastRound: string | null; // who took the last round ("ничья" for a draw)
}

export type GameEventMsg = { ev: 'check'; label: string; result: CheckResult } | { ev: 'quest'; quest: string; stage: string } | { ev: 'gained'; item: string } | { ev: 'level'; level: number };

export type ServerMsg =
  | {
      t: 'welcome';
      you: string;
      map: string; // which map to draw (a location, an encounter, the arena)
      mode: RoomMode;
      code: string;
      state: GameStateData;
      actors: ActorSnap[];
      hostiles: HostileSnap[];
      players: PlayerInfo[];
      combat: CombatSync | null;
      sneaking: boolean;
    }
  | { t: 'you'; state: GameStateData }
  | ({ t: 'gev' } & GameEventMsg)
  | { t: 'flag'; key: string; value: FlagValue }
  | { t: 'walk'; id: string; path: Tile[]; speed: number }
  | { t: 'place'; id: string; x: number; y: number; dir: number }
  | { t: 'face'; id: string; x: number; y: number }
  | { t: 'spawn'; actor: ActorSnap }
  | { t: 'despawn'; id: string }
  | ({ t: 'hostile' } & HostileSnap)
  | { t: 'fx'; kind: 'blast'; x: number; y: number; r: number }
  | ({ t: 'dialogue' } & DialogueMsg)
  | { t: 'dialogueEnd'; id: string }
  | { t: 'combat'; seq: number; events: CombatEvent[]; sync: CombatSync }
  | { t: 'combatEnd'; outcome: Outcome }
  | { t: 'sneak'; on: boolean }
  | { t: 'players'; list: PlayerInfo[] }
  | { t: 'gameOver'; canLoad: boolean }
  | { t: 'chat'; from: string; text: string }
  | { t: 'notice'; text: string }
  | { t: 'window'; kind: 'workbench' | 'barter'; id: string } // a dialogue opened a window for this player
  | { t: 'loot'; items: Record<string, number> | null } // the spoils of a road battle (null: gone, close the window)
  | { t: 'town'; loc: string } // the party stands at a town of several known areas: show its plan to pick one
  | { t: 'depart'; by: string | null; ms: number; where?: string } // co-op: someone leads the party out of town (or to `where`, another area) in `ms` (by null: called off)
  | { t: 'travel'; x: number; y: number; minute: number; day: number; path: [number, number][]; target: string | null; sneak: boolean; seen?: string; parties: MapParty[]; escort: { to: string; paused: boolean } | null; storms?: [number, number, number, number][] } // the party on the world map
  | ({ t: 'arena' } & ArenaStatus)
  | LobbyMsg;

/** Before (and around) a room: frames the server handles itself, not the room. */
export type LobbyFrame =
  | { t: 'hello'; v: number }
  | { t: 'create'; mode: 'coop' | 'arena'; token: string; character?: CharacterData; loadout?: unknown }
  | { t: 'join'; code: string; token: string; character?: CharacterData; loadout?: unknown }
  | { t: 'restart' } // co-op, everyone down: back to the room's autosave
  | { t: 'leave' };

/** What the server says about the connection itself. */
export type LobbyMsg = { t: 'joined'; code: string; mode: RoomMode } | { t: 'error'; text: string } | { t: 'left' };
