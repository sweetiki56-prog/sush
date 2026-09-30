// Main menu over a slowly drifting view of the real map (same art, same grade as the game).
import Phaser from 'phaser';
import { session } from '../session';
import { synth } from '../audio/Synth';
import { music } from '../audio/Music';
import { loadGame } from '../core/SaveSystem';
import { BuildDraft } from '../core/character/BuildDraft';
import { CONTENT } from '../content';
import { GAME_W } from '../config';
import { WorldMap } from '../world/MapBuilder';
import { Ambience } from '../world/Ambience';
import { tileCenter } from '../iso/IsoMath';
import type { GenMeta, MapData } from '../world/MapData';
import { C, glass, title, txt } from '../ui/theme';
import { showAbout, showSettings } from '../ui/SettingsPanel';
import { onKey } from '../ui/keys';

// camera drifts between these tiles
const TOUR = [[10, 27], [24, 20], [31, 12], [18, 30]];


/** A static build (a page host with no game server): co-op and the arena are left out. */
const ONLINE = import.meta.env.VITE_OFFLINE !== '1';
export class MenuScene extends Phaser.Scene {
  private items: { label: string; enabled: boolean; run: () => void; text?: Phaser.GameObjects.Text }[] = [];
  private sel = 0;
  private overlay = false;
  private static linkUsed = false;

  constructor() {
    super('Menu');
  }

  create(): void {
    music.play('menu');
    this.overlay = false;
    const data = session().map as MapData;
    const map = new WorldMap(this, data, this.cache.json.get('meta') as GenMeta);
    const fire = data.objects.find((o) => o.frame === 'campfire');
    const amb = new Ambience(this);
    if (fire) amb.campfire(fire.x, fire.y);
    const world = [...this.children.list];

    const cam = this.cameras.main;
    const b = map.bounds();
    cam.setBounds(b.x, b.y, b.width, b.height).setZoom(1).setPostPipeline('WastelandFX');
    const start = tileCenter(TOUR[0][0], TOUR[0][1]);
    cam.centerOn(start.x, start.y);
    this.drift(1);

    const ui = this.add.container(0, 0);
    cam.ignore(ui);
    const uiCam = this.cameras.add(0, 0, GAME_W, 720);
    uiCam.ignore(world);
    uiCam.setPostPipeline('CrtFX');

    const canContinue = !!loadGame();
    const band = this.add.graphics();
    band.fillGradientStyle(0x120d0a, 0x120d0a, 0x120d0a, 0x120d0a, 0, 0, 0.75, 0.75).fillRect(0, 50, GAME_W, 70);
    band.fillStyle(0x120d0a, 0.75).fillRect(0, 120, GAME_W, 80);
    band.fillGradientStyle(0x120d0a, 0x120d0a, 0x120d0a, 0x120d0a, 0.75, 0.75, 0, 0).fillRect(0, 200, GAME_W, 50);
    band.fillStyle(0x120d0a, 0.7).fillRect(0, 676, GAME_W, 28);
    ui.add(band);
    ui.add(title(this, GAME_W / 2 + 4, 124, 'СУШЬ', 60, '#120d0a').setOrigin(0.5));
    ui.add(title(this, GAME_W / 2, 120, 'СУШЬ', 60, C.amber).setOrigin(0.5));
    ui.add(txt(this, GAME_W / 2, 180, 'Низовье и Солончаки · Главы I–IV', 18, C.sand).setOrigin(0.5).setShadow(2, 2, '#120d0a', 0, true, true));
    ui.add(glass(this, GAME_W / 2 - 170, 262, 340, (ONLINE ? 6 : 4) * 44 + 26));
    this.items = [
      { label: 'НОВАЯ ИГРА', enabled: true, run: () => this.scene.start('Create') },
      { label: 'ПРОДОЛЖИТЬ', enabled: canContinue, run: () => this.continueGame() },
      ...(ONLINE
        ? [
            { label: 'КООПЕРАТИВ', enabled: true, run: () => this.scene.start('Lobby', { mode: 'coop' }) },
            { label: 'АРЕНА', enabled: true, run: () => this.scene.start('Lobby', { mode: 'arena' }) },
          ]
        : []),
      { label: 'НАСТРОЙКИ', enabled: true, run: () => this.open((done) => showSettings(this, done)) },
      { label: 'ОБ ИГРЕ', enabled: true, run: () => this.open((done) => showAbout(this, done)) },
    ];
    this.items.forEach((it, i) => {
      const t = txt(this, GAME_W / 2, 280 + i * 44, it.label, 20, it.enabled ? C.crt : C.crtDim, undefined, true).setOrigin(0.5, 0).setInteractive();
      t.on('pointerover', () => it.enabled && ((this.sel = i), this.paint()));
      t.on('pointerdown', () => this.activate(i));
      it.text = t;
      ui.add(t);
    });
    this.sel = canContinue ? 1 : 0;
    this.paint();
    ui.add(txt(this, GAME_W / 2, 690, '↑ ↓ выбрать · Enter подтвердить', 12, C.crtDim).setOrigin(0.5));

    // settings / about overlays are created later: keep them out of the world camera
    const hide = (o: Phaser.GameObjects.GameObject) => cam.ignore(o);
    this.events.on('addedtoscene', hide);
    this.events.once('shutdown', () => this.events.off('addedtoscene', hide));
    onKey(this, (e) => {
      if (this.overlay || e.repeat) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') this.move(e.key === 'ArrowDown' ? 1 : -1);
      if (e.key === 'Enter') this.activate(this.sel);
    });
    // a friend's link (?room=CODE&mode=arena) goes straight to the lobby with the code filled in
    const q = new URLSearchParams(location.search);
    const room = q.get('room');
    if (room && ONLINE && !MenuScene.linkUsed) {
      MenuScene.linkUsed = true;
      this.scene.start('Lobby', { mode: q.get('mode') === 'arena' ? 'arena' : 'coop', code: room });
      return;
    }
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__menu = {
        quickStart: (i: number) => this.quickStart(i),
        continueGame: () => this.continueGame(),
        lobby: (mode: 'coop' | 'arena') => this.scene.start('Lobby', { mode }),
      };
  }

