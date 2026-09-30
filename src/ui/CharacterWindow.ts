// In-game character sheet [C]: attributes, derived stats, skills (spend points on level-up), traits, perks.
import Phaser from 'phaser';
import type { Game } from '../core/Game';
import * as Ch from '../core/character/Character';
import { ATTR_NAMES, SKILL_NAMES, type SkillId } from '../core/character/defs';
import { GAME_W } from '../config';
import { synth } from '../audio/Synth';
import { session } from '../session';
import { C, button, dimmer, glass, metalPanel, title, txt, type Button } from './theme';
import { InfoCard } from './sheet/InfoCard';
import { AttrPanel } from './sheet/AttrPanel';
import { DerivedPanel } from './sheet/DerivedPanel';
import { modsText } from './itemText';
import { SkillPanel } from './sheet/SkillPanel';
import { ListPanel, type ListItem } from './sheet/ListPanel';

const W = 1180;
const H = 640;
const X = (GAME_W - W) / 2;
const Y = 40;

const FACTIONS: Record<string, string> = { circle: 'Круг колодцев', guild: 'Соляная гильдия', dry: 'Полусухие', trust: 'Трест' };

/** Standing with a faction: враг, недруг, чужак, знакомый, свой. */
export function repWord(r: number): string {
  return r <= -20 ? 'враг' : r < 0 ? 'недруг' : r < 10 ? 'чужак' : r < 25 ? 'знакомый' : 'свой';
}

export function karmaWord(k: number): string {
  if (k <= -2) return 'Вор и грубиян';
  if (k < 0) return 'Подозрительный';
  if (k >= 2) return 'Свой человек';
  return 'Чужак';
}

export class CharacterWindow {
  private root: Phaser.GameObjects.Container | null = null;
  private pending: Partial<Record<SkillId, number>> = {};
  private choosing = false;
  private picked: string | null = null;
  private skills!: SkillPanel;
  private perks!: ListPanel;
  private traits!: ListPanel;
  private perkBtn: Button | null = null;
  private idText!: Phaser.GameObjects.Text;
  private unsub: (() => void)[] = [];

  constructor(
    private scene: Phaser.Scene,
    private game: Game,
    private onClose: () => void,
  ) {}

  get open(): boolean {
    return !!this.root;
  }

  show(): void {
    if (this.root) return this.close();
    this.pending = {};
    this.choosing = false;
    this.picked = null;
    this.build();
    this.refresh();
    // online the room answers a moment later: redraw when the new state arrives
    const redraw = () => this.root && this.refresh();
    this.unsub = [this.game.events.on('stats', redraw), this.game.events.on('sync', redraw)];
  }

  close(): void {
    if (!this.root) return;
    this.unsub.forEach((u) => u());
    this.unsub = [];
    this.root.destroy();
    this.root = null;
    this.perkBtn = null;
    this.onClose();
  }

  /** Built once per opening; clicks only update texts, so new hit zones never lag a frame behind. */
  private build(): void {
    const s = this.scene;
    const c = this.game.char;
    const K = this.game.content.character;
    const root = (this.root = s.add.container(0, 0).setDepth(20));
    root.add([dimmer(s, 0.5), metalPanel(s, X, Y, W, H), title(s, X + 28, Y + 24, 'ПЕРСОНАЖ', 16, C.amber)]);
    root.add(button(s, X + W - 140, Y + 18, 110, 26, 'ЗАКРЫТЬ', () => this.close()).root);
    const info = new InfoCard(s, root, X + 370, Y + 540, W - 394, 80);
    info.setDefault('Подсказка', c.skillPoints || c.perkPoints ? 'Есть нераспределённые очки навыков или перк. Кнопки + и − у навыков, «Применить» сохраняет выбор.' : 'Наведите курсор на строку, чтобы прочитать описание.');

    root.add(glass(s, X + 24, Y + 60, 330, 106));
    root.add(s.add.image(X + 29, Y + 65, 'atlas', `portrait_hero_${c.look}`).setOrigin(0).setDisplaySize(96, 96));
    this.idText = txt(s, X + 136, Y + 68, '', 14, C.crtBright, 210);
    root.add(this.idText);
    new AttrPanel(s, root, X + 24, Y + 176, 330, K, info).update(Ch.effectiveAttrs(c, K));
    new DerivedPanel(s, root, X + 24, Y + 440, 330, info).update(c, K);

    const spending = c.skillPoints > 0;
    this.skills = new SkillPanel(s, root, X + 370, Y + 60, 420, K, info, spending ? 'spend' : 'view', { onSpend: (sk, d) => this.spend(sk, d) });
    if (spending) {
      root.add(button(s, X + 370, Y + 486, 200, 28, 'ПРИМЕНИТЬ', () => this.applySkills()).root);
      root.add(button(s, X + 590, Y + 486, 200, 28, 'СБРОС', () => ((this.pending = {}), this.refresh())).root);
    }

    this.traits = new ListPanel(s, root, X + 806, Y + 60, 350, 140, 'ОСОБЕННОСТИ И СОСТОЯНИЕ', info, undefined, 24);
    this.perks = new ListPanel(s, root, X + 806, Y + 210, 350, 280, 'ПЕРКИ', info, (id) => this.pick(id), 24);
    if (c.perkPoints > 0) {
      this.perkBtn = button(s, X + 806, Y + 500, 350, 28, '', () => this.perkAction());
      root.add(this.perkBtn.root);
    }
  }

