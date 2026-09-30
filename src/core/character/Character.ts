// Derived character values. Pure functions over CharacterData + content, no state.
import {
  ATTRS,
  ATTR_MAX,
  ATTR_MIN,
  MAX_LEVEL,
  SKILLS,
  SKILL_BASE,
  SKILL_MAX,
  TAG_BONUS,
  XP_TABLE,
  type AttrId,
  type Attrs,
  type CharacterContent,
  type CharacterData,
  type Mods,
  type SkillId,
} from './defs';

export type NumKey = 'allAttrs' | 'allSkills' | 'hp' | 'ap' | 'dr' | 'crit' | 'hit' | 'range' | 'meleeDmg' | 'attackAp' | 'detect' | 'caps' | 'seq';

/**
 * Every trait and perk the character has, as a list of modifier sets, plus `extra`:
 * what they wear and have taken (gear and chems), passed in by the Game.
 */
export function allMods(c: CharacterData, content: CharacterContent, extra: Mods[] = []): Mods[] {
  return [...c.traits.map((t) => content.traits[t]?.mods), ...c.perks.map((p) => content.perks[p]?.mods), ...extra].filter((m): m is Mods => !!m);
}

export function sumMod(c: CharacterData, content: CharacterContent, key: NumKey, extra: Mods[] = []): number {
  return allMods(c, content, extra).reduce((s, m) => s + (m[key] ?? 0), 0);
}

export function hasFlagMod(c: CharacterData, content: CharacterContent, key: 'poisonImmune' | 'jinx' | 'sentry', extra: Mods[] = []): boolean {
  return allMods(c, content, extra).some((m) => m[key]);
}

const clampAttr = (v: number) => Math.max(ATTR_MIN, Math.min(ATTR_MAX, v));

/** Attributes after trait and perk modifiers. */
export function effectiveAttrs(c: CharacterData, content: CharacterContent, extra: Mods[] = []): Attrs {
  const mods = allMods(c, content, extra);
  const out = {} as Attrs;
  for (const a of ATTRS) out[a] = clampAttr(c.attrs[a] + mods.reduce((s, m) => s + (m.allAttrs ?? 0) + (m.attrs?.[a] ?? 0), 0));
  return out;
}

export function attr(c: CharacterData, content: CharacterContent, a: AttrId, extra: Mods[] = []): number {
  return effectiveAttrs(c, content, extra)[a];
}

/** Skill value: base formula + tag bonus + mods + invested points (tagged skills grow twice as fast). */
export function skill(c: CharacterData, content: CharacterContent, id: SkillId, extra: Mods[] = [], attrs = effectiveAttrs(c, content, extra)): number {
  const mods = allMods(c, content, extra);
  const tagged = c.tags.includes(id);
  const bonus = mods.reduce((s, m) => s + (m.allSkills ?? 0) + (m.skills?.[id] ?? 0), 0);
  const invested = (c.spent[id] ?? 0) * (tagged ? 2 : 1);
  return Math.max(0, Math.min(SKILL_MAX, SKILL_BASE[id](attrs) + (tagged ? TAG_BONUS : 0) + bonus + invested));
}

export function skills(c: CharacterData, content: CharacterContent, extra: Mods[] = []): Record<SkillId, number> {
  const a = effectiveAttrs(c, content, extra);
  return Object.fromEntries(SKILLS.map((s) => [s, skill(c, content, s, extra, a)])) as Record<SkillId, number>;
}

export function hpPerLevel(a: Attrs): number {
  return 3 + Math.floor(a.end / 2);
}

export function maxHp(c: CharacterData, content: CharacterContent, extra: Mods[] = []): number {
  const a = effectiveAttrs(c, content, extra);
  return 15 + a.str + 2 * a.end + (c.level - 1) * hpPerLevel(a) + sumMod(c, content, 'hp', extra);
}

export function maxAp(c: CharacterData, content: CharacterContent, extra: Mods[] = []): number {
  return 5 + Math.floor(attr(c, content, 'agi', extra) / 2) + sumMod(c, content, 'ap', extra);
}

export function sequence(c: CharacterData, content: CharacterContent, extra: Mods[] = []): number {
  return 2 * attr(c, content, 'per', extra) + sumMod(c, content, 'seq', extra);
}

export function critChance(c: CharacterData, content: CharacterContent, extra: Mods[] = []): number {
  return Math.max(0, attr(c, content, 'luk', extra) + sumMod(c, content, 'crit', extra));
}

export function skillPointsPerLevel(c: CharacterData, content: CharacterContent): number {
  return 5 + 2 * attr(c, content, 'int');
}

export function levelForXp(xp: number): number {
  let lvl = 1;
  while (lvl < MAX_LEVEL && xp >= XP_TABLE[lvl + 1]) lvl++;
  return lvl;
}

/** XP needed for the next level, or null at the cap. */
export function nextLevelXp(level: number): number | null {
  return level < MAX_LEVEL ? XP_TABLE[level + 1] : null;
}

export function perkRequirementsMet(c: CharacterData, content: CharacterContent, perkId: string): boolean {
  const p = content.perks[perkId];
  if (!p || c.perks.includes(perkId)) return false;
  const a = effectiveAttrs(c, content);
  for (const [k, v] of Object.entries(p.req.attrs ?? {})) if (a[k as AttrId] < v) return false;
  for (const [k, v] of Object.entries(p.req.skills ?? {})) if (skill(c, content, k as SkillId, [], a) < v) return false;
  return c.level >= (p.req.level ?? 1);
}

/** Human-readable requirement line for a perk, e.g. "Ловкость 6, Выживание 50%". */
export function perkRequirementText(content: CharacterContent, perkId: string, names: { attrs: Record<string, string>; skills: Record<string, string> }): string {
  const r = content.perks[perkId]?.req ?? {};
  const parts = [
    ...Object.entries(r.attrs ?? {}).map(([k, v]) => `${names.attrs[k]} ${v}`),
    ...Object.entries(r.skills ?? {}).map(([k, v]) => `${names.skills[k]} ${v}%`),
    ...(r.level ? [`уровень ${r.level}`] : []),
  ];
  return parts.length ? parts.join(', ') : 'нет';
}
