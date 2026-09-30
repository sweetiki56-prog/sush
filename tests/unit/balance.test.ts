// Nest fight balance over many seeded runs: shooters should win, talkers should look for another way.
import { describe, it, expect } from 'vitest';
import { arm, lameFight, nestFight, placedBattle, premadeGame, roadBattle, roadFight, trustFight } from './sim';
import { TOWNS, WORLD } from './rooms';
import { CONTENT } from '../../src/content';
import { meetingDialogue } from '../../src/core/travel/Encounters';
import { Parties, type PartyEvent, type PartyState } from '../../src/core/travel/Parties';
import { checkChance } from '../../src/core/SkillCheck';
import { mulberry32 } from '../../src/core/rng';

const RUNS = 1000;
function winRate(title: string, barrel = true): number {
  let wins = 0;
  for (let s = 1; s <= RUNS; s++) if (nestFight(premadeGame(title, s * 7919), barrel) === 'victory') wins++;
  return wins / RUNS;
}

describe('nest fight balance', () => {
  it('reports win rates', () => {
    const rates = Object.fromEntries(['Стрелок', 'Механик', 'Говорун'].flatMap((t) => [[t, winRate(t)], [`${t} без бочки`, winRate(t, false)]]));
    process.stderr.write(JSON.stringify(rates) + '\n');
    expect(rates['Стрелок']).toBeGreaterThanOrEqual(0.8);
    expect(rates['Говорун']).toBeLessThanOrEqual(0.4);
  });

  it('the Trust squad: a fighter can shoot it out, a talker should find another way', () => {
    const rate = (t: string) => {
      let wins = 0;
      for (let s = 1; s <= RUNS; s++) if (trustFight(premadeGame(t, s * 7919)) === 'victory') wins++;
      return wins / RUNS;
    };
    const rates = { Стрелок: rate('Стрелок'), Говорун: rate('Говорун') };
    process.stderr.write(`trust ${JSON.stringify(rates)}\n`);
    expect(rates['Стрелок']).toBeGreaterThanOrEqual(0.75);
    expect(rates['Говорун']).toBeLessThanOrEqual(0.2);
  });

  it('the Жнецобой is made for scorpions: the nest turns easy even for a talker', () => {
    let wins = 0;
    for (let s = 1; s <= RUNS; s++) if (nestFight(arm(premadeGame('Говорун', s * 7919), 'reaper_spear')) === 'victory') wins++;
    process.stderr.write(`nest with the spear, Говорун: ${wins / RUNS}\n`);
    expect(wins / RUNS).toBeGreaterThanOrEqual(0.8);
  });

  it('Хромой Жнец wants preparation: a fighter may win, the spear makes it sure', () => {
    const rate = (t: string, spear: boolean) => {
      let wins = 0;
      for (let s = 1; s <= RUNS; s++) {
        const g = premadeGame(t, s * 7919);
        if (lameFight(spear ? arm(g, 'reaper_spear') : g) === 'victory') wins++;
      }
      return wins / RUNS;
    };
    const plain = rate('Стрелок', false);
    const spear = rate('Механик', true);
    process.stderr.write(`lame: Стрелок ${plain}, Механик with the spear ${spear}\n`);
    expect(plain).toBeGreaterThanOrEqual(0.4);
    expect(plain).toBeLessThanOrEqual(0.8);
    expect(spear).toBeGreaterThanOrEqual(0.9);
  });

  it('every premade survives the lone road scorpion', () => {
    for (const t of ['Стрелок', 'Механик', 'Говорун']) {
      let wins = 0;
      for (let s = 1; s <= RUNS; s++) if (roadFight(premadeGame(t, s * 104729)) === 'victory') wins++;
      process.stderr.write(`road ${t}: ${wins / RUNS}\n`);
      expect(wins / RUNS, t).toBeGreaterThanOrEqual(0.85);
    }
  });
});

