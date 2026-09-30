// Combat and world effects: floating numbers, muzzle flash, tracer, splats, blasts.
import Phaser from 'phaser';

const TOP = 2e5;

export function floatText(scene: Phaser.Scene, x: number, y: number, text: string, color: string, ms: number): void {
  const t = scene.add
    .text(x, y, text, { fontFamily: '"IBM Plex Mono", monospace', fontSize: '11px', fontStyle: 'bold', color, stroke: '#120d0a', strokeThickness: 3 })
    .setOrigin(0.5, 1)
    .setDepth(TOP)
    .setResolution(2);
  scene.tweens.add({ targets: t, y: y - 22, alpha: { from: 1, to: 0 }, duration: Math.max(300, ms * 3), ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
}

export function flash(scene: Phaser.Scene, x: number, y: number, frame: string, scale: number, ms: number): void {
  const f = scene.add.image(x, y, 'atlas', frame).setDepth(TOP).setBlendMode(Phaser.BlendModes.ADD).setScale(scale);
  scene.tweens.add({ targets: f, alpha: 0, scale: scale * 1.6, duration: Math.max(60, ms), onComplete: () => f.destroy() });
}

export function tracer(scene: Phaser.Scene, a: { x: number; y: number }, b: { x: number; y: number }, ms: number): void {
  const g = scene.add.graphics().setDepth(TOP);
  g.lineStyle(1, 0xffd87a, 0.9).lineBetween(a.x, a.y, b.x, b.y);
  scene.tweens.add({ targets: g, alpha: 0, duration: Math.max(60, ms), onComplete: () => g.destroy() });
}

export function splat(scene: Phaser.Scene, x: number, y: number, frame: 'ichor' | 'blood' | 'dust', ms: number): void {
  for (let i = 0; i < 6; i++) {
    const p = scene.add.image(x, y, 'atlas', frame).setDepth(TOP - 1).setScale(0.4 + Math.random() * 0.4);
    scene.tweens.add({
      targets: p,
      x: x + (Math.random() - 0.5) * 22,
      y: y + (Math.random() - 0.7) * 16,
      alpha: 0,
      duration: Math.max(150, ms * 1.5),
      onComplete: () => p.destroy(),
    });
  }
}

export function blast(scene: Phaser.Scene, x: number, y: number, radiusPx: number, ms: number): void {
  const b = scene.add.image(x, y, 'atlas', 'blast').setDepth(TOP).setBlendMode(Phaser.BlendModes.ADD).setScale(0.3);
  scene.tweens.add({ targets: b, scale: radiusPx / 28, alpha: { from: 1, to: 0 }, duration: Math.max(250, ms * 2), ease: 'Cubic.easeOut', onComplete: () => b.destroy() });
  for (let i = 0; i < 10; i++) {
    const s = scene.add.image(x, y, 'atlas', 'smoke').setDepth(TOP - 1).setAlpha(0.8);
    scene.tweens.add({
      targets: s,
      x: x + (Math.random() - 0.5) * radiusPx * 1.6,
      y: y - Math.random() * radiusPx,
      alpha: 0,
      scale: 2,
      duration: Math.max(400, ms * 4),
      onComplete: () => s.destroy(),
    });
  }
  scene.cameras.main.shake(Math.max(120, ms), 0.006);
}

/** A grenade flying in an arc from a to b; resolves when it lands. */
export function lob(scene: Phaser.Scene, a: { x: number; y: number }, b: { x: number; y: number }, ms: number): Promise<void> {
  const g = scene.add.image(a.x, a.y, 'atlas', 'dust').setDepth(TOP).setTint(0x3a3a34).setScale(0.9);
  const lift = Math.max(30, Math.hypot(b.x - a.x, b.y - a.y) * 0.35);
  return new Promise((done) => {
    scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: Math.max(120, ms),
      onUpdate: (tw) => {
        const s = tw.getValue() ?? 0;
        g.setPosition(a.x + (b.x - a.x) * s, a.y + (b.y - a.y) * s - lift * 4 * s * (1 - s));
      },
      onComplete: () => {
        g.destroy();
        done();
      },
    });
  });
}
