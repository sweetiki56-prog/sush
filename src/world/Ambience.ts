// Living-world dressing: blowing dust, tumbleweeds, campfire flames, smoke and glow, pump water.
import Phaser from 'phaser';
import { depthOf, gridToScreen, screenToGrid } from '../iso/IsoMath';

export class Ambience {
  private dust: Phaser.GameObjects.Particles.ParticleEmitter;
  private nextWeed = 4000;

  constructor(private scene: Phaser.Scene) {
    const cam = scene.cameras.main;
    this.dust = scene.add.particles(0, 0, 'atlas', {
      frame: 'dust',
      lifespan: 5000,
      speedX: { min: 30, max: 90 },
      speedY: { min: 5, max: 25 },
      scale: { min: 0.2, max: 0.7 },
      alpha: { start: 0.45, end: 0 },
      frequency: 70,
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(0, 0, cam.width, cam.height) } as Phaser.Types.GameObjects.Particles.EmitZoneData,
    });
    this.dust.setDepth(1e6);
  }

  campfire(tx: number, ty: number): void {
    const s = this.scene;
    const p = gridToScreen(tx + 0.5, ty + 0.5);
    const d = depthOf(tx + 0.5, ty + 0.5);
    const glow = s.add.image(p.x, p.y - 4, 'atlas', 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(-5e4).setScale(1.6);
    s.tweens.add({ targets: glow, alpha: { from: 0.75, to: 1 }, scale: { from: 1.5, to: 1.7 }, duration: 140, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    s.add
      .particles(p.x, p.y - 3, 'atlas', {
        frame: 'flame',
        lifespan: { min: 300, max: 600 },
        speedY: { min: -40, max: -20 },
        speedX: { min: -6, max: 6 },
        scale: { start: 0.9, end: 0.1 },
        alpha: { start: 1, end: 0 },
        tint: [0xffd87a, 0xf0a040, 0xd0602a],
        blendMode: 'ADD',
        frequency: 40,
      })
      .setDepth(d + 0.5);
    s.add
      .particles(p.x, p.y - 16, 'atlas', {
        frame: 'smoke',
        lifespan: 2600,
        speedY: { min: -26, max: -14 },
        speedX: { min: 4, max: 16 },
        scale: { start: 0.4, end: 1.6 },
        alpha: { start: 0.35, end: 0 },
        frequency: 220,
      })
      .setDepth(d + 0.6);
  }

  water(tx: number, ty: number): void {
    const p = gridToScreen(tx + 1, ty + 1);
    this.scene.add
      .particles(p.x + 17, p.y - 28, 'atlas', {
        frame: 'dust',
        lifespan: 500,
        speedX: { min: 10, max: 30 },
        speedY: { min: -10, max: 20 },
        gravityY: 200,
        scale: { start: 0.5, end: 0.2 },
        tint: 0x9cc4c4,
        frequency: 50,
      })
      .setDepth(depthOf(tx + 1, ty + 1) + 5);
  }

  update(dtMs: number): void {
    const cam = this.scene.cameras.main;
    const view = cam.worldView;
    this.dust.setPosition(view.x, view.y);
    const zone = this.dust.emitZones[0] as unknown as { source: Phaser.Geom.Rectangle } | undefined;
    zone?.source.setSize(view.width, view.height);
    this.nextWeed -= dtMs;
    if (this.nextWeed <= 0) {
      this.nextWeed = 9000 + Math.random() * 9000;
      this.tumbleweed(view);
    }
  }

  private tumbleweed(view: Phaser.Geom.Rectangle): void {
    const s = this.scene;
    const y0 = view.y + view.height * (0.2 + Math.random() * 0.6);
    const w = s.add.image(view.x - 20, y0, 'atlas', 'tumbleweed');
    const dur = 7000 + Math.random() * 3000;
    s.tweens.add({ targets: w, x: view.right + 40, y: y0 + 120, angle: 1080, duration: dur, onComplete: () => w.destroy() });
    s.tweens.add({ targets: w, scaleY: 0.85, duration: 180, yoyo: true, repeat: -1 });
    const upd = () => {
      if (!w.active) return;
      const g = screenToGrid(w.x, w.y);
      w.setDepth(depthOf(g.x, g.y));
    };
    s.events.on('update', upd);
    w.once('destroy', () => s.events.off('update', upd));
  }
}
