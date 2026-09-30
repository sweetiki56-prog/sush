// Fallout-style talking-head window: portrait, typed reply, numbered answers (click or keys 1-9).
// The room runs the dialogue; this window shows each node it sends and answers with the choice.
import Phaser from 'phaser';
import type { DialogueMsg } from '../core/room/protocol';
import { GAME_W } from '../config';
import { synth } from '../audio/Synth';
import { settings, TEXT_SPEEDS } from '../core/Settings';
import { C, dimmer, glass, metalPanel, title, txt } from './theme';
import { onKey } from './keys';

const W = 980;
const H = 470;
const X = (GAME_W - W) / 2;
const Y = 70;

export class DialogueView {
  private root: Phaser.GameObjects.Container | null = null;
  private msg: DialogueMsg | null = null;
  private waiting = false; // an answer went to the room, the next node has not come yet
  private body!: Phaser.GameObjects.Text;
  private opts: Phaser.GameObjects.Text[] = [];
  private full = '';
  private shown = 0;
  private typing: Phaser.Time.TimerEvent | null = null;

  constructor(
    private scene: Phaser.Scene,
    private choose: (i: number) => void,
    private onClose: (id: string) => void,
  ) {
    onKey(scene, (e) => {
      if (!this.root || e.repeat) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 9) this.pick(n - 1);
      if (e.key === ' ' || e.key === 'Enter') this.finishTyping();
    });
  }

  get open(): boolean {
    return !!this.root;
  }

  /** Open the window on the first node, or move on to the next one. */
  show(d: DialogueMsg): void {
    this.msg = d;
    this.waiting = false;
    if (this.root) return this.render();
    const s = this.scene;
    this.root = s.add.container(0, 0).setDepth(20);
    this.root.add(dimmer(s, 0.45));
    this.root.add(metalPanel(s, X, Y, W, H));
    const hasPortrait = !!d.portrait;
    if (hasPortrait) {
      this.root.add(glass(s, X + 20, Y + 20, 200, 200));
      this.root.add(s.add.image(X + 24, Y + 24, 'atlas', d.portrait!).setOrigin(0).setDisplaySize(192, 192));
    }
    const tx = hasPortrait ? X + 240 : X + 20;
    const tw = W - (tx - X) - 20;
    this.root.add(glass(s, tx, Y + 20, tw, 200));
    this.root.add(title(s, tx + 14, Y + 32, d.speaker.toUpperCase(), 12, C.amber));
    this.body = txt(s, tx + 14, Y + 58, '', 15, C.crtBright, tw - 28);
    this.root.add(this.body);
    this.root.add(glass(s, X + 20, Y + 236, W - 40, H - 256));
    this.render();
  }

  private render(): void {
    const d = this.msg!;
    this.full = d.text;
    this.shown = 0;
    this.body.setText('');
    this.typing?.remove();
    this.typing = this.scene.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        this.shown = Math.min(this.full.length, this.shown + TEXT_SPEEDS[settings().textSpeed].chars);
        this.body.setText(this.full.slice(0, this.shown));
        if (this.shown >= this.full.length) this.finishTyping();
      },
    });
    for (const o of this.opts) o.destroy();
    this.opts = [];
    let y = Y + 250;
    d.options.forEach((label, i) => {
      const t = txt(this.scene, X + 40, y, `${i + 1}. ${label}`, 15, C.crt, W - 90).setInteractive();
      t.on('pointerover', () => t.setColor(C.crtBright).setBackgroundColor('#1f3b22'));
      t.on('pointerout', () => t.setColor(C.crt).setBackgroundColor('transparent'));
      t.on('pointerdown', () => this.pick(i));
      this.root!.add(t);
      this.opts.push(t);
      y += t.height + 8;
    });
  }

  private finishTyping(): void {
    this.typing?.remove();
    this.typing = null;
    this.body?.setText(this.full);
  }

  private pick(i: number): void {
    if (!this.msg || this.waiting || i >= this.msg.options.length) return;
    synth.click();
    this.waiting = true;
    this.choose(i);
  }

  /** The room ended the talk. */
  close(): void {
    if (!this.root) return;
    this.typing?.remove();
    this.typing = null;
    const id = this.msg?.id ?? '';
    this.root.destroy();
    this.root = null;
    this.msg = null;
    this.opts = [];
    this.onClose(id);
  }
}
