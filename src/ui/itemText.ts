// Plain-text stat lines for items: what a weapon, armor, charm or chem does. Shared by the inventory,
// barter, workbench and arena editor, so every window says the same thing about the same item.
import { type AttrId, type Mods, type SkillId } from '../core/character/defs';
import type { DmgType, Resist } from '../core/combat/types';
import type { Content } from '../core/types';
import type { Locale } from '../i18n/content';
import { attrName, skillName } from '../i18n/character';
import { contentText } from '../i18n/display';

export const TYPE_WORD: Record<DmgType, string> = { normal: '', fire: 'огонь', poison: 'яд', shock: 'ток', wet: 'влага' };
const TAG_WORD: Record<string, string> = { beast: 'зверям', scorpion: 'скорпионам', dry: 'Сухостоям', salt: 'Солевикам', machine: 'машинам', human: 'людям' };
const EN_TYPE_WORD: Record<DmgType, string> = { normal: '', fire: 'fire', poison: 'poison', shock: 'shock', wet: 'water' };
const EN_TAG_WORD: Record<string, string> = { beast: 'beasts', scorpion: 'scorpions', dry: 'Drywood', salt: 'Saltfolk', machine: 'machines', human: 'humans' };
const word = (locale: Locale, ru: string, en: string) => locale === 'en' ? en : ru;

const signed = (n: number) => (n > 0 ? `+${n}` : `−${-n}`);

/** «защита: яд 50%, огонь −20%» (a minus is a weakness), or nothing. */
export function resText(r: Resist | undefined, locale: Locale = 'ru'): string[] {
  const parts = Object.entries(r ?? {})
    .filter(([, v]) => v)
    .map(([t, v]) => `${(locale === 'en' ? EN_TYPE_WORD : TYPE_WORD)[t as DmgType] || word(locale, 'урон', 'damage')} ${v! >= 100 ? word(locale, 'не берёт', 'immune') : `${v! < 0 ? '−' : ''}${Math.abs(v!)}%`}`);
  return parts.length ? [`${word(locale, 'защита', 'resistance')}: ${parts.join(', ')}`] : [];
}

/** Bonuses of a charm, a chem or armor extras: «Удача +1, Скрытность −10, крит +5%». */
export function modsText(m: Mods | undefined, locale: Locale = 'ru'): string {
  if (!m) return '';
  const out: string[] = [];
  for (const [a, v] of Object.entries(m.attrs ?? {})) if (v) out.push(`${attrName(a as AttrId, locale)} ${signed(v)}`);
  if (m.allAttrs) out.push(`${word(locale, 'все характеристики', 'all attributes')} ${signed(m.allAttrs)}`);
  for (const [s, v] of Object.entries(m.skills ?? {})) if (v) out.push(`${skillName(s as SkillId, locale)} ${signed(v)}`);
  if (m.allSkills) out.push(`${word(locale, 'все навыки', 'all skills')} ${signed(m.allSkills)}`);
  if (m.hp) out.push(`${word(locale, 'ОЗ', 'HP')} ${signed(m.hp)}`);
  if (m.ap) out.push(`${word(locale, 'ОД', 'AP')} ${signed(m.ap)}`);
  if (m.crit) out.push(`${word(locale, 'крит', 'critical chance')} ${signed(m.crit)}%`);
  if (m.hit) out.push(`${word(locale, 'попадание', 'accuracy')} ${signed(m.hit)}%`);
  if (m.range) out.push(`${word(locale, 'прицел', 'range')} ${signed(m.range)} ${word(locale, 'кл.', 'tiles')}`);
  if (m.meleeDmg) out.push(`${word(locale, 'урон вблизи', 'melee damage')} ${signed(m.meleeDmg)}`);
  if (m.dr) out.push(`${word(locale, 'сопротивление', 'damage resistance')} ${signed(m.dr)}%`);
  if (m.seq) out.push(`${word(locale, 'очерёдность', 'initiative')} ${signed(m.seq)}`);
  if (m.detect) out.push(locale === 'en' ? `creatures detect you ${Math.abs(Math.round(m.detect * 100))}% ${m.detect < 0 ? 'closer' : 'farther'} away` : `твари замечают ${m.detect < 0 ? 'ближе' : 'дальше'} на ${Math.abs(Math.round(m.detect * 100))}%`);
  if (m.poisonImmune) out.push(word(locale, 'яд не берёт', 'immune to poison'));
  if (m.sentry) out.push(word(locale, 'засаду в пути видно всегда', 'always spot road ambushes'));
  out.push(...resText(m.res, locale));
  return out.join(', ');
}

