// Meetings on the road: a dialogue built for the party at hand (docs/story/bestiary.md «Встречи на дороге»).
// What happens next is an `encounter` effect the room acts on: leave, flee (a head start), fight; trade opens barter.
import type { Dialogue, DialogueNode, DialogueOption, Effect, EncounterAction } from '../types';
import type { PartyTemplate } from './Parties';
import { drops, lowerFirst, people } from '../words';
import { TERRAIN } from './Travel';

export interface MeetingContext {
  party: PartyTemplate;
  count: number; // how many of them
  ratio: number; // hero strength / theirs
  terrain: string; // terrain char under the party
  sneak: boolean;
  trustEnemy: boolean;
  hire?: { to: string; pay: number }; // a caravan that takes a guard to its next stop
}

const go = (action: EncounterAction, extra: Effect[] = []): Effect[] => [...extra, { type: 'encounter', action }];

/** Barter with the party's trader once the talk closes (they stand by while the window is open). */
function tradeWith(p: PartyTemplate, text: string): DialogueOption[] {
  return p.trader ? [{ text, effects: go('leave', [{ type: 'open', window: 'barter', id: p.trader }]), next: null }] : [];
}

/**
 * Checks lean on the odds: a stronger party scares easier; a getaway is easier on fast open ground (the road)
 * than where you stumble (rocks), and easier sneaking.
 */
function odds(c: MeetingContext) {
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v)));
  const talk = clamp((c.ratio - 1) * 30, -40, 20);
  const ground = (TERRAIN[c.terrain] ?? TERRAIN['.']).speed;
  return { talk, flee: Math.round((ground - 0.7) * 50) + (c.sneak ? 10 : 0) };
}

const end = (text: string, effects: Effect[]): DialogueNode => ({ text, effects, options: [{ text: '…' }] });

function flee(c: MeetingContext, text: string): DialogueOption {
  return { text, check: { skill: 'sneak', mod: odds(c).flee, pass: 'fled', fail: 'caught' } };
}

const FIGHT: DialogueNode = end('Разговор окончен. Стволы поднимаются: они бьют первыми.', go('ambush'));
const ATTACK: DialogueNode = end('Вы бьёте первыми.', go('fight'));
const FLED: DialogueNode = end('Вы уходите в пыль и петляете, пока их голоса не стихают за спиной.', go('flee'));
const CAUGHT: DialogueNode = end('Не вышло: вас заметили и отрезали путь.', go('ambush'));

