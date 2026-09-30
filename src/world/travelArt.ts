// What makes the world map feel alive: walking figures, the light of the hour, drifting cloud shadows.
// Pure helpers for TravelScene (no room logic here).
import Phaser from 'phaser';
import type { Game } from '../core/Game';

/** The hero's sprite sheet, as the room names it (look and worn armor). */
export function heroSheet(g: Game): string {
  const armor = g.armor;
  const look = armor ? (armor.look ?? g.state.equipped.armor) : null;
  return `hero_${g.char.look}${look ? `_${look}` : ''}`;
}

/** Light over the chart by the hour: night blue, dusk and dawn amber, clear at noon. */
export function daylight(minute: number): { color: number; alpha: number } {
  const h = minute / 60;
  const night = { color: 0x0a1428, alpha: 0.5 };
  const dusk = { color: 0x5a2a0a, alpha: 0.22 };
  if (h < 4.5 || h >= 21.5) return night;
  const mix = (a: { color: number; alpha: number }, b: { color: number; alpha: number }, t: number) => {
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(a.color), Phaser.Display.Color.ValueToColor(b.color), 100, t * 100);
    return { color: Phaser.Display.Color.GetColor(c.r, c.g, c.b), alpha: a.alpha + (b.alpha - a.alpha) * t };
  };
  const clear = { color: 0x5a2a0a, alpha: 0 };
  if (h < 6) return mix(night, dusk, (h - 4.5) / 1.5);
  if (h < 7.5) return mix(dusk, clear, (h - 6) / 1.5);
  if (h < 18.5) return clear;
  if (h < 20) return mix(clear, dusk, (h - 18.5) / 1.5);
  return mix(dusk, night, (h - 20) / 1.5);
}

/** A soft round shadow for drifting clouds (made once, as a canvas texture). */
export function cloudTexture(scene: Phaser.Scene): string {
  const key = 'travel_cloud';
  if (scene.textures.exists(key)) return key;
  const size = 256;
  const tex = scene.textures.createCanvas(key, size, size)!;
  const ctx = tex.getContext();
  for (const [x, y, r] of [[128, 128, 110], [80, 120, 70], [175, 110, 80], [130, 90, 70]]) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(20,12,6,0.22)');
    g.addColorStop(1, 'rgba(20,12,6,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  tex.refresh();
  return key;
}

/** Walk animations for a sheet (8 directions), made once per sheet. */
export function walkAnims(scene: Phaser.Scene, sheet: string, poses: string[]): void {
  const first = poses.indexOf('walk');
  const last = poses.lastIndexOf('walk');
  const cols = poses.length;
  for (let d = 0; d < 8; d++) {
    const key = `${sheet}_walk_${d}`;
    if (!scene.anims.exists(key)) scene.anims.create({ key, frames: scene.anims.generateFrameNumbers(sheet, { start: d * cols + first, end: d * cols + last }), frameRate: 8, repeat: -1 });
  }
}
