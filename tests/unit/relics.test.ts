// Stage R «Реликвии Низовья»: the side quests that end in a one-of-a-kind weapon or charm, played in the real room,
// every ending of each; and a balance check that the relics stay a good II tier, not a game breaker.
import { describe, it, expect } from 'vitest';
import { CONTENT } from '../../src/content';
import { discount } from '../../src/core/room/Trade';
import type { PartyState } from '../../src/core/travel/Parties';
import { arm, premadeGame, roadBattle } from './sim';
import { room, until, untilAlone } from './rooms';
import { say, talk, winFight } from './story';

/** After Chapter I, peacefully: the party stands in Ржавый колодец with sharp eyes, money, and every roll succeeds. */
function setup(at = 'rusty_well') {
  const { r, clients } = room();
  const [c] = clients;
  const g = r.players.get(c.id)!.game;
  for (const [k, v] of [['trust_outcome', 'tax'], ['quest_complete', true], ['marta_letter', true], ['chapter1_done', true], ['chapter1_seen', true], ['day', 3]] as const) g.setFlag(k, v);
  g.char.attrs.per = 7;
  g.state.caps = 300;
  g.rng = () => 0.01;
  r.goTo(at);
  return { r, c, g };
}

/** Walk into a place again, so the people whose day it is come out. */
const reenter = (r: ReturnType<typeof setup>['r'], at: string) => {
  r.goTo(at);
  return r;
};

const SPOTS = {
  marta: [14, 25],
  shack_marta: [8, 22],
  birjuk: [7, 28],
  hank: [16, 32],
  rzhavchik: [13, 32],
  sipuha: [5, 23],
  car_pickup: [34, 20],
  remen: [7, 12],
  nyura: [13, 12],
  mityay: [16, 13],
  luka: [8, 32],
  mytny: [24, 13],
  bugai: [11, 27],
  bugai_clean: [11, 27],
  prokop: [11, 15],
  iva: [13, 13],
  vat_1: [12, 14],
  drip_tank: [22, 15],
  laska: [24, 14],
} as Record<string, [number, number]>;
const meet = (s: ReturnType<typeof setup>, id: string) => talk(s.r, s.c, id, SPOTS[id]);

describe('«Ружьё на стене»', () => {
  /** The rifle seen, Марта asked, and Бирюк found out through the photo behind its strap. */
  function truth() {
    const s = setup();
    const { r, c, g } = s;
    meet(s, 'shack_marta');
    expect(g.flag('rifle_seen')).toBe(true);
    say(c, 'За ремнём');
    expect(g.count('old_photo')).toBe(1);
    say(c, 'Выйти');
    meet(s, 'marta');
    say(c, 'Ружьё у тебя на стене');
    expect(c.last('dialogue')!.text).toMatch(/шрам через бровь/);
    say(c, 'Ничего');
    g.setFlag('caravan_here', true);
    reenter(r, 'rusty_well');
    meet(s, 'birjuk');
    say(c, 'старую фотографию');
    expect(g.flag('semyon_known')).toBe(true);
    expect(g.stage('wall_rifle')).toBe('truth');
    say(c, '…');
    return s;
  }

  it('reunited: Бирюк will come if she goes out; Марта gives the rifle and Бирюк sells cheaper', () => {
    const s = truth();
    const { c, g } = s;
    say(c, 'Двадцать лет — хватит');
    expect(g.flag('semyon_will')).toBe(true);
    say(c, 'Скажу');
    say(c, 'Прощай');
    const before = discount(g, CONTENT.traders.birjuk);
    meet(s, 'marta');
    say(c, 'Про ружьё');
    say(c, 'Семён жив');
    say(c, 'Он придёт, если ты выйдешь');
    expect(g.flag('semyon')).toBe('reunited');
    expect(g.count('skoba')).toBe(1);
    expect(g.stage('wall_rifle')).toBe('done');
    expect(discount(g, CONTENT.traders.birjuk)).toBeCloseTo(before + 0.1);
  });

  it('forgiven: Бирюк writes instead; the letter is enough', () => {
    const s = truth();
    const { c, g } = s;
    say(c, 'Напиши ей');
    expect(g.count('semyon_letter')).toBe(1);
    say(c, 'Не буду');
    say(c, 'Прощай');
    meet(s, 'marta');
    say(c, 'Про ружьё');
    say(c, 'Семён жив');
    say(c, 'Семён написал тебе');
    expect(g.flag('semyon')).toBe('forgiven');
    expect(g.count('semyon_letter')).toBe(0);
    expect(g.count('skoba')).toBe(1);
  });

  it('lied: Семён is «dead»; the rifle out of pity, karma down, and the caravan man keeps away from the well', () => {
    const s = truth();
    const { r, c, g } = s;
    say(c, 'Твоё дело');
    say(c, 'Прощай');
    const karma = Number(g.flag('karma') ?? 0);
    meet(s, 'marta');
    say(c, 'Про ружьё');
    say(c, 'Я видел могилу');
    expect(g.flag('semyon')).toBe('lied');
    expect(g.count('skoba')).toBe(1);
    expect(Number(g.flag('karma'))).toBe(karma - 2);
    reenter(r, 'rusty_well');
    expect(r.npcs.has('birjuk')).toBe(false);
  });

  it('silent: 120 капель buy it without a word of the truth', () => {
    const s = setup();
    const { c, g } = s;
    meet(s, 'shack_marta');
    say(c, 'Выйти');
    meet(s, 'marta');
    say(c, 'Ружьё у тебя на стене');
    say(c, 'Продай ружьё');
    expect(g.flag('semyon')).toBe('silent');
    expect(g.state.caps).toBe(180);
    expect(g.count('skoba')).toBe(1);
    say(c, 'Спасибо');
    // an empty wall after
    meet(s, 'shack_marta');
    expect(c.last('dialogue')!.text).toMatch(/светлое пятно/);
  });
});