export function meetingDialogue(c: MeetingContext): Dialogue {
  const p = c.party;
  const o = odds(c);
  const nodes: Record<string, DialogueNode> = { fight: FIGHT, attack: ATTACK, fled: FLED, caught: CAUGHT, leave: end('Вы расходитесь.', go('leave')) };
  let intro: DialogueNode;
  if (p.kind === 'bandits') {
    const toll = p.toll ?? 20;
    intro = {
      text: `Из-за укрытий выходит ${lowerFirst(p.name)}: ${people(c.count)} с оружием наготове. Главный скалится: — Капли или жизнь, путник. ${toll} ${drops(toll)} — и иди своей дорогой.`,
      options: [
        { text: `Держите ${toll} ${drops(toll)}.`, if: [{ caps: toll }], effects: [{ type: 'caps', amount: -toll }], next: 'paid' },
        { text: 'Это мы вас сейчас разденем.', check: { attr: 'str', mod: o.talk, pass: 'scared', fail: 'fight' } },
        { text: 'За нами идёт патруль Треста. Хотите познакомиться?', check: { skill: 'speech', mod: o.talk - 10, pass: 'talked', fail: 'fight' } },
        flee(c, 'Отступить в пыль.'),
        { text: 'Напасть.', next: 'attack' },
      ],
    };
    nodes.paid = end('— Умный. Вали, пока мы добрые.', go('leave'));
    nodes.scared = end('Главный меряет вас взглядом и сплёвывает. — Не сегодня. — Они отступают.', go('leave'));
    nodes.talked = end('— Трест… — Налётчики переглядываются и уходят с дороги.', go('leave'));
  } else if (p.kind === 'caravan') {
    intro = {
      text: 'Караван Гильдии: повозка, вьюки, охрана с ружьями. Караванщик поднимает руку: — Мирно? Тогда торгуем.',
      options: [
        ...tradeWith(p, 'Покажи товар.'),
        ...(c.hire ? [{ text: `Нужна охрана до места «${c.hire.to}»? (${c.hire.pay} ${drops(c.hire.pay)})`, next: 'hire' }] : []),
        { text: 'Что нового на тракте?', next: 'news' },
        { text: 'Ограбить караван.', effects: [{ type: 'karma', amount: -2 }, { type: 'inc', key: 'rep_guild', by: -15 }], next: 'attack' },
        { text: 'Счастливого пути.', next: 'leave' },
      ],
    };
    if (c.hire)
      nodes.hire = {
        text: `— Охрана лишней не бывает. До места «${c.hire.to}» — ${c.hire.pay} ${drops(c.hire.pay)}, плачу у ворот. Отстанешь или сбежишь — не заплачу.`,
        options: [
          { text: 'По рукам.', effects: go('hire'), next: null },
          { text: 'Подумаю.', next: 'intro' },
        ],
      };
    nodes.news = { text: '— На восточной дороге режут. «Жажда» с Элеватора охотится на всех, кто слабее. Держись тракта и не ходи ночью: в Мёртвых полях по ночам бродят Сухостои.', options: [{ text: 'Спасибо.', next: 'intro' }] };
  } else if (p.kind === 'trust') {
    intro = c.trustEnemy
      ? {
          text: '— Именем Треста! — Сборщик узнаёт вас. — Ты тот, кто перебил наших у Ржавого колодца.',
          options: [
            { text: 'Обознались. Я здесь впервые.', check: { skill: 'speech', mod: -10, pass: 'leave', fail: 'fight' } },
            { text: 'Штраф? Пятьдесят капель.', if: [{ caps: 50 }], effects: [{ type: 'caps', amount: -50 }], next: 'leave' },
            flee(c, 'Бежать.'),
            { text: 'Ну, попробуйте взять.', next: 'fight' },
          ],
        }
      : {
          text: 'Патруль Треста: серые пыльники, значки-счётчики. — Дорожный сбор, пять капель. Или пропуск.',
          options: [
            { text: 'Вот пропуск Треста.', if: [{ item: 'trust_pass' }], next: 'leave' },
            { text: 'Держите пять капель.', if: [{ caps: 5 }], effects: [{ type: 'caps', amount: -5 }], next: 'leave' },
            { text: 'Сбор? На пустой дороге?', check: { skill: 'speech', mod: 0, pass: 'leave', fail: 'insist' } },
            { text: 'Проваливайте.', effects: [{ type: 'flag', key: 'trust_road_fight' }], next: 'fight' },
          ],
        };
    nodes.insist = {
      text: '— Пять капель, или разговор продолжим в Запруде.',
      options: [
        { text: 'Держите.', if: [{ caps: 5 }], effects: [{ type: 'caps', amount: -5 }], next: 'leave' },
        { text: 'Нет.', effects: [{ type: 'flag', key: 'trust_road_fight' }], next: 'fight' },
      ],
    };
  } else if (p.kind === 'dry') {
    intro = {
      text: 'Из пыли поднимаются сухие фигуры с корой вместо кожи. Их ведёт запах воды у вас во фляге.',
      options: [
        { text: 'Бросить им флягу и уйти.', if: [{ item: 'flask' }], effects: [{ type: 'take', item: 'flask' }], next: 'thrown' },
        { text: 'Зажигательную бомбу — в стадо!', if: [{ item: 'firebomb' }], effects: [{ type: 'take', item: 'firebomb' }], next: 'burnt' },
        flee(c, 'Уйти, пока не окружили.'),
        { text: 'В бой.', next: 'attack' },
      ],
    };
    nodes.thrown = end('Фляга катится по трещинам. Сухостои бросаются к ней, раздирая друг друга. Вы уходите.', go('leave'));
    nodes.burnt = end('Огонь бежит по сухой коре. Стадо рассыпается с тихим треском.', go('leave'));
  } else if (p.kind === 'beast') {
    intro = {
      text: `${p.name}: ${people(c.count) === 'один' ? 'зверь' : `${c.count} ${c.count < 5 ? 'зверя' : 'зверей'}`} поднимаются из-за камней и следят за каждым вашим шагом.`,
      options: [
        { text: 'Бросить им жареную ящерицу и уйти.', if: [{ item: 'lizard' }], effects: [{ type: 'take', item: 'lizard' }], next: 'fed' },
        { text: 'Бросить пахучую приманку в сторону.', if: [{ item: 'scent_lizard' }], effects: [{ type: 'take', item: 'scent_lizard' }], next: 'fed' },
        { text: 'Зажигательную бомбу — перед ними!', if: [{ item: 'firebomb' }], effects: [{ type: 'take', item: 'firebomb' }], next: 'scared' },
        flee(c, 'Отходить, не поворачиваясь спиной.'),
        { text: 'В бой.', next: 'attack' },
      ],
    };
    nodes.fed = end('Звери бросаются на добычу и грызутся из-за неё. Вы уходите.', go('leave'));
    nodes.scared = end('Огонь отрезает их от вас. Звери скулят и разбегаются.', go('flee'));
  } else if (p.name.startsWith('Водонос')) {
    intro = {
      text: 'Двое с флягами на ремнях. — Вода. Дешевле, чем у Треста, и никто не пишет в книжку.',
      options: [
        { text: 'Фляга за 4 капли.', if: [{ caps: 4 }], effects: [{ type: 'caps', amount: -4 }, { type: 'give', item: 'flask' }], next: 'intro' },
        { text: 'Где вы берёте воду?', next: 'where' },
        { text: 'Прощайте.', next: 'leave' },
      ],
    };
    nodes.where = { text: '— Старые водоводы. Под Запрудой их сотни. Трест думает, что они сухие. — Водонос подмигивает.', options: [{ text: 'Ясно.', next: 'intro' }] };
  } else if (p.name.startsWith('Паломники')) {
    intro = {
      text: 'Паломники Ковчега бредут в пустыню с пустыми флягами. — Дождь придёт, — говорит старшая. — Ты веришь?',
      options: [
        { text: 'Отдать им флягу.', if: [{ item: 'flask' }], effects: [{ type: 'take', item: 'flask' }, { type: 'karma', amount: 1 }], next: 'blessed' },
        { text: 'Вернитесь. В пустыне вы умрёте.', check: { skill: 'speech', mod: 0, pass: 'turned', fail: 'leave', passEffects: [{ type: 'karma', amount: 1 }] } },
        { text: 'Отобрать у них всё.', effects: [{ type: 'karma', amount: -3 }], next: 'attack' },
        { text: 'Идите с миром.', next: 'leave' },
      ],
    };
    nodes.blessed = end('Старшая пьёт первой и передаёт флягу дальше. — Дождь запомнит тебя.', go('leave'));
    nodes.turned = end('Паломники переглядываются и поворачивают к Ковчегу.', go('leave'));
  } else {
    intro = {
      text: `${p.name}: тележка хлама и усталые лица. — Меняемся? Гайки, пружины, слухи.`,
      options: [
        ...tradeWith(p, 'Покажите, что есть.'),
        { text: 'Прощайте.', next: 'leave' },
      ],
    };
  }
  nodes.intro = intro;
  return { speaker: p.name, entry: [{ node: 'intro' }], nodes };
}

/** A fight already going on: bandits on someone. Help the ones they set upon, help the bandits, or keep out of it. */
export function battleDialogue(bandits: PartyTemplate, other: PartyTemplate): Dialogue {
  const robbing = other.kind === 'caravan' ? [{ type: 'inc' as const, key: 'rep_guild', by: -15 }] : [];
  return {
    speaker: 'Бой на дороге',
    entry: [{ node: 'intro' }],
    nodes: {
      intro: {
        text: `Впереди стреляют: ${lowerFirst(bandits.name)} насела на отряд — ${lowerFirst(other.name)}. Пыль, крики, кто-то уже лежит. Вас пока не заметили.`,
        options: [
          { text: `Помочь: ${other.name}.`, next: 'help' },
          { text: `Помочь: ${bandits.name}. Добычу поделим.`, effects: [{ type: 'karma', amount: -2 }, ...robbing], next: 'turn' },
          { text: 'Переждать в стороне.', next: 'leave' },
        ],
      },
      help: end('Вы бросаетесь в свалку.', go('help')),
      turn: end('Вы заходите им в спину.', go('turn')),
      leave: end('Вы обходите бой стороной. Чем кончится, узнаете потом.', go('leave')),
    },
  };
}
