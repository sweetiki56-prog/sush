// Chapter VI «Скит» (stage S) in the real room: the gate four ways (knowledge, strength, Ирга's word, the vent), the
// archive and Штемпель's letter, the dew-catchers kept, earned or stolen, брат Стужа three ways, the choice that ends
// the chapter; the four side quests with every ending; «Роса-2»; Ирга joins and bandages the wounded in a fight.
import { describe, it, expect } from 'vitest';
import type { Game } from '../../src/core/Game';
import { Combat } from '../../src/core/combat/Combat';
import { nextAction } from '../../src/core/combat/ai';
import { creatureUnit, playerUnit } from '../../src/core/combat/build';
import { CONTENT } from '../../src/content';
import { room, until, TOWNS } from './rooms';
import { placedBattle, premadeGame } from './sim';
import { say, talk, winFight } from './story';

/** After Chapter V: the tube in the bag, sharp eyes, money; every roll lands unless told otherwise. */
function setup(patch: (g: Game) => void = () => {}, map = 'skit_yard', entry?: string) {
  const { r, clients } = room();
  const [c] = clients;
  const g = r.players.get(c.id)!.game;
  for (const [k, v] of [['chapter1_seen', true], ['chapter1_done', true], ['trust_outcome', 'tax'], ['chapter3_seen', true], ['chapter4_seen', true], ['chapter4_done', true], ['chapter5_seen', true], ['chapter5_done', true], ['day', 30]] as const) g.setFlag(k, v);
  g.give('tube');
  g.char.attrs.per = 8;
  g.state.caps = 1500;
  g.rng = () => 0.01;
  patch(g);
  r.goTo(map, entry);
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
};
const opts = (s: S) => s.c.last('dialogue')!.options;

/** Through the gate by the trial of knowledge. */
function inside(s: S) {
  meet(s, 'gate_knight', [17, 31]);
  say(s.c, 'Испытание знанием');
  say(s.c, 'Роса — пар из воздуха');
  expect(s.g.flag('skit_in')).toBe(true);
  return s;
}

/** Inside, the archive read: Штемпель's letter in the bag. */
function read(s: S) {
  inside(s);
  s.g.setFlag('kassian_kin');
  go(s, 'skit_cells');
  meet(s, 'kassian', [15, 10]);
  say(s.c, 'Архив');
  say(s.c, 'Верес Кассианов');
  say(s.c, '…');
  go(s, 'skit_archive');
  meet(s, 'svitok', [9, 10]);
  say(s.c, 'Настоятель велел');
  meet(s, 'letter_shelf', [25, 6]);
  say(s.c, 'Открыть папку');
  return s;
}

