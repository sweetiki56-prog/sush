// Character creation ("dossier"): attributes, tag skills, traits, name, look, premades.
import Phaser from 'phaser';
import { BuildDraft } from '../core/character/BuildDraft';
import * as Ch from '../core/character/Character';
import { LOOKS, NAME_MAX, type AttrId, type SkillId } from '../core/character/defs';
import { CONTENT } from '../content';
import { session } from '../session';
import { synth } from '../audio/Synth';
import { GAME_W } from '../config';
import { C, button, glass, glyphButton, metalPanel, title, txt, type Button } from '../ui/theme';
import { InfoCard } from '../ui/sheet/InfoCard';
import { AttrPanel } from '../ui/sheet/AttrPanel';
import { SkillPanel } from '../ui/sheet/SkillPanel';
import { DerivedPanel } from '../ui/sheet/DerivedPanel';
import { ListPanel } from '../ui/sheet/ListPanel';
import { poseFrame } from '../world/Actor';
import type { GenMeta } from '../world/MapData';
import { onKey } from '../ui/keys';
import { TOUCH, overlayInput } from '../ui/touch';
import { saveCoopCharacter } from '../net/profiles';

const K = CONTENT.character;
const NAME_CHAR = /^[\p{L}\d '-]$/u;
const HELP =
  'Распределите свободные очки характеристик, отметьте три основных навыка и, если хотите, возьмите до двух особенностей. ' +
  (TOUCH ? 'Коснитесь строки, чтобы прочитать описание.' : 'Наведите курсор на любую строку, чтобы прочитать описание.') +
  ' Или выберите готовый шаблон слева.';

export class CreateScene extends Phaser.Scene {
  private draft = new BuildDraft(K);
  private info!: InfoCard;
  private attrs!: AttrPanel;
  private skills!: SkillPanel;
  private derived!: DerivedPanel;
  private traits!: ListPanel;
  private nameText!: Phaser.GameObjects.Text;
  private lookText!: Phaser.GameObjects.Text;
  private portrait!: Phaser.GameObjects.Image;
  private preview!: Phaser.GameObjects.Sprite;
  private status!: Phaser.GameObjects.Text;
  private done!: Button;
  private caret = true;
  private dir = 1;
  private then: 'solo' | 'coop' = 'solo'; // coop: the character goes back to the online lobby

  constructor() {
    super('Create');
  }

  init(data: { then?: 'coop' }): void {
    this.then = data.then ?? 'solo';
  }

  create(): void {
    this.draft = new BuildDraft(K);
    this.cameras.main.setPostPipeline('CrtFX');
    const root = this.add.container(0, 0);
    root.add(metalPanel(this, 0, 0, GAME_W, 720));
    root.add(title(this, GAME_W / 2, 30, 'ДОСЬЕ СТРАННИКА', 20, C.amber).setOrigin(0.5));

    this.info = new InfoCard(this, root, 396, 522, 860, 126);
    this.info.setDefault('Досье', HELP);
    this.identity(root, 24, 64);
    this.traits = new ListPanel(this, root, 24, 396, 360, 252, 'ОСОБЕННОСТИ · до двух', this.info, (id) => this.edit(() => this.draft.toggleTrait(id)), 30);
    this.attrs = new AttrPanel(this, root, 396, 64, 400, K, this.info, (a: AttrId, d) => this.edit(() => (d > 0 ? this.draft.inc(a) : this.draft.dec(a))));
    this.derived = new DerivedPanel(this, root, 396, 364, 400, this.info);
    this.skills = new SkillPanel(this, root, 808, 64, 448, K, this.info, 'tag', { onTag: (s: SkillId) => this.edit(() => this.draft.toggleTag(s)) });

    root.add(button(this, 24, 666, 120, 32, 'НАЗАД', () => this.back()).root);
    root.add(button(this, 154, 666, 120, 32, 'СБРОС', () => this.edit(() => (this.draft.reset(), true))).root);
    this.status = txt(this, 700, 682, '', 13, C.sand).setOrigin(0.5);
    root.add(this.status);
    this.done = button(this, GAME_W - 204, 666, 180, 32, 'ГОТОВО [ENTER]', () => this.finish());
    root.add(this.done.root);

    onKey(this, (e) => this.key(e));
    // a phone types into a real field laid over the name box (only a real input opens its keyboard)
    if (TOUCH) {
      const field = (this.nameField = overlayInput(this.game, { x: 38, y: 294, w: 332, h: 30 }, this.draft.name, 16, (v) => {
        this.draft.setName([...v].filter((ch) => NAME_CHAR.test(ch)).join(''));
        this.refresh();
      }, () => this.refresh()));
      this.events.once('shutdown', () => (field.remove(), (this.nameField = null)));
    }
    this.time.addEvent({ delay: 450, loop: true, callback: () => ((this.caret = !this.caret), this.refreshName()) });
    this.refresh();
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__create = { draft: this.draft, finish: () => this.finish() };
  }

  private identity(root: Phaser.GameObjects.Container, x: number, y: number): void {
    root.add([glass(this, x, y, 360, 320), title(this, x + 14, y + 12, 'СТРАННИК', 11, C.amber)]);
    root.add(glass(this, x + 14, y + 36, 128, 128));
    this.portrait = this.add.image(x + 16, y + 38, 'atlas', 'portrait_hero_0').setOrigin(0).setDisplaySize(124, 124);
    root.add(glass(this, x + 156, y + 36, 190, 128));
    this.preview = this.add.sprite(x + 251, y + 150, 'hero_0', 0).setOrigin(0.5, 1).setScale(2);
    this.time.addEvent({ delay: 650, loop: true, callback: () => this.preview.setFrame(this.frame((this.dir = (this.dir + 1) % 8))) });
    root.add([this.portrait, this.preview]);

    root.add(glyphButton(this, x + 14, y + 174, '◄', () => this.edit(() => (this.draft.cycleLook(-1), true)), 24).root);
    root.add(glyphButton(this, x + 118, y + 174, '►', () => this.edit(() => (this.draft.cycleLook(1), true)), 24).root);
    this.lookText = txt(this, x + 78, y + 178, '', 13, C.crt).setOrigin(0.5, 0);
    root.add(this.lookText);

    root.add(txt(this, x + 14, y + 212, TOUCH ? 'ИМЯ (коснитесь поля, чтобы ввести)' : 'ИМЯ (печатайте с клавиатуры)', 12, C.crtDim));
    root.add(glass(this, x + 14, y + 230, 332, 30));
    this.nameText = txt(this, x + 24, y + 236, '', 16, C.crtBright, undefined, true);
    root.add(this.nameText);

    root.add(txt(this, x + 14, y + 272, 'ШАБЛОН', 12, C.crtDim));
    K.premades.forEach((p, i) => {
      const b = button(this, x + 14 + i * 112, y + 288, 104, 24, p.title.toUpperCase(), () => {
        this.edit(() => (this.draft.applyPremade(p), true));
        this.info.show(`${p.title}: ${p.name}`, p.bio);
      });
      root.add(b.root);
    });
  }

  private edit(fn: () => boolean): void {
    if (!fn()) synth.fail();
    this.refresh();
  }

  private refresh(): void {
    const d = this.draft;
    const c = d.preview();
    this.attrs.update(Ch.effectiveAttrs(c, K), d.pointsLeft);
    this.derived.update(c, K);
    this.skills.update(Ch.skills(c, K), c.tags, `Основных навыков: ${c.tags.length} из 3`);
    this.traits.setItems(
      Object.entries(K.traits).map(([id, t]) => ({ id, name: t.name, desc: t.desc, mark: d.traits.includes(id) ? 'on' : 'off' })),
    );
    this.portrait.setFrame(`portrait_hero_${d.look}`).setOrigin(0).setDisplaySize(124, 124);
    this.preview.setTexture(`hero_${d.look}`, this.frame(this.dir));
    this.lookText.setText(`Облик ${d.look + 1}/${LOOKS}`);
    this.refreshName();
    const problem = d.problem();
    this.status.setText(problem ?? 'Готово. Можно отправляться в путь.').setColor(problem ? C.sand : C.crtBright);
    this.done.setEnabled(!problem);
  }

  private frame(dir: number): number {
    const meta = this.cache.json.get('meta') as GenMeta;
    return poseFrame(meta.sheets[`hero_${this.draft.look}`], dir, 'idle');
  }

  private nameField: ReturnType<typeof overlayInput> | null = null; // the phone's text field, kept in step with a template's name

  private refreshName(): void {
    this.nameField?.set(this.draft.name);
    const full = this.draft.name.length >= NAME_MAX;
    this.nameText?.setText(this.draft.name + (this.caret && !full ? '_' : ''));
  }

  private key(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.repeat) return this.finish();
    if (e.key === 'Escape') return this.back();
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Backspace') this.draft.setName(this.draft.name.slice(0, -1));
    else if (NAME_CHAR.test(e.key)) this.draft.setName(this.draft.name + e.key);
    else return;
    this.refresh();
  }

  private finish(): void {
    const problem = this.draft.problem();
    if (problem) {
      synth.fail();
      this.status.setText(problem).setColor(C.red);
      return;
    }
    if (this.then === 'coop') {
      saveCoopCharacter(this.draft.build());
      this.scene.start('Lobby', { mode: 'coop' });
      return;
    }
    session().startNew(this.draft.build());
    this.scene.start('Intro');
  }

  private back(): void {
    if (this.then === 'coop') this.scene.start('Lobby', { mode: 'coop' });
    else this.scene.start('Menu');
  }
}