describe('«Пёс сборщика»', () => {
  /** Three days of lizards at the fire: the dog comes to the hand. */
  function fed() {
    const s = setup();
    const { c, g } = s;
    g.give('lizard', 3);
    for (let day = 0; day < 3; day++) {
      meet(s, 'rzhavchik');
      say(c, 'жареную ящерицу');
      say(c, 'Отойти');
      meet(s, 'rzhavchik');
      expect(c.last('dialogue')!.text).toMatch(day < 2 ? /Сыт|сыт/ : /тычется носом/);
      say(c, 'Отойти');
      g.apply([{ type: 'rest' }]); // a new morning clears the day's feeding
      expect(g.flag('dog_fed_today')).toBeFalsy();
    }
    expect(g.flag('rzhavchik_fed')).toBe(3);
    expect(g.stage('collector_dog')).toBe('fed');
    meet(s, 'hank');
    expect(c.last('dialogue')!.text).toMatch(/Ржавчик/);
    expect(g.stage('collector_dog')).toBe('collar');
    say(c, 'семья');
    return s;
  }

  it('Hank’s letter to the widow: Нюра forgives, and Hank hands over «Сборщик»', () => {
    const s = fed();
    const { r, c, g } = s;
    say(c, 'Напиши ей');
    expect(g.count('hank_letter')).toBe(1);
    say(c, 'Отнесу');
    r.goTo('three_pillars');
    meet(s, 'nyura');
    say(c, 'письмо');
    say(c, 'Он не бросил');
    expect(g.flag('hank_forgiven')).toBe(true);
    say(c, 'Передам');
    r.goTo('rusty_well');
    meet(s, 'hank');
    expect(g.count('collector_gun')).toBe(1);
    expect(g.stage('collector_dog')).toBe('done');
  });

  it('home: the dog goes to Митяй; he stays there, and Нюра trades cheaper', () => {
    const s = fed();
    const { r, c, g } = s;
    say(c, 'Пёс вернётся к Митяю');
    say(c, 'Идём');
    reenter(r, 'rusty_well');
    expect(r.npcs.has('rzhavchik')).toBe(false);
    r.goTo('three_pillars');
    meet(s, 'mityay');
    say(c, 'Смотри, кто пришёл');
    expect(g.flag('rzhavchik')).toBe('home');
    say(c, '…');
    reenter(r, 'three_pillars');
    expect(r.npcs.has('rzhavchik_home')).toBe(true);
    const before = discount(g, CONTENT.traders.nyura);
    meet(s, 'nyura');
    expect(g.flag('nyura_friend')).toBe(true);
    expect(discount(g, CONTENT.traders.nyura)).toBeCloseTo(before + 0.1);
  });

  it('ours: the whistle on the collar; worn, it spots any ambush on the road', () => {
    const s = fed();
    const { c, g } = s;
    say(c, 'Пёс останется со мной');
    expect(g.flag('rzhavchik')).toBe('ours');
    expect(g.count('dog_whistle')).toBe(1);
    expect(g.hasMod('sentry')).toBe(false);
    const per = g.attr('per');
    expect(g.equip('charm', 'dog_whistle')).toBe(true);
    expect(g.hasMod('sentry')).toBe(true);
    expect(g.attr('per')).toBe(per + 1);
  });

  it('taken: Мытный pays 50 for the runaway collector; Hank is gone from the well', () => {
    const s = fed();
    const { r, c, g } = s;
    say(c, 'не моя');
    r.goTo('three_pillars');
    meet(s, 'mytny');
    const caps = g.state.caps;
    say(c, 'Беглый сборщик Хэнк');
    expect(g.state.caps).toBe(caps + 50);
    expect(g.flag('hank_taken')).toBe(true);
    r.goTo('rusty_well');
    expect(r.npcs.has('hank')).toBe(false);
  });
});

