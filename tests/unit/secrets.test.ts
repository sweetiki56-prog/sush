// Stage P (S15a): the courier, Veres's bunker, the Literny, the Sealwax chamber and Dry Hands.
import { describe, expect, it } from 'vitest';
import type { Game } from '../../src/core/Game';
import { CONTENT } from '../../src/content';
import { slidesFor } from '../../src/core/endings';
import { room, TOWNS } from './rooms';
import { placedBattle, premadeGame } from './sim';
import { say, talk, winFight } from './story';

function setup(patch: (g: Game) => void = () => {}, map = 'post_station', entry?: string) {
  const { r, clients } = room();
  const [c] = clients;
  const g = r.players.get(c.id)!.game;
  for (let n = 1; n <= 8; n++) for (const key of [`chapter${n}_seen`, `chapter${n}_done`]) g.setFlag(key, true);
  g.rng = () => 0.01;
  patch(g);
  r.goTo(map, entry);
  return { r, c, g };
}
type S = ReturnType<typeof setup>;
function close(s: S) {
  for (let n = 0; n < 8 && s.r.players.get(s.c.id)!.talk; n++) s.c.do({ t: 'choose', i: s.c.last('dialogue')!.options.length - 1 });
}
function meet(s: S, id: string, from: [number, number]) {
  close(s);
  talk(s.r, s.c, id, from);
}

describe('S15a places', () => {
  it('registers the courier, bunker, train and chamber maps', () => {
    expect(CONTENT.locations.post_station.map).toBe('post_station');
    expect(CONTENT.locations.watcher_bunker.open).toEqual([{ flag: 'watcher_known' }]);
    expect(CONTENT.locations.literny.areas?.map((a) => a.map)).toEqual(['literny_tunnel', 'literny_train']);
    expect(CONTENT.locations.capital_ruins.areas?.some((a) => a.map === 'seal_chamber')).toBe(true);
  });
});

describe('Последний гонец', () => {
  it('opens from Ефим and leaves the two-point evidence letter', () => {
    const s = setup((g) => g.setFlag('navigator', 'sailed'));
    meet(s, 'courier_mummy', [12, 12]);
    say(s.c, 'Рассмотреть завал');
    say(s.c, 'Забрать письмо');
    expect([s.g.flag('courier_letter'), s.g.count('courier_letter'), s.g.stage('last_courier')]).toEqual(['kept', 1, 'done']);
  });
});

describe('Бункер Смотрителя', () => {
  it('holds the diary, the voice and three clearance outcomes', () => {
    for (const [answer, outcome] of [
      ['Подтвердить приказ', 'confirmed'],
      ['Переписать приказ', 'rewritten'],
      ['Стереть приказ', 'erased'],
    ] as const) {
      const s = setup((g) => g.setFlag('watcher_known', true), 'watcher_bunker');
      meet(s, 'watcher_desk', [13, 10]);
      say(s.c, 'Забрать дневник');
      expect(s.g.flag('watcher_diary')).toBe(true);
      meet(s, 'watcher_voice', [21, 17]);
      say(s.c, 'Кто ставит печати');
      expect(s.g.flag('chamber_hint')).toBe(true);
      meet(s, 'watcher_terminal', [27, 9]);
      say(s.c, answer);
      expect(s.g.flag('watcher_clearance')).toBe(outcome);
    }
  });
});