describe('Chapter VI: the gate of the Скит', () => {
  it('arriving starts the chapter; the trial of knowledge opens the bars', () => {
    const s = setup();
    expect(s.g.stage('skit')).toBe('enter');
    inside(s);
    expect(s.g.flag('skit_way')).toBe('knowledge');
    expect(s.g.flag('open_skit_gate_a')).toBe(true);
    expect(s.g.stage('skit')).toBe('archive');
    expect(s.g.stage('trial')).toBe('done');
    expect(s.g.flag('keeper_marks')).toBe(1);
  });

  it('a clever mind answers without a roll; a plain one gives the truest answer in forty years', () => {
    const wise = setup((g) => (g.char.attrs.int = 8));
    meet(wise, 'gate_knight', [17, 31]);
    say(wise.c, 'Испытание знанием');
    say(wise.c, 'ночь холоднее воздуха');
    expect(wise.g.flag('trial')).toBe('mind');
    const plain = setup((g) => (g.char.attrs.int = 3));
    meet(plain, 'gate_knight', [17, 31]);
    say(plain.c, 'Испытание знанием');
    expect(opts(plain).some((o) => o.includes('ночь холоднее'))).toBe(false);
    say(plain.c, 'Вода мокрая');
    expect(plain.g.flag('trial')).toBe('simple');
    expect(plain.g.flag('skit_in')).toBe(true);
  });

  it('a wrong answer keeps the bars down', () => {
    const s = setup((g) => (g.rng = () => 0.99));
    meet(s, 'gate_knight', [17, 31]);
    say(s.c, 'Испытание знанием');
    say(s.c, 'Роса — пар из воздуха');
    expect(s.g.flag('skit_in')).toBeFalsy();
  });

  it('the trial of strength: a bout with брат Кремнец to the fall', () => {
    const s = setup();
    meet(s, 'gate_knight', [17, 31]);
    say(s.c, 'Испытание силой');
    say(s.c, 'Начнём');
    expect(until(s.r, () => !!s.r.fight, 10_000)).toBe(true);
    expect(s.r.ring).toBe(true);
    winFight(s.r, s.c);
    expect(until(s.r, () => !s.r.fight, 10_000)).toBe(true);
    expect(s.g.flag('ring_result')).toBe('won');
    meet(s, 'gate_knight', [17, 31]);
    say(s.c, '…');
    expect(s.g.flag('skit_way')).toBe('strength');
    expect(s.g.flag('ring_result')).toBe(false);
  });

  it('Ирга\'s word at the gate; her vent under the salt comes up in the works, past the gate', () => {
    const s = setup(() => {}, 'rosa_surface');
    meet(s, 'irga', [12, 22]);
    say(s.c, 'Почему ушла');
    say(s.c, 'ворует паруса');
    expect(s.g.flag('irga_password')).toBe(true);
    expect(s.g.stage('unaccounted')).toBe('asked');
    go(s, 'skit_yard');
    meet(s, 'gate_knight', [17, 31]);
    say(s.c, 'Роса собирается ночью');
    expect(s.g.flag('skit_way')).toBe('password');

    const v = setup(() => {}, 'rosa_deep', 'ladder');
    meet(v, 'vent_skit', [29, 26]);
    say(v.c, 'Пролезть под Скит');
    expect(until(v.r, () => v.r.map.id === 'skit_depths', 5000)).toBe(true);
    expect(v.g.flag('skit_way')).toBe('vents');
    expect(v.g.stage('skit')).toBe('archive');
  });
});

describe('Chapter VI: the archive and the dew', () => {
  it('Кассиан lets a kinsman of Верес in; Штемпель\'s letter is the eighth seal', () => {
    const s = read(setup());
    expect(s.g.count('stempel_letter')).toBe(1);
    expect(s.g.flag('seal_mark_8')).toBe(true);
    expect(s.g.stage('skit')).toBe('dew');
  });

  it('Свиток is fooled, or the grate is picked', () => {
    const lie = inside(setup());
    go(lie, 'skit_archive');
    meet(lie, 'svitok', [9, 10]);
    say(lie.c, 'Срочно');
    expect(lie.g.flag('open_archive_grate')).toBe(true);
    const pick = inside(setup());
    go(pick, 'skit_archive');
    meet(pick, 'archive_grate', [21, 10]);
    say(pick.c, 'Вскрыть');
    expect(pick.g.flag('open_archive_grate')).toBe(true);
  });

  it('the secret kept: the Order is a friend', () => {
    const s = read(setup());
    go(s, 'skit_cells');
    meet(s, 'kassian', [15, 10]);
    say(s.c, 'Росоуловители');
    say(s.c, 'Оставьте тайну себе');
    expect(s.g.flag('dew_way')).toBe('kept');
    expect(s.g.flag('order_ally')).toBe(true);
    expect(s.g.stage('skit')).toBe('stuzha');
  });

  it('a keeper by three deeds gets the plans from Кассиан\'s own hands', () => {
    const s = read(setup());
    go(s, 'skit_cells');
    meet(s, 'kassian', [15, 10]);
    say(s.c, 'Росоуловители');
    expect(opts(s).some((o) => o.includes('Сделайте меня'))).toBe(false); // one deed so far
    s.g.setFlag('keeper_marks', 3);
    meet(s, 'kassian', [15, 10]);
    say(s.c, 'Росоуловители');
    say(s.c, 'Сделайте меня хранителем');
    expect(s.g.flag('dew_way')).toBe('keeper');
    expect(s.g.count('dew_plans')).toBe(1);
  });

  it('the safe below: picked, the plans stolen and the Order an enemy; fumbled, the sentries wake', () => {
    const s = read(setup());
    go(s, 'skit_depths', 'stairs');
    meet(s, 'dew_safe', [31, 8]);
    say(s.c, 'Вскрыть замок');
    expect(s.g.flag('dew_way')).toBe('stolen');
    expect(s.g.count('dew_plans')).toBe(1);
    expect(s.g.flag('order_enemy')).toBe(true);
    const f = read(setup());
    f.g.rng = () => 0.99;
    go(f, 'skit_depths', 'stairs');
    meet(f, 'dew_safe', [31, 8]);
    say(f.c, 'Вскрыть замок');
    expect(f.g.flag('depths_alarm')).toBe(true);
    expect(f.g.count('dew_plans')).toBe(0);
  });
});

