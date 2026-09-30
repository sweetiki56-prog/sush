// Content and state types shared by game logic and scenes.
import type { AttrId, CharacterContent, CharacterData, Mods, SkillId } from './character/defs';
import type { ArmorDef, CombatUse, CreatureDef, WeaponDef } from './combat/types';
import type { TravelState } from './travel/Travel';
import type { TravelContent } from './travel/Parties';

export type { AttrId, SkillId } from './character/defs';
export { SKILL_NAMES, ATTR_NAMES } from './character/defs';

export type FlagValue = boolean | number | string;

/**
 * All listed fields must hold (AND). gte / lt / eq compare the one numeric subject
 * of the condition: a flag, an attribute or a skill (never mix two subjects in one object).
 */
export interface Condition {
  flag?: string; // flag must be truthy, or match eq / gte / lt
  attr?: AttrId; // attribute value vs gte / lt
  skill?: SkillId; // skill value vs gte / lt
  eq?: FlagValue;
  gte?: number;
  lt?: number;
  gteFlag?: string; // the flag's number is at least this other flag's (day ≥ raid_day)
  ltFlag?: string;
  notFlag?: string;
  item?: string;
  qty?: number; // with item / party: at least this many (default 1)
  noItem?: string;
  party?: string; // someone in the party carries this item (co-op: any player; solo: you)
  noParty?: string; // nobody in the party carries it
  caps?: number; // at least
  level?: number; // at least
  perk?: string;
  noPerk?: string;
  trait?: string;
}

export type Effect =
  | { type: 'flag'; key: string; value?: FlagValue }
  | { type: 'inc'; key: string; by?: number }
  | { type: 'give'; item: string; qty?: number }
  | { type: 'take'; item: string; qty?: number; party?: boolean } // party: from whoever carries it
  | { type: 'caps'; amount: number }
  | { type: 'hp'; amount: number }
  | { type: 'quest'; quest: string; stage: string }
  | { type: 'log'; text: string }
  | { type: 'xp'; amount: number }
  | { type: 'karma'; amount: number }
  | { type: 'open'; window: 'workbench' | 'barter'; id: string } // a window over the game: a bench kind or a trader
  | { type: 'rest' } // sleep till the next morning (the room decides if it is safe)
  | { type: 'travel' } // the party leaves this place for the world map
  | { type: 'goto'; map: string; entry?: string } // the party moves to another area (a hatch, a gangway)
  | { type: 'confiscate' } // an arrest: weapons, grenades, ammo and armor go into the warden's chest
  | { type: 'unconfiscate' } // and come back
  | { type: 'dayMark'; key: string; in: number } // key = today + `in` (a day something will happen)
  | { type: 'encounter'; action: EncounterAction }; // how a meeting on the road ends (the room acts once the talk closes)

/**
 * leave: part ways; flee: slip away with a head start; fight: we strike first; ambush: they do;
 * hire: guard the caravan to its next stop; help / turn: join a fight in progress on the side we met / the other.
 */
export type EncounterAction = 'leave' | 'flee' | 'fight' | 'ambush' | 'hire' | 'help' | 'turn';

/** What a check rolls against: a skill value, or an attribute ×10. */
export interface CheckTarget {
  skill?: SkillId;
  attr?: AttrId;
}

export interface SkillCheckDef extends CheckTarget {
  mod?: number;
  pass: string; // node id
  fail: string;
  passEffects?: Effect[];
  failEffects?: Effect[];
}

export interface DialogueOption {
  text: string;
  if?: Condition[];
  effects?: Effect[];
  next?: string | null; // null / missing = end
  check?: SkillCheckDef;
}

export interface DialogueNode {
  text: string;
  effects?: Effect[]; // applied when the node is entered
  options: DialogueOption[];
}

export interface Dialogue {
  speaker: string;
  portrait?: string;
  entry: { if?: Condition[]; node: string }[];
  nodes: Record<string, DialogueNode>;
}

/** Workbench or campfire work: what goes in, what comes out, and any one of the skills at its level. */
export interface RecipeDef {
  inputs: Record<string, number>;
  output: Record<string, number>;
  skill?: Partial<Record<SkillId, number>>;
  bench: 'workbench' | 'fire';
}

export interface JobReward {
  caps?: number;
  xp?: number;
  rep?: Record<string, number>; // faction -> reputation
  items?: Record<string, number>;
}

/** A contract on the board by the well (see core/jobs.ts). */
export interface JobDef {
  title: string;
  desc: string;
  need?: Record<string, number>; // fetch: items handed in
  hunt?: { tag?: string; group?: string; id?: string; creature?: string; count: number }; // kills that count (creature: its kind, anywhere, the road too)
  reward: JobReward;
  repeat?: boolean; // back on the board every morning
  if?: Condition[]; // when it is on the board
  take?: Effect[]; // what taking it sets off (an ambush)
  check?: { skill?: SkillId; attr?: AttrId; mod?: number }; // a roll when handing in (repairs)
  board?: string; // which town's board carries it (default: the Rusty Well's)
  turnIn?: { if: Condition[]; text: string; reward: JobReward; effects?: Effect[] }[]; // several endings (bounties)
}

/** A place on the world map. Without a map it is not built yet: its gates say which chapter opens it. */
/** One map of a town, as a button on its plan. */
export interface AreaDef {
  map: string;
  entry?: string; // where the party comes in from the world map
  name: string;
  at: [number, number]; // its place on the town's plan (0..1 of the plan's width and height)
  known?: Condition[]; // on the plan while these hold (missing: from the start); a visited area always is
}

