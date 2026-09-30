// Chapter III «Запруда» in the real room: every way through the gate, the Notary with each fate of the tube, the
// archive, the bounty and the prison, the four choices that end the chapter, and every ending of the five side quests.
import { describe, it, expect } from 'vitest';
import type { Game } from '../../src/core/Game';
import { room, until, TOWNS } from './rooms';
import { placedBattle, premadeGame } from './sim';
import { CONTENT } from '../../src/content';
import { say, talk, winFight } from './story';

/** After Chapter II: the Notary's name known, the tube in the bag, money, sharp eyes; every roll lands. */
function setup(patch: (g: Game) => void = () => {}) {
  const { r, clients } = room();
  const [c] = clients;
  const g = r.players.get(c.id)!.game;
  for (const [k, v] of [['chapter1_seen', true], ['chapter1_done', true], ['trust_outcome', 'tax'], ['chapter2_done', true], ['chapter2_seen', true], ['notary_known', true], ['day', 9]] as const) g.setFlag(k, v);
  g.give('tube');
  g.char.attrs.per = 8;
  g.state.caps = 800;
  g.rng = () => 0.01;
  patch(g);
  r.goTo('zap_lower');
  return { r, c, g };
}
type S = ReturnType<typeof setup>;
const meet = (s: S, id: string, from: [number, number]) => talk(s.r, s.c, id, from);
const go = (s: S, map: string, entry?: string) => {
  s.r.goTo(map, entry);
  for (const h of s.r.hostiles.list) if (['rats', 'den'].includes(h.group)) h.dead = true;
};

/** Through the gate on a pass; Chapter III has begun. */
function inside(s: S) {
  s.g.give('guild_pass');
  meet(s, 'gate_col_a', [19, 35]);
  say(s.c, 'пропуск Соляной');
  say(s.c, 'Пройти');
  return s;
}

/** The Notary reads and certifies the tube for 300 капель. */
function certified(s: S) {
  go(s, 'zap_market');
  meet(s, 'shtempel', [9, 9]);
  say(s.c, 'Прочтите');
  expect(s.g.flag('mandate_read')).toBe(true);
  say(s.c, '…');
  say(s.c, 'Триста');
  expect(s.g.flag('mandate_certified')).toBe(true);
  say(s.c, '…');
  return s;
}

/** Up to the Upper city and into the archive for the forgery. */
function proof(s: S) {
  go(s, 'zap_market');
  meet(s, 'upper_guard', [22, 4]);
  say(s.c, 'Пятьдесят');
  say(s.c, 'Отойти');
  go(s, 'zap_upper');
  meet(s, 'kulik', [25, 11]);
  say(s.c, 'Восемьдесят');
  say(s.c, 'Отойти');
  meet(s, 'archive_case', [33, 10]);
  say(s.c, 'Открыть папку');
  expect(s.g.count('forgery_proof')).toBe(1);
  expect(s.g.flag('seal_mark_5')).toBe(true);
  expect(s.g.stage('zapruda')).toBe('bounty');
  say(s.c, 'Уйти');
  return s;
}

describe('Chapter III: the gate', () => {
  it('a pass from Зоя lifts the grille and starts the chapter', () => {
    const s = inside(setup());
    expect(s.g.flag('gate_way')).toBe('pass');
    expect(s.g.flag('open_gate_a')).toBe(true);
    expect(s.g.stage('zapruda')).toBe('notary');
  });

  it('claiming to be a collector works with a good tongue; breaking through makes the city hostile', () => {
    const s = setup();
    meet(s, 'gate_col_a', [19, 35]);
    say(s.c, 'Сам из сборщиков');
    expect(s.g.flag('gate_way')).toBe('collector');
    const t = setup();
    meet(t, 'gate_col_a', [19, 35]);
    say(t.c, 'Прорваться');
    expect(t.g.flag('zap_wanted')).toBe(true);
    expect(t.g.flag('gate_way')).toBe('fight');
  });

  it('the water-bearers\' way: the aqueduct under the wall, the sewers, up through the hatch', () => {
    const s = setup((g) => g.setFlag('lejka_friend', true));
    meet(s, 'aqueduct', [33, 36]);
    say(s.c, 'Ерёма говорил');
    expect(until(s.r, () => s.r.map.id === 'zap_sewers')).toBe(true);
    expect(s.g.flag('gate_way')).toBe('bearers');
    s.c.do({ t: 'debug', op: { op: 'teleport', x: 18, y: 5 } });
    s.c.do({ t: 'walk', x: 18, y: 3 });
    expect(until(s.r, () => s.r.map.id === 'zap_lower')).toBe(true);
    expect(s.g.flag('zap_in')).toBe(true);
  });
});

