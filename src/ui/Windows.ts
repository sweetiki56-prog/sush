// Journal window, pause menu, game over and chapter-end screens.
import Phaser from 'phaser';
import type { Game } from '../core/Game';
import { GAME_H, GAME_W } from '../config';
import { C, button, dimmer, fmtTime, glass, metalPanel, title, txt } from './theme';
import { karmaWord } from './CharacterWindow';
import { Window } from './Window';
import { jobCount, jobFlag } from '../core/jobs';



export class JournalWindow extends Window {
  show(): void {
    if (this.root) return this.close();
    const s = this.scene;
    const { x, y } = this.frame(700, 520, 'ЖУРНАЛ');
    let yy = y + 76;
    for (const [id, q] of Object.entries(this.game.content.quests)) {
      const lines = this.game.journal(id);
      if (!lines.length) continue;
      const head = txt(s, x + 36, yy, q.title.toUpperCase(), 15, C.amber, 620, true);
      this.root!.add(head);
      yy += head.height + 10;
      for (const l of lines) {
        const t = txt(s, x + 48, yy, `${l.done ? '✓' : '◆'} ${l.text}`, 13, l.done ? C.crtDim : C.crtBright, 600);
        this.root!.add(t);
        yy += t.height + 8;
      }
    }
    // contracts from the board: one line each, with the count for hunts
    const g = this.game;
    const jobs = Object.entries(g.content.jobs).filter(([id]) => g.flag(jobFlag(id)) === 'active');
    if (jobs.length) {
      const head = txt(s, x + 36, yy, 'КОНТРАКТЫ', 15, C.amber, 620, true);
      this.root!.add(head);
      yy += head.height + 10;
      for (const [id, j] of jobs) {
        const n = j.hunt ? ` — ${Number(g.flag(jobCount(id)) ?? 0)} из ${j.hunt.count}` : '';
        const t = txt(s, x + 48, yy, `◆ «${j.title}»${n}. ${j.desc}`, 13, C.crtBright, 600);
        this.root!.add(t);
        yy += t.height + 8;
      }
    }
    if (yy === y + 76) this.root!.add(txt(s, x + 36, yy, 'Записей нет. Поговорите с жителями поселения.', 14, C.crt));
  }
}

/** Death screen: load the pre-combat autosave or leave to the main menu. Co-op: the whole party fell. */
export function showGameOver(scene: Phaser.Scene, h: { load: (() => void) | null; menu: () => void; party?: boolean }): Phaser.GameObjects.Container {
  const s = scene;
  const root = s.add.container(0, 0).setDepth(60);
  root.add(s.add.rectangle(0, 0, GAME_W, GAME_H, 0x0d0a08, 0.88).setOrigin(0).setInteractive());
  root.add(title(s, GAME_W / 2, 200, h.party ? 'ОТРЯД ПАЛ' : 'ВАС НЕ СТАЛО', 34, C.red).setOrigin(0.5));
  const line = h.party ? 'Никто не устоял. Любой из отряда может вернуть всех к сохранению перед боем.' : 'Пустошь не прощает ошибок. Песок заметёт следы к утру.';
  root.add(txt(s, GAME_W / 2, 260, line, 16, C.sand).setOrigin(0.5));
  if (h.load) root.add(button(s, GAME_W / 2 - 150, 330, 300, 36, h.party ? 'ВСЕМ ВЕРНУТЬСЯ К СОХРАНЕНИЮ' : 'ЗАГРУЗИТЬ АВТОСЕЙВ', h.load).root);
  root.add(button(s, GAME_W / 2 - 150, 380, 300, 36, 'ГЛАВНОЕ МЕНЮ', h.menu).root);
  return root;
}

