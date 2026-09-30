// UI kit: rusted metal frames with green phosphor glass, Fallout-terminal flavor.
import Phaser from 'phaser';
import { FONT, TITLE_FONT } from '../config';
import { synth } from '../audio/Synth';

export const C = {
  crt: '#7ad36a',
  crtDim: '#3f7a3a',
  crtBright: '#b8f5a0',
  amber: '#f0a040',
  sand: '#e6cc97',
  red: '#d0602a',
  glass: 0x0c160d,
  glassEdge: 0x3f7a3a,
  ink: 0x120d0a,
  rust: 0x6a2f18,
  steel: 0x55514a,
};

export function txt(scene: Phaser.Scene, x: number, y: number, s: string, size = 14, color = C.crt, wrap?: number, bold = false) {
  return scene.add.text(x, y, s, {
    fontFamily: FONT,
    fontSize: `${size}px`,
    fontStyle: bold ? 'bold' : 'normal',
    color,
    wordWrap: wrap ? { width: wrap, useAdvancedWrap: true } : undefined,
    lineSpacing: 3,
  });
}

export function title(scene: Phaser.Scene, x: number, y: number, s: string, size = 16, color = C.amber) {
  return scene.add.text(x, y, s, { fontFamily: TITLE_FONT, fontSize: `${size}px`, color });
}

/** Rusty riveted metal plate. */
export function metalPanel(scene: Phaser.Scene, x: number, y: number, w: number, h: number): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const plate = scene.add.tileSprite(0, 0, w, h, 'atlas', 'metal').setOrigin(0);
  const g = scene.add.graphics();
  g.lineStyle(2, 0x000000, 0.8).strokeRect(1, 1, w - 2, h - 2);
  g.lineStyle(1, 0x8a847a, 0.6).lineBetween(3, 3, w - 3, 3).lineBetween(3, 3, 3, h - 3);
  g.lineStyle(1, 0x1e1611, 0.9).lineBetween(3, h - 3, w - 3, h - 3).lineBetween(w - 3, 3, w - 3, h - 3);
  c.add([plate, g]);
  for (const [rx, ry] of [[7, 7], [w - 13, 7], [7, h - 13], [w - 13, h - 13]]) c.add(scene.add.image(rx, ry, 'atlas', 'rivet').setOrigin(0));
  return c;
}

/** Dark phosphor glass inset. */
export function glass(scene: Phaser.Scene, x: number, y: number, w: number, h: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics({ x, y });
  g.fillStyle(C.glass, 0.95).fillRect(0, 0, w, h);
  g.fillStyle(0x7ad36a, 0.04).fillRect(0, 0, w, h / 2);
  g.lineStyle(1, C.glassEdge, 1).strokeRect(0.5, 0.5, w - 1, h - 1);
  g.lineStyle(1, 0x000000, 0.9).strokeRect(-1.5, -1.5, w + 3, h + 3);
  return g;
}

export interface Button {
  root: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  setEnabled(on: boolean): void;
}

export function button(scene: Phaser.Scene, x: number, y: number, w: number, h: number, label: string, onClick: () => void): Button {
  const root = scene.add.container(x, y);
  const bg = scene.add.rectangle(0, 0, w, h, 0x1f3b22).setOrigin(0).setStrokeStyle(1, 0x3f7a3a);
  const t = txt(scene, w / 2, h / 2, label, 13, C.crt, undefined, true).setOrigin(0.5);
  root.add([bg, t]);
  let enabled = true;
  bg.setInteractive({ useHandCursor: false })
    .on('pointerover', () => enabled && (bg.setFillStyle(0x3f7a3a), t.setColor(C.crtBright)))
    .on('pointerout', () => (bg.setFillStyle(0x1f3b22), t.setColor(enabled ? C.crt : C.crtDim)))
    .on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => {
      ev?.stopPropagation?.();
      if (!enabled) return;
      synth.start();
      synth.click();
      onClick();
    });
  return {
    root,
    label: t,
    setEnabled(on: boolean) {
      enabled = on;
      t.setColor(on ? C.crt : C.crtDim);
    },
  };
}

/** Small square button with a glyph such as − + ◄ ►. */
export function glyphButton(scene: Phaser.Scene, x: number, y: number, glyph: string, onClick: () => void, size = 20): Button {
  return button(scene, x, y, size, size, glyph, onClick);
}

/** Invisible hover/click zone over a row of text. */
export function hitRow(scene: Phaser.Scene, x: number, y: number, w: number, h: number, onHover: () => void, onClick?: () => void): Phaser.GameObjects.Rectangle {
  const r = scene.add.rectangle(x, y, w, h, 0x7ad36a, 0).setOrigin(0).setInteractive();
  r.on('pointerover', () => (r.setFillStyle(0x7ad36a, 0.08), onHover()));
  r.on('pointerout', () => r.setFillStyle(0x7ad36a, 0));
  if (onClick)
    r.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => {
      ev?.stopPropagation?.();
      synth.start();
      synth.click();
      onClick();
    });
  return r;
}

/** Full-screen dimmer that swallows clicks. */
export function dimmer(scene: Phaser.Scene, alpha = 0.55): Phaser.GameObjects.Rectangle {
  return scene.add
    .rectangle(0, 0, scene.scale.width, scene.scale.height, 0x000000, alpha)
    .setOrigin(0)
    .setInteractive();
}

export function fmtTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)} мин ${String(s % 60).padStart(2, '0')} с`;
}
