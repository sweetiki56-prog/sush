// Chapter IX «Заслон» (stage F) in the real room: the boom of the pass four ways, the sides of the siege by the
// flags of the whole game, the crest three ways, the machine hall three ways, the trial by the number of pieces of
// evidence (or a fight, or a deal), the seven choices at the console; then the slides of the ending.
import { describe, it, expect } from 'vitest';
import type { Game } from '../../src/core/Game';
import { CONTENT } from '../../src/content';
import { slidesFor } from '../../src/core/endings';
import { room, until, TOWNS } from './rooms';
import { placedBattle, premadeGame } from './sim';
import { say, talk, winFight } from './story';

/** After Chapter VIII: the whole tube, money; every roll lands unless told otherwise. */
function setup(patch: (g: Game) => void = () => {}, map = 'dam_approach', entry?: string) {
  const { r, clients } = room();
  const [c] = clients;
  const g = r.players.get(c.id)!.game;
  for (let n = 1; n <= 8; n++) for (const k of [`chapter${n}_seen`, `chapter${n}_done`]) g.setFlag(k, true);
  for (const [k, v] of [['trust_outcome', 'tax'], ['day', 60], ['key_whole', true], ['boom_up', true]] as const) g.setFlag(k, v);
  g.give('tube');
  g.state.caps = 2000;
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
const opts = (s: S) => s.c.last('dialogue')!.options;
const fight = (s: S) => {
  expect(until(s.r, () => !!s.r.fight, 10_000)).toBe(true);
  winFight(s.r, s.c);
};

describe('Chapter IX: the boom of the pass', () => {
  it('lifted by Лукич\'s pass, his word or Шлюз\'s doubt; the north road opens', () => {
    for (const [patch, answer, way] of [
      [(g: Game) => g.give('gates_pass'), 'Пропуск Лукича', 'pass'],
      [(g: Game) => g.setFlag('lukich_friend', true), 'Лукич, подними', 'lukich'],
      [(g: Game) => g.setFlag('shluz_doubts', true), 'Шлюз сам усомнился', 'shluz'],
    ] as const) {
      const s = setup((g) => {
        g.setFlag('boom_up', false);
        patch(g);
      }, 'gates_post');
      meet(s, 'boom_b', [19, 11]);
      say(s.c, answer);
      expect([s.g.flag('boom_up'), s.g.flag('boom_way'), s.g.flag('open_boom_b')]).toEqual([true, way, true]);
    }
  });

  it('or by force: the guards of the pass fall', () => {
    const s = setup((g) => g.setFlag('boom_up', false), 'gates_post');
    meet(s, 'boom_b', [19, 11]);
    say(s.c, 'Поднять силой');
    say(s.c, '…');
    fight(s);
    expect(until(s.r, () => s.g.flag('boom_way') === 'forced', 20_000)).toBe(true);
  });

  it('the boom stays down before Chapter VIII ends', () => {
    const s = setup((g) => {
      g.setFlag('boom_up', false);
      g.setFlag('chapter8_done', false);
      g.give('gates_pass');
    }, 'gates_post');
    meet(s, 'boom_b', [19, 11]);
    expect(opts(s)).toHaveLength(1);
  });
});

describe('Chapter IX: the siege', () => {
  it('the sides come by the flags of the whole game', () => {
    const all = setup((g) => {
      g.setFlag('threat_told', 'circle');
      g.setFlag('order_ally', true);
      g.setFlag('salt_promise', 'sections');
      g.setFlag('defector', 'saved');
    });
    expect(['ally_circle', 'ally_dry', 'ally_order', 'ally_salt', 'shore_known'].map((k) => all.g.flag(k))).toEqual([true, true, true, true, true]);
    expect(all.g.stage('dam')).toBe('siege');
    const none = setup((g) => {
      g.setFlag('bones_enemy', true);
      g.setFlag('salt_promise', 'refuse');
    });
    expect(['ally_circle', 'ally_dry', 'ally_order', 'ally_salt', 'shore_known'].map((k) => none.g.flag(k) ?? false)).toEqual([false, false, false, false, false]);
  });

  it('the treaty of the shores: freely to the one who saved Ратмир, by a good word, or war', () => {
    const saved = setup((g) => g.setFlag('defector', 'saved'));
    meet(saved, 'yarina_dam', [34, 8]);
    say(saved.c, 'Ратмир жив');
    expect(saved.g.flag('shore_treaty')).toBe(true);
    const word = setup((g) => g.setFlag('second_dam_hint', true));
    meet(word, 'yarina_dam', [34, 8]);
    say(word.c, 'Договор берегов');
    expect(word.g.flag('shore_treaty')).toBe(true);
    const war = setup((g) => g.setFlag('second_dam_hint', true));
    meet(war, 'yarina_dam', [34, 8]);
    say(war.c, 'Уходите за горы');
    expect(war.g.flag('shore_war')).toBe(true);
  });
});

describe('Chapter IX: to the console', () => {
  it('the crest by Шлюз\'s doubt: he opens the gate and goes to the trial as a witness', () => {
    const s = setup((g) => g.setFlag('shluz_doubts', true), 'dam_crest');
    meet(s, 'shluz_dam', [22, 9]);
    say(s.c, 'Ты усомнился в приказе');
    say(s.c, '…');
    expect([s.g.flag('dam_way'), s.g.flag('shluz_ally'), s.g.flag('open_hall_door_a'), s.g.stage('dam')]).toEqual(['parley', true, true, 'machines']);
  });

  it('the crest stormed: the Trust\'s army falls, the gate stands open', () => {
    const s = setup(() => {}, 'dam_crest');
    meet(s, 'shluz_dam', [22, 9]);
    say(s.c, 'Тогда силой');
    say(s.c, '…');
    fight(s);
    expect(until(s.r, () => s.g.flag('dam_way') === 'storm', 30_000)).toBe(true);
  });

  it('under the crest by the Бригада\'s water main, with the dam guard\'s map', () => {
    const s = setup((g) => g.give('aqueduct_map'));
    meet(s, 'aqueduct_hatch', [6, 33]);
    say(s.c, 'Сверить с картой');
    say(s.c, 'Пролезть');
    expect(until(s.r, () => s.r.map.id === 'dam_machines', 5000)).toBe(true);
    expect(s.g.flag('dam_way')).toBe('aqueduct');
  });

  it('the machine hall: the sentries stood down by hand or by Ведро\'s clearance, or fought', () => {
    const hand = setup((g) => (g.char.spent.repair = 100), 'dam_machines');
    meet(hand, 'sentry_panel', [33, 23]);
    say(hand.c, 'Разомкнуть цепь');
    expect([hand.g.flag('machines_way'), hand.g.flag('sentries_off')]).toEqual(['off', true]);
    meet(hand, 'machines_up', [20, 4]);
    say(hand.c, 'Подняться');
    expect(until(hand.r, () => hand.r.map.id === 'dam_control', 5000)).toBe(true);

    const vedro = setup((g) => {
      g.setFlag('with_vedro', true);
      g.setFlag('clearance', 'hero');
    }, 'dam_machines');
    meet(vedro, 'sentry_panel', [33, 23]);
    say(vedro.c, 'Ведро, передай допуск');
    expect(vedro.g.flag('machines_way')).toBe('vedro');

    const quiet = setup(() => {}, 'dam_machines');
    expect(quiet.r.fight).toBeNull(); // a quiet way in: the sentries walk their rounds
    meet(quiet, 'sentry_panel', [33, 23]);
    say(quiet.c, 'Разбить щиток');
    say(quiet.c, '…');
    fight(quiet);
    expect(until(quiet.r, () => quiet.g.flag('machines_way') === 'fight', 30_000)).toBe(true);

    const f = setup((g) => g.setFlag('dam_way', 'storm'), 'dam_machines');
    expect(f.g.flag('hall_alarm')).toBe(true); // the storm overhead raised them
    f.c.do({ t: 'debug', op: { op: 'teleport', x: 19, y: 16 } });
    fight(f);
    expect(until(f.r, () => f.g.flag('machines_way') === 'fight', 30_000)).toBe(true);
  });
});

describe('Chapter IX: the trial', () => {
  const evidence = (g: Game, n: number) => {
    const all: (() => void)[] = [
      () => g.give('stempel_letter'),
      () => g.give('printer_letter'),
      () => g.give('veres_diary'),
      () => g.setFlag('mandate_certified', true),
      () => g.give('land_books'),
      () => g.give('suhovey_book'),
    ];
    all.slice(0, n).forEach((f) => f());
  };
  const show = (s: S, n: number) => {
    for (let i = 0; i < n; i++) {
      const d = s.c.last('dialogue')!;
      const at = d.options.findIndex((o) => !['Суд окончен', 'Признай сам', 'Мандат — Тресту', 'Хватит слов', 'Позже'].some((w) => o.startsWith(w)));
      s.c.do({ t: 'choose', i: at });
      say(s.c, '…');
    }
  };

  it('two pieces are not enough; three make a trial; five make Затвор confess himself', () => {
    const two = setup((g) => evidence(g, 2), 'dam_control');
    meet(two, 'zatvor_dam', [17, 10]);
    show(two, 2);
    expect(opts(two).some((o) => o.startsWith('Суд окончен'))).toBe(false);

    const three = setup((g) => evidence(g, 3), 'dam_control');
    meet(three, 'zatvor_dam', [17, 10]);
    show(three, 3);
    expect(three.g.flag('evidence')).toBe(3);
    expect(opts(three).some((o) => o.startsWith('Признай сам'))).toBe(false);
    say(three.c, 'Суд окончен');
    say(three.c, '…');
    expect([three.g.flag('trial_way'), three.g.flag('zatvor_judged'), three.g.stage('dam')]).toEqual(['judged', true, 'choice']);

    const five = setup((g) => evidence(g, 5), 'dam_control');
    meet(five, 'zatvor_dam', [17, 10]);
    show(five, 5);
    say(five.c, 'Признай сам');
    say(five.c, '…');
    expect(five.g.flag('trial_way')).toBe('persuaded');
  });

  it('a deal: the Mandate sold to the Trust ends the game at once; the Printer\'s «power of paper» leaves the console free', () => {
    const trust = setup(() => {}, 'dam_control');
    meet(trust, 'zatvor_dam', [17, 10]);
    say(trust.c, 'Мандат — Тресту');
    say(trust.c, 'По рукам');
    say(trust.c, '…');
    expect([trust.g.flag('ending'), trust.g.flag('chapter9_done')]).toEqual(['trust', true]);

    const wax = setup((g) => g.setFlag('printer_known', true), 'dam_control');
    meet(wax, 'stempel_dam', [20, 10]);
    say(wax.c, 'Договорились');
    say(wax.c, '…');
    expect([wax.g.flag('trial_way'), wax.g.flag('sealwax_rules')]).toEqual(['deal_sealwax', true]);
  });

  it('or a fight in the control room', () => {
    const s = setup(() => {}, 'dam_control');
    meet(s, 'zatvor_dam', [17, 10]);
    say(s.c, 'Хватит слов');
    say(s.c, '…');
    fight(s);
    expect(until(s.r, () => s.g.flag('trial_way') === 'fought', 30_000)).toBe(true);
  });

  it('the console: seven choices, each ends the story; the flood needs the manual release and its drawing', () => {
    for (const [answer, way] of [['Кругу колодцев', 'circle'], ['Тресту', 'trust'], ['Гильдии', 'guild'], ['Бригаде', 'brigade'], ['Сухарям', 'dry'], ['Себе', 'self'], ['Третий ярус', 'flood']] as const) {
      const s = setup((g) => {
        g.setFlag('trial_way', 'judged');
        if (way === 'flood') {
          g.setFlag('manual_release', true);
          g.give('gate_scheme');
        }
      }, 'dam_control');
      meet(s, 'dam_console', [17, 6]);
      if (way !== 'flood') expect(opts(s).some((o) => o.startsWith('Третий ярус'))).toBe(false);
      say(s.c, answer);
      say(s.c, '…');
      expect([s.g.flag('ending'), s.g.flag('chapter9_done'), s.g.stage('dam')]).toEqual([way, true, 'done']);
    }
  });
});

describe('the ending slides', () => {
  const game = (flags: Record<string, string | boolean>) => {
    const g = premadeGame('Стрелок', 1);
    g.char.name = 'Ворон';
    for (const [k, v] of Object.entries(flags)) g.setFlag(k, v);
    return g;
  };

  it('every slide has a title and at least one variant; every condition is a known shape', () => {
    for (const s of CONTENT.endings) {
      expect(s.title.length, s.id).toBeGreaterThan(0);
      expect(s.variants.length, s.id).toBeGreaterThan(0);
    }
    expect(CONTENT.endings[0].id).toBe('choice');
    expect(CONTENT.endings.at(-1)!.id).toBe('name');
  });

  it('the choice comes first and the nickname last; slides with no match are skipped; {name} is the hero', () => {
    const g = game({ ending: 'circle', trial_way: 'judged', printer_known: true, dew_fate: 'all', shore_treaty: true, met_lelya: true });
    const sl = slidesFor(g, CONTENT.endings);
    expect(sl[0]).toMatchObject({ id: 'choice' });
    expect(sl[0].text).toContain('Кругу колодцев');
    expect(sl.at(-1)!.text).toContain('Ворон');
    expect(sl.at(-1)!.text).toContain('Разрыватель печатей');
    const ids = sl.map((s) => s.id);
    expect(ids).toContain('lelya');
    expect(ids).not.toContain('irga'); // never met
    expect(sl.find((s) => s.id === 'shore')!.text).toContain('Договор берегов');
  });

  it('the flood: «Утопленник», and Лёля who opened the third tier', () => {
    const sl = slidesFor(game({ ending: 'flood', plate_scheme: 'lelya', met_lelya: true }), CONTENT.endings);
    expect(sl[0].text).toContain('Ручной сброс');
    expect(sl.find((s) => s.id === 'lelya')!.text).toContain('третий ярус');
    expect(sl.at(-1)!.text).toContain('Утопленник');
  });
});

describe('Chapter IX balance', () => {
  const RUNS = 200;
  const titles = ['Стрелок', 'Механик', 'Говорун'];
  const rate = (map: string, at: [number, number], foes: [string, number, number][], friends: [string, number, number][] = []) =>
    Object.fromEntries(
      titles.map((t) => {
        let w = 0;
        for (let s = 1; s <= RUNS; s++) {
          const g = premadeGame(t, s * 7919);
          g.addXp(3600); // level 9–10 by Chapter IX
          if (placedBattle(g, TOWNS[map], at, foes, friends) === 'victory') w++;
        }
        return [t, w / RUNS];
      }),
    );

  it('the crest is a battle for an army: hopeless alone, won with the sides of the siege', () => {
    const army: [string, number, number][] = [['shluz_c', 22, 8], ['zap_guard', 14, 10], ['zap_guard', 29, 10], ['zap_guard', 22, 14]];
    const allies: [string, number, number][] = [['militia', 17, 24], ['suhar', 26, 24], ['dew_knight', 15, 22], ['salt_fighter', 28, 22]];
    const r = {
      crest: rate('dam_crest', [21, 26], army),
      crestWithAllies: rate('dam_crest', [21, 26], army, allies),
      machines: rate('dam_machines', [19, 26], [['dam_sentry', 12, 14], ['dam_sentry', 26, 20]]),
      control: rate('dam_control', [6, 20], [['zatvor_c', 17, 9], ['zap_guard', 13, 12], ['zap_guard', 22, 12]]),
    };
    process.stderr.write(`Chapter IX, level 9: ${JSON.stringify(r)}\n`);
    expect(r.crest['Стрелок']).toBeLessThanOrEqual(0.3);
    expect(r.crestWithAllies['Стрелок']).toBeGreaterThanOrEqual(0.5);
    expect(r.machines['Стрелок']).toBeLessThanOrEqual(0.8);
    expect(r.control['Стрелок']).toBeGreaterThanOrEqual(0.3);
  }, 180_000);
});