describe('Chapter VI: брат Стужа and the choice', () => {
  /** The secret kept; Стужа asks for the Mandate. */
  function asked(s: S) {
    read(s);
    go(s, 'skit_cells');
    meet(s, 'kassian', [15, 10]);
    say(s.c, 'Росоуловители');
    say(s.c, 'Оставьте тайну себе');
    meet(s, 'stuzha', [21, 10]);
    return s;
  }

  it('a duel to the knee', () => {
    const s = asked(setup());
    say(s.c, 'Попробуй взять');
    say(s.c, '…');
    expect(until(s.r, () => !!s.r.fight, 10_000)).toBe(true);
    winFight(s.r, s.c);
    expect(until(s.r, () => s.g.flag('stuzha_way') === 'duel', 20_000)).toBe(true);
    expect(s.g.stage('skit')).toBe('choice');
    expect(s.g.count('tube')).toBe(1);
  });

  it('Кассиан revokes the order: for the name of Верес, or for a good word', () => {
    const s = asked(setup());
    say(s.c, 'Спроси настоятеля');
    meet(s, 'kassian', [15, 10]);
    say(s.c, 'Отмените приказ');
    expect(s.g.flag('stuzha_way')).toBe('revoked');
    const w = asked(setup());
    w.g.setFlag('kassian_kin', false);
    say(w.c, 'Спроси настоятеля');
    meet(w, 'kassian', [15, 10]);
    say(w.c, 'Отмените приказ');
    expect(w.g.flag('stuzha_way')).toBe('revoked');
  });

  it('slipped away through the vent with the Mandate', () => {
    const s = asked(setup());
    say(s.c, 'Спроси настоятеля');
    go(s, 'skit_depths', 'stairs');
    meet(s, 'vent_up', [5, 30]);
    say(s.c, 'с Мандатом');
    expect(s.g.flag('stuzha_way')).toBe('slipped');
    expect(until(s.r, () => s.r.map.id === 'rosa_deep', 5000)).toBe(true);
  });

  it('the dew stays with the Order, or goes to everyone with the plans: the chapter ends either way', () => {
    const s = asked(setup());
    say(s.c, 'Спроси настоятеля');
    meet(s, 'kassian', [15, 10]);
    say(s.c, 'Отмените приказ');
    meet(s, 'kassian', [15, 10]);
    expect(opts(s).some((o) => o.includes('для всех'))).toBe(false); // no plans
    say(s.c, 'Роса останется Ордену');
    expect(s.g.flag('dew_fate')).toBe('order');
    expect(s.g.flag('chapter6_done')).toBe(true);
    expect(s.g.stage('skit')).toBe('done');

    const a = read(setup());
    go(a, 'skit_depths', 'stairs');
    meet(a, 'dew_safe', [31, 8]);
    say(a.c, 'Вскрыть замок');
    a.g.setFlag('stuzha_way', 'duel');
    go(a, 'rosa_surface');
    meet(a, 'irga', [12, 22]);
    say(a.c, 'Почему ушла');
    say(a.c, 'ворует паруса');
    meet(a, 'irga', [12, 22]);
    say(a.c, 'Отдадим их людям');
    expect(a.g.flag('dew_fate')).toBe('all');
    expect(a.g.flag('chapter6_done')).toBe(true);
  });
});