  private get left(): number {
    return this.game.char.skillPoints - Object.values(this.pending).reduce((a, b) => a + (b ?? 0), 0);
  }

  private refresh(): void {
    const g = this.game;
    const c = g.char;
    const K = g.content.character;
    const next = Ch.nextLevelXp(c.level);
    const karma = g.flag('karma');
    this.idText.setText(`${c.name}\nУровень ${c.level}\nОпыт ${c.xp}${next ? ` / ${next}` : ''}\n${karmaWord(typeof karma === 'number' ? karma : 0)}`);
    const values = Ch.skills(c, K);
    for (const [k, v] of Object.entries(this.pending)) values[k as SkillId] += (v ?? 0) * (c.tags.includes(k as SkillId) ? 2 : 1);
    this.skills.update(values, c.tags, c.skillPoints > 0 ? `Очков навыков: ${this.left}` : '', this.pending);
    this.traits.setItems(this.stateItems(), 'Нет.');
    this.perks.setHeading(this.choosing ? 'ВЫБЕРИТЕ ПЕРК' : 'ПЕРКИ');
    this.perks.setItems(this.perkItems(), 'Пока нет. Новый перк даётся с каждым уровнем.');
    if (this.perkBtn) {
      const label = !this.choosing ? 'ВЫБРАТЬ ПЕРК' : this.picked ? `ВЗЯТЬ «${K.perks[this.picked].name}»` : 'ВЫБЕРИТЕ ПЕРК В СПИСКЕ';
      this.perkBtn.label.setText(c.perkPoints > 0 ? label : 'ПЕРК ВЗЯТ');
      this.perkBtn.setEnabled(c.perkPoints > 0 && (!this.choosing || !!this.picked));
    }
  }

  /** Traits, then chems at work and withdrawal: what shapes the numbers on this sheet right now. */
  private stateItems(): ListItem[] {
    const g = this.game;
    const K = g.content.character;
    const items: ListItem[] = g.char.traits.map((id) => ({ id, name: K.traits[id].name, desc: K.traits[id].desc, mark: 'none' }));
    for (const b of g.body.buffs) {
      const def = g.content.items[b.item];
      items.push({ id: `buff_${b.item}`, name: `◆ ${def.name}: ${Math.ceil(b.leftMs / 1000)} с`, desc: modsText(def.buff?.mods), mark: 'none' });
    }
    for (const [id, name] of Object.entries(FACTIONS)) {
      const rep = Number(g.flag(`rep_${id}`) ?? 0);
      if (rep) items.push({ id: `rep_${id}`, name: `${name}: ${repWord(rep)} (${rep})`, desc: 'Репутация: от неё зависят цены, товары для своих и разговоры.', mark: 'none' });
    }
    for (const id of g.withdrawals()) {
      const def = g.content.items[id];
      items.push({ id: `hooked_${id}`, name: `✕ Ломка: ${def.name}`, desc: `${modsText(def.addict?.withdrawal)}. Пройдёт сама со временем, быстрее — с дозой или «Чистяком».`, mark: 'none' });
    }
    return items;
  }

  private perkItems(): ListItem[] {
    const c = this.game.char;
    const K = this.game.content.character;
    if (!this.choosing) return c.perks.map((id) => ({ id, name: K.perks[id].name, desc: K.perks[id].desc, mark: 'none' }));
    const names = { attrs: ATTR_NAMES, skills: SKILL_NAMES };
    return Object.entries(K.perks).map(([id, p]) => {
      const taken = c.perks.includes(id);
      const ok = Ch.perkRequirementsMet(c, K, id);
      const req = `Требуется: ${Ch.perkRequirementText(K, id, names)}.`;
      return { id, name: p.name, desc: `${p.desc}\n${taken ? 'Уже взят.' : req}`, mark: taken || id === this.picked ? 'on' : 'off', dim: !ok && !taken };
    });
  }

  private spend(sk: SkillId, d: 1 | -1): void {
    const cur = this.pending[sk] ?? 0;
    if ((d > 0 && this.left <= 0) || (d < 0 && cur <= 0)) return synth.fail();
    this.pending[sk] = cur + d;
    this.refresh();
  }

  private applySkills(): void {
    session().send({ t: 'spendSkills', plan: this.pending });
    this.pending = {};
    this.refresh();
  }

  private pick(id: string): void {
    const c = this.game.char;
    if (!this.choosing || c.perks.includes(id) || !Ch.perkRequirementsMet(c, this.game.content.character, id)) return synth.fail();
    this.picked = id;
    this.refresh();
  }

  private perkAction(): void {
    if (!this.choosing) this.choosing = true;
    else if (this.picked) {
      session().send({ t: 'takePerk', id: this.picked });
      synth.quest();
      this.choosing = false;
      this.picked = null;
    }
    this.refresh();
  }
}
