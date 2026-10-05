// Bottom console: portrait, message log, vitals, buttons; plus quest tracker and hover tooltip.
import Phaser from 'phaser';
import type { Game } from '../core/Game';
import { nextLevelXp } from '../core/character/Character';
import { GAME_H, GAME_W, HUD_H } from '../config';
import { C, button, glass, metalPanel, txt, type Button } from './theme';
import { synth } from '../audio/Synth';
import { settings } from '../core/Settings';
import { logLineForDisplay, journalLineForDisplay, heroNameForDisplay } from '../i18n/display';
import { uiText } from '../i18n/ui';

export class Hud {
  private locale = settings().language;
  private logText: Phaser.GameObjects.Text;
  private vitals: Phaser.GameObjects.Text;
  private tracker: Phaser.GameObjects.Text;
  private trackerBg: Phaser.GameObjects.Graphics;
  private charBtn: Button;
  private sneakBtn: Button;
  private blinkOn = false;
  private unsub: (() => void)[];
  readonly tooltip: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    private game: Game,
    actions: { inventory: () => void; journal: () => void; character: () => void; menu: () => void; mute: () => boolean; sneak: () => void },
  ) {
    const y = GAME_H - HUD_H;
    metalPanel(scene, 0, y, GAME_W, HUD_H);
    glass(scene, 14, y + 12, 92, 92);
    scene.add.image(18, y + 16, 'atlas', `portrait_hero_${game.char.look}`).setOrigin(0).setDisplaySize(84, 84);

    glass(scene, 120, y + 12, 560, 92);
    this.logText = txt(scene, 130, y + 18, '', 13, C.crt, 540);

    glass(scene, 694, y + 12, 250, 92);
    this.vitals = txt(scene, 704, y + 18, '', 13, C.crt);

    const bx = 958;
    button(scene, bx, y + 14, 150, 26, uiText('hud.inventory', this.locale), actions.inventory);
    button(scene, bx, y + 45, 150, 26, uiText('hud.journal', this.locale), actions.journal);
    this.charBtn = button(scene, bx, y + 76, 150, 26, uiText('hud.character', this.locale), actions.character);
    button(scene, bx + 160, y + 14, 150, 26, uiText('hud.menu', this.locale), actions.menu);
    const soundLabel = () => uiText(synth.muted ? 'hud.soundOff' : 'hud.soundOn', this.locale);
    const mute = button(scene, bx + 160, y + 45, 150, 26, soundLabel(), () => (actions.mute(), mute.label.setText(soundLabel())));
    this.sneakBtn = button(scene, bx + 160, y + 76, 150, 26, uiText('hud.sneak', this.locale), actions.sneak);
    scene.time.addEvent({ delay: 500, loop: true, callback: () => this.blink() });

    this.trackerBg = scene.add.graphics();
    this.tracker = txt(scene, 22, 18, '', 13, C.sand, 420);
    this.tooltip = txt(scene, 0, 0, '', 13, C.sand).setBackgroundColor('#120d0acc').setPadding(6, 3, 6, 3).setDepth(50).setVisible(false);

    this.unsub = [
      game.events.on('log', () => this.refreshLog()),
      game.events.on('stats', () => this.refreshVitals()),
      game.events.on('level', () => this.refreshVitals()),
      game.events.on('quest', () => this.refreshTracker()),
      game.events.on('sync', () => (this.refreshLog(), this.refreshVitals(), this.refreshTracker())),
    ];
    this.refreshLog();
    this.refreshVitals();
    this.refreshTracker();
  }

  setSneak(on: boolean): void {
    this.sneakBtn.label.setText(uiText(on ? 'hud.sneaking' : 'hud.sneak', this.locale)).setColor(on ? C.amber : C.crt);
  }

  /** Stop listening to the game (the scene is going away). */
  dispose(): void {
    this.unsub.forEach((u) => u());
  }

  /** The character button pulses while level-up points wait to be spent. */
  private blink(): void {
    const c = this.game.char;
    this.blinkOn = !this.blinkOn && (c.skillPoints > 0 || c.perkPoints > 0);
    this.charBtn.label.setColor(this.blinkOn ? C.amber : C.crt);
  }

  refreshLog(): void {
    const lines = this.game.state.log.slice(-5).map((line) => logLineForDisplay(this.game, line, this.locale));
    this.logText.setText(lines.length ? lines.map((l) => `> ${l}`).join('\n') : `> ${uiText('hud.silence', this.locale)}`);
    // keep the newest lines visible if wrapping overflows
    while (this.logText.height > 84 && lines.length > 1) {
      lines.shift();
      this.logText.setText(lines.map((l) => `> ${l}`).join('\n'));
    }
  }

  refreshVitals(): void {
    const g = this.game;
    const c = g.char;
    const next = nextLevelXp(c.level);
    const pending = c.skillPoints > 0 || c.perkPoints > 0 ? '  ▲' : '';
    this.vitals.setText(
      [`${heroNameForDisplay(c.name, this.locale)}, ${uiText('hud.level', this.locale)} ${c.level}${pending}`, `${uiText('hud.hp', this.locale)}      ${g.state.hp}/${g.maxHp}`, `${uiText('hud.xp', this.locale)}    ${c.xp}${next ? `/${next}` : ''}`, `${uiText('hud.drops', this.locale)}  ${g.state.caps} · ${uiText('hud.day', this.locale)} ${Number(g.flag('day') ?? 1)}`].join('\n'),
    );
  }

  refreshTracker(): void {
    // the thread the story is on: the Trust at the well, the Mandate once found, the water quest before that
    const g = this.game;
    const quest = ['inspector', 'mandate', 'water'].find((q) => g.stage(q)) ?? 'water';
    const j = g.journal(quest);
    this.trackerBg.clear();
    if (!j.length) {
      this.tracker.setText('');
      return;
    }
    const cur = j[j.length - 1];
    this.tracker.setText(`◆ ${journalLineForDisplay(g, quest, j.length - 1, cur.text, this.locale)}`);
    this.trackerBg.fillStyle(0x120d0a, 0.7).fillRect(12, 10, this.tracker.width + 20, this.tracker.height + 16);
    this.trackerBg.lineStyle(1, 0xa84e24, 0.8).strokeRect(12, 10, this.tracker.width + 20, this.tracker.height + 16);
  }

  showTooltip(label: string | null, x: number, y: number): void {
    if (!label) {
      this.tooltip.setVisible(false);
      return;
    }
    this.tooltip.setText(label).setVisible(true);
    this.tooltip.setPosition(Math.min(x + 18, GAME_W - this.tooltip.width - 4), Math.max(4, y - 28));
  }
}
