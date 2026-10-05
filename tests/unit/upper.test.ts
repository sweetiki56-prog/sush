// Chapter VII «Шептун и Депо» (stage U) in the real room: the archive of the Бригада four ways (the pump, the exam,
// the money, the tunnels), the plate and Верес's diary, the relay «Шептун» three ways and the record that names the
// hero, the choice of whom to tell; the side quests with every ending; Лёля and Ведро; the road north on the chart.
import { describe, it, expect } from 'vitest';
import type { Game } from '../../src/core/Game';
import { CONTENT } from '../../src/content';
import { room, until, TOWNS } from './rooms';
import { placedBattle, premadeGame, toLevel } from './sim';
import { say, talk, winFight } from './story';

/** After Chapter VI: the tube in the bag, money; every roll lands unless told otherwise. */
function setup(patch: (g: Game) => void = () => {}, map = 'depot_yard', entry?: string) {
  const { r, clients } = room();
  const [c] = clients;
  const g = r.players.get(c.id)!.game;
  for (const k of ['chapter1_seen', 'chapter1_done', 'chapter3_seen', 'chapter4_seen', 'chapter4_done', 'chapter5_seen', 'chapter5_done', 'chapter6_seen', 'chapter6_done']) g.setFlag(k, true);
  g.setFlag('trust_outcome', 'tax');
  g.setFlag('day', 40);
  g.give('tube');
  g.char.attrs.cha = 6;
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
/** A skill brought to exactly this value: nothing tagged, the rest invested. */
const skillTo = (g: Game, id: 'repair' | 'science', v: number) => {
  g.char.tags = g.char.tags.filter((t) => t !== id);
  g.char.spent[id] = 0;
  g.char.spent[id] = Math.max(0, v - g.skill(id));
};

/** Into the archive by paying for spare parts; the plate read. */
function read(s: S) {
  meet(s, 'sverlo', [17, 18]);
  say(s.c, 'Мне нужен архив');
  say(s.c, '…');
  say(s.c, 'Вот 500 капель');
  expect(s.g.flag('depot_way')).toBe('paid');
  go(s, 'depot_archive', 'west');
  meet(s, 'plate_table', [14, 17]);
  expect(s.g.flag('plate_read')).toBe(true);
  return s;
}

describe('Chapter VII: the archive of the Бригада', () => {
  it('arriving starts the chapter; the archive is locked until Сверло says so', () => {
    const s = setup();
    expect(s.g.stage('upper')).toBe('north');
    meet(s, 'archive_door', [33, 14]);
    expect(opts(s)).toHaveLength(1);
    meet(s, 'sverlo', [17, 18]);
    say(s.c, 'Мне нужен архив');
    expect(s.g.stage('upper')).toBe('archive');
    expect(s.g.stage('pump')).toBe('asked');
  });

  it('the pump raised as it was, or with the villages\' share; or left dead and the Trust angry', () => {
    const fixed = setup((g) => skillTo(g, 'repair', 60), 'depot_shops');
    meet(fixed, 'main_pump', [17, 10]);
    expect(opts(fixed).some((o) => o.includes('заглушку'))).toBe(false); // not skilled enough for the share
    say(fixed.c, 'как было');
    expect(fixed.g.flag('pump')).toBe('fixed');
    go(fixed, 'depot_yard', 'north');
    meet(fixed, 'sverlo', [17, 18]);
    say(fixed.c, 'Мне нужен архив');
    say(fixed.c, '…');
    say(fixed.c, 'Насос поднят');
    expect(fixed.g.flag('depot_way')).toBe('pump');
    expect(fixed.g.flag('counter_pass')).toBe(true);

    const shared = setup((g) => (g.char.spent.repair = 100), 'depot_shops');
    meet(shared, 'main_pump', [17, 10]);
    say(shared.c, 'снять заглушку');
    expect(shared.g.flag('pump')).toBe('shared');

    const broken = setup(() => {}, 'depot_shops');
    meet(broken, 'main_pump', [17, 10]);
    say(broken.c, 'Не трогать');
    expect(broken.g.flag('pump')).toBe('broken');
    expect(broken.g.flag('trust_angry')).toBe(true);
    expect(broken.g.stage('pump')).toBe('done');
  });

  it('Регламент 17: a clever head, Манометр\'s word, or a forged pass (caught when the roll fails)', () => {
    const wise = setup((g) => (g.char.attrs.int = 8));
    meet(wise, 'sverlo', [17, 18]);
    say(wise.c, 'Сдать Регламент 17');
    say(wise.c, 'Воду не перекрывать');
    expect([wise.g.flag('depot_way'), wise.g.flag('regulation'), wise.g.stage('regulation')]).toEqual(['brigade', 'exam', 'done']);

    const vouched = setup((g) => g.setFlag('veres_witness', true), 'depot_shops');
    meet(vouched, 'manometr', [11, 16]);
    say(vouched.c, 'Поручишься');
    expect(vouched.g.flag('manometr_vouch')).toBe(true);
    go(vouched, 'depot_yard', 'north');
    meet(vouched, 'sverlo', [17, 18]);
    say(vouched.c, 'Сдать Регламент 17');
    say(vouched.c, 'Дед Манометр');
    expect(vouched.g.flag('regulation')).toBe('vouch');

    const forged = setup();
    meet(forged, 'sverlo', [17, 18]);
    say(forged.c, 'Сдать Регламент 17');
    say(forged.c, 'Показать допуск');
    expect(forged.g.flag('regulation')).toBe('forged');
    const caught = setup((g) => (g.rng = () => 0.99));
    meet(caught, 'sverlo', [17, 18]);
    say(caught.c, 'Сдать Регламент 17');
    say(caught.c, 'Показать допуск');
    expect(caught.g.flag('exam_failed')).toBe(true);
    expect(caught.g.flag('depot_way')).toBeUndefined();
  });

  it('through the tunnels: the grate picked, up the ladder into the archive from below', () => {
    const s = setup();
    meet(s, 'tunnel_gate', [30, 27]);
    say(s.c, 'Вскрыть замок');
    say(s.c, 'Спуститься');
    expect(until(s.r, () => s.r.map.id === 'depot_tunnels', 5000)).toBe(true);
    for (const h of s.r.hostiles.list) h.dead = true;
    meet(s, 'tunnel_archive_ladder', [38, 5]);
    say(s.c, 'Подняться в архив');
    expect(until(s.r, () => s.r.map.id === 'depot_archive', 5000)).toBe(true);
    expect(s.g.flag('depot_way')).toBe('tunnels');
    expect(s.g.stage('upper')).toBe('plate');
  });

  it('the plate: half the code is the dam\'s gates, the other half is with the dam\'s guard; Верес\'s diary', () => {
    const s = read(setup());
    expect(s.g.stage('upper')).toBe('whisper');
    meet(s, 'diary_shelf', [24, 18]);
    say(s.c, 'Взять копию');
    expect(s.g.count('veres_diary')).toBe(1);
  });
});

describe('Chapter VII: the relay «Шептун» and the choice', () => {
  it('started by hand (Наука), by Лёля, or from the bunker\'s power panel; the record names the hero', () => {
    const tech = setup((g) => (g.char.spent.science = 100), 'whisper_tower');
    meet(tech, 'relay_console', [21, 11]);
    say(tech.c, 'Перекоммутировать');
    say(tech.c, '…');
    expect(tech.c.last('dialogue')!.text).toContain(tech.g.char.name);
    expect(tech.g.flag('whisper_way')).toBe('tech');
    expect(tech.g.flag('key_half_known')).toBe(true);
    expect(tech.g.stage('upper')).toBe('choice');

    const lelya = setup((g) => g.setFlag('archive_seen', true), 'depot_shops');
    meet(lelya, 'lelya', [22, 12]);
    say(lelya.c, 'Пойдёшь со мной');
    expect(lelya.g.flag('with_lelya')).toBe(true);
    go(lelya, 'whisper_tower');
    meet(lelya, 'relay_console', [21, 11]);
    say(lelya.c, 'Лёля, справишься');
    expect(lelya.g.flag('whisper_way')).toBe('lelya');

    const bunker = setup(() => {}, 'whisper_slope');
    meet(bunker, 'bunker_door', [31, 26]);
    say(bunker.c, 'Вскрыть кодовый замок');
    say(bunker.c, 'Войти');
    expect(until(bunker.r, () => bunker.r.map.id === 'whisper_bunker', 5000)).toBe(true);
    for (const h of bunker.r.hostiles.list) h.dead = true;
    meet(bunker, 'power_panel', [24, 6]);
    say(bunker.c, 'Поднять рубильник');
    go(bunker, 'whisper_tower');
    meet(bunker, 'relay_console', [21, 11]);
    say(bunker.c, 'Питание подано снизу');
    expect(bunker.g.flag('whisper_way')).toBe('bunker');
  });

  it('the record goes to the Circle, to the Trust, or nowhere: the chapter ends', () => {
    for (const [answer, way] of [['частоте Круга', 'circle'], ['частоте Треста', 'trust'], ['Никому', 'silent']] as const) {
      const s = setup((g) => (g.char.spent.repair = 100), 'whisper_tower');
      meet(s, 'relay_console', [21, 11]);
      say(s.c, 'Перемотать');
      say(s.c, '…');
      say(s.c, '…');
      say(s.c, answer);
      expect(s.g.flag('threat_told')).toBe(way);
      expect(s.g.flag('chapter7_done')).toBe(true);
      expect(s.g.stage('upper')).toBe('done');
    }
  });

  it('«Голос с вышки»: five records in order; the fifth answers a question nobody asked aloud', () => {
    const s = setup((g) => (g.char.spent.science = 100), 'whisper_tower');
    meet(s, 'relay_console', [21, 11]);
    say(s.c, 'Перекоммутировать');
    done(s);
    for (let i = 1; i <= 5; i++) {
      meet(s, 'relay_console', [21, 11]);
      say(s.c, 'Послушать записи');
      expect(opts(s).filter((o) => o.startsWith('Запись'))).toEqual([`Запись ${i}.`]);
      say(s.c, `Запись ${i}.`);
    }
    expect(s.g.flag('watcher_hint')).toBe(true);
    expect(s.g.stage('tower_voice')).toBe('done');
  });
});

describe('Chapter VII: side quests', () => {
  it('«Голос в трубе»: Шунт calmed (the key), let go, or killed', () => {
    const calm = setup(() => {}, 'depot_tunnels', 'yard');
    for (const h of calm.r.hostiles.list) if (h.group !== 'shunt') h.dead = true;
    meet(calm, 'shunt', [12, 14]);
    say(calm.c, 'смена окончена');
    expect([calm.g.flag('pipe_voice'), calm.g.count('bunker_key')]).toEqual(['calmed', 1]);

    const free = setup(() => {}, 'depot_tunnels', 'yard');
    meet(free, 'shunt', [12, 14]);
    say(free.c, 'Иди вниз');
    expect(free.g.flag('pipe_voice')).toBe('released');

    const kill = setup(() => {}, 'depot_tunnels', 'yard');
    for (const h of kill.r.hostiles.list) if (h.group !== 'shunt') h.dead = true;
    meet(kill, 'shunt', [12, 14]);
    say(kill.c, 'Хватит держать');
    say(kill.c, '…');
    expect(until(kill.r, () => !!kill.r.fight, 10_000)).toBe(true);
    winFight(kill.r, kill.c);
    expect(until(kill.r, () => kill.g.flag('pipe_voice') === 'killed', 20_000)).toBe(true);
  });

  it('«Допуск»: Ведро mended and following; its order kept, rewritten or erased', () => {
    for (const [answer, how] of [['Оставить приказ', 'mandate'], ['Переписать приказ', 'hero'], ['Стереть приказ', 'free']] as const) {
      const s = setup((g) => (g.char.spent.repair = 100), 'depot_tunnels', 'yard');
      for (const h of s.r.hostiles.list) h.dead = true;
      meet(s, 'vedro_broken', [13, 29]);
      say(s.c, 'Перебрать привод');
      say(s.c, 'Пойдём');
      expect(s.g.flag('with_vedro')).toBe(true);
      go(s, 'whisper_bunker', 'door');
      for (const h of s.r.hostiles.list) h.dead = true;
      meet(s, 'duty_log', [8, 7]);
      say(s.c, answer);
      expect(s.g.flag('clearance')).toBe(how);
      expect(s.g.flag('with_vedro')).toBe(how === 'free' ? false : true);
    }
  });

  it('«Пропуск Лукича»: the son found in the Депо; father and son, the son betrayed, or the pass bought', () => {
    const find = (s: S) => {
      meet(s, 'lukich', [22, 17]);
      say(s.c, 'Что за услуга');
      say(s.c, '…');
      go(s, 'depot_yard');
      meet(s, 'kran', [27, 25]);
      say(s.c, 'Мозоль от коромысла');
      expect(s.g.flag('kran_is_fedot')).toBe(true);
      go(s, 'gates_post');
      return s;
    };
    const reunite = find(setup((g) => (g.char.attrs.per = 8), 'gates_post'));
    meet(reunite, 'lukich', [22, 17]);
    say(reunite.c, 'Твой сын в Депо');
    expect([reunite.g.flag('lukich'), reunite.g.count('gates_pass')]).toEqual(['reunited', 1]);

    const betray = find(setup((g) => (g.char.attrs.per = 8), 'gates_post'));
    const caps = betray.g.state.caps;
    meet(betray, 'gate_guard_a', [16, 14]);
    say(betray.c, 'беглый водонос');
    expect([betray.g.flag('lukich'), betray.g.state.caps - caps, betray.g.flag('fedot_gone')]).toEqual(['betrayed', 300, true]);

    const buy = setup(() => {}, 'gates_post');
    meet(buy, 'lukich', [22, 17]);
    say(buy.c, 'Что за услуга');
    say(buy.c, '…');
    say(buy.c, 'Пропуск за двести');
    expect([buy.g.flag('lukich'), buy.g.count('gates_pass')]).toEqual(['bought', 1]);
  });

  it('«Перебежчик» on the road by the pass: saved, returned to Ветрова, or handed to the Trust', () => {
    for (const [answer, how] of [['Спрячу тебя', 'saved'], ['Верну тебя', 'returned'], ['Трест на «Воротах»', 'trust']] as const) {
      const s = setup();
      s.g.apply([{ type: 'travel' }]);
      const t = s.r.world.travel!;
      Object.assign(t, { x: 30.5, y: 13.5, parties: [{ id: 'u_defector', tpl: 'defector', x: 31.5, y: 13.5, path: [], members: ['ratmir_unit'], hurt: 0, wait: 9999, think: 9999 }] });
      s.c.do({ t: 'travel', x: 32, y: 13 });
      expect(until(s.r, () => !!s.r.meeting, 10_000)).toBe(true);
      say(s.c, answer);
      expect(s.g.flag('defector')).toBe(how);
      expect(s.g.flag('eagle_known') ?? false).toBe(how !== 'trust');
    }
  });

  it('Орлиное гнездо opens on the chart once the post is known; Ветрова talks of the Высокий берег', () => {
    const s = setup((g) => g.setFlag('defector', 'returned'), 'eagle_nest');
    expect(CONTENT.locations.eagle.secret).toBe(true);
    meet(s, 'yarina', [17, 13]);
    say(s.c, 'Ратмир у вас');
    say(s.c, '…');
    say(s.c, 'Зачем Высокому берегу');
    expect(s.g.flag('second_dam_hint')).toBe(true);
    expect(s.r.npcs.has('ratmir')).toBe(true);
  });
});

describe('Chapter VII on the chart', () => {
  it('the places of the Верховья open after Chapter VI and the road there is walked', () => {
    const s = setup();
    s.g.apply([{ type: 'travel' }]);
    const t = s.r.world.travel!;
    Object.assign(t, { x: 26.5, y: 42.5, parties: [] }); // at Запруда
    s.c.do({ t: 'travel', to: 'depot' });
    expect(until(s.r, () => s.r.map.id === 'depot_yard' || (!s.r.onRoad && !!s.r.map), 120_000)).toBe(true);
    expect(s.r.map.id).toBe('depot_yard');
  });
});

describe('Chapter VII balance', () => {
  const RUNS = 200;
  const titles = ['Стрелок', 'Механик', 'Говорун'];
  const rate = (map: string, at: [number, number], foes: [string, number, number][], friends: [string, number, number][] = []) =>
    Object.fromEntries(
      titles.map((t) => {
        let w = 0;
        for (let s = 1; s <= RUNS; s++) {
          const g = premadeGame(t, s * 7919);
          toLevel(g, 7); // level 7 by Chapter VII
          if (placedBattle(g, TOWNS[map], at, foes, friends) === 'victory') w++;
        }
        return [t, w / RUNS];
      }),
    );

  it('the «Счётчики», the bunker\'s machines and the condors are hard alone, fairer with Лёля or Ведро', () => {
    const counters: [string, number, number][] = [['counter', 22, 5], ['counter', 26, 6]];
    const machines: [string, number, number][] = [['bunker_machine', 20, 12], ['bunker_machine', 22, 14]];
    const r = {
      counters: rate('depot_tunnels', [14, 5], counters),
      countersWithLelya: rate('depot_tunnels', [14, 5], counters, [['lelya_ally', 13, 6]]),
      machines: rate('whisper_bunker', [12, 20], machines),
      machinesWithVedro: rate('whisper_bunker', [12, 20], machines, [['vedro_ally', 11, 21]]),
      condors: rate('whisper_slope', [8, 26], [['condor', 9, 22], ['condor', 11, 22], ['condor', 7, 22]]),
    };
    process.stderr.write(`Chapter VII, level 7: ${JSON.stringify(r)}\n`);
    expect(r.counters['Стрелок']).toBeLessThanOrEqual(0.8);
    expect(r.countersWithLelya['Стрелок']).toBeGreaterThanOrEqual(r.counters['Стрелок']);
    expect(r.machines['Стрелок']).toBeLessThanOrEqual(0.75);
    expect(r.machinesWithVedro['Стрелок']).toBeGreaterThanOrEqual(r.machines['Стрелок']);
    expect(r.condors['Стрелок']).toBeGreaterThanOrEqual(0.4);
  });
});
