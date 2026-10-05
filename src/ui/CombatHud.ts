// Combat console: AP lamps, weapon slot, end-turn button and the turn order strip.
import Phaser from 'phaser';
import { GAME_H, GAME_W, HUD_H } from '../config';
import { session } from '../session';
import type { CombatView } from '../world/CombatView';
import { C, button, metalPanel, txt, type Button } from './theme';
import { settings } from '../core/Settings';

const X = 950;
const Y = GAME_H - HUD_H;

export class CombatHud {
  private root: Phaser.GameObjects.Container;
  private lamps: Phaser.GameObjects.Rectangle[] = [];
  private weapon: Button;
  private end: Button;
  private info: Phaser.GameObjects.Text;
  private order: Phaser.GameObjects.Container;
  private view: CombatView | null = null;
  private shownSec = -1;

  constructor(private scene: Phaser.Scene) {
    const s = scene;
    this.root = s.add.container(0, 0).setDepth(15).setVisible(false);
    // the panel covers the normal HUD buttons; swallow clicks that miss our own buttons
    this.root.add(s.add.rectangle(X, Y, GAME_W - X, HUD_H, 0, 0).setOrigin(0).setInteractive());
    this.root.add(metalPanel(s, X, Y, GAME_W - X, HUD_H));
    this.root.add(txt(s, X + 14, Y + 10, settings().language === 'en' ? 'AP' : 'ОД', 12, C.amber, undefined, true));
    for (let i = 0; i < 12; i++) {
      const l = s.add.rectangle(X + 44 + i * 22, Y + 12, 16, 12, 0x1f3b22).setOrigin(0).setStrokeStyle(1, 0x3f7a3a);
      this.lamps.push(l);
      this.root.add(l);
    }
    this.weapon = button(s, X + 12, Y + 34, 306, 30, '', () => session().send({ t: 'swapWeapon' }));
    this.end = button(s, X + 12, Y + 72, 306, 30, settings().language === 'en' ? 'END TURN [SPACE]' : 'КОНЕЦ ХОДА [ПРОБЕЛ]', () => session().send({ t: 'endTurn' }));
    this.info = txt(s, X + 14, Y + 106, '', 11, C.crtDim);
    this.root.add([this.weapon.root, this.end.root, this.info]);
    this.order = s.add.container(0, 0).setDepth(15);
  }

  update(v: CombatView | null): void {
    this.view = v;
    this.shownSec = -1;
    this.root.setVisible(!!v);
    this.order.removeAll(true);
    if (!v) return;
    this.lamps.forEach((l, i) => {
      l.setVisible(i < v.maxAp);
      l.setFillStyle(i < v.ap ? (v.playerTurn ? 0x7ad36a : 0x3f7a3a) : 0x16261a);
    });
    const locale = settings().language;
    const ammo = v.ammo === null ? '' : locale === 'en' ? ` · ${v.ammo} rounds` : ` · ${v.ammo} патр.`;
    this.weapon.label.setText(`${v.weaponName.toUpperCase()} · ${v.cost} ${locale === 'en' ? 'AP' : 'ОД'}${ammo} [F]`);
    this.weapon.setEnabled(v.playerTurn);
    this.end.setEnabled(v.playerTurn);
    this.tick();
    // turn order strip along the top right (the quest tracker owns the top left)
    const w = 150;
    const x0 = GAME_W - 12 - v.order.length * (w + 8);
    v.order.forEach((u, i) => {
      const x = x0 + i * (w + 8);
      const col = u.friend ? 0x7ad36a : 0xd0602a;
      const g = this.scene.add.graphics();
      g.fillStyle(0x120d0a, 0.8).fillRect(x, 8, w, 34);
      g.lineStyle(u.current ? 2 : 1, u.current ? 0xf0a040 : 0x3f7a3a, 1).strokeRect(x, 8, w, 34);
      g.fillStyle(0x16261a, 1).fillRect(x + 6, 30, w - 12, 6);
      g.fillStyle(col, 1).fillRect(x + 6, 30, Math.max(0, ((w - 12) * u.hp) / u.maxHp), 6);
      this.order.add([g, txt(this.scene, x + 6, 11, `${u.name} ${u.hp}/${u.maxHp}`, 11, u.current ? C.amber : C.crt, w - 12)]);
    });
  }

  /** Turn line with the countdown, refreshed once a second. */
  tick(): void {
    const v = this.view;
    if (!v) return;
    const sec = v.deadline === null ? -1 : Math.max(0, Math.ceil((v.deadline - Date.now()) / 1000));
    if (sec === this.shownSec && this.info.text) return;
    this.shownSec = sec;
    const locale = settings().language;
    const line = v.aiming ? `${v.aiming}: ${locale === 'en' ? 'select a tile (right-click to cancel)' : 'выберите клетку (ПКМ — отмена)'}` : v.whose;
    this.info.setText(sec >= 0 ? `${line} · ${sec} ${locale === 'en' ? 's' : 'с'}` : line);
  }
}
