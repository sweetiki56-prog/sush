// Stage L quests in the real room, every ending: «Колодец под печатью» (the cistern), «Медная жила» (the substation
// ruins), «Семена под стеклом» (the greenhouses), and the barge: «Угорь под палубой», «Ржавая лотерея», «Слепой штурман».
import { describe, it, expect } from 'vitest';
import type { SkillId } from '../../src/core/character/defs';
import { room, until, TOWNS } from './rooms';
import { placedBattle, premadeGame } from './sim';
import { say, talk, winFight } from './story';

/** After Chapter I (the well sealed by the Trust): sharp eyes, money, every roll lands; the party in `at`. */
function setup(at = 'rusty_well') {
  const { r, clients } = room();
  const [c] = clients;
  const g = r.players.get(c.id)!.game;
  for (const [k, v] of [['chapter1_seen', true], ['trust_outcome', 'tax'], ['quest_complete', true], ['marta_letter', true], ['chapter1_done', true], ['well_sealed', true], ['day', 3]] as const) g.setFlag(k, v);
  g.char.attrs.per = 7;
  g.state.caps = 300;
  g.rng = () => 0.01;
  go(r, at);
  return { r, c, g };
}
type S = ReturnType<typeof setup>;

/** Move to a map with nothing hostile awake there (the fights are tested elsewhere). */
function go(r: S['r'], map: string) {
  r.goTo(map);
  for (const h of r.hostiles.list) if (!h.group.startsWith('queen')) h.dead = true;
}
const skill = (g: S['g'], s: SkillId, v: number) => (g.char.spent[s] = v);
const meet = (s: S, id: string, from: [number, number]) => talk(s.r, s.c, id, from);

describe('«Колодец под печатью»', () => {
  it('bypass: the valve in the cistern sends water past the seal; Марта thanks', () => {
    const s = setup();
    const { r, c, g } = s;
    meet(s, 'marta', [14, 25]);
    say(c, 'Пломба на помпе');
    expect(g.stage('well_seal')).toBe('asked');
    say(c, 'Посмотрю');
    go(r, 'rw_cistern');
    g.give('crowbar');
    meet(s, 'bypass_valve', [21, 14]);
    say(c, 'монтировкой');
    expect(g.flag('well_fate')).toBe('bypass');
    expect(g.flag('well_sealed')).toBe(true); // the seal is still there: the Trust sees nothing
    say(c, 'Отойти');
    go(r, 'rusty_well');
    const caps = g.state.caps;
    meet(s, 'marta', [14, 25]);
    expect(g.state.caps).toBe(caps + 40);
    expect(g.flag('seal_thanked')).toBe(true);
  });

  it('free: the paint capsule seen, the seal taken off clean', () => {
    const s = setup();
    const { c, g } = s;
    meet(s, 'pump', [12, 24]);
    say(c, 'Присмотреться к пломбе');
    say(c, '…');
    say(c, 'Снять пломбу чисто');
    expect(g.flag('well_fate')).toBe('free');
    expect(g.flag('well_sealed')).toBe(false);
    expect(g.flag('paint_hands')).toBeFalsy();
  });

  it('torn: ripped off, hands in paint, the Trust angry', () => {
    const s = setup();
    const { c, g } = s;
    meet(s, 'pump', [12, 24]);
    say(c, 'Сорвать пломбу');
    expect(g.flag('well_fate')).toBe('torn');
    expect(g.flag('paint_hands')).toBe(true);
    expect(Number(g.flag('rep_trust'))).toBe(-10);
  });

  it('licensed or bought: Мытный in Три столба', () => {
    for (const [pick, then, fate] of [['льгота', null, 'licensed'], ['Выкупить колодец', 'Держи сто', 'bought']] as const) {
      const s = setup('three_pillars');
      const { c, g } = s;
      meet(s, 'mytny', [24, 13]);
      say(c, pick);
      if (then) say(c, then);
      expect(g.flag('well_fate')).toBe(fate);
      if (fate === 'bought') expect(g.state.caps).toBe(200);
    }
  });
});

