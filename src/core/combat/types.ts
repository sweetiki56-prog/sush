// Turn-based combat data. Everything here is plain data so the rules stay unit-testable.
import type { Tile } from '../../iso/Pathfinder';
import type { Mods } from '../character/defs';

/** What a hit is made of. `wet` is fresh water: it only hurts the salt-born. */
export type DmgType = 'normal' | 'fire' | 'poison' | 'shock' | 'wet';
export const DMG_TYPES: DmgType[] = ['normal', 'fire', 'poison', 'shock', 'wet'];
/** Resistance % by damage type; negative = weakness, 100 = immune. */
export type Resist = Partial<Record<DmgType, number>>;

export interface WeaponDef {
  name: string;
  skill: 'guns' | 'melee';
  ap: number;
  dmg: [number, number];
  range: number; // tiles; 1 = adjacent (melee)
  ammo?: string; // item consumed per shot
  item?: string; // inventory item that grants the weapon
  poison?: { dmg: number; turns: number };
  burst?: number; // rounds per attack; each rolls on its own, a bit worse than the last
  pierce?: number; // ignores this much of the target's damage threshold
  thrown?: { radius: number }; // thrown at a tile, blows up there; the item itself is used up
  type?: DmgType; // default normal
  hit?: number; // to-hit bonus of the weapon itself
  crit?: number; // crit chance bonus
  aim?: number; // extra tiles without range penalty (scopes)
  bane?: { tag: string; dmg: number; hit?: number }; // made for one kind of foe: damage ×dmg, +hit
  burn?: { dmg: number; turns: number }; // sets the target on fire
  stun?: { chance: number; ap: number }; // % to knock AP off the target's next turn
  splash?: number; // a hit also catches everyone this close to the target
}

/** Worn armor: a damage threshold (flat) and resistance (%), and what it costs. */
export interface ArmorDef {
  name: string;
  dt: number;
  dr: number;
  res?: Resist; // per damage type, on top of dr
  look?: string; // which armored hero sheet shows it (ARMOR_LOOKS key); default: the item id
  mods?: Mods; // what else it does to the wearer: heavy plates are loud and slow, powered frames hit harder
}

/** What a consumable does when used in a fight. */
export interface CombatUse {
  heal?: number;
  cure?: boolean;
  ap?: number; // extra AP right now
  dr?: number; // extra resistance for `turns` of the user's turns
  turns?: number;
}

export interface CreatureDef {
  name: string;
  sheet: string;
  hp: number;
  ap: number;
  seq: number;
  skill: number; // melee to-hit
  tags?: string[]; // beast, scorpion, dry, salt, machine, human: what bane weapons look for
  res?: Resist;
  guns?: number; // people with guns: shooting skill
  aim?: number; // tiles without range penalty (people: ⌊Вос/2⌋ + 3)
  weapons: string[];
  dr: number;
  dt?: number; // damage threshold of what they wear
  crit: number;
  perception: number;
  xp: number;
  loot?: Record<string, number>;
  fleeAt: number; // flee below this HP fraction
  spare?: boolean; // a story figure: a blow that would kill makes them leave the fight instead
  rooted?: boolean; // never leaves its tile (an eel under the sand): strikes whoever comes near
  burrow?: boolean; // dives into the salt every other turn (out of reach) and comes up beside the sturdiest foe
  heal?: number; // a healer: bandages a badly wounded friend next to it for this many HP (a companion medic)
  fleeText?: string; // log line when they run ({name})
}

export type Side = 'player' | 'hostile' | 'object';

/** The team a unit fights for: its side, unless set (arena: every player alone). */
export function teamOf(u: { side: Side; team?: string }): string {
  return u.team ?? u.side;
}

/** Can a attack b? Barrels are fair game for everyone; people and monsters only across teams. */
export function enemies(a: { side: Side; team?: string }, b: { side: Side; team?: string }): boolean {
  return b.side === 'object' || teamOf(a) !== teamOf(b);
}

export interface Combatant {
  id: string;
  name: string;
  side: Side;
  team?: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  ap: number;
  maxAp: number;
  seq: number;
  skills: { guns: number; melee: number };
  weapons: string[];
  weapon: string;
  dr: number; // %
  dt: number; // damage threshold: flat cut before DR
  buff: { dr: number; turns: number } | null; // a stim's extra resistance
  crit: number; // %
  hit: number; // to-hit bonus
  aim: number; // tiles without range penalty
  meleeDmg: number;
  attackAp: number; // added to weapon AP cost
  poison: number; // turns left
  poisonDmg: number; // per turn while poisoned
  poisonSave: number; // % chance to shrug off a poisoned hit
  burn: number; // turns left on fire
  burnDmg: number;
  stunned: number; // AP lost at the start of the next turn
  tags: string[];
  res: Resist;
  jinx: boolean;
  dead: boolean;
  fled: boolean;
  fleeing: boolean;
  fleeAt: number;
  spare?: boolean; // leaves the fight instead of dying
  rooted?: boolean; // never moves
  burrow?: boolean; // dives and surfaces (see CreatureDef)
  heal?: number; // bandages a wounded friend (see CreatureDef)
  under?: boolean; // under the salt now: no one can reach it
  up?: boolean; // came up this turn (or was driven up by a noise): stays up till its next turn is over
  holdBack?: boolean; // a companion told to hold back: fights only foes who came close to the party's people
  xp: number;
  loot: Record<string, number>;
  explode?: { radius: number; dmg: [number, number] };
}

export type Outcome = 'victory' | 'defeat' | 'escape';

export type CombatEvent =
  | { t: 'turn'; id: string }
  | { t: 'move'; id: string; path: Tile[] }
  | { t: 'attack'; id: string; target: string; weapon: string; chance: number; roll: number; hit: boolean; crit: boolean; fumble: boolean }
  | { t: 'damage'; id: string; amount: number; hp: number; crit: boolean }
  | { t: 'poisoned'; id: string }
  | { t: 'burning'; id: string }
  | { t: 'stunned'; id: string; ap: number }
  | { t: 'death'; id: string }
  | { t: 'explode'; id: string; x: number; y: number; radius: number }
  | { t: 'throw'; id: string; item: string; x: number; y: number; chance: number; roll: number; hit: boolean }
  | { t: 'use'; id: string; item: string }
  | { t: 'heal'; id: string; amount: number; hp: number }
  | { t: 'revive'; id: string; by: string; hp: number }
  | { t: 'flee'; id: string }
  | { t: 'burrow'; id: string } // dived under the salt
  | { t: 'surface'; id: string; x: number; y: number } // came up here
  | { t: 'log'; text: string }
  | { t: 'end'; outcome: Outcome };
