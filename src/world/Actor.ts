// A character on the iso grid: the room's Mover drawn as an 8-direction animated sprite.
import Phaser from 'phaser';
import { depthOf, gridToScreen } from '../iso/IsoMath';
import type { Tile } from '../iso/Pathfinder';
import { WALK_SPEED } from '../config';
import { Mover } from '../core/world/Mover';
import type { SheetMeta } from './MapData';

/** Frame index of a pose (first column with that name) in a direction row. */
export function poseFrame(meta: SheetMeta, dir: number, pose: string): number {
  return dir * meta.poses.length + Math.max(0, meta.poses.indexOf(pose));
}

export function registerAnims(scene: Phaser.Scene, sheet: string, meta: SheetMeta): void {
  const first = meta.poses.indexOf('walk');
  const last = meta.poses.lastIndexOf('walk');
  const cols = meta.poses.length;
  for (let d = 0; d < 8; d++) {
    const walk = `${sheet}_walk_${d}`;
    if (!scene.anims.exists(walk))
      scene.anims.create({ key: walk, frames: scene.anims.generateFrameNumbers(sheet, { start: d * cols + first, end: d * cols + last }), frameRate: 9, repeat: -1 });
  }
}

export class Actor {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly shadow: Phaser.GameObjects.Image;
  readonly mover: Mover;
  private stepAcc = 0;
  private pose = 'idle';
  private animDir = -1;
  onStep: ((tile: Tile) => void) | null = null; // footstep sound hook

  constructor(
    scene: Phaser.Scene,
    readonly id: string,
    readonly sheet: string,
    tx: number,
    ty: number,
    dir: number,
    readonly meta: SheetMeta,
  ) {
    registerAnims(scene, sheet, meta);
    this.mover = new Mover(tx, ty, dir, WALK_SPEED);
    this.shadow = scene.add.image(0, 0, 'atlas', 'shadow');
    this.sprite = scene.add.sprite(0, 0, sheet, poseFrame(meta, dir, 'idle')).setOrigin(meta.footX / meta.w, meta.footY / meta.h);
    this.sync();
  }

  get gx(): number {
    return this.mover.gx;
  }

  get gy(): number {
    return this.mover.gy;
  }

  get dir(): number {
    return this.mover.dir;
  }

  get tile(): Tile {
    return this.mover.tile;
  }

  get moving(): boolean {
    return this.mover.moving;
  }

  get speed(): number {
    return this.mover.speed;
  }

  set speed(v: number) {
    this.mover.speed = v;
  }

  get dead(): boolean {
    return this.pose === 'dead';
  }

  face(dir: number): void {
    this.mover.dir = dir;
    if (this.moving) return;
    this.setPose(this.dead ? 'dead' : 'idle');
  }

  /** Show a still pose (aim, fire, melee1, hit, dead...) facing the current direction. */
  setPose(pose: string): void {
    this.pose = pose;
    this.animDir = -1;
    this.sprite.anims.stop();
    this.sprite.setFrame(poseFrame(this.meta, this.dir, pose));
  }

  faceTile(tx: number, ty: number): void {
    this.mover.faceTile(tx, ty);
    this.face(this.mover.dir);
  }

  walk(path: Tile[], onArrive?: () => void): void {
    this.mover.walk(path, () => {
      this.setPose('idle');
      onArrive?.();
    });
  }

  stop(): void {
    this.mover.stop();
    this.setPose(this.dead ? 'dead' : 'idle');
  }

  teleport(tx: number, ty: number): void {
    this.stop();
    this.mover.teleport(tx, ty);
    this.sync();
  }

  update(dt: number): void {
    if (!this.mover.moving) return;
    this.mover.update(dt);
    if (this.mover.moving && (this.mover.dir !== this.animDir || !this.sprite.anims.isPlaying)) {
      this.animDir = this.mover.dir;
      this.sprite.anims.play(`${this.sheet}_walk_${this.animDir}`, true);
    }
    this.stepAcc += dt;
    if (this.stepAcc > 0.26) {
      this.stepAcc = 0;
      this.onStep?.(this.tile);
    }
    this.sync();
  }

  sync(): void {
    const p = gridToScreen(this.gx, this.gy);
    this.sprite.setPosition(Math.round(p.x), Math.round(p.y));
    this.shadow.setPosition(Math.round(p.x), Math.round(p.y) - 1);
    const depth = depthOf(this.gx, this.gy);
    this.sprite.setDepth(this.dead ? -1e5 + depth : depth + 0.2); // corpses lie under everyone
    this.shadow.setDepth(depth - 0.3);
  }
}

