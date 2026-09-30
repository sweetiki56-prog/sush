import { describe, it, expect } from 'vitest';
import { Game } from '../../src/core/Game';
import { BuildDraft } from '../../src/core/character/BuildDraft';
import * as Ch from '../../src/core/character/Character';
import { SKILLS, type CharacterData } from '../../src/core/character/defs';
import { newState, plainCharacter } from '../../src/core/state';
import { saveGame, loadGame, type KV } from '../../src/core/SaveSystem';
import { fixedRng } from '../../src/core/rng';
import { CONTENT } from '../../src/content';

const C = CONTENT.character;
const premade = (title: string): CharacterData => {
  const d = new BuildDraft(C);
  d.applyPremade(C.premades.find((p) => p.title === title)!);
  return d.build();
};
const gameWith = (c: CharacterData, rng = fixedRng([0])) => new Game(CONTENT, rng, newState(c, CONTENT));

describe('character formulas', () => {
  it('plain 5s: skills from base formulas, tags +20', () => {
    const c = plainCharacter(['guns', 'sneak', 'science']);
    const s = Ch.skills(c, C);
    expect(s).toEqual({ guns: 45, melee: 40, medic: 20, sneak: 40, lockpick: 20, speech: 25, barter: 20, repair: 15, science: 40, survival: 20 });
    expect(Ch.maxHp(c, C)).toBe(30);
    expect(Ch.maxAp(c, C)).toBe(7);
    expect(Ch.sequence(c, C)).toBe(10);
    expect(Ch.critChance(c, C)).toBe(5);
    expect(Ch.skillPointsPerLevel(c, C)).toBe(15);
  });

  it('tagged skills grow two points per invested point', () => {
    const c = plainCharacter(['guns', 'sneak', 'science']);
    c.spent = { guns: 5, melee: 5 };
    expect(Ch.skill(c, C, 'guns')).toBe(55);
    expect(Ch.skill(c, C, 'melee')).toBe(45);
  });

  it('traits apply attribute and skill modifiers, clamped to 1..10', () => {
    const c = plainCharacter();
    c.traits = ['gifted', 'bookworm'];
    const a = Ch.effectiveAttrs(c, C);
    expect(a.str).toBe(5); // +1 gifted, -1 bookworm
    expect(a.int).toBe(6);
    expect(Ch.skill(c, C, 'science')).toBe(4 * 6 - 10 + 10);
    c.attrs.luk = 10;
    expect(Ch.effectiveAttrs(c, C).luk).toBe(10);
  });

  it('premades are valid builds with sensible specialties', () => {
    for (const p of C.premades) {
      const c = premade(p.title);
      const s = Ch.skills(c, C);
      const best = [...SKILLS].sort((a, b) => s[b] - s[a]).slice(0, 3);
      for (const t of p.tags) expect(best.includes(t) || s[t] >= 40, `${p.title}: ${t}=${s[t]}`).toBe(true);
    }
    expect(Ch.skill(premade('Говорун'), C, 'speech')).toBe(80);
    expect(Ch.skill(premade('Стрелок'), C, 'guns')).toBe(61);
    expect(Ch.skill(premade('Механик'), C, 'repair')).toBe(57);
  });
});

describe('BuildDraft', () => {
  it('enforces the point budget and attribute bounds', () => {
    const d = new BuildDraft(C);
    expect(d.pointsLeft).toBe(5);
    for (let i = 0; i < 5; i++) expect(d.inc('agi')).toBe(true);
    expect(d.attrs.agi).toBe(10);
    expect(d.inc('str')).toBe(false); // no points left
    expect(d.dec('per')).toBe(true);
    expect(d.inc('agi')).toBe(false); // max 10
    for (let i = 0; i < 3; i++) d.dec('cha');
    expect(d.dec('cha')).toBe(true);
    expect(d.dec('cha')).toBe(false); // min 1
  });

  it('allows exactly three tags and two traits', () => {
    const d = new BuildDraft(C);
    expect(['guns', 'sneak', 'repair'].every((s) => d.toggleTag(s as never))).toBe(true);
    expect(d.toggleTag('speech')).toBe(false);
    expect(d.toggleTag('guns')).toBe(true); // untag
    expect(d.tags).toEqual(['sneak', 'repair']);
    expect(d.toggleTrait('gifted')).toBe(true);
    expect(d.toggleTrait('kind')).toBe(true);
    expect(d.toggleTrait('jinxed')).toBe(false);
    expect(d.toggleTrait('nope')).toBe(false);
  });

  it('explains what is missing before it builds', () => {
    const d = new BuildDraft(C);
    expect(d.problem()).toMatch(/очки/);
    for (let i = 0; i < 5; i++) d.inc('int');
    expect(d.problem()).toMatch(/основные навыки/);
    ['guns', 'sneak', 'repair'].forEach((s) => d.toggleTag(s as never));
    expect(d.problem()).toMatch(/имя/);
    d.setName('Очень-очень-длинное-имя');
    expect(d.name).toHaveLength(16);
    expect(d.problem()).toBeNull();
    expect(d.build().level).toBe(1);
  });
});