/** Pause overlay (Esc): resume, settings, back to the main menu. */
export function showPause(scene: Phaser.Scene, h: { resume: () => void; settings: () => void; mainMenu: () => void; invite?: () => void }): Phaser.GameObjects.Container {
  const s = scene;
  const w = 360;
  const hh = h.invite ? 296 : 250;
  const x = (GAME_W - w) / 2;
  const y = 150;
  const root = s.add.container(0, 0).setDepth(50);
  root.add([dimmer(s, 0.55), metalPanel(s, x, y, w, hh), glass(s, x + 16, y + 16, w - 32, hh - 32), title(s, GAME_W / 2, y + 42, 'ПАУЗА', 16, C.amber).setOrigin(0.5)]);
  const items: [string, () => void][] = [
    ['ПРОДОЛЖИТЬ', () => (root.destroy(), h.resume())],
    ...(h.invite ? [['ССЫЛКА ДЛЯ ДРУЗЕЙ', h.invite] as [string, () => void]] : []),
    ['НАСТРОЙКИ', h.settings],
    ['ГЛАВНОЕ МЕНЮ', h.mainMenu],
  ];
  items.forEach(([label, fn], i) => root.add(button(s, x + 50, y + 76 + i * 46, w - 100, 32, label, fn).root));
  root.add(txt(s, GAME_W / 2, y + hh - 34, h.invite ? 'Комнату сохраняет сервер.' : 'Игра сохраняется сама.', 12, C.crtDim).setOrigin(0.5));
  return root;
}

function nestOutcome(game: Game): string {
  const stage = game.stage('nest');
  if (stage === 'cleared') return game.flag('nest_bombed') ? 'взорвано бомбой' : 'перебито в бою';
  if (stage === 'avoided') return game.flag('nest_lured') ? 'выманено приманкой' : 'обойдено тайком';
  return stage === 'seen' ? 'осталось в покое' : 'не встречено';
}

const TRUST_WORDS: Record<string, string> = {
  lie: 'поверил, что беглец сгорел',
  hidden: 'обыскал и ушёл ни с чем',
  tax: 'вписал колодец в книгу',
  fight: 'ушёл раненым',
  surrender: 'увёз тубус',
  law: 'усомнился в приказе',
};

function tubeWhere(game: Game): string {
  if (game.flag('paper_dog')) return 'у Треста';
  if (game.flag('tube_well')) return 'спрятан в колодце';
  if (game.flag('tube_bones')) return 'спрятан под скелетом';
  if (game.flag('tube_bag')) return 'в мешке Хэнка';
  return game.count('tube') ? 'в мешке' : 'у спутника';
}

function hankFate(game: Game): string {
  if (game.flag('hank_taken')) return 'уведён Трестом';
  if (game.flag('trust_outcome') === 'surrender') return 'не простил';
  return game.flag('hank_joins') ? 'идёт с вами' : 'остался у костра';
}

const SCRIBE_WORDS: Record<string, string> = { exposed: 'разоблачён', followed: 'выслежен до тайника', copied: 'заверил тубус', killed: 'убит', sold: 'купил сведения о Хэнке' };
const RAID_WORDS: Record<string, string> = { fought: 'отбила налёт', trapped: 'остановила Сухарей ловушками', tribute: 'платит дань водой', given: 'выдала беглянку', parley: 'разошлась с Сухарями миром', burned: 'отбилась сама, грядки сгорели' };
const LASKA_WORDS: Record<string, string> = { hidden: 'прячется в Колючке', given: 'выдана Сухарям', left: 'ушла с Сухарями сама' };
const SENKA_WORDS: Record<string, string> = { hidden: 'в Колючке, у Прокопа', trust: 'под защитой Треста', given: 'выдан Писарю' };
const CARAVAN_WORDS: Record<string, string> = { exposed: 'Хорь уличён, люди свободны', bought: 'люди выкуплены', water: 'люди свободны: вода из Колючки', fought: 'охрана перебита, люди свободны' };

function chapter2Next(game: Game): string {
  if (game.flag('mandate_copy')) return 'Впереди — водонапорные башни Запруды и контора Нотариуса. Тубус при вас, с новой печатью Писаря. Только почему он кажется легче?';
  if (game.flag('trust_outcome') === 'surrender') return 'Впереди — водонапорные башни Запруды. Тубус где-то там, у Треста. Нотариус — единственный, кто скажет, что за бумагу вы отдали.';
  return 'Впереди — водонапорные башни Запруды. Нотариус в Нижнем городе прочтёт Мандат. Если сборщики на воротах пропустят…';
}

