// Arena build editor: any attributes, level, skills, traits, perks, two weapons, armor and a limited kit.
// Five preset slots and a text code to share a build with friends.
import Phaser from 'phaser';
import * as Ch from '../core/character/Character';
import { ATTR_MAX, ATTR_MIN, LOOKS, MAX_TRAITS, NAME_MAX, SKILL_MAX, type AttrId, type SkillId } from '../core/character/defs';
import { arenaWeapons, decodeLoadout, encodeLoadout, loadoutCharacter, validLoadout, type Loadout } from '../core/room/loadout';
import { CONTENT } from '../content';
import { GAME_W } from '../config';
import { session } from '../session';
import { synth } from '../audio/Synth';
import { currentLoadout, presets, PRESET_SLOTS, saveLoadout, savePreset } from '../net/profiles';
import { C, button, glass, glyphButton, metalPanel, title, txt, type Button } from '../ui/theme';
import { InfoCard } from '../ui/sheet/InfoCard';
import { AttrPanel } from '../ui/sheet/AttrPanel';
import { SkillPanel } from '../ui/sheet/SkillPanel';
import { DerivedPanel } from '../ui/sheet/DerivedPanel';
import { ListPanel } from '../ui/sheet/ListPanel';
import { onKey } from '../ui/keys';
import { itemStats } from '../ui/itemText';
import { settings } from '../core/Settings';
import { characterContentForDisplay, contentText } from '../i18n/display';
import { loadoutText } from '../i18n/loadout';