describe('progression', () => {
  it('new state applies trait start bonuses and full HP', () => {
    const s = newState(premade('Стрелок'), CONTENT);
    expect(s.caps).toBe(42);
    expect(s.items.bandage).toBe(3);
    expect(s.hp).toBe(Ch.maxHp(s.character, C));
  });

  it('levels up at 100 XP: skill points, a perk point, more HP', () => {
    const g = gameWith(plainCharacter());
    const levels: number[] = [];
    g.events.on('level', (l) => levels.push(l));
    g.addXp(99);
    expect(g.char.level).toBe(1);
    g.addXp(160); // 259 total: straight to 3
    expect(levels).toEqual([2, 3]);
    expect(g.char.skillPoints).toBe(30);
    expect(g.char.perkPoints).toBe(2);
    expect(g.maxHp).toBe(30 + 2 * 5);
    expect(g.state.hp).toBe(40);
  });

  it('spends skill points only within budget', () => {
    const g = gameWith(plainCharacter());
    g.addXp(100);
    expect(g.spendSkillPoints({ guns: 20 })).toBe(false);
    expect(g.spendSkillPoints({ lockpick: 10, guns: 5 })).toBe(true);
    expect(g.skill('lockpick')).toBe(40 + 20);
    expect(g.skill('guns')).toBe(25 + 5);
    expect(g.char.skillPoints).toBe(0);
  });

  it('takes perks only when requirements are met', () => {
    const g = gameWith(plainCharacter());
    expect(g.takePerk('tough')).toBe(false); // no perk point yet
    g.addXp(250);
    expect(g.takePerk('quickhands')).toBe(false); // agility 5 < 6
    expect(g.takePerk('tough')).toBe(true);
    expect(g.takePerk('tough')).toBe(false); // already taken
    expect(g.maxHp).toBe(40 + 10);
    expect(g.state.hp).toBe(50);
    expect(g.takePerk('nimble')).toBe(true);
    expect(g.skill('lockpick')).toBe(60);
  });

  it('quest stages and successful checks give XP', () => {
    const g = gameWith(plainCharacter());
    g.setStage('water', 'find_station');
    expect(g.char.xp).toBe(25);
    g.check({ skill: 'speech' });
    expect(g.char.xp).toBe(35);
  });

  it('save v2 round-trips the character', () => {
    const m = new Map<string, string>();
    const kv: KV = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
    const g = gameWith(premade('Механик'));
    g.addXp(120);
    saveGame(g.state, kv);
    const back = loadGame(kv)!;
    expect(back.character).toEqual(g.char);
    expect(loadGame(kv, 'auto')).toBeNull();
    m.set('rusty-well-save-v2:main', JSON.stringify({ ...back, version: 1 }));
    expect(loadGame(kv)).toBeNull();
  });
});

describe('character conditions and attribute checks', () => {
  it('tests attributes, skills, level, perks and traits', () => {
    const c = premade('Говорун');
    const g = gameWith(c);
    expect(g.test({ attr: 'cha', gte: 9 })).toBe(true);
    expect(g.test({ attr: 'int', lt: 4 })).toBe(false);
    expect(g.test({ skill: 'speech', gte: 80 })).toBe(true);
    expect(g.test({ skill: 'guns', gte: 30 })).toBe(false);
    expect(g.test({ trait: 'kind' })).toBe(true);
    expect(g.test({ perk: 'trader' })).toBe(false);
    expect(g.test({ noPerk: 'trader' })).toBe(true);
    expect(g.test({ level: 2 })).toBe(false);
  });

  it('rolls attribute checks at attribute x10', () => {
    const g = gameWith(premade('Стрелок'), fixedRng([0.59, 0.6]));
    expect(g.chance({ attr: 'str' })).toBe(60);
    expect(g.check({ attr: 'str' }).success).toBe(true); // roll 60
    expect(g.check({ attr: 'str' }).success).toBe(false); // roll 61
  });

  it('karma and xp effects', () => {
    const g = gameWith(plainCharacter());
    g.apply([{ type: 'karma', amount: -1 }, { type: 'karma', amount: -1 }, { type: 'xp', amount: 40 }]);
    expect(g.flag('karma')).toBe(-2);
    expect(g.char.xp).toBe(40);
  });
});
