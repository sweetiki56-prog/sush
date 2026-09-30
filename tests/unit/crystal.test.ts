// Chapter V «Кристалл» (stage V) in the real room: the gate four ways, Кварц and the Wall of names, the Горькие and
// what they stole (fought, exiled, sneaked, reconciled, raided), the promise that ends the chapter, the four side
// quests with every ending, the salt tunnel; then the fight at the camp with and without Гранит.
import { describe, it, expect } from 'vitest';
import type { Game } from '../../src/core/Game';
import { room, until, TOWNS } from './rooms';
import { placedBattle, premadeGame } from './sim';
import { say, talk, winFight } from './story';

/** After Chapter IV: the tube in the bag, a guide who is one of theirs, money, sharp eyes; every roll lands. */
function setup(patch: (g: Game) => void = () => {}) {
  const { r, clients } = room();
  const [c] = clients;
  const g = r.players.get(c.id)!.game;
  for (const [k, v] of [['chapter1_seen', true], ['chapter1_done', true], ['trust_outcome', 'tax'], ['chapter3_seen', true], ['chapter4_seen', true], ['chapter4_done', true], ['krupitsa_fate', 'debt'], ['crystal_guide', 'sol'], ['day', 20]] as const) g.setFlag(k, v);
  g.give('tube');
  g.char.attrs.per = 8;
  g.state.caps = 1500;
  g.rng = () => 0.01;
  patch(g);
  r.goTo('crystal_gate');
  return { r, c, g };
}
type S = ReturnType<typeof setup>;
function done(s: S) {
  for (let n = 0; n < 6 && s.r.players.get(s.c.id)!.talk; n++) s.c.do({ t: 'choose', i: s.c.last('dialogue')!.options.length - 1 });
}
const meet = (s: S, id: string, from: [number, number]) => {
  done(s);
  talk(s.r, s.c, id, from);
};
const go = (s: S, map: string, entry?: string) => {
  done(s);
  s.r.goTo(map, entry);
  for (const h of s.r.hostiles.list) if (['deep_spiders', 'spiders'].includes(h.group)) h.dead = true;
};

/** Through the gate with the guide's word. */
function inside(s: S) {
  meet(s, 'warden', [20, 21]);
  say(s.c, 'Со мной Сол');
  return s;
}

/** Кварц tells the truth; the Горькие steal the tube. */
function told(s: S) {
  inside(s);
  go(s, 'crystal_council');
  meet(s, 'kvarts', [17, 10]);
  say(s.c, 'Что это за стена');
  say(s.c, 'Мандат открывает');
  say(s.c, '…');
  expect(s.g.flag('tube_stolen')).toBe(true);
  expect(s.g.count('tube')).toBe(0);
  expect(s.g.stage('crystal')).toBe('bitter');
  return s;
}

describe('Chapter V: the gate of Кристалл', () => {
  it('arriving starts the chapter; a guide who is one of theirs opens the grille', () => {
    const s = setup();
    expect(s.g.stage('crystal')).toBe('gate');
    inside(s);
    expect(s.g.flag('crystal_way')).toBe('guide');
    expect(s.g.flag('open_crystal_gate_a')).toBe(true);
    expect(s.g.stage('crystal')).toBe('council');
  });

  it('Обаяние, Гранит\'s word, or a plain tongue (the «Простак»: a salt brother at once)', () => {
    for (const [patch, answer, way] of [
      [(g: Game) => ((g.char.attrs.cha = 8), g.setFlag('crystal_guide', 'captain')), 'Я пришёл не брать', 'charm'],
      [(g: Game) => (g.setFlag('crystal_guide', 'captain'), g.setFlag('empty_water', 'pipe')), 'Гранит скажет', 'water'],
      [(g: Game) => ((g.char.attrs.int = 2), g.setFlag('crystal_guide', 'captain')), 'Мне к главному', 'simple'],
    ] as const) {
      const s = setup(patch);
      meet(s, 'warden', [20, 21]);
      say(s.c, answer);
      expect(s.g.flag('crystal_way')).toBe(way);
    }
  });
});

