// The rest of Низовье (stage N) in the real room: the lead flower four ways and Тимофей, the raid on the shelter,
// the bell of Хлебное, the herd at Свинцовый, the «Мираж» still, the debtor, the stolen water truck, the Ark and its
// radio, the lost pilgrim found in time or too late, and Хэнк's debt in the Lower city.
import { describe, it, expect } from 'vitest';
import type { Game } from '../../src/core/Game';
import { CONTENT } from '../../src/content';
import { room, until, untilAlone, TOWNS } from './rooms';
import { placedBattle, premadeGame, toLevel } from './sim';
import { say, talk, winFight } from './story';

/** After Chapter I (II when asked); money; every roll lands unless told otherwise. */
function setup(patch: (g: Game) => void = () => {}, map = 'dead_fields', entry?: string) {
  const { r, clients } = room();
  const [c] = clients;
  const g = r.players.get(c.id)!.game;
  for (const k of ['chapter1_seen', 'chapter1_done']) g.setFlag(k, true);
  g.setFlag('trust_outcome', 'tax');
  g.state.caps = 1000;
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
const fight = (s: S) => {
  expect(until(s.r, () => !!s.r.fight, 10_000)).toBe(true);
  winFight(s.r, s.c);
};
const calm = (s: S) => {
  for (const h of s.r.hostiles.list) h.dead = true;
};

describe('Низовье: the places open after Chapter I', () => {
  it('four places with their areas, none waiting for a chapter any more', () => {
    for (const id of ['khlebnoe', 'silence', 'elevator', 'ark']) {
      const loc = CONTENT.locations[id];
      expect(loc.map, id).toBeDefined();
      expect(loc.chapter, id).toBeUndefined();
      expect(loc.open, id).toEqual([{ flag: 'chapter1_done' }]);
    }
  });
});

describe('«Свинцовый цветок» and Тимофей', () => {
  /** Тимофей asks for the flower. */
  const asked = (patch: (g: Game) => void = () => {}) => {
    const s = setup(patch, 'silence_house');
    meet(s, 'timofey', [22, 10]);
    say(s.c, 'Какие цветы');
    return s;
  };

  it('bought from Гвоздарь, talked out of him after the herd, or the farmers driven off', () => {
    const buy = asked();
    go(buy, 'dead_fields');
    calm(buy);
    meet(buy, 'gvozdar', [12, 14]);
    say(buy.c, 'Мне нужны свинцовые цветы');
    say(buy.c, 'Сто пятьдесят капель');
    expect([buy.g.flag('lead_flower'), buy.g.flag('dry_cure'), buy.g.count('lead_bloom')]).toEqual(['bought', true, 1]);

    const talked = asked((g) => g.setFlag('svinec_grateful', true));
    go(talked, 'dead_fields');
    calm(talked);
    meet(talked, 'gvozdar', [12, 14]);
    say(talked.c, 'Мне нужны свинцовые цветы');
    say(talked.c, 'Стадо ушло благодаря мне');
    expect(talked.g.flag('lead_flower')).toBe('talked');

    const driven = asked();
    go(driven, 'dead_fields');
    calm(driven);
    meet(driven, 'gvozdar', [12, 14]);
    say(driven.c, 'Мне нужны свинцовые цветы');
    say(driven.c, 'Уходите с отравленной земли');
    say(driven.c, '…');
    expect([driven.g.flag('lead_flower'), driven.g.flag('svinec_empty')]).toEqual(['driven', true]);
  });

  it('grown in Колючка from the seeds of «Роса-2»; then Тимофей joins and bandages the wounded', () => {
    const s = asked((g) => g.setFlag('lab_tech', 'salters'));
    expect(s.g.flag('lead_flower_asked')).toBe(true);
    meet(s, 'timofey', [22, 10]);
    expect(s.c.last('dialogue')!.options.some((o) => o.includes('Какие цветы'))).toBe(true);
    say(s.c, 'Какие цветы');
    say(s.c, 'Семена есть у меня');
    say(s.c, '…');
    say(s.c, 'Пойдём');
    expect([s.g.flag('lead_flower'), s.g.flag('with_timofey')]).toEqual(['grown', true]);
    expect(CONTENT.creatures.timofey_ally.heal).toBeGreaterThan(0);
  });
});

describe('the raid on the shelter', () => {
  const raid = (patch: (g: Game) => void = () => {}) => {
    const s = setup((g) => {
      g.setFlag('chapter2_done', true);
      g.setFlag('silence_seen', true);
      patch(g);
    }, 'silence_house');
    expect(s.g.flag('silence_raid')).toBe('coming');
    meet(s, 'suhorukov', [19, 22]);
    return s;
  };

  it('talked down with the notes of «Роса» or with science; or the people led to Колючка', () => {
    const t = raid((g) => g.give('fresh_cure'));
    say(t.c, 'Полусухие не заразны');
    say(t.c, '…');
    expect(t.g.flag('silence_raid')).toBe('talked');
    const m = raid((g) => g.setFlag('resin_thief', 'open'));
    say(m.c, 'Дай им уйти в Колючку');
    say(m.c, 'Прокоп примет');
    say(m.c, '…');
    expect([m.g.flag('silence_raid'), m.g.flag('silence_gone')]).toEqual(['moved', true]);
  });

  it('or fought off at the gate', () => {
    const s = raid();
    say(s.c, 'Только через меня');
    say(s.c, '…');
    fight(s);
    expect(until(s.r, () => s.g.flag('silence_raid') === 'fought', 30_000)).toBe(true);
  });

  it('no raid before Chapter II ends', () => {
    const s = setup((g) => g.setFlag('silence_seen', true), 'silence_house');
    expect(s.g.flag('silence_raid')).toBeUndefined();
  });
});

describe('Хлебное and the herd', () => {
  it('the bell: Пономарь led to the shelter, his vespers sung, or left ringing', () => {
    for (const [answer, how] of [['Пойдём в приют', 'led'], ['Вечерня окончена', 'vespers'], ['Звони дальше', 'left']] as const) {
      const s = setup(() => {}, 'khlebnoe_ruins');
      calm(s);
      meet(s, 'ponomar', [21, 11]);
      say(s.c, answer);
      say(s.c, '…');
      expect(s.g.flag('bell')).toBe(how);
    }
  });

  it('the herd: a decoy barrel, the water shared, or fire at the fence', () => {
    const decoy = setup((g) => g.give('flask'));
    meet(decoy, 'hidden_barrel', [8, 8]);
    say(decoy.c, 'Наполнить пустую бочку');
    expect([decoy.g.flag('herd'), decoy.g.flag('svinec_grateful')]).toEqual(['decoy', true]);

    const shared = setup();
    meet(shared, 'gvozdar', [12, 14]);
    say(shared.c, 'Сухостои идут к хутору');
    say(shared.c, 'Отдайте стаду воду');
    expect(shared.g.flag('herd')).toBe('shared');

    const burned = setup();
    meet(burned, 'gvozdar', [12, 14]);
    say(burned.c, 'Сухостои идут к хутору');
    say(burned.c, 'Подготовьте факелы');
    say(burned.c, '…');
    fight(burned);
    expect(until(burned.r, () => burned.g.flag('herd') === 'burned', 30_000)).toBe(true);
  });
});

describe('the Elevator', () => {
  it('«Кто варит Мираж»: «Суховей» in the still; blown up, taken over, or sold to the Trust', () => {
    for (const [answer, how] of [['Перекрыть клапан', 'blown'], ['Поставки теперь через меня', 'taken'], ['Трест узнает', 'trust']] as const) {
      const s = setup((g) => (g.char.spent.repair = 60), 'elevator_brewery', 'ladder');
      meet(s, 'kub', [13, 11]);
      say(s.c, 'Из чего варишь');
      expect(s.g.stage('mirage_brew')).toBe('truth');
      say(s.c, answer);
      say(s.c, '…');
      expect(s.g.flag('mirage_brew')).toBe(how);
    }
  });

  it('«Должник»: bought out (the Guild sold him), or the cage picked', () => {
    const b = setup(() => {}, 'elevator_floors');
    meet(b, 'sizy', [17, 12]);
    say(b.c, 'Ключник в клетке');
    say(b.c, 'Вот двести капель');
    expect([b.g.flag('debtor'), b.g.flag('guild_sold_debtor')]).toEqual(['bought', true]);
    const p = setup(() => {}, 'elevator_floors');
    meet(p, 'klyuchnik', [28, 22]);
    say(p.c, 'Вскрыть замок');
    say(p.c, '…');
    expect(p.g.flag('debtor')).toBe('freed');
  });

  it('«Должник»: or the Elevator stormed — Сизый falls and the cage opens', () => {
    const s = setup(() => {}, 'elevator_floors');
    meet(s, 'sizy', [17, 12]);
    say(s.c, 'Конец «Жажде»');
    say(s.c, '…');
    fight(s);
    expect(until(s.r, () => s.g.flag('sizy_dead') === true, 30_000)).toBe(true);
    meet(s, 'klyuchnik', [28, 22]);
    say(s.c, '…');
    expect(s.g.flag('debtor')).toBe('stormed');
  });

  it('«Похищенная вода»: the truck to the Trust, to the Circle, or left to «Жажда» for a share', () => {
    for (const [answer, how, caps] of [['Вернуть Тресту', 'trust', 100], ['Отвести воду Кругу', 'circle', 0], ['Оставить «Жажде»', 'thirst', 80]] as const) {
      const s = setup(() => {}, 'elevator_yard');
      const before = s.g.state.caps;
      meet(s, 'stolen_truck', [30, 19]);
      say(s.c, answer);
      expect([s.g.flag('stolen_truck'), s.g.state.caps - before]).toEqual([how, caps]);
    }
  });
});

describe('the Ark', () => {
  it('the radio found: the prophet exposed, left, or given the «Шептун» forecasts — and rain comes', () => {
    const ex = setup(() => {}, 'ark_ship');
    meet(ex, 'ark_radio', [27, 8]);
    meet(ex, 'oblako', [19, 15]);
    say(ex.c, 'Приёмник в каюте');
    say(ex.c, 'Скажу паломникам правду');
    expect([ex.g.flag('ark'), ex.g.flag('fanatics_angry')]).toEqual(['exposed', true]);

    const rain = setup((g) => g.give('weather_reports'), 'ark_ship');
    meet(rain, 'oblako', [19, 15]);
    say(rain.c, 'Ты смотришь на небо');
    say(rain.c, 'свежие метеосводки');
    expect(rain.g.flag('ark')).toBe('rain_came');

    const faith = setup(() => {}, 'ark_ship');
    meet(faith, 'oblako', [19, 15]);
    say(faith.c, 'Жду. И помогу');
    expect(faith.g.flag('ark')).toBe('believed');
  });

  it('the lost pilgrim: tracked at once, found within the day, or found too late', () => {
    const tracked = setup((g) => (g.char.spent.survival = 60), 'ark_camp');
    meet(tracked, 'agnia_mother', [11, 21]);
    say(tracked.c, 'Следы ведут на запад');
    expect([tracked.g.flag('stray'), tracked.g.flag('dry_rain_hint')]).toEqual(['found', true]);

    for (const [late, how] of [[false, 'found'], [true, 'dead']] as const) {
      const s = setup((g) => g.setFlag('day', 5), 'ark_camp');
      meet(s, 'agnia_mother', [11, 21]);
      say(s.c, 'Найду. Куда она пошла');
      expect(s.g.flag('stray_deadline')).toBe(7);
      if (late) s.g.setFlag('day', 7);
      done(s);
      s.g.apply([{ type: 'travel' }]);
      const t = s.r.world.travel!;
      Object.assign(t, { x: 23.5, y: 76.5, parties: [] });
      s.c.do({ t: 'travel', to: 'stray_spot' });
      expect(untilAlone(s.r, () => s.g.flag('stray') !== undefined)).toBe(true);
      expect(s.g.flag('stray')).toBe(how);
    }
  });
});

describe('«Долг сборщика»', () => {
  it('with Хэнк in the Lower city: Засов forgiven, given to Шлюз, or made to name Оттиск — evidence for the trial', () => {
    for (const [answer, how] of [['Хэнк, решай ты', 'forgiven'], ['Шлюз должен это услышать', 'given'], ['Имя. Кто был с сургучом', 'testimony']] as const) {
      const s = setup((g) => {
        g.setFlag('with_hank', true);
        g.setFlag('zap_started', true);
      }, 'zap_lower');
      calm(s);
      meet(s, 'zasov', [10, 31]);
      say(s.c, 'Хэнк сбежал при тебе');
      say(s.c, answer);
      done(s);
      expect(s.g.flag('hank_debt')).toBe(how);
      if (how === 'testimony') expect(s.g.flag('hank_testimony')).toBe(true);
    }
    const trial = CONTENT.dialogues.zatvor_dam.nodes.intro.options.find((o) => o.text.includes('Засова'))!;
    expect(trial.if).toEqual([{ flag: 'hank_testimony' }, { notFlag: 'shown_hank' }]);
  });
});

describe('Низовье balance', () => {
  const RUNS = 200;
  const titles = ['Стрелок', 'Механик', 'Говорун'];
  const rate = (map: string, at: [number, number], foes: [string, number, number][], friends: [string, number, number][] = [], level = 3) =>
    Object.fromEntries(
      titles.map((t) => {
        let w = 0;
        for (let s = 1; s <= RUNS; s++) {
          const g = premadeGame(t, s * 7919);
          toLevel(g, level); // level 3–4 in Низовье
          if (placedBattle(g, TOWNS[map], at, foes, friends) === 'victory') w++;
        }
        return [t, w / RUNS];
      }),
    );

  it('the raid, the herd and the Elevator\'s yard are fights a party of the lowland can take', () => {
    const raid: [string, number, number][] = [['raid_captain', 19, 20], ['collector', 16, 21], ['collector', 23, 21]];
    const r = {
      raid: rate('silence_house', [19, 26], raid),
      raidWithTimofey: rate('silence_house', [19, 26], raid, [['timofey_ally', 18, 27]]),
      herd: rate('dead_fields', [30, 30], [['dryman', 33, 22], ['dryman', 36, 24], ['dryman', 34, 26]]),
      sizy: rate('elevator_floors', [17, 24], [['sizy', 17, 11], ['raider', 12, 13], ['raider', 22, 13]], [], 4),
    };
    process.stderr.write(`Низовье, level 3–5: ${JSON.stringify(r)}\n`);
    expect(r.raid['Стрелок']).toBeLessThanOrEqual(0.8);
    expect(r.raidWithTimofey['Стрелок']).toBeGreaterThanOrEqual(r.raid['Стрелок']);
    expect(r.herd['Стрелок']).toBeGreaterThanOrEqual(0.3);
    expect(r.sizy['Стрелок']).toBeGreaterThanOrEqual(0.3);
  }, 180_000);
});