export interface LocationDef {
  name: string;
  cell: [number, number]; // world map cell
  map?: string; // map id to enter (the first area when there are several)
  entry?: string; // entry point on that map when arriving from the world map
  areas?: AreaDef[]; // a town of several maps: entered through its plan
  chapter?: number; // the chapter that opens it (for the gates' text)
  open?: Condition[]; // it can be entered only while these hold
  reach?: Hook[]; // what happens on reaching it on the world map (a closed gate can end a chapter)
  secret?: boolean; // not a town: a mark on the chart only while `open` holds (a cache someone told of)
}

/** Something that happens when the party arrives (a map, a place on the world map) or wakes up there. */
export interface Hook {
  if?: Condition[]; // also guards against firing twice: the effects should make it false
  effects: Effect[];
  log?: string;
}

/** A trader: whose people they are, what they carry and how much money, what they take and like. */
export interface TraderDef {
  name: string; // «с Хэнком»: after «Сделка с»
  faction?: string; // rep_<faction> gives a discount and opens `need` goods
  friend?: string; // a flag: once set, a tenth off on top (a personal debt of gratitude)
  money: number;
  stock: Record<string, number>;
  restock: number; // days until goods and money come back
  buys?: ItemCat[]; // what they take (all when missing)
  likes?: Record<string, number>; // price factor when they buy it
  need?: Record<string, number>; // item -> reputation needed to see it
}

/** A trader's goods and money right now (shared by every player of a room). */
export interface TraderStock {
  money: number;
  items: Record<string, number>;
  day?: number; // when it was last filled
}

/** Inventory tab an item sits in. */
export type ItemCat = 'weapon' | 'grenade' | 'armor' | 'charm' | 'chem' | 'ammo' | 'part' | 'quest';

export interface ItemDef {
  name: string;
  desc: string;
  icon: string;
  cat: ItemCat;
  value: number; // base price in капли (traders add their cut)
  use?: 'heal' | 'cure' | 'bait' | 'throw' | 'craft' | 'wear' | 'stim' | 'grenade' | 'charm' | 'drink' | 'eat';
  combat?: CombatUse; // what it does when used in a fight (heal also works outside one)
  buff?: { mods: Mods; ms: number }; // a chem's effect for a while of play time (the rest of a fight counts too)
  /** Strong chems: a chance to get hooked; without a dose for `after` ms withdrawal sets in and passes by itself after `clean` ms more. */
  addict?: { chance: number; after: number; clean: number; withdrawal: Mods };
  cureAddict?: boolean; // clears every addiction
  empties?: string; // what is left in the hand afterwards (a drunk flask leaves the canteen)
}

export interface QuestDef {
  title: string;
  /** alt: journal text that replaces the stage's own when its conditions hold (the first match wins). */
  stages: { id: string; journal: string; xp?: number; alt?: { if: Condition[]; journal: string }[] }[];
}

/** Arena rules: how far a free build may go, and match pacing. */
export interface ArenaDef {
  maxLevel: number;
  weapons: number; // weapons to carry (fists come free)
  rounds: number; // round wins that take the match
  turnMs: number;
  roundPauseMs: number;
  startCountdownMs: number;
  ammoPerGun: number;
  items: Record<string, number>; // consumables and grenades: most you may bring
}

export interface Content {
  items: Record<string, ItemDef>;
  quests: Record<string, QuestDef>;
  dialogues: Record<string, Dialogue>;
  character: CharacterContent;
  weapons: Record<string, WeaponDef>;
  creatures: Record<string, CreatureDef>;
  armor: Record<string, ArmorDef>; // keyed by the item you wear
  charms: Record<string, Mods>; // keyed by the item: what the charm gives while worn
  recipes: Record<string, RecipeDef>;
  traders: Record<string, TraderDef>;
  jobs: Record<string, JobDef>;
  locations: Record<string, LocationDef>;
  travel: TravelContent;
  arena: ArenaDef;
}

export interface GameStateData {
  version: 2;
  character: CharacterData;
  hp: number;
  caps: number;
  flags: Record<string, FlagValue>;
  items: Record<string, number>;
  /** Two weapons in hand (weapon ids; alt '' = nothing, missing = pick one from the bag), armor, up to two charms. */
  equipped: { weapon: string; alt?: string; armor?: string; charms?: string[] };
  quests: Record<string, string>; // quest id -> current stage id
  player: { x: number; y: number; dir: number };
  stats: { playMs: number; checksPassed: number; checksFailed: number; kills: number };
  log: string[];
  /** Where the party is on the world map: shared world state like flags. Missing until the first trip. */
  travel?: TravelState;
  /** Traders' goods and money: shared world state like flags. Missing in older saves. */
  stock?: Record<string, TraderStock>;
  /** Chems at work (ms left) and addictions (ms since the last dose). Missing in older saves. */
  body?: { buffs: { item: string; leftMs: number }[]; hooked: Record<string, number>; thirsty?: boolean };
  /** Weapons, grenades, ammo and armor taken away on an arrest, until they are got back. */
  confiscated?: Record<string, number>;
}

export const START_CAPS = 12;
export const START_ITEMS: Record<string, number> = { canteen: 1, rifle: 1, knife: 1, ammo: 12, bandage: 1 };