describe('«Литерный» and the Chamber', () => {
  it('finds mark twelve and keeps, sells or destroys the legal stamps', () => {
    for (const [answer, outcome] of [
      ['Забрать штампы', 'kept'],
      ['Продать штампы', 'sold'],
      ['Разбить штампы', 'destroyed'],
    ] as const) {
      const s = setup((g) => {
        g.setFlag('literny_known', true);
        g.setFlag('literny_pass', 'key');
      }, 'literny_train', 'west');
      meet(s, 'seal_mark_12', [30, 19]);
      say(s.c, 'Сложить план');
      expect([s.g.flag('seal_mark_12'), s.g.flag('chamber_known')]).toEqual([true, true]);
      meet(s, 'drop_stamp_safe', [35, 19]);
      say(s.c, answer);
      expect(s.g.flag('drop_stamps')).toBe(outcome);
    }
  });

  it('opens with all marks and breaks the press without a fight', () => {
    const s = setup((g) => {
      for (let n = 1; n <= 12; n++) g.setFlag(`seal_mark_${n}`, true);
      g.char.spent.repair = 80;
    }, 'ruins_streets', 'chamber');
    for (const h of s.r.hostiles.list) h.dead = true;
    meet(s, 'chamber_door', [10, 13]);
    say(s.c, 'Сложить двенадцать');
    say(s.c, 'Спуститься');
    close(s);
    s.r.tick(50);
    expect(s.g.flag('at')).toBe('seal_chamber');
    meet(s, 'seal_press', [20, 11]);
    say(s.c, 'Переставить шестерню');
    expect([s.g.flag('sealwax_crushed'), s.g.flag('chamber_open')]).toEqual([true, true]);
  });
});

describe('«Сухие руки»', () => {
  it('marks a killed human, but not a beast or a Сухостой', () => {
    const human = setup(() => {}, 'ruins_streets');
    human.r.startCombat(human.r.players.get(human.c.id)!, human.r.hostiles.alive.filter((h) => h.def.tags?.includes('human')).map((h) => h.id));
    winFight(human.r, human.c);
    expect(human.g.flag('blood_drawn')).toBe(true);

    const dry = setup(() => {}, 'dead_fields');
    dry.r.startCombat(dry.r.players.get(dry.c.id)!, dry.r.hostiles.alive.filter((h) => h.def.tags?.includes('dry')).map((h) => h.id));
    winFight(dry.r, dry.c);
    expect(dry.g.flag('blood_drawn')).toBeUndefined();
  });

  it('lets four pieces of evidence persuade Zatvor and gives the ending slide', () => {
    const s = setup((g) => {
      g.setFlag('evidence', 4);
      g.setFlag('boom_up', true);
    }, 'dam_control', 'ladder');
    meet(s, 'zatvor_dam', [21, 11]);
    say(s.c, 'За тобой нет крови');
    say(s.c, '…');
    expect([s.g.flag('trial_way'), s.g.flag('dry_hands')]).toEqual(['persuaded', true]);
    expect(slidesFor(s.g, CONTENT.endings).some((slide) => slide.id === 'dry_hands')).toBe(true);
  });
});

describe('S15a balance', () => {
  const rate = (map: string, at: [number, number], foes: [string, number, number][], friends: [string, number, number][] = []) => {
    let wins = 0;
    for (let seed = 1; seed <= 120; seed++) {
      const g = premadeGame('Стрелок', seed * 7919);
      g.addXp(2600);
      if (placedBattle(g, TOWNS[map], at, foes, friends) === 'victory') wins++;
    }
    return wins / 120;
  };

  it('the train guards and the Chamber are hard fights; Vedro materially helps', () => {
    const counters: [string, number, number][] = [['counter', 17, 10], ['counter', 27, 17], ['counter', 36, 10]];
    const chamber: [string, number, number][] = [['ottisk', 18, 15], ['sealwax_agent', 13, 16], ['sealwax_agent', 24, 16], ['sealwax_agent', 14, 10]];
    const r = {
      counters: rate('literny_tunnel', [5, 13], counters),
      countersWithVedro: rate('literny_tunnel', [5, 13], counters, [['vedro_ally', 6, 13]]),
      chamber: rate('seal_chamber', [18, 24], chamber),
      chamberWithVedro: rate('seal_chamber', [18, 24], chamber, [['vedro_ally', 19, 24]]),
    };
    process.stderr.write(`S15a, level 8: ${JSON.stringify(r)}\n`);
    expect(r.counters).toBeLessThanOrEqual(0.8);
    expect(r.countersWithVedro).toBeGreaterThan(r.counters);
    expect(r.chamber).toBeLessThanOrEqual(0.7);
    expect(r.chamber).toBeGreaterThan(0);
    expect(r.chamberWithVedro).toBeGreaterThan(r.chamber);
  }, 180_000);
});