describe('«Чертёж Луки»', () => {
  /** Ремень’s order and all three parts: the pickup’s tube, the old drip spring, the pack leader’s hide. */
  function parts(learn = true) {
    const s = setup('three_pillars');
    const { r, c, g } = s;
    meet(s, 'remen');
    say(c, 'особое');
    say(c, 'Какие');
    expect(g.stage('luka_drawing')).toBe('order');
    say(c, 'Позже');
    say(c, 'Прощай');
    r.goTo('rusty_well');
    g.give('saw');
    meet(s, 'car_pickup');
    say(c, 'Отпилить трубу');
    expect(g.count('pickup_barrel')).toBe(1);
    r.goTo('kolyuchka');
    meet(s, 'drip_tank');
    say(c, 'Перебрать кран');
    say(c, 'старую пружину');
    expect(g.count('drip_spring')).toBe(1);
    g.give('leader_hide');
    r.goTo('three_pillars');
    if (learn) {
      meet(s, 'luka');
      say(c, 'Ласточку');
      expect(g.flag('luka_known')).toBe(true);
      expect(g.stage('luka_drawing')).toBe('truth');
      say(c, 'Прости');
    }
    return s;
  }
  const noParts = (g: ReturnType<typeof setup>['g']) => ['pickup_barrel', 'drip_spring', 'leader_hide'].every((i) => g.count(i) === 0);

  it('Ремень builds it for 40', () => {
    const s = parts(false);
    const { c, g } = s;
    meet(s, 'remen');
    say(c, 'Про «Ласточку»');
    say(c, 'Детали у меня');
    expect(g.count('lastochka')).toBe(1);
    expect(g.state.caps).toBe(260);
    expect(noParts(g)).toBe(true);
    expect(g.stage('luka_drawing')).toBe('done');
  });

  it('Лука builds his own, better, for free, and sobers up', () => {
    const s = parts();
    const { c, g } = s;
    say(c, 'Собери «Ласточку» сам');
    expect(g.flag('luka')).toBe('sober');
    expect(g.count('lastochka_luka')).toBe(1);
    expect(noParts(g)).toBe(true);
    expect(CONTENT.weapons.lastochka_luka.crit).toBeGreaterThan(CONTENT.weapons.lastochka.crit!);
  });

  it('partners: talked round, Ремень takes Лука into the trade', () => {
    const s = parts();
    const { c, g } = s;
    say(c, 'Прощай');
    meet(s, 'remen');
    say(c, 'Про «Ласточку»');
    say(c, 'Возьми его в долю');
    expect(g.flag('luka')).toBe('partners');
    expect(g.count('lastochka_luka')).toBe(1);
  });

  it('gone: Лука sold to the Trust; his table is empty after', () => {
    const s = parts();
    const { r, c, g } = s;
    say(c, 'Прощай');
    meet(s, 'mytny');
    say(c, 'беглый оружейник');
    expect(g.flag('luka')).toBe('gone');
    reenter(r, 'three_pillars');
    expect(r.npcs.has('luka')).toBe(false);
  });
});

