import type { Rng } from './rng';

export interface CheckResult {
  chance: number;
  roll: number;
  success: boolean;
}

/** Success chance for a skill value plus modifier, clamped like Fallout: never certain, never hopeless. */
export function checkChance(skill: number, mod = 0): number {
  return Math.max(5, Math.min(95, Math.round(skill + mod)));
}

/** d100 roll-under check. */
export function rollCheck(skill: number, mod: number, rng: Rng): CheckResult {
  const chance = checkChance(skill, mod);
  const roll = 1 + Math.floor(rng() * 100);
  return { chance, roll, success: roll <= chance };
}