describe('Chapter V: the Горькие and the promise', () => {
  it('fought in their camp: the tube comes back', () => {
    const s = told(setup());
    go(s, 'crystal_deep');
    meet(s, 'gorech', [34, 27]);
    say(s.c, 'Отдай — или отберу');
    say(s.c, '…');
    expect(until(s.r, () => !!s.r.fight, 10_000)).toBe(true);
    winFight(s.r, s.c);
    expect(until(s.r, () => s.g.flag('bitter_way') === 'fought', 20_000)).toBe(true);
    expect(s.g.count('tube')).toBe(1);
    expect(s.g.stage('crystal')).toBe('promise');
  });

  it('taken back from the stash unseen', () => {
    const s = told(setup());
    go(s, 'crystal_deep');
    meet(s, 'bitter_stash', [37, 32]);
    say(s.c, 'Забрать украденное');
    say(s.c, '…');
    expect(s.g.flag('bitter_way')).toBe('sneaked');
    expect(s.g.count('tube')).toBe(1);
  });

  it('the truth about Горечь\'s grandfather: reconciled at the fire, or exiled by the Council', () => {
    const truth = (s: S) => {
      go(s, 'crystal_deep');
      meet(s, 'bitter_altar', [30, 20]);
      say(s.c, 'На лоскуте');
      expect(s.g.flag('bitter_truth')).toBe(true);
      return s;
    };
    const r = truth(told(setup()));
    meet(r, 'gorech', [34, 27]);
    say(r.c, 'Твой дед');
    say(r.c, '…');
    expect(r.g.flag('bitter_way')).toBe('reconciled');
    expect(r.g.count('tube')).toBe(1);
    r.r.goTo('crystal_council');
    expect(r.r.npcs.has('gorech_council')).toBe(true);

    const e = truth(told(setup()));
    go(e, 'crystal_council');
    meet(e, 'kvarts', [17, 10]);
    say(e.c, 'Изгони его');
    expect(e.g.flag('bitter_way')).toBe('exiled');
    say(e.c, '…');
    expect(e.g.count('tube')).toBe(1);
  });

  it('without the tube they steal the Council\'s scroll; sold to Ртуть, the camp is raided and the stash left', () => {
    const s = setup((g) => g.take('tube'));
    inside(s);
    go(s, 'crystal_council');
    meet(s, 'kvarts', [17, 10]);
    say(s.c, 'Что это за стена');
    say(s.c, 'Мандат открывает');
    say(s.c, '…');
    expect(s.g.flag('scroll_stolen')).toBe(true);
    go(s, 'crystal_gate');
    meet(s, 'slyuda', [27, 14]);
    say(s.c, 'Кто такие Горькие');
    go(s, 'crystal_baths');
    meet(s, 'rtut', [25, 24]);
    say(s.c, 'Трест заплатит');
    say(s.c, 'Бери');
    expect(s.g.flag('bitter_blood')).toBe('sold');
    expect(s.g.flag('crystal_grudge')).toBe(true);
    go(s, 'crystal_deep');
    expect(s.r.hostiles.byId('gorech')).toBeUndefined();
    meet(s, 'bitter_stash', [37, 32]);
    say(s.c, 'Забрать украденное');
    say(s.c, '…');
    expect(s.g.flag('bitter_way')).toBe('raided');
    expect(s.g.count('quartz_scroll')).toBe(1);
  });

  it('the promise ends the chapter three ways', () => {
    for (const [answer, fate] of [['Даю слово', 'protect'], ['по участкам', 'sections'], ['Обещать не буду', 'refuse']] as const) {
      const s = told(setup());
      go(s, 'crystal_deep');
      meet(s, 'bitter_stash', [37, 32]);
      say(s.c, 'Забрать украденное');
      go(s, 'crystal_council');
      meet(s, 'kvarts', [17, 10]);
      say(s.c, answer);
      expect(s.g.flag('salt_promise')).toBe(fate);
      expect(s.g.flag('chapter5_done')).toBe(true);
      expect(s.g.stage('crystal')).toBe('done');
      expect(!!s.g.flag('salt_brother')).toBe(fate !== 'refuse');
    }
  });
});

