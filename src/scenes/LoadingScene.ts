// The loading screens: a western at the end of the world. Three backdrops (tools/art/loading.mjs):
// a desert dusk (the game starting), a notice nailed to boards (arriving somewhere new), the survey chart
// with a compass (the world map). Progress fills a row of water drops, the country's own money;
// the compass needle swings with it. A tip at the bottom. Shown over everything, faded in and out.
import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';
import { randomTip } from '../ui/tips';

export type LoadingStyle = 'dusk' | 'poster' | 'chart';
export interface LoadingData {
  style: LoadingStyle;
  title: string;
  subtitle?: string;
}

export const WESTERN = '"Kelly Slab", "Georgia", serif'; // capitals only: its lowercase «в» reads as a Latin B
const PLAIN = '"Georgia", "Times New Roman", serif';
const DROPS = 10;
const MIN_MS = 900; // no flashing: once shown, a screen stays long enough to be read
const FADE_MS = 350;

export class LoadingScene extends Phaser.Scene {
  private progress = 0;
  private shown = 0;
  private closing = false;
  private drops!: Phaser.GameObjects.Graphics;
  private needle: Phaser.GameObjects.Graphics | null = null;
  private dropsAt = { x: 0, y: 0 };

  constructor() {
    super('Loading');
  }

  create(data: LoadingData): void {
    this.progress = 0;
    this.closing = false;
    this.shown = this.time.now;
    this.cameras.main.setAlpha(0);
    this.tweens.add({ targets: this.cameras.main, alpha: 1, duration: FADE_MS });
    this.add.image(0, 0, `loading_${data.style}`).setOrigin(0).setDisplaySize(GAME_W, GAME_H);
    const text = (x: number, y: number, s: string, size: number, color: string, stroke = '#1a0e08', style: Phaser.Types.GameObjects.Text.TextStyle = {}) =>
      this.add.text(x, y, s, { fontFamily: WESTERN, fontSize: `${size}px`, color, stroke, strokeThickness: Math.max(2, size / 12), align: 'center', ...style }).setOrigin(0.5);

    if (data.style === 'dusk') {
      text(GAME_W / 2, 120, data.title.toUpperCase(), 110, '#f6d79a', '#2a0f14').setShadow(0, 6, 'rgba(0,0,0,0.6)', 8, true, true);
      if (data.subtitle) text(GAME_W / 2, 200, data.subtitle.toUpperCase(), 24, '#e8b98a', '#2a0f14', { letterSpacing: 3 });
      this.dropsAt = { x: GAME_W / 2, y: 612 };
    } else if (data.style === 'poster') {
      text(GAME_W / 2, 132, 'ПУТЕВОЙ ЛИСТ', 34, '#3a2414', '#e8d3a4').setAngle(-1);
      text(GAME_W / 2, 262, data.title.toUpperCase(), data.title.length > 14 ? 58 : 76, '#2a160a', '#e8d3a4').setAngle(-1);
      if (data.subtitle) text(GAME_W / 2, 350, data.subtitle.toUpperCase(), 22, '#4a3020', '#e8d3a4', { wordWrap: { width: 560 }, letterSpacing: 2 }).setAngle(-1);
      this.dropsAt = { x: GAME_W / 2, y: 452 };
    } else {
      text(430, 112, data.title.toUpperCase(), 60, '#2a160a', '#e8d3a4').setAngle(-3.4);
      if (data.subtitle) text(430, 170, data.subtitle.toUpperCase(), 22, '#4a3020', '#e8d3a4', { letterSpacing: 2 }).setAngle(-3.4);
      this.needle = this.add.graphics({ x: 1010, y: 300 });
      this.dropsAt = { x: 560, y: 600 };
    }
    // a tip on a dark band along the bottom
    this.add.rectangle(0, GAME_H - 64, GAME_W, 64, 0x0d0806, 0.72).setOrigin(0);
    text(GAME_W / 2, GAME_H - 32, randomTip(), 19, '#e8c890', '#0d0806', { wordWrap: { width: GAME_W - 160 }, fontFamily: PLAIN, fontStyle: 'italic' });
    this.drops = this.add.graphics();
    this.drawDrops(0);
  }