describe('«Медная жила»', () => {
  function asked(learn = true) {
    const s = setup('three_pillars');
    const { r, c, g } = s;
    meet(s, 'mytny', [24, 13]);
    say(c, 'Есть работа');
    expect(g.stage('copper')).toBe('asked');
    say(c, 'Найду');
    say(c, 'Прощай');
    if (learn) {
      go(r, 'pillars_ruins');
      meet(s, 'shnyr', [8, 16]);
      say(c, 'Это медь');
      expect(g.stage('copper')).toBe('truth');
      say(c, '…');
      say(c, 'Потом');
    }
    return s;
  }

  it('told: the children given up; the families lose water, the kids are gone from the ruins', () => {
    const s = asked();
    const { r, c, g } = s;
    go(r, 'three_pillars');
    meet(s, 'mytny', [24, 13]);
    const caps = g.state.caps;
    say(c, 'Медь с опор режут дети');
    expect(g.flag('copper')).toBe('told');
    expect(g.state.caps).toBe(caps + 30);
    go(r, 'pillars_ruins');
    expect(r.npcs.has('shnyr')).toBe(false);
  });

  it('deal: Ремень learns it through talk and will buy scrap from the ruins instead', () => {
    const s = asked(false);
    const { c, g } = s;
    meet(s, 'remen', [7, 12]);
    say(c, 'Кто носит тебе медь');
    expect(g.flag('copper_known')).toBe(true);
    say(c, '…');
    say(c, 'Бери у детей лом');
    expect(g.flag('copper')).toBe('deal');
  });

  it('vault: the transformer house forced open, the coils go to the children, Галка gives her bracelet', () => {
    const s = asked();
    const { c, g } = s;
    g.give('crowbar');
    meet(s, 'vault_door', [23, 14]);
    say(c, 'монтировкой');
    expect(g.flag('open_vault_door')).toBe(true);
    say(c, 'Отойти');
    meet(s, 'shnyr', [8, 16]);
    say(c, 'Трансформаторная открыта');
    expect(g.flag('copper')).toBe('vault');
    expect(g.count('copper_band')).toBe(1);
  });
});

describe('«Семена под стеклом»', () => {
  function found() {
    const s = setup('kolyuchka');
    const { r, c, g } = s;
    g.setFlag('prokop_trust', true);
    meet(s, 'prokop', [11, 15]);
    say(c, 'Откуда у Колючки кактус');
    say(c, 'Принесу');
    say(c, 'Прощай');
    go(r, 'kolyuchka_glass');
    g.give('crowbar');
    meet(s, 'seed_door', [25, 11]);
    say(c, 'монтировкой');
    say(c, 'Отойти');
    meet(s, 'seed_box', [26, 7]);
    say(c, 'мелкий шрифт');
    expect(g.flag('seeds_label')).toBe(true);
    say(c, '…');
    say(c, 'Взять ящик');
    expect(g.stage('seeds')).toBe('found');
    say(c, 'Отойти');
    go(r, 'kolyuchka');
    meet(s, 'prokop', [11, 15]);
    say(c, 'Вот семена');
    return s;
  }

  it('planted as they are', () => {
    const { c, g } = found();
    say(c, 'Отдать как есть');
    expect(g.flag('seeds')).toBe('planted');
    expect(g.count('seed_box')).toBe(0);
  });

  it('burned once Прокоп reads the tag', () => {
    const { c, g } = found();
    say(c, 'Дочитай бирку');
    say(c, 'Сжечь');
    expect(g.flag('seeds')).toBe('burned');
  });

  it('crossed with the farm cactus by Наука and resin', () => {
    const s = found();
    const { c, g } = s;
    say(c, 'Потом');
    say(c, 'Прощай');
    skill(g, 'science', 60);
    g.give('resin');
    meet(s, 'prokop', [11, 15]);
    say(c, 'Вот семена');
    say(c, 'Скрестить');
    expect(g.flag('seeds')).toBe('crossed');
  });

  it('sold to the Guild caravan man', () => {
    const s = found();
    const { r, c, g } = s;
    say(c, 'Потом');
    say(c, 'Прощай');
    g.setFlag('caravan_here', true);
    go(r, 'rusty_well');
    meet(s, 'birjuk', [7, 28]);
    const caps = g.state.caps;
    say(c, 'довоенные семена');
    say(c, 'По рукам');
    expect(g.flag('seeds')).toBe('sold');
    expect(g.state.caps).toBe(caps + 80);
  });
});