describe('Chapter VI: side quests', () => {
  /** Ирга asked; the thief's bunk searched. */
  function thief(s: S) {
    s.g.setFlag('unaccounted_asked');
    inside(s);
    go(s, 'skit_cells');
    meet(s, 'ivan_bunk', [6, 20]);
    say(s.c, 'Под нарами');
    expect(s.g.flag('ivan_truth')).toBe(true);
    meet(s, 'ivan', [8, 22]);
    return s;
  }

  it('«Неучтённый»: the novice is Прокоп\'s son; given up, helped (Ирга joins) or a sail lent', () => {
    const given = thief(setup());
    say(given.c, 'Выдам Ордену');
    expect(given.g.flag('unaccounted')).toBe('given');
    expect(given.g.flag('keeper_marks')).toBe(2);

    const helped = thief(setup());
    say(helped.c, 'Помогу унести');
    expect(helped.g.flag('unaccounted')).toBe('helped');
    expect(helped.g.flag('kolyuchka_dew')).toBe(true);
    go(helped, 'rosa_surface');
    meet(helped, 'irga', [12, 22]);
    say(helped.c, 'Почему ушла');
    say(helped.c, 'ворует паруса');
    meet(helped, 'irga', [12, 22]);
    say(helped.c, 'Пойдём со мной');
    expect(helped.g.flag('with_irga')).toBe(true);

    const lent = thief(setup());
    say(lent.c, 'Попрошу настоятеля');
    meet(lent, 'kassian', [15, 10]);
    say(lent.c, 'Одолжите хутору');
    expect(lent.g.flag('unaccounted')).toBe('lent');
    expect(lent.g.stage('unaccounted')).toBe('done');
  });

  it('dull eyes miss the bunk; Иван confesses to a good word instead', () => {
    const s = setup((g) => (g.char.attrs.per = 4));
    s.g.setFlag('unaccounted_asked');
    inside(s);
    go(s, 'skit_cells');
    meet(s, 'ivan_bunk', [6, 20]);
    expect(opts(s).some((o) => o.includes('Под нарами'))).toBe(false);
    meet(s, 'ivan', [8, 22]);
    say(s.c, 'разбирает парус');
    expect(s.g.flag('ivan_truth')).toBe(true);
  });

  it('«Лаборант»: Пётр\'s cure to the Солевики, to the Order, or left with him', () => {
    for (const [answer, how] of [['Солевикам', 'salters'], ['Ордену', 'order'], ['Оставь у себя', 'left']] as const) {
      const s = setup(() => {}, 'rosa_deep', 'ladder');
      meet(s, 'petr', [20, 20]);
      say(s.c, 'Что ты здесь хранишь');
      say(s.c, answer);
      expect(s.g.flag('lab_tech')).toBe(how);
      expect(s.g.count('fresh_cure')).toBe(how === 'salters' ? 1 : 0);
      expect(s.g.stage('lab_tech')).toBe('done');
    }
  });

  it('«Последняя капсула»: woken (he remembers Верес), left asleep, or switched off', () => {
    const w = setup(() => {}, 'rosa_deep', 'ladder');
    meet(w, 'capsule', [16, 14]);
    say(w.c, 'Разбудить');
    expect(w.g.flag('capsule')).toBe('woken');
    expect(w.g.flag('veres_witness')).toBe(true);
    done(w);
    expect(until(w.r, () => w.r.npcs.has('camel_first'), 5000)).toBe(true);
    for (const [answer, how] of [['Оставить спать', 'sleeping'], ['Отключить', 'stopped']] as const) {
      const s = setup(() => {}, 'rosa_deep', 'ladder');
      meet(s, 'capsule', [16, 14]);
      say(s.c, answer);
      expect(s.g.flag('capsule')).toBe(how);
    }
  });

  it('the lab: the gas bites until the valve is shut; the ninth seal on the door', () => {
    const s = setup(() => {}, 'rosa_lab', 'stairs');
    for (const h of s.r.hostiles.list) h.dead = true;
    const hp = s.g.state.hp;
    s.c.do({ t: 'debug', op: { op: 'teleport', x: 21, y: 26 } });
    s.c.do({ t: 'walk', x: 27, y: 26 });
    expect(until(s.r, () => s.g.state.hp < hp, 20_000)).toBe(true);
    meet(s, 'gas_valve', [20, 29]);
    say(s.c, 'Крутить вентиль');
    expect(s.g.flag('gas_vented')).toBe(true);
    meet(s, 'lab_door', [30, 11]);
    say(s.c, 'капля красного воска');
    expect(s.g.flag('seal_mark_9')).toBe(true);
  });
});

