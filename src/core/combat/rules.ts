// Combat math: to-hit, damage, AP costs. Same 5..95 clamp as skill checks.
import { checkChance } from '../SkillCheck';
import type { Rng } from '../rng';
import type { Combatant, DmgType, WeaponDef } from './types';

export const RANGE_PENALTY = 4; // % per tile beyond aim range
export const FUMBLE_ROLL = 98; // miss with roll >= this is a critical failure
export const JINX_FUMBLE_ROLL = 88;
export const BURST_STEP = 10; // % worse for every extra round in a burst

export function attackCost(u: Combatant, w: WeaponDef): number {
  return Math.max(2, w.ap + u.attackAp);
}

/** Resistance of a unit to a damage type: gear and hide; fresh water only hurts the salt-born. */
export function resist(u: Pick<Combatant, 'res'>, type: DmgType = 'normal'): number {
  return u.res?.[type] ?? (type === 'wet' ? 100 : 0);
}

/** A weapon made for this kind of foe. */
export function baneOf(w: WeaponDef, target: Pick<Combatant, 'tags'>): WeaponDef['bane'] | null {
  return w.bane && target.tags?.includes(w.bane.tag) ? w.bane : null;
}

export function hitChance(att: Combatant, target: Combatant, w: WeaponDef, dist: number): number {
  if (dist > w.range) return 0;
  const penalty = w.skill === 'guns' ? RANGE_PENALTY * Math.max(0, dist - att.aim - (w.aim ?? 0)) : 0;
  const easy = target.side === 'object' ? 10 : 0;
  return checkChance(att.skills[w.skill] + att.hit + (w.hit ?? 0) + (baneOf(w, target)?.hit ?? 0) + easy - penalty);
}

/** A share of damage after the type resistance: 0 when immune, else at least 1. */
export function typeCut(dmg: number, u: Pick<Combatant, 'res'>, type: DmgType = 'normal'): number {
  const r = resist(u, type);
  return r >= 100 ? 0 : Math.max(1, Math.round(dmg * (1 - r / 100)));
}

/** Armor first takes a flat bite (threshold, minus the weapon's pierce), then a share (resistance). */
export function armorCut(dmg: number, target: Pick<Combatant, 'dt' | 'dr'>, pierce = 0): number {
  const dt = Math.max(0, (target.dt ?? 0) - pierce);
  return Math.max(1, Math.round((dmg - dt) * (1 - target.dr / 100)));
}

export function rollDamage(att: Combatant, target: Combatant, w: WeaponDef, crit: boolean, rng: Rng): number {
  const [lo, hi] = w.dmg;
  let dmg = lo + Math.floor(rng() * (hi - lo + 1));
  if (w.skill === 'melee') dmg += att.meleeDmg;
  if (crit) dmg *= 2;
  dmg = Math.round(dmg * (baneOf(w, target)?.dmg ?? 1));
  return typeCut(armorCut(dmg, target, w.pierce), target, w.type);
}

export interface AttackRoll {
  chance: number;
  roll: number;
  hit: boolean;
  crit: boolean;
  fumble: boolean;
}

export function rollAttack(chance: number, critChance: number, jinxed: boolean, rng: Rng): AttackRoll {
  const roll = 1 + Math.floor(rng() * 100);
  const hit = roll <= chance;
  const crit = hit && roll <= critChance;
  const fumble = !hit && roll >= (jinxed ? JINX_FUMBLE_ROLL : FUMBLE_ROLL);
  return { chance, roll, hit, crit, fumble };
}
