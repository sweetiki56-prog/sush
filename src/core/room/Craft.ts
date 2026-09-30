// Workbench and campfire work: recipes from content, checked against the bag and the skills.
// Any one of a recipe's skills at its level is enough (boiling an antidote takes Выживание or Медицина).
import { SKILL_NAMES, type SkillId } from '../character/defs';
import { CHECK_XP, type Game } from '../Game';
import type { RecipeDef } from '../types';

export interface CraftCheck {
  ok: boolean;
  missing: string[]; // item names short of what the recipe needs, with how many
  skill: { id: SkillId; need: number; have: number } | null; // the hero's best fitting skill
}

/** Of the recipe's skills, the one this hero is best at relative to what it needs. */
export function recipeSkill(g: Game, r: RecipeDef): CraftCheck['skill'] {
  let best: CraftCheck['skill'] = null;
  for (const [id, need] of Object.entries(r.skill ?? {}) as [SkillId, number][]) {
    const have = g.skill(id);
    if (!best || have - need > best.have - best.need) best = { id, need, have };
  }
  return best;
}

export function craftCheck(g: Game, r: RecipeDef): CraftCheck {
  const missing = Object.entries(r.inputs)
    .filter(([id, n]) => g.count(id) < n)
    .map(([id, n]) => `${g.content.items[id]?.name ?? id} ${g.count(id)}/${n}`);
  const skill = recipeSkill(g, r);
  return { ok: !missing.length && (!skill || skill.have >= skill.need), missing, skill };
}

/** Make it: inputs go, outputs come, a little experience for the work. False (with a log line) when it cannot be done. */
export function craft(g: Game, id: string): boolean {
  const r = g.content.recipes[id];
  if (!r) return false;
  const c = craftCheck(g, r);
  if (!c.ok) {
    if (c.missing.length) g.log(`Не хватает: ${c.missing.join(', ')}.`);
    else if (c.skill) g.log(`Нужно: ${SKILL_NAMES[c.skill.id]} ${c.skill.need}% (у вас ${c.skill.have}%).`);
    return false;
  }
  for (const [item, n] of Object.entries(r.inputs)) g.take(item, n);
  for (const [item, n] of Object.entries(r.output)) g.give(item, n);
  g.addXp(CHECK_XP);
  return true;
}