describe('Chapter III: the Notary and the tube', () => {
  it('the tube read and certified; the forged copy named', () => {
    const s = certified(inside(setup()));
    expect(s.g.stage('zapruda')).toBe('forgery');
    expect(s.g.flag('forgery_known')).toBe(true);
    expect(s.g.state.caps).toBe(500);
  });

  it('a copy from the Писарь: the original is in the Notary\'s safe, bought back for 200', () => {
    const s = setup((g) => {
      g.take('tube');
      g.give('tube_copy');
      g.setFlag('mandate_copy', true);
    });
    inside(s);
    go(s, 'zap_market');
    meet(s, 'shtempel', [9, 9]);
    say(s.c, 'Прочтите');
    say(s.c, 'Сейф у вас за спиной');
    say(s.c, 'Выкуплю');
    expect(s.g.count('tube')).toBe(1);
    say(s.c, 'Теперь прочтите');
    expect(s.g.flag('mandate_read')).toBe(true);
  });

  it('the tube given to the Trust in Chapter I: it lies in the archive beside the forgery', () => {
    const s = setup((g) => {
      g.take('tube');
      g.setFlag('trust_outcome', 'surrender');
    });
    inside(s);
    go(s, 'zap_market');
    meet(s, 'shtempel', [9, 9]);
    say(s.c, 'Мандат у Треста');
    expect(s.g.stage('zapruda')).toBe('forgery');
    say(s.c, '…');
    s.g.give('ada_pass');
    go(s, 'zap_market');
    meet(s, 'upper_guard', [22, 4]);
    say(s.c, 'Пропуск Ады');
    say(s.c, 'Отойти');
    go(s, 'zap_upper');
    meet(s, 'kulik', [25, 11]);
    say(s.c, 'Пропуск Ады');
    say(s.c, 'Отойти');
    meet(s, 'archive_case', [33, 10]);
    say(s.c, 'Открыть папку');
    say(s.c, 'латунный тубус');
    expect(s.g.count('tube')).toBe(1);
    expect(s.g.count('forgery_proof')).toBe(1);
  });

  it('the fourth seal mark on the back of the Notary\'s register', () => {
    const s = inside(setup());
    go(s, 'zap_market');
    meet(s, 'notary_registry', [6, 8]);
    say(s.c, 'Перевернуть');
    expect(s.g.flag('seal_mark_4')).toBe(true);
  });
});