/** One line of numbers for an item (empty for plain things). */
export function itemStats(content: Content, id: string, locale: Locale = 'ru'): string {
  const w = content.weapons[id];
  if (w?.item) {
    const type = w.type && w.type !== 'normal' ? ` (${(locale === 'en' ? EN_TYPE_WORD : TYPE_WORD)[w.type]})` : '';
    const parts = [`${word(locale, 'Урон', 'Damage')} ${w.dmg[0]}–${w.dmg[1]}${type}`, `${w.ap} ${word(locale, 'ОД', 'AP')}`];
    if (w.thrown) parts.push(locale === 'en' ? `throw range ${w.range} tiles, radius ${w.thrown.radius}` : `бросок до ${w.range} кл., радиус ${w.thrown.radius}`);
    else parts.push(w.range > 1 ? `${word(locale, 'дальность', 'range')} ${w.range}` : word(locale, 'вплотную', 'adjacent'));
    if (w.ammo) {
      const ammo = content.items[w.ammo];
      parts.push(`${word(locale, 'заряд', 'ammo')}: ${ammo ? contentText(`/items/${w.ammo}/name`, ammo.name, locale).toLowerCase() : w.ammo}`);
    }
    if (w.burst) parts.push(`${word(locale, 'очередь', 'burst')} ${w.burst}`);
    if (w.pierce) parts.push(`${word(locale, 'пробой', 'penetration')} ${w.pierce}`);
    if (w.hit) parts.push(`${word(locale, 'попадание', 'accuracy')} +${w.hit}%`);
    if (w.crit) parts.push(`${word(locale, 'крит', 'critical chance')} +${w.crit}%`);
    if (w.aim) parts.push(`${word(locale, 'прицел', 'aim')} +${w.aim}`);
    if (w.poison) parts.push(`${word(locale, 'яд', 'poison')} ${w.poison.dmg}×${w.poison.turns}`);
    if (w.burn) parts.push(`${word(locale, 'горение', 'burn')} ${w.burn.dmg}×${w.burn.turns}`);
    if (w.stun) parts.push(`${word(locale, 'оглушение', 'stun')} ${w.stun.chance}%`);
    if (w.splash) parts.push(word(locale, 'задевает соседей цели', 'hits adjacent units'));
    if (w.bane) parts.push(`${word(locale, 'по', 'vs.')} ${(locale === 'en' ? EN_TAG_WORD : TAG_WORD)[w.bane.tag] ?? w.bane.tag} ×${w.bane.dmg}${w.bane.hit ? `, +${w.bane.hit}%` : ''}`);
    return parts.join(' · ');
  }
  const a = content.armor[id];
  if (a) return [`${word(locale, 'Порог', 'Damage threshold')} ${a.dt}`, `${word(locale, 'сопротивление', 'damage resistance')} ${a.dr}%`, ...resText(a.res, locale), modsText(a.mods, locale)].filter(Boolean).join(' · ');
  const charm = content.charms[id];
  if (charm) return modsText(charm, locale);
  const def = content.items[id];
  const use = def?.combat;
  const parts: string[] = [];
  if (use?.heal) parts.push(`+${use.heal} ${word(locale, 'ОЗ', 'HP')}`);
  if (use?.cure) parts.push(word(locale, 'снимает яд', 'cures poison'));
  if (use?.ap) parts.push(`+${use.ap} ${word(locale, 'ОД в бою', 'AP in combat')}`);
  if (use?.dr) parts.push(locale === 'en' ? `damage resistance +${use.dr}% for ${use.turns ?? 3} turns` : `сопротивление +${use.dr}% на ${use.turns ?? 3} хода`);
  if (def?.buff) parts.push(`${modsText(def.buff.mods, locale)} ${word(locale, 'на', 'for')} ${Math.round(def.buff.ms / 1000)} ${word(locale, 'с', 's')}`);
  if (def?.addict) parts.push(`${word(locale, 'привыкание', 'addiction')} ${def.addict.chance}% (${word(locale, 'ломка', 'withdrawal')}: ${modsText(def.addict.withdrawal, locale)})`);
  if (def?.cureAddict) parts.push(word(locale, 'снимает зависимость и ломку', 'cures addiction and withdrawal'));
  return parts.join(' · ');
}