describe('road balance', () => {
  const RUNS_ROAD = 500;
  const rate = (t: string, foes: string[], field: string, friends: string[] = []) => {
    let wins = 0;
    for (let s = 1; s <= RUNS_ROAD; s++) if (roadBattle(premadeGame(t, s * 7919), foes, field, friends) === 'victory') wins++;
    return wins / RUNS_ROAD;
  };
  const raiders = (n: number) => Array(n).fill('raider');
  const band = ['raider_boss', ...raiders(3)];
  const guards = ['caravaneer', 'caravan_guard', 'caravan_guard'];

  it('a gang of your level: a fighter wins, a talker should pay, talk or run', () => {
    const r = { two: rate('Стрелок', raiders(2), 'enc_sand'), three: rate('Стрелок', raiders(3), 'enc_road'), talker: rate('Говорун', raiders(3), 'enc_road') };
    process.stderr.write(`road gang, level 3: ${JSON.stringify(r)}\n`);
    expect(r.two).toBeGreaterThanOrEqual(0.9);
    expect(r.three).toBeGreaterThanOrEqual(0.7);
    expect(r.talker).toBeLessThanOrEqual(0.2);
  });

  it('the Elevator band wants help or a better level; caravan guards make it a fight', () => {
    const alone = rate('Стрелок', band, 'enc_sand');
    const helped = rate('Стрелок', band, 'enc_sand', guards);
    process.stderr.write(`road band, level 3: alone ${alone}, with guards ${helped}\n`);
    expect(alone).toBeLessThanOrEqual(0.4);
    expect(helped).toBeGreaterThanOrEqual(alone + 0.3);
  });

  it('a night herd of six in the Dead fields is no fight to pick', () => {
    const r = rate('Стрелок', Array(6).fill('dryman'), 'enc_dead');
    process.stderr.write(`dry herd of six: ${r}\n`);
    expect(r).toBeLessThanOrEqual(0.2);
  });

  it('a getaway is likelier on the road than in the rocks', () => {
    const g = premadeGame('Говорун', 1);
    const chance = (terrain: string) => {
      const d = meetingDialogue({ party: CONTENT.travel.parties.gang, count: 3, ratio: 0.5, terrain, sneak: false, trustEnemy: false });
      const o = d.nodes.intro.options.find((x) => x.check?.skill === 'sneak')!;
      return checkChance(g.skill('sneak'), o.check!.mod);
    };
    process.stderr.write(`getaway, Говорун: road ${chance('=')}, rocks ${chance('^')}\n`);
    expect(chance('=')).toBeGreaterThan(chance('^') + 20);
  });

  it('a Guild caravan with its guards usually beats off a gang on its own', () => {
    let wins = 0;
    for (let s = 1; s <= RUNS_ROAD; s++) {
      const list: PartyState[] = [];
      const ps = new Parties(WORLD, list, CONTENT.travel, CONTENT.creatures, CONTENT.weapons, CONTENT.locations, mulberry32(s));
      const car = ps.spawn('caravan', [20, 20]);
      const gang = ps.spawn('gang', [20, 20]);
      const ev: PartyEvent[] = [];
      ps.decideFight(gang, car, ev);
      if (ps.byId(car.id)) wins++;
    }
    process.stderr.write(`caravan vs gang: ${wins / RUNS_ROAD}\n`);
    expect(wins / RUNS_ROAD).toBeGreaterThanOrEqual(0.7);
  });
});

describe('Chapter II balance', () => {
  const RUNS2 = 400;
  const rate = (f: (seed: number) => string) => {
    let w = 0;
    for (let s = 1; s <= RUNS2; s++) if (f(s * 7919) === 'victory') w++;
    return w / RUNS2;
  };
  const raid: [string, number, number][] = [['kremen', 8, 6], ['suhar', 6, 5], ['suhar', 10, 6], ['suhar', 9, 4]];
  const militia: [string, number, number][] = [['militia', 12, 7], ['militia', 14, 6], ['militia', 13, 5]];
  const everyone: [string, number, number][] = [...militia, ['militia', 15, 7], ['militia', 11, 5], ['caravan_guard', 16, 6], ['caravan_guard', 14, 4]];

  it('the ring: a sober Бугай is a fair bout for a fighter; under «Мираж» he is a killer', () => {
    const bout = (t: string, who: string) => rate((s) => placedBattle(premadeGame(t, s), TOWNS.three_pillars, [11, 27], [[who, 11, 25]], [], true));
    const r = { mech: bout('Механик', 'boxer'), talker: bout('Говорун', 'boxer'), mechMirage: bout('Механик', 'boxer_mirage') };
    process.stderr.write(`ring: ${JSON.stringify(r)}\n`);
    expect(r.mech).toBeGreaterThanOrEqual(0.3);
    expect(r.mech).toBeLessThanOrEqual(0.75);
    expect(r.talker).toBeLessThanOrEqual(0.3);
    expect(r.mechMirage).toBeLessThan(r.mech - 0.2);
  });

  it('the raid: alone it is lost, the militia make it a fight, everyone the hero brought makes it likely', () => {
    const fight = (friends: [string, number, number][]) => rate((s) => placedBattle(premadeGame('Стрелок', s), TOWNS.kolyuchka, [9, 7], raid, friends));
    const r = { alone: fight([]), militia: fight(militia), everyone: fight(everyone) };
    process.stderr.write(`raid, Стрелок: ${JSON.stringify(r)}\n`);
    expect(r.alone).toBeLessThanOrEqual(0.3);
    expect(r.militia).toBeGreaterThanOrEqual(0.4);
    expect(r.everyone).toBeGreaterThanOrEqual(0.75);
  });

  it('the bounties: a fighter takes the jackal pack; the behemoth wants fire or a better level', () => {
    const r = {
      jackals: rate((s) => roadBattle(premadeGame('Стрелок', s), ['jackal_leader', 'jackal', 'jackal', 'jackal'], 'enc_road')),
      behemoth: rate((s) => roadBattle(premadeGame('Стрелок', s), ['scorpion_behemoth'], 'enc_ravine')),
    };
    process.stderr.write(`bounties, Стрелок: ${JSON.stringify(r)}\n`);
    expect(r.jackals).toBeGreaterThanOrEqual(0.6);
    expect(r.behemoth).toBeLessThanOrEqual(0.5);
  });
});