const K = CONTENT.character;
const A = CONTENT.arena;
const NAME_CHAR = /^[\p{L}\d '-]$/u;
const SKILL_STEP = 5;

export class LoadoutScene extends Phaser.Scene {
  private get locale() { return settings().language; }
  private t(source: string) { return loadoutText(source, this.locale); }
  private l!: Loadout;
  private back: 'lobby' | 'game' = 'lobby';
  private slot = 0;
  private info!: InfoCard;
  private attrs!: AttrPanel;
  private derived!: DerivedPanel;
  private skills!: SkillPanel;
  private traits!: ListPanel;
  private perks!: ListPanel;
  private weapons!: ListPanel;
  private armor!: ListPanel;
  private charms!: ListPanel;
  private kit = new Map<string, Phaser.GameObjects.Text>();
  private nameText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private portrait!: Phaser.GameObjects.Image;
  private slots: Button[] = [];
  private status!: Phaser.GameObjects.Text;
  private caret = true;

  constructor() {
    super('Loadout');
  }

  init(data: { back?: 'lobby' | 'game' }): void {
    this.back = data.back ?? 'lobby';
  }

  create(): void {
    this.l = structuredClone(currentLoadout());
    this.kit.clear();
    this.slots = [];
    this.cameras.main.setPostPipeline('CrtFX');
    const root = this.add.container(0, 0);
    const displayK = characterContentForDisplay(K, this.locale);
    root.add(metalPanel(this, 0, 0, GAME_W, 720));
    root.add(title(this, GAME_W / 2, 28, this.t('СНАРЯЖЕНИЕ ДЛЯ АРЕНЫ'), 18, C.amber).setOrigin(0.5));

    this.info = new InfoCard(this, root, 330, 510, 300, 150);
    this.info.setDefault(this.t('Арена'), this.t('Соберите бойца как хотите: характеристики, навыки и перки без ограничений очков. Лимиты только на уровень, оружие и расходники.'));
    this.identity(root, 16, 52);
    this.traits = new ListPanel(this, root, 16, 352, 300, 150, this.t(`ОСОБЕННОСТИ · до ${MAX_TRAITS}`), this.info, (id) => this.edit(() => toggle(this.l.traits, id, MAX_TRAITS)), 22);
    this.presetsPanel(root, 16, 512);
    this.attrs = new AttrPanel(this, root, 330, 52, 300, displayK, this.info, (a: AttrId, d) => this.edit(() => this.attr(a, d)));
    this.derived = new DerivedPanel(this, root, 330, 346, 300, this.info);
    this.skills = new SkillPanel(this, root, 644, 52, 300, displayK, this.info, 'spend', { onSpend: (s: SkillId, d) => this.edit(() => this.skill(s, d)) });
    this.perks = new ListPanel(this, root, 644, 480, 300, 180, this.t('ПЕРКИ'), this.info, (id) => this.edit(() => toggle(this.l.perks, id, this.l.level - 1)), 22);
    this.weapons = new ListPanel(this, root, 958, 52, 306, 196, this.t(`ОРУЖИЕ · до ${A.weapons}`), this.info, (id) => this.edit(() => toggle(this.l.weapons, id, A.weapons)), 22);
    this.armor = new ListPanel(this, root, 958, 254, 306, 124, this.t('БРОНЯ'), this.info, (id) => this.edit(() => ((this.l.armor = this.l.armor === id || id === 'none' ? null : id), true)), 22);
    this.charms = new ListPanel(this, root, 958, 384, 306, 124, this.t('ОБЕРЕГИ · до 2'), this.info, (id) => this.edit(() => toggle(this.l.charms, id, 2)), 22);
    this.kitPanel(root, 958, 514);

    root.add(button(this, 16, 672, 120, 32, this.t('НАЗАД'), () => this.leave(false)).root);
    this.status = txt(this, 640, 688, '', 13, C.sand).setOrigin(0.5);
    root.add(this.status);
    root.add(button(this, GAME_W - 196, 672, 180, 32, this.t('ГОТОВО [ENTER]'), () => this.leave(true)).root);
    onKey(this, (e) => this.key(e));
    this.time.addEvent({ delay: 450, loop: true, callback: () => ((this.caret = !this.caret), this.refreshName()) });
    this.refresh();
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__loadout = { get: () => this.l, set: (l: Loadout) => ((this.l = l), this.refresh()), done: () => this.leave(true) };
  }

  // ---------- panels ----------
  private identity(root: Phaser.GameObjects.Container, x: number, y: number): void {
    root.add([glass(this, x, y, 300, 290), title(this, x + 14, y + 12, this.t('БОЕЦ'), 11, C.amber)]);
    root.add(glass(this, x + 14, y + 34, 100, 100));
    this.portrait = this.add.image(x + 16, y + 36, 'atlas', 'portrait_hero_0').setOrigin(0).setDisplaySize(96, 96);
    root.add(this.portrait);
    root.add(glyphButton(this, x + 130, y + 40, '◄', () => this.edit(() => ((this.l.look = (this.l.look + LOOKS - 1) % LOOKS), true)), 24).root);
    root.add(glyphButton(this, x + 250, y + 40, '►', () => this.edit(() => ((this.l.look = (this.l.look + 1) % LOOKS), true)), 24).root);
    root.add(txt(this, x + 205, y + 44, this.t('облик'), 13, C.crt).setOrigin(0.5, 0));
    root.add(glyphButton(this, x + 130, y + 90, '−', () => this.edit(() => this.level(-1)), 24).root);
    root.add(glyphButton(this, x + 250, y + 90, '+', () => this.edit(() => this.level(1)), 24).root);
    this.levelText = txt(this, x + 205, y + 94, '', 13, C.crtBright, undefined, true).setOrigin(0.5, 0);
    root.add(this.levelText);
    root.add(txt(this, x + 14, y + 148, this.t('ИМЯ (печатайте с клавиатуры)'), 12, C.crtDim));
    root.add(glass(this, x + 14, y + 166, 272, 30));
    this.nameText = txt(this, x + 24, y + 172, '', 16, C.crtBright, undefined, true);
    root.add(this.nameText);
    root.add(txt(this, x + 14, y + 208, this.t('Уровень даёт очки здоровья и перки: по одному за каждый уровень после первого.'), 12, C.crtDim, 272));
  }

  private presetsPanel(root: Phaser.GameObjects.Container, x: number, y: number): void {
    root.add([glass(this, x, y, 300, 148), title(this, x + 14, y + 10, this.t('ПРЕСЕТЫ'), 11, C.amber)]);
    for (let i = 0; i < PRESET_SLOTS; i++) {
      const b = button(this, x + 14 + i * 56, y + 34, 50, 26, String(i + 1), () => this.loadSlot(i));
      this.slots.push(b);
      root.add(b.root);
    }
    root.add(button(this, x + 14, y + 68, 272, 26, this.t('СОХРАНИТЬ В ВЫБРАННЫЙ'), () => this.saveSlot()).root);
    root.add(button(this, x + 14, y + 102, 132, 26, this.t('КОД ДРУГУ'), () => this.copyCode()).root);
    root.add(button(this, x + 154, y + 102, 132, 26, this.t('ВСТАВИТЬ КОД'), () => this.pasteCode()).root);
  }

  private kitPanel(root: Phaser.GameObjects.Container, x: number, y: number): void {
    // two columns of small rows: name, count, − and + (hover a name for what it does)
    const items = Object.entries(A.items);
    const rows = Math.ceil(items.length / 2);
    root.add([glass(this, x, y, 306, 30 + rows * 19), title(this, x + 14, y + 8, this.t('НАБОР'), 11, C.amber)]);
    items.forEach(([id, max], i) => {
      const cx = x + 8 + Math.floor(i / rows) * 150;
      const ry = y + 26 + (i % rows) * 19;
      const item = CONTENT.items[id];
      const itemName = item ? contentText(`/items/${id}/name`, item.name, this.locale) : id;
      const name = txt(this, cx, ry, itemName.slice(0, 11), 11, C.crt).setInteractive();
      name.on('pointerover', () => this.info.show(itemName, item ? contentText(`/items/${id}/desc`, item.desc, this.locale) : ''));
      const v = txt(this, cx + 100, ry, '', 11, C.crtBright, undefined, true).setOrigin(1, 0);
      this.kit.set(id, v);
      root.add([name, v]);
      root.add(glyphButton(this, cx + 104, ry - 2, '−', () => this.edit(() => this.item(id, -1, max)), 17).root);
      root.add(glyphButton(this, cx + 124, ry - 2, '+', () => this.edit(() => this.item(id, 1, max)), 17).root);
    });
  }

  // ---------- edits ----------
  private edit(fn: () => boolean): void {
    if (!fn()) synth.fail();
    this.refresh();
  }

  private attr(a: AttrId, d: number): boolean {
    const v = this.l.attrs[a] + d;
    if (v < ATTR_MIN || v > ATTR_MAX) return false;
    this.l.attrs[a] = v;
    return true;
  }

  private level(d: number): boolean {
    const v = this.l.level + d;
    if (v < 1 || v > A.maxLevel) return false;
    this.l.level = v;
    this.l.perks = this.l.perks.slice(0, v - 1);
    return true;
  }

  /** Skills move in steps of 5, never below what the attributes already give. */
  private skill(s: SkillId, d: number): boolean {
    const base = Ch.skill({ ...loadoutCharacter(this.l, CONTENT), spent: {} }, K, s);
    const now = Math.max(base, this.l.skills[s] ?? base);
    const want = Math.max(base, Math.min(SKILL_MAX, now + d * SKILL_STEP));
    if (want === now) return false;
    if (want === base) delete this.l.skills[s];
    else this.l.skills[s] = want;
    return true;
  }

  private item(id: string, d: number, max: number): boolean {
    const v = (this.l.items[id] ?? 0) + d;
    if (v < 0 || v > max) return false;
    if (v) this.l.items[id] = v;
    else delete this.l.items[id];
    return true;
  }

  private loadSlot(i: number): void {
    this.slot = i;
    const p = presets()[i];
    if (p) this.l = structuredClone(p);
    this.say(p ? this.t(`Пресет ${i + 1}: ${p.name}.`) : this.t(`Слот ${i + 1} пуст. Соберите бойца и сохраните.`));
    this.refresh();
  }

  private saveSlot(): void {
    savePreset(this.slot, structuredClone(this.l));
    this.say(this.t(`Сохранено в слот ${this.slot + 1}.`));
    this.refresh();
  }

  private copyCode(): void {
    const code = encodeLoadout(this.l);
    this.info.show(this.t('Код снаряжения'), code);
    void navigator.clipboard?.writeText(code).then(
      () => this.say(this.t('Код скопирован: отправьте его другу.')),
      () => this.say(this.t('Скопируйте код из карточки внизу.')),
    );
  }

  private pasteCode(): void {
    const code = window.prompt(this.t('Вставьте код снаряжения'));
    if (!code) return;
    const l = decodeLoadout(code, CONTENT);
    if (!l) return this.say(this.t('Код не подходит.'), true);
    this.l = l;
    this.say(this.t(`Загружено: ${l.name}.`));
    this.refresh();
  }

  // ---------- view ----------
  private say(text: string, bad = false): void {
    if (bad) synth.fail();
    this.status.setText(text).setColor(bad ? C.red : C.sand);
  }

  private refresh(): void {
    const l = this.l;
    const c = loadoutCharacter(l, CONTENT);
    const displayK = characterContentForDisplay(K, this.locale);
    this.attrs.update(Ch.effectiveAttrs(c, K), this.t('Любые значения от 1 до 10'));
    this.derived.update(c, K);
    this.skills.update(Ch.skills(c, K), [], this.t(`Навыки: ±${SKILL_STEP}%, до ${SKILL_MAX}%`));
    const mark = (on: boolean) => (on ? 'on' : 'off') as 'on' | 'off';
    this.traits.setItems(Object.entries(displayK.traits).map(([id, t]) => ({ id, name: t.name, desc: t.desc, mark: mark(l.traits.includes(id)) })));
    this.perks.setHeading(this.t(`ПЕРКИ · ${l.perks.length} из ${l.level - 1}`));
    this.perks.setItems(Object.entries(displayK.perks).map(([id, p]) => ({ id, name: p.name, desc: p.desc, mark: mark(l.perks.includes(id)) })));
    const desc = (id: string) => `${CONTENT.items[id] ? contentText(`/items/${id}/desc`, CONTENT.items[id].desc, this.locale) : ''}\n${itemStats(CONTENT, id, this.locale)}`;
    this.weapons.setItems(arenaWeapons(CONTENT).map((id) => ({ id, name: contentText(`/weapons/${id}/name`, CONTENT.weapons[id].name, this.locale), desc: desc(id), mark: mark(l.weapons.includes(id)) })));
    this.armor.setItems([
      { id: 'none', name: this.t('Без брони'), desc: this.t('Ничего лишнего: полные ОД и тишина.'), mark: mark(!l.armor) },
      ...Object.entries(CONTENT.armor).map(([id, a]) => ({ id, name: contentText(`/armor/${id}/name`, a.name, this.locale), desc: desc(id), mark: mark(l.armor === id) })),
    ]);
    this.charms.setItems(Object.keys(CONTENT.charms).map((id) => ({ id, name: contentText(`/items/${id}/name`, CONTENT.items[id].name, this.locale), desc: desc(id), mark: mark(l.charms.includes(id)) })));
    for (const [id, t] of this.kit) t.setText(`${l.items[id] ?? 0}/${A.items[id]}`);
    this.portrait.setFrame(`portrait_hero_${l.look}`).setOrigin(0).setDisplaySize(96, 96);
    this.levelText.setText(this.t(`уровень ${l.level}`));
    const saved = presets();
    this.slots.forEach((b, i) => b.label.setText(`${i === this.slot ? '▸' : ''}${i + 1}${saved[i] ? '' : '·'}`));
    this.refreshName();
  }

  private refreshName(): void {
    this.nameText?.setText(this.l.name + (this.caret && this.l.name.length < NAME_MAX ? '_' : ''));
  }

  private key(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.repeat) return this.leave(true);
    if (e.key === 'Escape') return this.leave(false);
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Backspace') this.l.name = this.l.name.slice(0, -1);
    else if (NAME_CHAR.test(e.key) && this.l.name.length < NAME_MAX) this.l.name += e.key;
    else return;
    this.refreshName();
  }

  /** Done (keep the build) or back (drop the edits). */
  private leave(keep: boolean): void {
    if (keep) {
      const l = validLoadout(this.l, CONTENT);
      if (!l) return this.say(this.t('Проверьте имя: оно не может быть пустым.'), true);
      saveLoadout(l);
      if (this.back === 'game') session().send({ t: 'loadout', loadout: l });
    }
    if (this.back === 'lobby') return void this.scene.start('Lobby', { mode: 'arena' });
    this.scene.stop();
    this.scene.wake('World');
    this.scene.wake('UI');
  }
}

/** Add or remove an id, keeping at most `max`; false when full. */
function toggle(list: string[], id: string, max: number): boolean {
  const i = list.indexOf(id);
  if (i >= 0) list.splice(i, 1);
  else if (list.length < max) list.push(id);
  else return false;
  return true;
}
