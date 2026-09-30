// A town's plan, opened from the world map when the party stands at a town of several known areas, as in the
// old isometric RPGs: the areas are sepia vignettes on parchment (tools/art/townplan.mjs), each with a button;
// only the areas the party knows of show. Picking one walks the party into it; «Карта мира» goes back.
import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';
import { session } from '../session';
import { areaKnown, areasOf } from '../core/places';
import { onKey } from '../ui/keys';
import { synth } from '../audio/Synth';
import { WESTERN } from './LoadingScene';

const PLAN_W = 1100;
const PLAN_H = 600;

export class TownScene extends Phaser.Scene {
  private loc = '';

  constructor() {
    super('Town');
  }

  create(data: { loc: string }): void {
    const s = session();
    const g = s.game!;
    const loc = g.content.locations[data.loc];
    if (!loc) return void this.scene.stop();
    this.loc = data.loc;
    s.setModal(true);
    const x0 = (GAME_W - PLAN_W) / 2;
    const y0 = (GAME_H - PLAN_H) / 2 - 20;
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0d0806, 0.78).setOrigin(0).setInteractive(); // swallows clicks on the chart
    const key = `townplan_${data.loc}`;
    if (this.textures.exists(key)) this.add.image(x0, y0, key).setOrigin(0).setDisplaySize(PLAN_W, PLAN_H);
    else this.add.rectangle(x0, y0, PLAN_W, PLAN_H, 0xd8bf8e).setOrigin(0);
    this.add
      .text(GAME_W / 2, y0 + 38, loc.name.toUpperCase(), { fontFamily: WESTERN, fontSize: '46px', color: '#2a160a', stroke: '#e8d3a4', strokeThickness: 4 })
      .setOrigin(0.5);

    const known = areasOf(loc).filter((a) => areaKnown(a, g.state.flags, (c) => g.testAll(c)));
    known.forEach((a, i) => {
      const px = x0 + a.at[0] * PLAN_W;
      const py = y0 + a.at[1] * PLAN_H;
      const pin = this.add.circle(px, py, 9, 0xa8321e).setStrokeStyle(2, 0x2a160a);
      this.tweens.add({ targets: pin, scale: 1.35, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.pick(px, py + 34, `${i + 1}. ${a.name}`, () => this.enter(a.map));
    });
    this.pick(x0 + PLAN_W - 150, y0 + PLAN_H - 34, 'КАРТА МИРА', () => this.close());
    onKey(this, (e) => {
      const n = Number(e.key);
      if (n >= 1 && n <= known.length) this.enter(known[n - 1].map);
      else if (e.key === 'Escape') this.close();
    });
    // the party walked in (or the chapter moved on): the plan is done
    const off = s.net!.events.on('welcome', (m) => m.map !== 'world' && this.close());
    this.events.once('shutdown', () => off());
    if (this.scene.manager.getScene('Cursor')) this.scene.bringToTop('Cursor');
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__town = { areas: () => known.map((a) => a.map), enter: (map: string) => this.enter(map), close: () => this.close() };
  }

  /** A label on the plan that acts like a button: ink on a paper tab, red when hovered. */
  private pick(x: number, y: number, label: string, onClick: () => void): void {
    const t = this.add
      .text(x, y, label.toUpperCase(), { fontFamily: WESTERN, fontSize: '20px', color: '#2a160a', backgroundColor: '#e8d3a4', padding: { x: 10, y: 4 } })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: false });
    t.on('pointerover', () => t.setColor('#a8321e'));
    t.on('pointerout', () => t.setColor('#2a160a'));
    t.on('pointerdown', () => {
      synth.start();
      synth.click();
      onClick();
    });
  }

  private enter(map: string): void {
    session().send({ t: 'enter', loc: this.loc, area: map });
    this.close();
  }

  private close(): void {
    if (!this.scene.isActive()) return;
    session().setModal(false);
    delete (window as unknown as Record<string, unknown>).__town;
    this.scene.stop();
  }
}