describe('Chapter III: the bounty, the prison and the choice', () => {
  const ready = () => proof(certified(inside(setup())));

  it('doubt, then the copy kept for a court through Лейка: the chapter ends', () => {
    const s = ready();
    go(s, 'zap_market');
    meet(s, 'shluz_z', [19, 20]);
    say(s.c, 'Прочтите сами');
    expect(s.g.flag('bounty_done')).toBe('doubt');
    expect(s.g.flag('shlyuz_doubt')).toBe(true);
    say(s.c, '…');
    go(s, 'zap_lower');
    meet(s, 'lejka', [9, 22]);
    say(s.c, 'Сохраню для суда');
    expect(s.g.flag('forgery_fate')).toBe('kept');
    expect(s.g.flag('chapter3_done')).toBe(true);
    expect(s.g.stage('zapruda')).toBe('done');
  });

  it('arrested: weapons taken away; a shiv from the cellmate, the grille, the sewers; the chest gives them back', () => {
    const s = ready();
    s.g.give('rifle');
    const rifles = s.g.count('rifle');
    go(s, 'zap_market');
    meet(s, 'shluz_z', [19, 20]);
    say(s.c, 'Иду');
    expect(until(s.r, () => s.r.map.id === 'zap_dock')).toBe(true);
    expect(s.g.count('rifle')).toBe(0);
    expect(s.g.state.confiscated?.rifle).toBe(rifles);
    say(s.c, '…');
    meet(s, 'cellmate', [6, 4]);
    say(s.c, 'заточку');
    say(s.c, 'Отойти');
    meet(s, 'cell_a_door', [6, 6]);
    say(s.c, 'заточкой');
    expect(s.g.flag('open_cell_a_door')).toBe(true);
    say(s.c, 'Отойти');
    meet(s, 'dock_stash', [24, 11]);
    say(s.c, 'Забрать своё');
    expect(s.g.count('rifle')).toBe(rifles);
    meet(s, 'dock_grate', [27, 20]);
    say(s.c, 'бежать');
    expect(until(s.r, () => s.r.map.id === 'zap_sewers')).toBe(true);
    expect(s.g.flag('bounty_done')).toBe('escaped');
  });

  it('arrested, out on bail or on Лейка\'s word through the bars', () => {
    for (const [pick, how] of [['Залог', 'bail'], ['от Лейки', 'talked']] as const) {
      const s = ready();
      s.g.setFlag('lejka_ally', true);
      go(s, 'zap_market');
      meet(s, 'shluz_z', [19, 20]);
      say(s.c, 'Иду');
      expect(until(s.r, () => s.r.map.id === 'zap_dock')).toBe(true);
      say(s.c, '…');
      meet(s, 'cell_a_door', [6, 6]);
      say(s.c, 'Постучать');
      say(s.c, pick);
      expect(s.g.flag('bounty_done')).toBe(how);
      expect(until(s.r, () => s.r.map.id === 'zap_lower')).toBe(true);
    }
  });

  it('arrested, a riot of the prisoners fought through', () => {
    const s = ready();
    go(s, 'zap_market');
    meet(s, 'shluz_z', [19, 20]);
    say(s.c, 'Иду');
    expect(until(s.r, () => s.r.map.id === 'zap_dock')).toBe(true);
    say(s.c, '…');
    meet(s, 'cellmate', [6, 4]);
    say(s.c, 'Поднимем док'); // the guards go for the rioters at once
    expect(until(s.r, () => !!s.r.fight, 10_000)).toBe(true);
    winFight(s.r, s.c);
    expect(until(s.r, () => s.g.flag('bounty_done') === 'riot', 20_000)).toBe(true);
  });

  it('slipped into the crowd, then the copy read out on the square', () => {
    const s = ready();
    go(s, 'zap_market');
    meet(s, 'shluz_z', [19, 20]);
    say(s.c, 'Уйти в толпу');
    expect(s.g.flag('bounty_done')).toBe('slipped');
    say(s.c, '…');
    go(s, 'zap_lower');
    meet(s, 'podium', [19, 15]);
    say(s.c, 'Зачитать');
    expect(s.g.flag('forgery_fate')).toBe('public');
    expect(s.g.count('forgery_proof')).toBe(0);
  });

  it('the copy handed to Шлюз, or sold to Затвор', () => {
    const a = ready();
    go(a, 'zap_market');
    meet(a, 'shluz_z', [19, 20]);
    say(a.c, 'Прочтите сами');
    say(a.c, '…');
    meet(a, 'shluz_z', [19, 20]);
    say(a.c, 'Отдать её вам');
    expect(a.g.flag('forgery_fate')).toBe('shlyuz');
    const b = ready();
    go(b, 'zap_market');
    meet(b, 'shluz_z', [19, 20]);
    say(b.c, 'Уйти в толпу');
    say(b.c, '…');
    go(b, 'zap_upper');
    const caps = b.g.state.caps;
    meet(b, 'zatvor', [18, 11]);
    say(b.c, 'Продать');
    expect(b.g.flag('forgery_fate')).toBe('sold');
    expect(b.g.state.caps).toBe(caps + 400);
  });
});

