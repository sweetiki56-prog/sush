// Roofs over buildings with an inside (tools/art/roofs.mjs): drawn over everything in the building, they melt away
// while this client's hero stands under one and come back once the hero walks out, as in the old isometric RPGs.
import Phaser from 'phaser';
import { depthOf, gridToScreen } from '../iso/IsoMath';
import type { MapData, MapRoof } from './MapData';

const FADE_MS = 260;

export class Roofs {
  private readonly items: { roof: MapRoof; image: Phaser.GameObjects.Image; under: boolean }[] = [];

  constructor(
    private scene: Phaser.Scene,
    data: MapData,
  ) {
    for (const roof of data.roofs ?? []) {
      const key = `roof_${data.id}_${roof.id}`;
      if (!scene.textures.getFrame('atlas', key)) continue;
      const frame = scene.textures.getFrame('atlas', key);
      const anchor = (frame.customData as { anchor?: { x: number; y: number } }).anchor ?? { x: 0.5, y: 1 };
      const p = gridToScreen(roof.x1 + 1, roof.y1 + 1);
      const image = scene.add.image(p.x, p.y, 'atlas', key).setOrigin(anchor.x, anchor.y).setDepth(depthOf(roof.x1 + 1, roof.y1 + 1));
      this.items.push({ roof, image, under: false });
    }
  }

  /** The hero is at this tile: melt the roof over it, bring back the others. */
  update(x: number, y: number): void {
    for (const it of this.items) {
      const r = it.roof;
      const under = x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
      if (under === it.under) continue;
      it.under = under;
      this.scene.tweens.killTweensOf(it.image);
      this.scene.tweens.add({ targets: it.image, alpha: under ? 0 : 1, duration: FADE_MS });
    }
  }

  /** For tests: how opaque a roof is now (1 shown, 0 melted). */
  alpha(id: string): number | null {
    return this.items.find((it) => it.roof.id === id)?.image.alpha ?? null;
  }
}
