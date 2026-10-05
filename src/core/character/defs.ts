// Character system constants: attributes, skills and their base formulas, XP table.
// Descriptions, traits, perks and premade builds are data in src/content/character.json.

export type AttrId = 'str' | 'per' | 'end' | 'cha' | 'int' | 'agi' | 'luk';
export const ATTRS: AttrId[] = ['str', 'per', 'end', 'cha', 'int', 'agi', 'luk'];
export const ATTR_NAMES: Record<AttrId, string> = {
  str: 'Сила',
  per: 'Восприятие',
  end: 'Выносливость',
  cha: 'Обаяние',
  int: 'Интеллект',
  agi: 'Ловкость',
  luk: 'Удача',
};
export const ATTR_WORDS = ['', 'Жалко', 'Плохо', 'Слабо', 'Сносно', 'Средне', 'Хорошо', 'Оч. хор.', 'Отлично', 'Превосх.', 'Героич.'];

export type SkillId = 'guns' | 'melee' | 'medic' | 'sneak' | 'lockpick' | 'speech' | 'barter' | 'repair' | 'science' | 'survival';
export const SKILLS: SkillId[] = ['guns', 'melee', 'medic', 'sneak', 'lockpick', 'speech', 'barter', 'repair', 'science', 'survival'];
export const SKILL_NAMES: Record<SkillId, string> = {
  guns: 'Стрельба',
  melee: 'Ближний бой',
  medic: 'Медицина',
  sneak: 'Скрытность',
  lockpick: 'Взлом',
  speech: 'Красноречие',
  barter: 'Торговля',
  repair: 'Ремонт',
  science: 'Наука',
  survival: 'Выживание',
};

export type Attrs = Record<AttrId, number>;

export const SKILL_BASE: Record<SkillId, (a: Attrs) => number> = {
  guns: (a) => 5 + 4 * a.agi,
  melee: (a) => 20 + 2 * (a.str + a.agi),
  medic: (a) => 2 * (a.per + a.int),
  sneak: (a) => 5 + 3 * a.agi,
  lockpick: (a) => 10 + a.per + a.agi,
  speech: (a) => 5 * a.cha,
  barter: (a) => 4 * a.cha,
  repair: (a) => 3 * a.int,
  science: (a) => 4 * a.int,
  survival: (a) => 2 * (a.end + a.int),
};

export const ATTR_MIN = 1;
export const ATTR_MAX = 10;
export const ATTR_START = 5;
export const FREE_POINTS = 5;
export const TAG_COUNT = 3;
export const TAG_BONUS = 20;
export const MAX_TRAITS = 2;
export const SKILL_MAX = 200;
export const LOOKS = 4;
export const NAME_MAX = 16;

/** Total XP needed to reach each level (index = level). */
export const XP_TABLE = [0, 0, 400, 1000, 1800, 2800, 4000, 5400, 7000, 8800, 10800];
export const MAX_LEVEL = XP_TABLE.length - 1;

/** Modifiers a trait or perk applies. All optional; numbers add up across sources. */
export interface Mods {
  attrs?: Partial<Attrs>;
  allAttrs?: number;
  skills?: Partial<Record<SkillId, number>>;
  allSkills?: number;
  hp?: number;
  ap?: number;
  dr?: number; // damage resistance, %
  crit?: number; // crit chance, %
  hit?: number; // to-hit bonus, %
  range?: number; // tiles
  meleeDmg?: number;
  attackAp?: number;
  detect?: number; // enemy detection radius multiplier delta (-0.5 = half)
  seq?: number; // turn order
  res?: Partial<Record<'normal' | 'fire' | 'poison' | 'shock' | 'wet', number>>; // % by damage type (gear, chems)
  poisonImmune?: boolean;
  jinx?: boolean;
  sentry?: boolean; // an ambush on the road is always seen coming (a dog at heel)
  caps?: number; // start bonus (traits)
  items?: Record<string, number>; // start bonus (traits)
}

export interface TraitDef {
  name: string;
  desc: string;
  mods: Mods;
}

export interface PerkDef {
  name: string;
  desc: string;
  req: { attrs?: Partial<Attrs>; skills?: Partial<Record<SkillId, number>>; level?: number };
  mods: Mods;
}

export interface PremadeDef {
  title: string;
  name: string;
  look: number;
  bio: string;
  attrs: Attrs;
  tags: SkillId[];
  traits: string[];
}

export interface CharacterContent {
  attrs: Record<AttrId, string>; // descriptions
  skills: Record<SkillId, string>;
  traits: Record<string, TraitDef>;
  perks: Record<string, PerkDef>;
  premades: PremadeDef[];
}

/** Persistent character sheet (part of the save). Derived values are computed, never stored. */
export interface CharacterData {
  name: string;
  look: number;
  attrs: Attrs; // base values chosen at creation, before trait/perk mods
  tags: SkillId[];
  traits: string[];
  perks: string[];
  level: number;
  xp: number;
  skillPoints: number; // unspent
  perkPoints: number; // unspent
  spent: Partial<Record<SkillId, number>>; // skill points invested per skill
}