describe('Кастет Бугая', () => {
  it('a sober Бугай after the ring gives his knuckles; a saved one too', () => {
    for (const [flag, who] of [['bugai_clean', 'bugai_clean'], ['bugai_saved', 'bugai']] as const) {
      const s = setup();
      const { r, c, g } = s;
      g.setFlag(flag, true);
      g.setFlag('ring_done', true);
      r.goTo('three_pillars');
      meet(s, who);
      say(c, 'Кулаки у тебя тяжёлые');
      expect(g.count('bugai_knuckles')).toBe(1);
    }
  });
});

describe('«Кто ворует живицу»', () => {
  function asked() {
    const s = setup('kolyuchka');
    const { c, g } = s;
    g.setFlag('prokop_trust', true);
    meet(s, 'prokop');
    say(c, 'гложет');
    expect(g.stage('resin_thief')).toBe('asked');
    say(c, 'Найду');
    say(c, 'Прощай');
    return s;
  }

  it('secret: Ива’s jug carried to Сипуха; the amulet comes from the Silence', () => {
    const s = asked();
    const { r, c, g } = s;
    meet(s, 'iva');
    say(c, 'Руки у тебя в живице');
    expect(g.flag('resin_known')).toBe(true);
    say(c, 'Слушаю');
    say(c, 'Давай кувшин');
    expect(g.count('resin_jug')).toBe(1);
    g.setFlag('sipuha_here', true);
    r.goTo('rusty_well');
    meet(s, 'sipuha');
    say(c, 'Ива из Колючки');
    expect(g.flag('resin_thief')).toBe('secret');
    expect(g.count('resin_amulet')).toBe(1);
    expect(g.stage('resin_thief')).toBe('done');
  });

  it('told: a night by the vats, Ива turned in, locked up and gone from the yard', () => {
    const s = asked();
    const { r, c, g } = s;
    meet(s, 'vat_1');
    say(c, 'Посторожить');
    expect(c.last('dialogue')!.text).toMatch(/Ива/);
    say(c, 'Отойти');
    meet(s, 'prokop');
    say(c, 'Живицу носит Ива');
    expect(g.flag('resin_thief')).toBe('told');
    reenter(r, 'kolyuchka');
    expect(r.npcs.has('iva')).toBe(false);
    expect(g.count('resin_amulet')).toBe(0);
  });

  it('open: Прокоп talked round; Ива brings the amulet', () => {
    const s = asked();
    const { c, g } = s;
    g.setFlag('resin_known', true);
    meet(s, 'prokop');
    say(c, 'Помогай им открыто');
    expect(g.flag('resin_thief')).toBe('open');
    say(c, 'Правильно');
    say(c, 'Прощай');
    meet(s, 'iva');
    expect(g.count('resin_amulet')).toBe(1);
  });
});

