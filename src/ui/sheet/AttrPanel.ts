// Seven attributes: value, rating word, optional − / + for character creation.
import Phaser from 'phaser';
import { ATTRS, type AttrId, type Attrs, type CharacterContent } from '../../core/character/defs';
import { settings } from '../../core/Settings';
import { attrName, attrWord } from '../../i18n/character';
import { uiText } from '../../i18n/ui';
import { C, glass, glyphButton, hitRow, title, txt } from '../theme';
import type { InfoCard } from './InfoCard';

const ROW = 30;

export class AttrPanel {
  private values = new Map<AttrId, [Phaser.GameObjects.Text, Phaser.GameObjects.Text]>();
  private points: Phaser.GameObjects.Text | null = null;
  private locale = settings().language;

  constructor(
    scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
    w: number,
    content: CharacterContent,
    info: InfoCard,
    onChange?: (a: AttrId, delta: 1 | -1) => void,
  ) {
    const h = 44 + ATTRS.length * ROW + (onChange ? 30 : 0);
    parent.add([glass(scene, x, y, w, h), title(scene, x + 14, y + 12, uiText('sheet.attrs', this.locale), 11, C.amber)]);
    ATTRS.forEach((a, i) => {
      const ry = y + 40 + i * ROW;
      const hit = hitRow(scene, x + 6, ry - 3, w - 12, ROW - 2, () => info.show(attrName(a, this.locale), content.attrs[a]));
      const name = txt(scene, x + 16, ry, attrName(a, this.locale), 14, C.crt);
      const val = txt(scene, x + w - (onChange ? 150 : 110), ry - 2, '', 18, C.crtBright, undefined, true).setOrigin(1, 0);
      const word = txt(scene, x + w - (onChange ? 142 : 100), ry + 1, '', 12, C.crtDim);
      parent.add([hit, name, val, word]);
      if (onChange) {
        parent.add(glyphButton(scene, x + w - 60, ry - 1, '−', () => onChange(a, -1)).root);
        parent.add(glyphButton(scene, x + w - 34, ry - 1, '+', () => onChange(a, 1)).root);
      }
      this.values.set(a, [val, word]);
    });
    if (onChange) {
      this.points = txt(scene, x + 16, y + 44 + ATTRS.length * ROW, '', 14, C.amber, undefined, true);
      parent.add(this.points);
    }
  }

  /** footer: points left in the dossier, or any line (the arena has no budget). */
  update(eff: Attrs, footer?: number | string): void {
    for (const [a, [val, word]] of this.values) {
      val.setText(String(eff[a]));
      word.setText(attrWord(eff[a], this.locale));
    }
    this.points?.setText(typeof footer === 'string' ? footer : uiText('sheet.freePoints', this.locale).replace('{count}', String(footer ?? 0)));
  }
}