describe('the side quests of Кристалл', () => {
  it('«Пустая вода»: the fresh water found, then the mines freed, a treaty, or a brine pipe; Гранит joins', () => {
    const start = (patch: (g: Game) => void = () => {}) => {
      const s = setup(patch);
      meet(s, 'granit', [25, 23]);
      say(s.c, 'посмотрю, что с водой');
      go(s, 'salt_mines');
      meet(s, 'fresh_tank', [13, 25]);
      say(s.c, 'пломба Гильдии');
      expect(s.g.flag('empty_water_truth')).toBe(true);
      return s;
    };
    const p = start();
    say(p.c, 'Отойти');
    meet(p, 'fresh_tank', [13, 25]);
    say(p.c, 'Провести в бак рассол');
    expect(p.g.flag('empty_water')).toBe('pipe');
    go(p, 'crystal_gate');
    meet(p, 'granit', [25, 23]);
    say(p.c, 'Пойдём со мной');
    expect(p.g.flag('with_granit')).toBe(true);

    const f = start();
    meet(f, 'klesch', [11, 6]);
    say(f.c, 'Хватит поить');
    say(f.c, '…');
    expect(until(f.r, () => !!f.r.fight, 10_000)).toBe(true);
    winFight(f.r, f.c);
    expect(until(f.r, () => f.g.flag('empty_water') === 'freed', 20_000)).toBe(true);

    const t = start();
    go(t, 'salt_guild');
    t.g.setFlag('open_guild_gate_a');
    t.g.setFlag('krupitsa_met');
    meet(t, 'krupitsa', [10, 9]);
    say(t.c, 'Договор с Кристаллом');
    expect(t.g.flag('empty_water')).toBe('treaty');
  });

  it('«Стена имён»: Верес Кассианов found three ways; kept, returned or erased', () => {
    for (const [find, keep, fate] of [
      ['niches', 'Сохраню', 'lever'],
      ['kvarts', 'Верни имя', 'bridge'],
      ['tablet', 'Сотри', 'erased'],
    ] as const) {
      const s = told(setup((g) => (g.char.attrs.cha = 7)));
      if (find === 'niches') {
        meet(s, 'niche_6_5', [7, 5]);
        say(s.c, 'Сверить');
      } else if (find === 'tablet') {
        go(s, 'crystal_deep');
        meet(s, 'name_tablet', [11, 7]);
        say(s.c, 'Соскоблить');
        go(s, 'crystal_council');
      } else {
        meet(s, 'kvarts', [17, 10]);
        say(s.c, 'Вспомни, старик');
        say(s.c, '…');
      }
      expect(s.g.flag('names_found')).toBe(true);
      if (find !== 'kvarts') {
        meet(s, 'kvarts', [17, 10]);
        say(s.c, 'Нашлись имена');
      }
      say(s.c, keep);
      expect(s.g.flag('wall_names')).toBe(fate);
    }
  });

  it('«Соль земли»: the sixth… the seventh seal on the pipe; the poisoner exposed, the Order blamed, or the spring cleaned', () => {
    const start = () => {
      const s = inside(setup());
      go(s, 'crystal_baths');
      meet(s, 'shcholoch', [12, 21]);
      say(s.c, 'посмотрю источник');
      meet(s, 'bath_pipe', [19, 10]);
      say(s.c, 'красный воск');
      expect(s.g.flag('seal_mark_7')).toBe(true);
      return s;
    };
    const e = start();
    go(e, 'crystal_council');
    e.g.setFlag('quartz_told');
    meet(e, 'kvarts', [17, 10]);
    say(e.c, 'Отравитель бань');
    expect(e.g.flag('salt_earth')).toBe('exposed');
    const b = start();
    meet(b, 'shcholoch', [12, 21]);
    say(b.c, 'Да, это Орден');
    expect(b.g.flag('crystal_vs_order')).toBe(true);
    const c = start();
    meet(c, 'bath_pipe', [19, 10]);
    say(c.c, 'Промыть трубу');
    expect(c.g.flag('salt_earth')).toBe('cleaned');
  });

  it('the salt tunnel takes a salt brother from the deep mines to the mines of Соль and back', () => {
    const s = setup((g) => g.setFlag('salt_brother'));
    go(s, 'crystal_deep');
    meet(s, 'tunnel_mouth', [4, 21]);
    say(s.c, 'Пройти тоннелем');
    expect(until(s.r, () => s.r.map.id === 'salt_mines', 5000)).toBe(true);
    expect(s.r.map.exits!.find((x) => x.id === 'tunnel')!.to).toBe('crystal_deep');
  });

  it('the Солевой молот lies under a fallen prop', () => {
    const s = setup((g) => (g.char.attrs.str = 8));
    go(s, 'crystal_deep');
    meet(s, 'hammer_cache', [6, 33]);
    say(s.c, 'Разобрать завал');
    expect(s.g.count('salt_hammer')).toBe(1);
  });
});

describe('Chapter V balance', () => {
  const RUNS = 200;
  const titles = ['Стрелок', 'Механик', 'Говорун'];
  const camp = TOWNS.crystal_deep;
  const foes: [string, number, number][] = [['gorech', 35, 27], ['bitter', 32, 25], ['bitter', 37, 28]];
  const rate = (friends: [string, number, number][]) =>
    Object.fromEntries(
      titles.map((t) => {
        let w = 0;
        for (let s = 1; s <= RUNS; s++) {
          const g = premadeGame(t, s * 7919);
          g.addXp(700); // level 6 by Chapter V
          if (placedBattle(g, camp, [29, 19], foes, friends) === 'victory') w++;
        }
        return [t, w / RUNS];
      }),
    );

  it('the camp of the Горькие is hard alone; Гранит makes it a fair fight', () => {
    const r = { alone: rate([]), withGranit: rate([['granit_ally', 30, 18]]) };
    process.stderr.write(`Chapter V camp, level 6: ${JSON.stringify(r)}\n`);
    expect(r.alone['Стрелок']).toBeLessThanOrEqual(0.7);
    expect(r.withGranit['Стрелок']).toBeGreaterThan(r.alone['Стрелок']);
    expect(r.withGranit['Стрелок']).toBeGreaterThanOrEqual(0.6);
  });
});