  update(time: number): void {
    const t = time * 0.001;
    this.drawDrops(t);
    if (this.needle) {
      // the needle swings toward the progress and trembles like a real one
      const a = this.progress * Math.PI * 3 + Math.sin(t * 5) * 0.08;
      const g = this.needle.clear().setRotation(a);
      g.fillStyle(0xa8321e, 1).fillTriangle(-10, 0, 10, 0, 0, -118);
      g.fillStyle(0x2a2a2a, 1).fillTriangle(-10, 0, 10, 0, 0, 118);
      g.fillStyle(0xd8b060, 1).fillCircle(0, 0, 10);
      g.lineStyle(2, 0x3a2414, 1).strokeCircle(0, 0, 10);
    }
  }

  setProgress(p: number): void {
    this.progress = Math.max(this.progress, Math.min(1, p));
  }

  /** Everything is in: fill up, hold a moment if it came too fast, fade away. */
  finish(): void {
    if (this.closing) return;
    this.closing = true;
    this.progress = 1;
    const wait = Math.max(0, MIN_MS - (this.time.now - this.shown));
    this.time.delayedCall(wait, () =>
      this.tweens.add({ targets: this.cameras.main, alpha: 0, duration: FADE_MS, onComplete: () => this.scene.stop() }),
    );
  }

  /** A row of drops: the full ones water-blue with a glint, the one being filled rising, the rest dry. */
  private drawDrops(t: number): void {
    const g = this.drops.clear();
    const gap = 38;
    const r = 11;
    const x0 = this.dropsAt.x - ((DROPS - 1) * gap) / 2;
    const fill = this.progress * DROPS;
    for (let i = 0; i < DROPS; i++) {
      const x = x0 + i * gap;
      const y = this.dropsAt.y;
      const level = Math.max(0, Math.min(1, fill - i));
      const shape = dropShape(x, y, r);
      g.fillStyle(0x1a0e08, 0.85).fillPoints(dropShape(x, y, r + 2.5), true); // a dark rim
      g.fillStyle(0x6a5040, 0.9).fillPoints(shape, true); // dry
      if (level > 0) {
        const water = level >= 1 ? shape : clipBelow(shape, y + r - (r * 3.1) * level);
        g.fillStyle(0x3c8fd0, level >= 1 ? 0.9 + Math.sin(t * 3 + i) * 0.1 : 1).fillPoints(water, true);
        if (level >= 1) g.fillStyle(0xe0f4ff, 0.8).fillEllipse(x - r * 0.35, y - r * 0.1, r * 0.3, r * 0.6);
      }
    }
  }
}

/** A drop: its round belly centred on (x, y), its tip above; the outline as points. */
function dropShape(x: number, y: number, r: number): Phaser.Math.Vector2[] {
  const tip = r * 2.1;
  const t = Math.acos(r / tip); // where the sides touch the belly
  const pts = [new Phaser.Math.Vector2(x, y - tip)];
  for (let k = 0; k <= 20; k++) {
    const a = -Math.PI / 2 + t + (k / 20) * (2 * Math.PI - 2 * t);
    pts.push(new Phaser.Math.Vector2(x + Math.cos(a) * r, y + Math.sin(a) * r));
  }
  return pts;
}

/** The part of a polygon below a water line (Sutherland–Hodgman against y ≥ cut). */
function clipBelow(pts: Phaser.Math.Vector2[], cut: number): Phaser.Math.Vector2[] {
  const out: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const ain = a.y >= cut;
    const bin = b.y >= cut;
    if (ain) out.push(a);
    if (ain !== bin) out.push(new Phaser.Math.Vector2(a.x + ((b.x - a.x) * (cut - a.y)) / (b.y - a.y), cut));
  }
  return out;
}

/** Open a loading screen over everything; the returned handle takes the progress and closes it. */
export function showLoading(from: Phaser.Scene, data: LoadingData): { progress: (p: number) => void; done: () => void } {
  const mgr = from.scene.manager;
  if (mgr.isActive('Loading')) mgr.stop('Loading');
  from.scene.launch('Loading', data);
  from.scene.bringToTop('Loading');
  if (mgr.getScene('Cursor')) from.scene.bringToTop('Cursor');
  const get = () => mgr.getScene('Loading') as LoadingScene;
  return {
    progress: (p) => mgr.isActive('Loading') && get().setProgress(p),
    done: () => mgr.isActive('Loading') && get().finish(),
  };
}

/** Show a loading screen for this scene's loader: progress from its events, closed when it completes. */
export function loadingFor(from: Phaser.Scene, data: LoadingData): void {
  const h = showLoading(from, data);
  from.load.on('progress', h.progress);
  from.load.once('complete', () => {
    from.load.off('progress', h.progress);
    h.done();
  });
}