const GATE_WORDS: Record<string, string> = { pass: 'по пропуску', collector: 'назвавшись сборщиком', bearers: 'водоводом, с водоносами', fight: 'с боем' };
const BOUNTY_WORDS: Record<string, string> = { escaped: 'бежали из «Сухого дока» стоками', talked: 'надзиратель отпустил', riot: 'вырвались с бунтом заключённых', bail: 'вышли под залог', slipped: 'ушли от Шлюза в толпу', doubt: 'Шлюз отпустил, усомнившись', fought: 'отбились от Шлюза' };
const FORGERY_WORDS: Record<string, string> = { public: 'зачитана на площади', shlyuz: 'у Шлюза', kept: 'при вас, для суда', sold: 'продана Затвору' };
const RIOT_WORDS: Record<string, string> = { led: 'бунт возглавлен', quelled: 'бунт погашен', mint: 'толпа разнесла Монетный двор' };

function chapter3Next(game: Game): string {
  const fate = game.flag('forgery_fate');
  if (fate === 'sold') return 'Капли звенят в мешке, а улики больше нет. Затвор вам благодарен — пока. На севере, за Солончаками, ждёт Соль и вторая половина ключа.';
  if (fate === 'public') return 'Нижняя Запруда знает, что копия Затвора — подделка. Трест слабеет и звереет. Пора уходить на север, в Соль, пока ворота ещё открыты.';
  if (fate === 'shlyuz') return 'Шлюз унёс улику в Башню и впервые не знает, кому служит. Дорога ведёт на север, к Соли, где ищут вторую половину ключа.';
  return 'Улика подделки у вас, Мандат заверен. Нотариус сказал: пластина — только половина. Вторая — где-то на севере, за Солончаками, в Соли.';
}

function chapterNext(game: Game): string {
  const out = game.flag('trust_outcome');
  if (out === 'surrender') return 'Колодец снова даёт воду, а тубус уехал в Запруду. Трест у вас в долгу. Только отчего-то кажется, что до Запруды тубус не доедет…';
  if (tubeWhere(game).startsWith('спрятан') || game.flag('tube_bag')) return 'Колодец снова даёт воду. Тубус остался в тайнике — за ним придётся вернуться.';
  if (out === 'fight') return 'Колодец снова даёт воду, у дороги лежат сборщики Треста, а Шлюз унёс в марево ваше лицо. Дорога ведёт на запад, в Соль…';
  return 'Колодец снова даёт воду. В мешке у вас тубус, за которым идёт Трест. Дорога ведёт на запад, к Трём столбам, и дальше — в Соль…';
}

