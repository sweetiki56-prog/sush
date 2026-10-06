// A thin silhouette for a known combatant whose pixels are actually covered by a vehicle.
// Rendering only: sight, hit chance and target validation remain room-authoritative.
import Phaser from 'phaser';
import type { Cast } from './Cast';
import type { WorldMap } from './MapBuilder';
import { masksOverlap, type AlphaMask } from './occlusion';

const VEHICLES = new Set(['car_x', 'car_y', 'car_x_burnt', 'water_truck']);

export class HostileOutlines {
  private readonly masks = new Map<string, AlphaMask>();
  private readonly images = new Map<string, Phaser.GameObjects.Image>();

  constructor(private readonly scene: Phaser.Scene, private readonly map: WorldMap, private readonly cast: Cast) {}

  private mask(key: string, frame: string | number, w: number, h: number): AlphaMask {
    const cacheKey = `${key}:${frame}`;
    let mask = this.masks.get(cacheKey);
    if (mask) return mask;
    const alpha = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
      alpha[y * w + x] = this.scene.textures.getPixelAlpha(x, y, key, frame) ?? 0;
    mask = { w, h, alpha };
    this.masks.set(cacheKey, mask);
    return mask;
  }

  private outline(key: string, mask: AlphaMask): string {
    const textureKey = `hostile_outline_${key.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    if (this.scene.textures.exists(textureKey)) return textureKey;
    const texture = this.scene.textures.createCanvas(textureKey, mask.w + 2, mask.h + 2)!;
    const context = texture.getContext();
    const pixels = context.createImageData(mask.w + 2, mask.h + 2);
    for (let y = -1; y <= mask.h; y++) for (let x = -1; x <= mask.w; x++) {
      if (x >= 0 && x < mask.w && y >= 0 && y < mask.h && mask.alpha[y * mask.w + x] > 64) continue;
      const edge = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].some(([xx, yy]) =>
        xx >= 0 && xx < mask.w && yy >= 0 && yy < mask.h && mask.alpha[yy * mask.w + xx] > 64);
      if (!edge) continue;
      const p = ((y + 1) * (mask.w + 2) + x + 1) * 4;
      pixels.data[p] = 255;
      pixels.data[p + 1] = 53;
      pixels.data[p + 2] = 43;
      pixels.data[p + 3] = 245;
    }
    context.putImageData(pixels, 0, 0);
    texture.refresh();
    return textureKey;
  }

  update(combatant: (id: string) => boolean): void {
    const vehicles = [...this.map.props.values()].filter(({ image }) => image.visible && VEHICLES.has(image.frame.name));
    const live = new Set<string>();
    for (const member of this.cast.aliveHostiles()) {
      if (!combatant(member.id)) continue;
      live.add(member.id);
      const sprite = member.actor.sprite;
      if (!sprite.visible || sprite.alpha <= 0) continue;
      const actorMask = this.mask(member.actor.sheet, sprite.frame.name, sprite.frame.width, sprite.frame.height);
      const bounds = sprite.getBounds();
      const hidden = vehicles.some(({ image }) => {
        if (image.depth <= sprite.depth) return false;
        const vehicleBounds = image.getBounds();
        if (!Phaser.Geom.Rectangle.Overlaps(bounds, vehicleBounds)) return false;
        const vehicleMask = this.mask('atlas', image.frame.name, image.frame.width, image.frame.height);
        return masksOverlap(actorMask, bounds.x, bounds.y, vehicleMask, vehicleBounds.x, vehicleBounds.y);
      });
      let image = this.images.get(member.id);
      if (!hidden) {
        image?.setVisible(false);
        continue;
      }
      const texture = this.outline(`${member.actor.sheet}_${sprite.frame.name}`, actorMask);
      if (!image) {
        image = this.scene.add.image(0, 0, texture);
        this.images.set(member.id, image);
      } else image.setTexture(texture);
      image.setOrigin((member.actor.meta.footX + 1) / (actorMask.w + 2), (member.actor.meta.footY + 1) / (actorMask.h + 2));
      image.setPosition(sprite.x, sprite.y).setDepth(1e4).setVisible(true);
    }
    for (const [id, image] of this.images) if (!live.has(id)) {
      image.destroy();
      this.images.delete(id);
    }
  }

  destroy(): void {
    for (const image of this.images.values()) image.destroy();
    this.images.clear();
  }
}