  private drift(i: number): void {
    const t = tileCenter(TOUR[i][0], TOUR[i][1]);
    const cam = this.cameras.main;
    this.tweens.add({
      targets: cam,
      scrollX: t.x - cam.width / 2,
      scrollY: t.y - cam.height / 2,
      duration: 16000,
      ease: 'Sine.easeInOut',
      onComplete: () => this.drift((i + 1) % TOUR.length),
    });
  }

  private paint(): void {
    this.items.forEach((it, i) => it.text?.setText(i === this.sel ? `> ${it.label} <` : it.label).setColor(!it.enabled ? C.crtDim : i === this.sel ? C.crtBright : C.crt));
  }

  private move(d: number): void {
    const n = this.items.length;
    do this.sel = (this.sel + d + n) % n;
    while (!this.items[this.sel].enabled);
    synth.click();
    this.paint();
  }

  private activate(i: number): void {
    const it = this.items[i];
    if (!it?.enabled || this.overlay) return;
    synth.start();
    synth.click();
    it.run();
  }

  private open(show: (done: () => void) => void): void {
    this.overlay = true;
    show(() => (this.overlay = false));
  }

  private continueGame(): void {
    if (!session().load()) return;
    this.enterWorld();
  }

  /** Dev/test shortcut: start with a premade build, skipping the dossier and intro. */
  private quickStart(i: number): void {
    const d = new BuildDraft(CONTENT.character);
    d.applyPremade(CONTENT.character.premades[i]);
    session().startNew(d.build());
    this.enterWorld();
  }

  private enterWorld(): void {
    this.scene.start('World');
    this.scene.launch('UI');
  }
}