export function showComplete(scene: Phaser.Scene, game: Game, chapter: number, onNew: () => void, onStay: () => void): void {
  const s = scene;
  const st = game.state;
  const c = game.char;
  const root = s.add.container(0, 0).setDepth(30);
  const w = 700;
  const h = 600;
  const x = (GAME_W - w) / 2;
  const y = 50;
  root.add([dimmer(s, 0.6), metalPanel(s, x, y, w, h), glass(s, x + 16, y + 16, w - 32, h - 32)]);
  root.add(title(s, GAME_W / 2, y + 48, `ГЛАВА ${['', 'I', 'II', 'III'][chapter] ?? chapter} ОКОНЧЕНА`, 22, C.amber).setOrigin(0.5));
  const karma = game.flag('karma');
  const well = game.flag('well_sealed') ? 'под пломбой Треста' : game.flag('well_taxed') ? 'платит налог Тресту' : 'свободен';
  const rows2 = [
    ['Странник', `${c.name}, уровень ${c.level}`],
    ['Время в пути', fmtTime(st.stats.playMs)],
    ['Писарь', SCRIBE_WORDS[String(game.flag('scribe_outcome'))] ?? 'остался у доски'],
    ['Колючка', RAID_WORDS[String(game.flag('raid_outcome'))] ?? 'ждёт Сухарей'],
    ['Ласка', LASKA_WORDS[String(game.flag('laska'))] ?? '—'],
    ['Сенька', SENKA_WORDS[String(game.flag('senka'))] ?? 'не найден'],
    ['Караван Хоря', CARAVAN_WORDS[String(game.flag('caravan_dry'))] ?? 'ушёл в Соль с «должниками»'],
    ['Бугай', game.flag('bugai_dead') ? 'умер на ринге' : game.flag('bugai_clean') ? 'жив, без «Миража»' : 'дерётся под «Миражом»'],
    ['Тубус', game.flag('mandate_copy') ? 'с печатью Писаря' : tubeWhere(game)],
    ['Убито врагов', String(st.stats.kills)],
    ['Капли', String(st.caps)],
    ['Репутация', karmaWord(typeof karma === 'number' ? karma : 0)],
  ];
  const rows1 = [
    ['Странник', `${c.name}, уровень ${c.level}`],
    ['Время в пути', fmtTime(st.stats.playMs)],
    ['Дверь насосной', (game.flag('door_method') as string | undefined) ?? '—'],
    ['Гнездо скорпионов', nestOutcome(game)],
    ['Инспектор Шлюз', TRUST_WORDS[String(game.flag('trust_outcome'))] ?? '—'],
    ['Колодец', well],
    ['Тубус', tubeWhere(game)],
    ['Хэнк', hankFate(game)],
    ['Проверки навыков', `${st.stats.checksPassed} успех / ${st.stats.checksFailed} провал`],
    ['Убито врагов', String(st.stats.kills)],
    ['Капли', String(st.caps)],
    ['Репутация', karmaWord(typeof karma === 'number' ? karma : 0)],
  ];
  const rows3 = [
    ['Странник', `${c.name}, уровень ${c.level}`],
    ['Время в пути', fmtTime(st.stats.playMs)],
    ['Ворота Запруды', GATE_WORDS[String(game.flag('gate_way'))] ?? '—'],
    ['Мандат', game.flag('mandate_certified') ? 'заверен Нотариусом' : 'не заверен'],
    ['Улика подделки', FORGERY_WORDS[String(game.flag('forgery_fate'))] ?? '—'],
    ['Награда за голову', BOUNTY_WORDS[String(game.flag('bounty_done'))] ?? '—'],
    ['Нижний город', RIOT_WORDS[String(game.flag('dry_riot'))] ?? 'затаился'],
    ['Сургучные метки', String([1, 2, 3, 4, 5].filter((n) => game.flag(`seal_mark_${n}`)).length)],
    ['Убито врагов', String(st.stats.kills)],
    ['Капли', String(st.caps)],
    ['Репутация', karmaWord(typeof karma === 'number' ? karma : 0)],
  ];
  const rows = chapter === 3 ? rows3 : chapter === 2 ? rows2 : rows1;
  rows.forEach(([k, v], i) => {
    root.add(txt(s, x + 60, y + 88 + i * 27, k, 15, C.crt));
    root.add(txt(s, x + w - 60, y + 88 + i * 27, v, 15, C.crtBright, 360, true).setOrigin(1, 0).setAlign('right'));
  });
  root.add(txt(s, GAME_W / 2, y + h - 116, chapter === 3 ? chapter3Next(game) : chapter === 2 ? chapter2Next(game) : chapterNext(game), 14, C.sand, w - 80).setOrigin(0.5).setAlign('center'));
  const bStay = button(s, x + 70, y + h - 72, 250, 32, 'ОСТАТЬСЯ В СУШИ', () => (root.destroy(), onStay()));
  const bNew = button(s, x + w - 320, y + h - 72, 250, 32, 'НОВАЯ ИГРА', onNew);
  root.add([bStay.root, bNew.root]);
}