describe('Chapter III side quests', () => {
  it('«Водоносы Лейки»: Тихон found by his ink; judged, given to the Trust, or let go', () => {
    for (const [pick, how] of [['Суди его сама', 'judged'], ['Сдадим Тресту', 'trust'], ['Отпусти его', 'spared']] as const) {
      const s = inside(setup());
      meet(s, 'lejka', [9, 22]);
      say(s.c, '…');
      say(s.c, 'Нужна помощь');
      say(s.c, 'Найду');
      say(s.c, 'Прощай');
      go(s, 'zap_sewers', 'lower');
      meet(s, 'tikhon', [12, 17]);
      say(s.c, 'Присмотреться');
      expect(s.g.flag('tikhon_known')).toBe(true);
      say(s.c, 'Отойти');
      go(s, 'zap_lower', 'hatch');
      meet(s, 'lejka', [9, 22]);
      say(s.c, 'оттиск Сургуча');
      say(s.c, pick);
      expect(s.g.flag('lejka')).toBe(how);
      expect(!!s.g.flag('lejka_ally')).toBe(how !== 'trust');
    }
  });

  it('«Тихий этаж»: the poison traced to Ада; ally, told or helped — and the Notary certifies for it', () => {
    for (const [pick, how] of [['Люди с красным воском', 'ally'], ['Отец узнает', 'told'], ['Заканчивай', 'helped']] as const) {
      const s = inside(setup());
      go(s, 'zap_market');
      meet(s, 'shtempel', [9, 9]);
      say(s.c, 'Прочтите');
      say(s.c, '…');
      say(s.c, 'Возьмусь за Башню');
      expect(s.g.flag('upper_ok')).toBe(true);
      say(s.c, '…');
      go(s, 'zap_upper');
      meet(s, 'ada_herbs', [6, 20]);
      say(s.c, 'красным воском');
      expect(s.g.flag('ada_exposed')).toBe(true);
      say(s.c, 'Отойти');
      meet(s, 'ada', [9, 22]);
      say(s.c, pick);
      expect(s.g.flag('quiet_floor')).toBe(how);
      if (how !== 'told') expect(s.g.count('ada_pass')).toBe(1);
      say(s.c, '…');
      go(s, 'zap_market');
      meet(s, 'shtempel', [9, 9]);
      say(s.c, 'Отравитель в Башне найден');
      expect(s.g.flag('mandate_certified')).toBe(true);
    }
  });

  it('«Мутные капли»: the Council\'s order found under the press; each ending', () => {
    for (const [pick, how] of [['Обнародую', 'public'], ['Совет заплатит', 'blackmail'], ['Штамп заберу', 'die'], ['Промолчу', 'share']] as const) {
      const s = inside(setup());
      go(s, 'zap_market');
      meet(s, 'gravyor', [30, 9]);
      say(s.c, 'Найду');
      meet(s, 'mint_press', [33, 8]);
      say(s.c, 'Осмотреть пресс');
      expect(s.g.flag('dull_known')).toBe(true);
      say(s.c, 'Отойти');
      if (how === 'die') {
        meet(s, 'mint_press', [33, 8]);
        say(s.c, 'поддельный штамп');
        expect(s.g.count('mint_die')).toBe(1);
        say(s.c, 'Отойти');
      }
      meet(s, 'gravyor', [30, 9]);
      say(s.c, pick);
      expect(s.g.flag('dull_drops')).toBe(how);
    }
  });

  it('«Сухой бунт»: Косой exposed and the crowd sent home; or led on the Tower; or turned on the Mint', () => {
    for (const [pick, how] of [['Показать толпе', 'quelled'], ['Веди', 'led'], ['Монетный двор', 'mint']] as const) {
      const s = inside(setup((g) => g.setFlag('dull_known', true)));
      meet(s, 'kosoy', [22, 17]);
      if (how !== 'led') {
        say(s.c, 'Сапоги у тебя новые');
        say(s.c, '…');
      }
      say(s.c, pick);
      expect(s.g.flag('dry_riot')).toBe(how);
    }
  });

  it('«Мытарь»: the widow\'s well sealed (the badge; the aqueduct shut), refused, or a fake seal', () => {
    for (const [pick, how] of [['Опечатать', 'sealed'], ['Не буду', 'refused'], ['пломбу, которая снимается', 'warned']] as const) {
      const s = inside(setup());
      s.g.char.spent.lockpick = 30;
      go(s, 'zap_market');
      meet(s, 'recruiter', [9, 22]);
      say(s.c, 'Записывай');
      say(s.c, '…');
      go(s, 'zap_lower');
      meet(s, 'agafya', [32, 27]);
      say(s.c, pick);
      expect(s.g.flag('tax_man')).toBe(how);
      expect(s.g.count('trust_badge')).toBe(how === 'refused' ? 0 : 1);
      if (how === 'sealed') expect(s.g.flag('aqueduct_closed')).toBe(true);
    }
  });

  it('the collector\'s badge opens the Upper city and the archive by service', () => {
    const s = inside(setup());
    s.g.give('trust_badge');
    go(s, 'zap_market');
    meet(s, 'upper_guard', [22, 4]);
    say(s.c, 'Бляха сборщика');
    expect(s.g.flag('upper_ok')).toBe(true);
    say(s.c, 'Отойти');
    go(s, 'zap_upper');
    meet(s, 'kulik', [25, 11]);
    say(s.c, 'Бляха сборщика');
    expect(s.g.flag('open_archive_door')).toBe(true);
  });
});

