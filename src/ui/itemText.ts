// Plain-text stat lines for items: what a weapon, armor, charm or chem does. Shared by the inventory,
// barter, workbench and arena editor, so every window says the same thing about the same item.
import { ATTR_NAMES, SKILL_NAMES, type AttrId, type Mods, type SkillId } from '../core/character/defs';
import type { DmgType, Resist } from '../core/combat/types';
import type { Content } from '../core/types';

export const TYPE_WORD: Record<DmgType, string> = { normal: '', fire: 'огонь', poison: 'яд', shock: 'ток', wet: 'влага' };
const TAG_WORD: Record<string, string> = { beast: 'зверям', scorpion: 'скорпионам', dry: 'Сухостоям', salt: 'Солевикам', machine: 'машинам', human: 'людям' };

const signed = (n: number) => (n > 0 ? `+${n}` : `−${-n}`);

/** «защита: яд 50%, огонь −20%» (a minus is a weakness), or nothing. */
export function resText(r: Resist | undefined): string[] {
  const parts = Object.entries(r ?? {})
    .filter(([, v]) => v)
    .map(([t, v]) => `${TYPE_WORD[t as DmgType] || 'урон'} ${v! >= 100 ? 'не берёт' : `${v! < 0 ? '−' : ''}${Math.abs(v!)}%`}`);
  return parts.length ? [`защита: ${parts.join(', ')}`] : [];
}

/** Bonuses of a charm, a chem or armor extras: «Удача +1, Скрытность −10, крит +5%». */
export function modsText(m: Mods | undefined): string {
  if (!m) return '';
  const out: string[] = [];
  for (const [a, v] of Object.entries(m.attrs ?? {})) if (v) out.push(`${ATTR_NAMES[a as AttrId]} ${signed(v)}`);
  if (m.allAttrs) out.push(`все характеристики ${signed(m.allAttrs)}`);
  for (const [s, v] of Object.entries(m.skills ?? {})) if (v) out.push(`${SKILL_NAMES[s as SkillId]} ${signed(v)}`);
  if (m.allSkills) out.push(`все навыки ${signed(m.allSkills)}`);
  if (m.hp) out.push(`ОЗ ${signed(m.hp)}`);
  if (m.ap) out.push(`ОД ${signed(m.ap)}`);
  if (m.crit) out.push(`крит ${signed(m.crit)}%`);
  if (m.hit) out.push(`попадание ${signed(m.hit)}%`);
  if (m.range) out.push(`прицел ${signed(m.range)} кл.`);
  if (m.meleeDmg) out.push(`урон вблизи ${signed(m.meleeDmg)}`);
  if (m.dr) out.push(`сопротивление ${signed(m.dr)}%`);
  if (m.seq) out.push(`очерёдность ${signed(m.seq)}`);
  if (m.detect) out.push(`твари замечают ${m.detect < 0 ? 'ближе' : 'дальше'} на ${Math.abs(Math.round(m.detect * 100))}%`);
  if (m.poisonImmune) out.push('яд не берёт');
  if (m.sentry) out.push('засаду в пути видно всегда');
  out.push(...resText(m.res));
  return out.join(', ');
}

/** One line of numbers for an item (empty for plain things). */
export function itemStats(content: Content, id: string): string {
  const w = content.weapons[id];
  if (w?.item) {
    const type = w.type && w.type !== 'normal' ? ` (${TYPE_WORD[w.type]})` : '';
    const parts = [`Урон ${w.dmg[0]}–${w.dmg[1]}${type}`, `${w.ap} ОД`];
    if (w.thrown) parts.push(`бросок до ${w.range} кл., радиус ${w.thrown.radius}`);
    else parts.push(w.range > 1 ? `дальность ${w.range}` : 'вплотную');
    if (w.ammo) parts.push(`заряд: ${content.items[w.ammo]?.name.toLowerCase() ?? w.ammo}`);
    if (w.burst) parts.push(`очередь ${w.burst}`);
    if (w.pierce) parts.push(`пробой ${w.pierce}`);
    if (w.hit) parts.push(`попадание +${w.hit}%`);
    if (w.crit) parts.push(`крит +${w.crit}%`);
    if (w.aim) parts.push(`прицел +${w.aim}`);
    if (w.poison) parts.push(`яд ${w.poison.dmg}×${w.poison.turns}`);
    if (w.burn) parts.push(`горение ${w.burn.dmg}×${w.burn.turns}`);
    if (w.stun) parts.push(`оглушение ${w.stun.chance}%`);
    if (w.splash) parts.push('задевает соседей цели');
    if (w.bane) parts.push(`по ${TAG_WORD[w.bane.tag] ?? w.bane.tag} ×${w.bane.dmg}${w.bane.hit ? `, +${w.bane.hit}%` : ''}`);
    return parts.join(' · ');
  }
  const a = content.armor[id];
  if (a) return [`Порог ${a.dt}`, `сопротивление ${a.dr}%`, ...resText(a.res), modsText(a.mods)].filter(Boolean).join(' · ');
  const charm = content.charms[id];
  if (charm) return modsText(charm);
  const def = content.items[id];
  const use = def?.combat;
  const parts: string[] = [];
  if (use?.heal) parts.push(`+${use.heal} ОЗ`);
  if (use?.cure) parts.push('снимает яд');
  if (use?.ap) parts.push(`+${use.ap} ОД в бою`);
  if (use?.dr) parts.push(`сопротивление +${use.dr}% на ${use.turns ?? 3} хода`);
  if (def?.buff) parts.push(`${modsText(def.buff.mods)} на ${Math.round(def.buff.ms / 1000)} с`);
  if (def?.addict) parts.push(`привыкание ${def.addict.chance}% (ломка: ${modsText(def.addict.withdrawal)})`);
  if (def?.cureAddict) parts.push('снимает зависимость и ломку');
  return parts.join(' · ');
}