describe('«Лук Ласки»', () => {
  /** After a raid talked down, Ласка asks; the cache shows on the chart and the Сухари wait by it. */
  function onRoad(outcome = 'parley') {
    const s = setup('kolyuchka');
    const { r, c, g } = s;
    g.setFlag('laska_met', true);
    g.setFlag('raid_outcome', outcome);
    reenter(r, 'kolyuchka');
    meet(s, 'laska');
    say(c, 'Заберу');
    expect(g.stage('laska_bow')).toBe('asked');
    expect(g.testAll(CONTENT.locations.dry_stone.open)).toBe(true);
    g.apply([{ type: 'travel' }]);
    for (let t = 0; t < 10_500 && !r.onRoad; t += 50) r.tick(50);
    const tr = r.world.travel!;
    expect(untilAlone(r, () => true, 50)).toBe(true);
    const guard: PartyState = { id: 'u_dry_stone', tpl: 'dry_stone', x: tr.x + 0.3, y: tr.y, path: [], members: ['suhar', 'suhar'], hurt: 0, wait: 9999, think: 9999 };
    tr.parties = [guard];
    c.do({ t: 'travel', x: Math.floor(tr.x) + 1, y: Math.floor(tr.y) });
    expect(until(r, () => r.meeting === 'u_dry_stone', 10_000)).toBe(true);
    expect(c.last('dialogue')!.speaker).toBe('Сухари у Сухого камня');
    return s;
  }

  it('talked: the peace with the circle makes the Сухари hand it over; Ласка says keep it', () => {
    const s = onRoad();
    const { r, c, g } = s;
    say(c, 'Колючка и круг теперь в мире');
    say(c, '…');
    expect(g.flag('laska_bow')).toBe('talked');
    expect(g.count('laska_bow')).toBe(1);
    expect(r.fight).toBeNull();
    c.do({ t: 'travel', to: 'kolyuchka' });
    expect(untilAlone(r, () => g.flag('at') === 'kolyuchka')).toBe(true);
    meet(s, 'laska');
    expect(g.flag('laska_bow_done')).toBe(true);
    expect(g.count('laska_bow')).toBe(1);
  });

  it('sneaked: taken from under their noses', () => {
    const s = onRoad('trapped');
    const { c, g } = s;
    say(c, 'зайти к яме');
    say(c, '…');
    expect(g.flag('laska_bow')).toBe('sneaked');
    expect(g.count('laska_bow')).toBe(1);
  });

  it('fought: beaten, the guard leaves the cache open', () => {
    const s = onRoad('trapped');
    const { r, c, g } = s;
    say(c, 'Лук мой');
    say(c, '…');
    expect(until(r, () => !!r.fight, 10_000)).toBe(true);
    winFight(r, c);
    expect(until(r, () => !r.fight && r.onRoad, 30_000)).toBe(true);
    expect(g.flag('gone_u_dry_stone')).toBe(true);
    expect(g.flag('laska_bow')).toBe('fought');
    expect(g.count('laska_bow')).toBe(1);
  });
});

describe('relics balance', () => {
  // a gang boss and three raiders at level 3: «Кочевник» (the best II tier rifle) is the yardstick
  const RUNS = 300;
  const AMMO: Record<string, string> = { nomad: 'ammo', skoba: 'ammo', lastochka: 'pistol', lastochka_luka: 'pistol', laska_bow: 'bolts' };
  const band = ['raider_boss', 'raider', 'raider', 'raider'];
  const rate = (title: string, weapon: string, foes: string[], field: string) => {
    let wins = 0;
    for (let s = 1; s <= RUNS; s++) {
      const g = arm(premadeGame(title, s * 7919), weapon);
      if (AMMO[weapon]) g.give(AMMO[weapon], 60);
      if (roadBattle(g, foes, field) === 'victory') wins++;
    }
    return wins / RUNS;
  };

  it('each relic beats the II tier yardstick, but by no more than a fifth of all fights', () => {
    const nomad = rate('Стрелок', 'nomad', band, 'enc_sand');
    const r = Object.fromEntries(['skoba', 'lastochka', 'lastochka_luka', 'laska_bow'].map((w) => [w, rate('Стрелок', w, band, 'enc_sand')]));
    process.stderr.write(`relics vs band, Стрелок: nomad ${nomad} ${JSON.stringify(r)}\n`);
    for (const v of Object.values(r)) {
      expect(v).toBeGreaterThanOrEqual(nomad);
      expect(v).toBeLessThanOrEqual(nomad + 0.25);
    }
  });

  it('Бугай’s knuckles: a real step up from a wrench, not a new game', () => {
    const three = ['raider', 'raider', 'raider'];
    const wrench = rate('Механик', 'wrench', three, 'enc_road');
    const knuckles = rate('Механик', 'bugai_knuckles', three, 'enc_road');
    process.stderr.write(`knuckles vs three raiders, Механик: wrench ${wrench} knuckles ${knuckles}\n`);
    expect(knuckles).toBeGreaterThanOrEqual(wrench);
    expect(knuckles).toBeLessThanOrEqual(wrench + 0.25);
  });
});