describe('Chapter III balance', () => {
  const RUNS = 200;
  const rate = (t: string, map: string, at: [number, number], foes: [string, number, number][], friends: [string, number, number][] = [], bare = false) => {
    let w = 0;
    for (let s = 1; s <= RUNS; s++) {
      const g = premadeGame(t, s * 7919);
      // arrested: nothing that fights is left in the bag
      if (bare) for (const [id, n] of Object.entries(g.state.items)) if (n && ['weapon', 'grenade', 'ammo', 'armor'].includes(CONTENT.items[id]?.cat ?? '')) delete g.state.items[id];
      if (placedBattle(g, TOWNS[map], at, foes, friends) === 'victory') w++;
    }
    return w / RUNS;
  };

  it('breaking the gate is a fighter\'s way; a riot with four prisoners is a real chance even bare-handed', () => {
    const r = Object.fromEntries(
      ['Стрелок', 'Механик', 'Говорун'].map((t) => [
        t,
        {
          gate: rate(t, 'zap_lower', [20, 36], [['collector', 19, 34], ['collector', 22, 34]]),
          riot: rate(t, 'zap_dock', [6, 9], [['zap_guard', 20, 11], ['dock_guard', 12, 14], ['dock_guard', 24, 17]], [['prisoner', 12, 9], ['prisoner', 14, 9], ['prisoner', 19, 9], ['prisoner', 8, 10]], true),
        },
      ]),
    );
    process.stderr.write(`Chapter III fights, level 3: ${JSON.stringify(r)}\n`);
    expect(r['Стрелок'].gate).toBeGreaterThanOrEqual(0.85);
    expect(r['Говорун'].gate).toBeLessThanOrEqual(0.65);
    for (const t of ['Стрелок', 'Механик', 'Говорун']) expect(r[t].riot).toBeGreaterThanOrEqual(0.4);
  });
});