describe('Ирга in a fight', () => {
  it('bandages a friend under half health instead of shooting', () => {
    const g = premadeGame('Стрелок', 11);
    const me = playerUnit(g, 5, 5);
    me.hp = 4;
    const irga = { ...creatureUnit(CONTENT.creatures.irga_ally, 'comp_irga', 6, 5), team: 'player' };
    const foe = creatureUnit(CONTENT.creatures.camel_reject, 'foe', 15, 5);
    const c = new Combat([irga, me, foe], CONTENT.weapons, { width: 30, height: 30, rng: () => 0.5, blocked: () => false, opaque: () => false, ammo: () => 99, spendAmmo: () => {} });
    c.start();
    while (c.current.id !== 'comp_irga') c.endTurn();
    const act = nextAction(c, c.current);
    expect(act).toEqual({ kind: 'tend', target: 'player' });
    const ev = c.tend('player');
    expect(me.hp).toBe(14);
    expect(ev.some((e) => e.t === 'log' && e.text.includes('перевязывает'))).toBe(true);
  });
});

describe('Chapter VI balance', () => {
  const RUNS = 200;
  const titles = ['Стрелок', 'Механик', 'Говорун'];
  const rate = (map: string, at: [number, number], foes: [string, number, number][], friends: [string, number, number][] = []) =>
    Object.fromEntries(
      titles.map((t) => {
        let w = 0;
        for (let s = 1; s <= RUNS; s++) {
          const g = premadeGame(t, s * 7919);
          g.addXp(1100); // level 6–7 by Chapter VI
          if (placedBattle(g, TOWNS[map], at, foes, friends) === 'victory') w++;
        }
        return [t, w / RUNS];
      }),
    );

  it('Стужа is a real duel; the sentries and the rejects are hard alone, fairer with Ирга', () => {
    const r = {
      stuzha: rate('skit_cells', [22, 14], [['stuzha', 22, 9]]),
      sentries: rate('skit_depths', [20, 5], [['sentry', 24, 8], ['sentry', 12, 10]]),
      rejects: rate('rosa_lab', [16, 26], [['camel_reject', 22, 14], ['camel_reject', 26, 18], ['camel_reject', 18, 22]]),
      rejectsWithIrga: rate('rosa_lab', [16, 26], [['camel_reject', 22, 14], ['camel_reject', 26, 18], ['camel_reject', 18, 22]], [['irga_ally', 15, 27]]),
    };
    process.stderr.write(`Chapter VI, level 6: ${JSON.stringify(r)}\n`);
    expect(r.stuzha['Стрелок']).toBeGreaterThanOrEqual(0.4);
    expect(r.stuzha['Стрелок']).toBeLessThanOrEqual(0.9);
    expect(r.sentries['Стрелок']).toBeGreaterThanOrEqual(0.3);
    expect(r.rejects['Стрелок']).toBeLessThanOrEqual(0.75);
    expect(r.rejectsWithIrga['Стрелок']).toBeGreaterThanOrEqual(r.rejects['Стрелок']);
  });
});
