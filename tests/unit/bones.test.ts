// Chapter VIII «Костяной круг» (stage B) in the real room: the gate of ribs four ways, the second half of the key
// four ways, the Printer named three ways (and by the kidnapper), the hostage taken and freed by a storm, a bargain or
// a fake tube; the side quests with every ending; the draisine between the Депо, the ruins and the pass.
import { describe, it, expect } from 'vitest';
import type { Game } from '../../src/core/Game';
import { room, until, TOWNS } from './rooms';
import { placedBattle, premadeGame, toLevel } from './sim';
import { say, talk, winFight } from './story';

/** After Chapter VII: the tube and Верес's diary in the bag, money; every roll lands unless told otherwise. */
function setup(patch: (g: Game) => void = () => {}, map = 'bone_camp', entry?: string) {
  const { r, clients } = room();
  const [c] = clients;
  const g = r.players.get(c.id)!.game;
  for (let n = 1; n <= 7; n++) for (const k of [`chapter${n}_seen`, `chapter${n}_done`]) g.setFlag(k, true);
  g.setFlag('trust_outcome', 'tax');
  g.setFlag('day', 50);
  g.give('tube');
  g.give('veres_diary');
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
const go = (s: S, map: string, entry?: string) => {
  done(s);
  s.r.goTo(map, entry);
};
const opts = (s: S) => s.c.last('dialogue')!.options;

/** Through the gate on the word of the trial. */
function inside(s: S) {
  meet(s, 'bone_guard', [18, 33]);
  say(s.c, 'Я иду на сухую неделю');
  expect(s.g.flag('bones_in')).toBe(true);
  return s;
}

/** The key by Верес's diary. */
function keyed(s: S) {
  inside(s);
  meet(s, 'tresh', [20, 16]);
  say(s.c, 'Вторая половина ключа');
  say(s.c, 'Вот дневник Вереса');
  expect(s.g.flag('key_whole')).toBe(true);
  return s;
}

describe('Chapter VIII: the gate of ribs', () => {
  it('arriving starts the chapter; the guard lets in a friend of Шёпот, of Кремень, or one going on the trial', () => {
    const s = setup((g) => (g.char.attrs.end = 6));
    expect(s.g.stage('bones')).toBe('canyon');
    inside(s);
    expect([s.g.flag('circle_way'), s.g.flag('open_bone_gate_a'), s.g.stage('bones')]).toEqual(['trial', true, 'key']);

    const shepot = setup((g) => g.setFlag('last_bout', 'spared'));
    meet(shepot, 'bone_guard', [18, 33]);
    say(shepot.c, 'Шёпот знает меня');
    expect(shepot.g.flag('circle_way')).toBe('shepot');

    const kremen = setup((g) => g.setFlag('raid_outcome', 'trapped'));
    meet(kremen, 'bone_guard', [18, 33]);
    say(kremen.c, 'Кремень помнит меня');
    expect(kremen.g.flag('circle_way')).toBe('kremen');

    const weak = setup((g) => {
      g.char.attrs.end = 3;
      g.char.tags = g.char.tags.filter((t) => t !== 'survival');
    });
    meet(weak, 'bone_guard', [18, 33]);
    expect(opts(weak).some((o) => o.includes('сухую неделю'))).toBe(false);
  });

  it('forced: the gate guards fall, the gate opens, the Сухари will remember', () => {
    const s = setup();
    meet(s, 'bone_guard', [18, 33]);
    say(s.c, 'Пустите — или пройду сам');
    say(s.c, '…');
    expect(until(s.r, () => !!s.r.fight, 10_000)).toBe(true);
    winFight(s.r, s.c);
    expect(until(s.r, () => s.g.flag('circle_way') === 'forced', 20_000)).toBe(true);
    expect([s.g.flag('bones_enemy'), s.g.flag('open_bone_gate_b')]).toEqual([true, true]);
  });
});

describe('Chapter VIII: the second half of the key', () => {
  it('by Верес\'s diary: the oath was «not to give water to war», not «to no one»', () => {
    const s = keyed(setup((g) => (g.char.attrs.end = 6)));
    expect([s.g.flag('key_way'), s.g.count('key_half'), s.g.stage('bones')]).toEqual(['diary', 1, 'printer']);
  });

  it('by the dry week: the «Мираж» sent away, or found out as Кремень\'s test; buying water fails it', () => {
    const s = setup((g) => (g.char.attrs.end = 7));
    inside(s);
    meet(s, 'tresh', [20, 16]);
    say(s.c, 'Вторая половина ключа');
    say(s.c, 'Пройду сухую неделю');
    go(s, 'bone_trail');
    meet(s, 'week_stone', [19, 16]);
    say(s.c, 'Сесть у камня и терпеть');
    say(s.c, 'Кто тебя прислал');
    expect([s.g.flag('dry_week'), s.g.flag('mirage_sent')]).toEqual(['passed', true]);
    go(s, 'bone_camp', 'north');
    meet(s, 'tresh', [20, 16]);
    say(s.c, 'Вторая половина ключа');
    say(s.c, 'Сухая неделя пройдена');
    expect(s.g.flag('key_way')).toBe('trial');

    const b = setup((g) => (g.char.attrs.end = 7), 'bone_trail');
    meet(b, 'week_stone', [19, 16]);
    say(b.c, 'Сесть у камня и терпеть');
    say(b.c, 'Купить воды');
    expect(b.g.flag('dry_week')).toBe('bought');
  });

  it('stolen from the niche in the cave of the oath, through the crawl from the trail', () => {
    const s = setup(() => {}, 'bone_trail');
    meet(s, 'cave_crawl', [34, 8]);
    say(s.c, 'Пролезть внутрь');
    expect(until(s.r, () => s.r.map.id === 'oath_cave', 5000)).toBe(true);
    meet(s, 'key_niche', [15, 6]);
    say(s.c, 'Вынуть пластину тихо');
    expect([s.g.flag('key_way'), s.g.flag('bones_suspicious'), s.g.count('key_half')]).toEqual(['stolen', true, 1]);
  });

  it('taken by force: Трещина and Кремень fall; the Сухари become enemies', () => {
    const s = setup((g) => (g.char.attrs.end = 6));
    inside(s);
    meet(s, 'tresh', [20, 16]);
    say(s.c, 'Вторая половина ключа');
    say(s.c, 'Отдай ключ');
    say(s.c, 'Возьму');
    say(s.c, '…');
    expect(until(s.r, () => !!s.r.fight, 10_000)).toBe(true);
    winFight(s.r, s.c);
    expect(until(s.r, () => s.g.flag('key_way') === 'taken', 20_000)).toBe(true);
    expect([s.g.flag('bones_enemy'), s.g.count('key_half')]).toEqual([true, 1]);
  });
});

describe('Chapter VIII: the Printer and the hostage', () => {
  it('Ада\'s letter names the Printer at the gate; the traitor\'s letter is the eleventh seal', () => {
    const ada = setup((g) => g.setFlag('quiet_floor', 'ally'));
    expect([ada.g.flag('printer_way'), ada.g.count('ada_letter')]).toEqual(['ada', 1]);

    const t = setup((g) => {
      g.char.attrs.end = 6;
      g.char.attrs.per = 7;
    });
    inside(t);
    meet(t, 'tresh', [20, 16]);
    say(t.c, 'В круге всё спокойно');
    meet(t, 'traitor_tent', [7, 21]);
    say(t.c, 'Красный воск');
    meet(t, 'shcheben', [9, 22]);
    say(t.c, 'Беги');
    expect([t.g.flag('traitor'), t.g.flag('sealwax_misled'), t.g.flag('seal_mark_11'), t.g.flag('printer_way')]).toEqual(['released', true, true, 'traitor']);
  });

  it('the library: torn pages, the tenth seal, the Notary\'s hand on the margin', () => {
    const s = setup((g) => g.setFlag('mandate_read', true), 'ruins_library', 'west');
    meet(s, 'suhovey_book', [20, 19]);
    say(s.c, 'реестре Нотариуса');
    say(s.c, 'Забрать книгу');
    expect([s.g.flag('seal_mark_10'), s.g.flag('printer_way'), s.g.flag('library'), s.g.count('suhovey_book')]).toEqual([true, 'library', 'taken', 1]);
  });

  /** The key in the tube with Лёля walking along, then the next arrival brings the note. */
  function taken(patch: (g: Game) => void = () => {}) {
    const s = keyed(setup((g) => {
      g.char.attrs.end = 6;
      patch(g);
    }));
    go(s, 'ruins_streets');
    return s;
  }

  it('the note comes at the next arrival: Марта is taken; Лёля if she walks along', () => {
    const m = taken();
    expect([m.g.flag('hostage'), m.g.flag('marta_taken'), m.g.count('ransom_note'), m.g.stage('bones')]).toEqual(['marta', true, 1, 'hostage']);

    const l = taken((g) => {
      g.setFlag('archive_seen', true);
      g.char.attrs.cha = 6;
    });
    expect(l.g.flag('hostage')).toBe('marta'); // she was not with the hero
    const l2 = setup((g) => g.setFlag('archive_seen', true), 'depot_shops');
    meet(l2, 'lelya', [22, 12]);
    say(l2.c, 'Пойдёшь со мной');
    expect(l2.g.flag('with_lelya')).toBe(true);
    l2.g.setFlag('key_whole', true);
    go(l2, 'ruins_streets');
    expect([l2.g.flag('hostage'), l2.g.flag('lelya_taken'), l2.g.flag('with_lelya')]).toEqual(['lelya', true, false]);
  });

  it('a bargain of 500 drops: freed, the Printer named by a slip of the tongue, the chapter ends', () => {
    const s = taken();
    go(s, 'ruins_cellar', 'ladder');
    meet(s, 'pisar_k', [17, 10]);
    say(s.c, 'Пятьсот капель');
    say(s.c, '…');
    expect([s.g.flag('hostage_way'), s.g.flag('marta_taken'), s.g.flag('printer_way'), s.g.flag('chapter8_done'), s.g.flag('mandate_known')]).toEqual(['bargained', false, 'scribe', true, true]);
    expect(s.g.stage('bones')).toBe('done');
  });

  it('a fake tube from Манометр: the Писарь spared at Три столба takes it quietly; Оттиск takes it too', () => {
    const quiet = taken((g) => {
      g.setFlag('scribe_outcome', 'exposed');
      g.char.spent.science = 100;
    });
    go(quiet, 'depot_shops');
    meet(quiet, 'manometr', [11, 16]);
    say(quiet.c, 'Сделаем копию тубуса — такую');
    expect(quiet.g.count('fake_mandate')).toBe(1);
    go(quiet, 'ruins_cellar', 'ladder');
    meet(quiet, 'pisar_k', [17, 10]);
    say(quiet.c, 'Вот тубус');
    expect(quiet.c.last('dialogue')!.text).toContain('Долг платежом');
    say(quiet.c, '…');
    expect([quiet.g.flag('hostage_way'), quiet.g.count('tube'), quiet.g.count('fake_mandate')]).toEqual(['fake', 1, 0]);

    const ottisk = setup((g) => {
      g.setFlag('scribe_outcome', 'killed');
      g.char.attrs.end = 6;
    });
    expect(ottisk.g.flag('kidnapper')).toBe('ottisk');
    inside(ottisk);
    meet(ottisk, 'tresh', [20, 16]);
    say(ottisk.c, 'Вторая половина ключа');
    say(ottisk.c, 'Вот дневник Вереса');
    ottisk.g.give('fake_mandate');
    go(ottisk, 'ruins_streets'); // the note comes on arrival
    go(ottisk, 'ruins_cellar', 'ladder');
    expect(ottisk.r.npcs.has('ottisk') || ottisk.r.hostiles.list.some((h) => h.id === 'ottisk')).toBe(true);
    meet(ottisk, 'ottisk', [17, 10]);
    say(ottisk.c, 'Вот тубус');
    say(ottisk.c, '…');
    expect(ottisk.g.flag('hostage_way')).toBe('fake');
  });

  it('stormed: the agents fall, the hostage is cut loose, the Printer\'s letter lies on the table', () => {
    const s = taken();
    go(s, 'ruins_cellar', 'ladder');
    meet(s, 'pisar_k', [17, 10]);
    say(s.c, 'заберу силой');
    say(s.c, '…');
    expect(until(s.r, () => !!s.r.fight, 10_000)).toBe(true);
    winFight(s.r, s.c);
    expect(until(s.r, () => s.g.flag('hostage_way') === 'stormed', 20_000)).toBe(true);
    expect([s.g.flag('marta_taken'), s.g.flag('printer_way'), s.g.flag('chapter8_done')]).toEqual([false, 'scribe', true]);
  });
});

describe('Chapter VIII: side quests', () => {
  it('«Кости предков»: Кремень digs for the dam guard\'s map; reported, helped, or the map taken', () => {
    for (const [answer, how] of [['Расскажу Матери', 'reported'], ['Помогу искать', 'helped'], ['Отдай карту мне', 'taken']] as const) {
      const s = setup((g) => {
        g.char.attrs.end = 6;
        g.char.attrs.per = 6;
      });
      inside(s);
      meet(s, 'dug_bones', [27, 13]);
      say(s.c, 'Следы подбитых сапог');
      meet(s, 'kremen_c', [28, 21]);
      say(s.c, answer);
      expect(s.g.flag('ancestors')).toBe(how);
      if (how === 'helped') expect(s.g.flag('kremen_strike')).toBe(true);
      if (how === 'taken') expect(s.g.count('aqueduct_map')).toBe(1);
    }
  });

  it('«Схема пластины»: the manual release of the dam — to Лёля, kept, or burnt', () => {
    for (const [answer, how] of [['Оставить себе', 'kept'], ['Сжечь', 'burned']] as const) {
      const s = setup(() => {}, 'ruins_library', 'west');
      meet(s, 'drawings_cabinet', [28, 23]);
      say(s.c, 'Вскрыть замок');
      say(s.c, answer);
      expect([s.g.flag('plate_scheme'), s.g.flag('manual_release')]).toEqual([how, true]);
    }
  });

  it('«Музей»: a tour, a new calendar, a picked case, or a fight — the Rod of the Watcher', () => {
    const tour = setup(() => {}, 'ruins_museum');
    meet(tour, 'curator', [18, 14]);
    say(tour.c, 'экскурсия');
    expect([tour.g.flag('museum'), tour.g.count('watcher_rod')]).toEqual(['tour', 1]);

    const prog = setup((g) => (g.char.spent.repair = 100), 'ruins_museum');
    meet(prog, 'curator', [18, 14]);
    say(prog.c, 'перевести календарь');
    expect(prog.g.flag('museum')).toBe('reprogrammed');

    const pick = setup(() => {}, 'ruins_museum');
    meet(pick, 'rod_case', [17, 8]);
    say(pick.c, 'Вскрыть витрину');
    expect(pick.g.flag('museum')).toBe('picked');

    const fight = setup(() => {}, 'ruins_museum');
    for (const h of fight.r.hostiles.list) if (h.group !== 'curator') h.dead = true;
    meet(fight, 'curator', [18, 14]);
    say(fight.c, 'Отойди от витрины');
    say(fight.c, '…');
    expect(until(fight.r, () => !!fight.r.fight, 10_000)).toBe(true);
    winFight(fight.r, fight.c);
    expect(until(fight.r, () => fight.g.flag('museum') === 'fought', 20_000)).toBe(true);
  });

  it('«Мэрия»: the land books taken, copied, or left with the Бригада', () => {
    for (const [answer, how] of [['Забрать книги', 'taken'], ['Переписать', 'copied'], ['Оставить на месте', 'brigade']] as const) {
      const s = setup((g) => (g.char.spent.science = 60), 'ruins_streets');
      for (const h of s.r.hostiles.list) h.dead = true;
      meet(s, 'land_registry', [9, 8]);
      say(s.c, answer);
      expect(s.g.flag('city_hall')).toBe(how);
      expect(s.g.count('land_books') > 0 || s.g.flag('land_books_brigade') === true).toBe(true);
    }
  });

  it('«Дрезина»: built for drops, then a ride from the Депо to the ruins and on to the pass', () => {
    const s = setup(() => {}, 'depot_yard');
    meet(s, 'draisine_depot', [15, 22]);
    say(s.c, 'Купить детали');
    expect(s.g.flag('draisine')).toBe('built');
    say(s.c, '…');
    say(s.c, 'В руины');
    expect(until(s.r, () => s.r.map.id === 'ruins_streets', 5000)).toBe(true);
    for (const h of s.r.hostiles.list) h.dead = true;
    meet(s, 'draisine_ruins', [36, 22]);
    say(s.c, 'К «Воротам»');
    expect(until(s.r, () => s.r.map.id === 'gates_post', 5000)).toBe(true);
  });
});

describe('Chapter VIII balance', () => {
  const RUNS = 200;
  const titles = ['Стрелок', 'Механик', 'Говорун'];
  const rate = (map: string, at: [number, number], foes: [string, number, number][], friends: [string, number, number][] = []) =>
    Object.fromEntries(
      titles.map((t) => {
        let w = 0;
        for (let s = 1; s <= RUNS; s++) {
          const g = premadeGame(t, s * 7919);
          toLevel(g, 8); // level 8 by Chapter VIII
          if (placedBattle(g, TOWNS[map], at, foes, friends) === 'victory') w++;
        }
        return [t, w / RUNS];
      }),
    );

  it('the elders of the circle and the cellar are hard alone; the museum\'s automaton is a fair duel', () => {
    const elders: [string, number, number][] = [['tresh', 20, 14], ['kremen', 26, 18], ['suhar', 14, 12]];
    const cellar: [string, number, number][] = [['pisar_k', 17, 9], ['sealwax_agent', 13, 12], ['sealwax_agent', 21, 12], ['sealwax_agent', 26, 20]];
    const r = {
      elders: rate('bone_camp', [20, 24], elders),
      eldersWithVedro: rate('bone_camp', [20, 24], elders, [['vedro_ally', 21, 25]]),
      cellar: rate('ruins_cellar', [8, 22], cellar),
      cellarWithLelya: rate('ruins_cellar', [8, 22], cellar, [['lelya_ally', 7, 23]]),
      curator: rate('ruins_museum', [18, 18], [['curator_bot', 18, 13]]),
    };
    process.stderr.write(`Chapter VIII, level 8: ${JSON.stringify(r)}\n`);
    expect(r.elders['Стрелок']).toBeLessThanOrEqual(0.8);
    expect(r.eldersWithVedro['Стрелок']).toBeGreaterThanOrEqual(r.elders['Стрелок']);
    expect(r.cellar['Стрелок']).toBeLessThanOrEqual(0.8);
    expect(r.cellarWithLelya['Стрелок']).toBeGreaterThanOrEqual(r.cellar['Стрелок']);
    expect(r.curator['Стрелок']).toBeGreaterThanOrEqual(0.4);
    expect(r.curator['Механик']).toBeLessThanOrEqual(0.5);
  });
});
