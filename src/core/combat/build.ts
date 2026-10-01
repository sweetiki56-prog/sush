// Turn the player, creatures and explosive props into combatants.
import type { Game } from '../Game';
import { hasFlagMod } from '../character/Character';
import type { Mods } from '../character/defs';
import type { Combatant, CreatureDef, DmgType } from './types';

const base = { poison: 0, poisonDmg: 2, burn: 0, burnDmg: 0, stunned: 0, dead: false, fled: false, fleeing: false, loot: {}, xp: 0, jinx: false, fleeAt: 0, dt: 0, buff: null };
/** People and beasts shrug off some poison; immunity comes from resistance. */
const HIDE_POISON_SAVE = 20;

export function playerUnit(g: Game, x: number, y: number, id = 'player'): Combatant {
  const c = g.char;
  const K = g.content.character;
  const weapons = [...g.hands(), 'fists'];
  const armor = g.armor;
  const extra = g.gearMods();
  return {
    ...base,
    id,
    name: c.name,
    side: 'player',
    x,
    y,
    hp: g.state.hp,
    maxHp: g.maxHp,
    ap: g.maxAp,
    maxAp: g.maxAp,
    seq: g.sequence,
    dt: armor?.dt ?? 0,
    skills: { guns: g.skill('guns'), melee: g.skill('melee') },
    weapons,
    weapon: weapons[0],
    dr: g.mod('dr') + (armor?.dr ?? 0),
    crit: g.crit,
    hit: g.mod('hit'),
    aim: Math.floor(g.attr('per') / 2) + 3 + g.mod('range'),
    meleeDmg: g.mod('meleeDmg') + Math.max(0, Math.floor((g.attr('str') - 5) / 2)),
    attackAp: g.mod('attackAp'),
    poisonSave: hasFlagMod(c, K, 'poisonImmune', extra) ? 100 : g.attr('end') * 10,
    jinx: hasFlagMod(c, K, 'jinx', extra),
    tags: ['human'],
    res: g.res,
  };
}

export function creatureUnit(def: CreatureDef, id: string, x: number, y: number): Combatant {
  return {
    ...base,
    id,
    name: def.name,
    side: 'hostile',
    x,
    y,
    hp: def.hp,
    maxHp: def.hp,
    ap: def.ap,
    maxAp: def.ap,
    seq: def.seq,
    skills: { guns: def.guns ?? 0, melee: def.skill },
    weapons: [...def.weapons],
    weapon: def.weapons[0],
    dr: def.dr,
    dt: def.dt ?? 0,
    crit: def.crit,
    hit: 0,
    aim: def.aim ?? 1,
    meleeDmg: 0,
    attackAp: 0,
    poisonSave: (def.res?.poison ?? 0) >= 100 ? 100 : HIDE_POISON_SAVE,
    xp: def.xp,
    loot: { ...(def.loot ?? {}) },
    fleeAt: def.fleeAt,
    spare: def.spare,
    rooted: def.rooted,
    burrow: def.burrow,
    heal: def.heal,
    tags: [...(def.tags ?? [])],
    res: { ...(def.res ?? {}) },
  };
}

/** An explosive barrel: a target with 1 HP that blows up when hit. */
export function barrelUnit(id: string, x: number, y: number): Combatant {
  return {
    ...base,
    id,
    name: 'Бочка с горючим',
    side: 'object',
    x,
    y,
    hp: 1,
    maxHp: 1,
    ap: 0,
    maxAp: 0,
    seq: -1,
    skills: { guns: 0, melee: 0 },
    weapons: [],
    weapon: '',
    dr: 0,
    crit: 0,
    hit: 0,
    aim: 0,
    meleeDmg: 0,
    attackAp: 0,
    poisonSave: 100,
    explode: { radius: 2.5, dmg: [15, 25] },
    tags: [],
    res: { poison: 100 },
  };
}

/** A chem taken in the middle of a fight works on the unit at once (the sheet catches up after the fight). */
export function boost(u: Combatant, m: Mods): void {
  u.hit += m.hit ?? 0;
  u.crit += m.crit ?? 0;
  u.meleeDmg += m.meleeDmg ?? 0;
  u.dr += m.dr ?? 0;
  if (m.ap) {
    u.ap = Math.max(0, u.ap + m.ap);
    u.maxAp = Math.max(1, u.maxAp + m.ap);
  }
  for (const [t, v] of Object.entries(m.res ?? {})) u.res[t as DmgType] = (u.res[t as DmgType] ?? 0) + (v ?? 0);
  const all = m.allSkills ?? 0;
  u.skills.guns += (m.skills?.guns ?? 0) + all;
  u.skills.melee += (m.skills?.melee ?? 0) + all;
  if (m.attrs?.per) u.aim += Math.floor(m.attrs.per / 2);
  if (m.attrs?.str) u.meleeDmg += Math.floor(m.attrs.str / 2);
}