describe('the barge «Стрежень»', () => {
  function asked() {
    const s = setup('barge_deck');
    const { r, c, g } = s;
    meet(s, 'yakor', [10, 9]);
    say(c, 'Работа есть');
    expect(g.stage('eel')).toBe('asked');
    say(c, 'Уберу');
    say(c, 'Прощай');
    go(r, 'barge_bed');
    meet(s, 'eel_nest', [34, 27]);
    expect(g.stage('eel')).toBe('nest');
    return s;
  }

  it('«Угорь под палубой», moved: the clutch dragged away, the queen follows, Якорь pays', () => {
    const s = asked();
    const { r, c, g } = s;
    skill(g, 'survival', 60);
    say(c, 'Отойти');
    meet(s, 'eel_nest', [34, 27]);
    say(c, 'Перетащить кладку');
    expect(g.flag('eel')).toBe('moved');
    say(c, 'Отойти');
    go(r, 'barge_bed');
    expect(r.hostiles.list.some((h) => h.group === 'queen')).toBe(false);
    go(r, 'barge_deck');
    const caps = g.state.caps;
    meet(s, 'yakor', [10, 9]);
    expect(g.state.caps).toBe(caps + 60);
  });

  it('«Угорь под палубой», tamed: a hatchling in a tin for a lizard', () => {
    const s = asked();
    const { c, g } = s;
    skill(g, 'survival', 70);
    g.give('lizard');
    say(c, 'Отойти');
    meet(s, 'eel_nest', [34, 27]);
    say(c, 'жареной ящерицей');
    expect(g.flag('eel')).toBe('tamed');
    expect(g.count('eel_hatchling')).toBe(1);
  });

  it('«Угорь под палубой», killed: the queen goes for us once attacked; beaten, the stern is safe', () => {
    const s = asked();
    const { r, c, g } = s;
    say(c, 'Напасть на матку');
    expect(until(r, () => !!r.fight, 10_000)).toBe(true);
    winFight(r, c);
    expect(until(r, () => g.flag('eel') === 'killed', 20_000)).toBe(true);
    expect(g.stage('eel')).toBe('done');
  });

  it('«Ржавая лотерея»: exposed, bought or picked — the tin armour and the third seal mark each time', () => {
    for (const how of ['exposed', 'bought', 'picked'] as const) {
      const s = setup('barge_deck');
      const { c, g } = s;
      meet(s, 'knysh', [19, 9]);
      if (how === 'exposed') say(c, 'Призовой ящик у тебя под лавкой');
      if (how === 'bought') say(c, 'Выкуплю все ящики');
      if (how === 'picked') {
        say(c, 'Прощай');
        meet(s, 'lottery_bench', [21, 9]);
        say(c, 'вскрыть ящик');
      }
      expect(g.flag('lottery')).toBe(how);
      expect(g.count('tinplate')).toBe(1);
      expect(g.flag('seal_mark_3')).toBe(true);
    }
  });

  it('«Слепой штурман»: water for the navigator opens the post station on the plan; its safe was sealed again five years ago', () => {
    const s = setup('barge_deck');
    const { r, c, g } = s;
    g.give('flask');
    meet(s, 'efim', [25, 15]);
    say(c, 'Принёс тебе воды');
    expect(g.flag('post_known')).toBe(true);
    expect(g.flag('tube_origin')).toBe(true);
    say(c, 'Спасибо');
    meet(s, 'yakor', [10, 9]);
    say(c, 'тубус');
    expect(g.flag('yakor_tube')).toBe(true);
    say(c, 'Не видел');
    say(c, 'Прощай');
    go(r, 'barge_post');
    meet(s, 'post_safe', [18, 11]);
    say(c, 'сургучу');
    expect(g.flag('post_wax')).toBe(true);
  });
});

describe('stage L balance', () => {
  const RUNS = 200;
  const rate = (t: string, map: string, at: [number, number], foes: [string, number, number][]) => {
    let w = 0;
    for (let s = 1; s <= RUNS; s++) if (placedBattle(premadeGame(t, s * 7919), TOWNS[map], at, foes) === 'victory') w++;
    return w / RUNS;
  };
  const mites: [string, number, number][] = [['rust_mite', 14, 10], ['rust_mite', 12, 16], ['rust_mite', 17, 17]];
  const queen: [string, number, number][] = [['eel_queen', 34, 25], ['sand_eel', 32, 26], ['sand_eel', 37, 25]];

  it('the cistern mites are a small fight for anyone; the eel queen is the hard way, for a shooter at that', () => {
    const r = {
      mites: Object.fromEntries(['Стрелок', 'Механик', 'Говорун'].map((t) => [t, rate(t, 'rw_cistern', [19, 8], mites)])),
      queen: Object.fromEntries(['Стрелок', 'Механик'].map((t) => [t, rate(t, 'barge_bed', [28, 24], queen)])),
    };
    process.stderr.write(`stage L fights, level 3: ${JSON.stringify(r)}\n`);
    expect(r.mites['Говорун']).toBeGreaterThanOrEqual(0.5);
    expect(r.mites['Стрелок']).toBeGreaterThanOrEqual(0.9);
    expect(r.queen['Стрелок']).toBeLessThanOrEqual(0.6);
    expect(r.queen['Стрелок']).toBeGreaterThan(r.queen['Механик']);
  });
});
