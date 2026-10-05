// Presentation names for character rules. Keep IDs and formulas in core/character.
import { ATTR_NAMES, ATTR_WORDS, SKILL_NAMES, type AttrId, type SkillId } from '../core/character/defs';
import type { Locale } from './content';

const englishAttrs: Record<AttrId, string> = {
  str: 'Strength', per: 'Perception', end: 'Endurance', cha: 'Charisma',
  int: 'Intelligence', agi: 'Agility', luk: 'Luck',
};
const englishSkills: Record<SkillId, string> = {
  guns: 'Guns', melee: 'Melee', medic: 'Medicine', sneak: 'Sneak',
  lockpick: 'Lockpicking', speech: 'Speech', barter: 'Barter',
  repair: 'Repair', science: 'Science', survival: 'Survival',
};
const englishWords = ['', 'Abysmal', 'Poor', 'Weak', 'Fair', 'Average', 'Good', 'Very good', 'Excellent', 'Exceptional', 'Heroic'];

export const attrName = (id: AttrId, locale: Locale): string => locale === 'en' ? englishAttrs[id] : ATTR_NAMES[id];
export const skillName = (id: SkillId, locale: Locale): string => locale === 'en' ? englishSkills[id] : SKILL_NAMES[id];
export const attrWord = (value: number, locale: Locale): string => (locale === 'en' ? englishWords : ATTR_WORDS)[value] ?? '';
export const attrNames = (locale: Locale): Record<AttrId, string> => locale === 'en' ? englishAttrs : ATTR_NAMES;
export const skillNames = (locale: Locale): Record<SkillId, string> => locale === 'en' ? englishSkills : SKILL_NAMES;
