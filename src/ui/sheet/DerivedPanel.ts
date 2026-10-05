// Derived stats (HP, AP, sequence, crit, skill points per level) with hover explanations.
import Phaser from 'phaser';
import * as Ch from '../../core/character/Character';
import type { CharacterContent, CharacterData } from '../../core/character/defs';
import { C, glass, hitRow, title, txt } from '../theme';
import type { InfoCard } from './InfoCard';
import { settings } from '../../core/Settings';
import { uiText, type UiKey } from '../../i18n/ui';

const ROWS: { name: UiKey; desc: UiKey; value: (c: CharacterData, k: CharacterContent) => string }[] = [
  { name: 'sheet.hp', desc: 'sheet.hpDesc', value: (c, k) => String(Ch.maxHp(c, k)) },
  { name: 'sheet.ap', desc: 'sheet.apDesc', value: (c, k) => String(Ch.maxAp(c, k)) },
  { name: 'sheet.sequence', desc: 'sheet.sequenceDesc', value: (c, k) => String(Ch.sequence(c, k)) },
  { name: 'sheet.crit', desc: 'sheet.critDesc', value: (c, k) => `${Ch.critChance(c, k)}%` },
  { name: 'sheet.skillPoints', desc: 'sheet.skillPointsDesc', value: (c, k) => String(Ch.skillPointsPerLevel(c, k)) },
];

export class DerivedPanel {
  private vals: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, x: number, y: number, w: number, info: InfoCard) {
    const locale = settings().language;
    parent.add([glass(scene, x, y, w, 40 + ROWS.length * 22), title(scene, x + 14, y + 12, uiText('sheet.derived', locale), 11, C.amber)]);
    ROWS.forEach((r, i) => {
      const ry = y + 36 + i * 22;
      parent.add(hitRow(scene, x + 6, ry - 2, w - 12, 20, () => info.show(uiText(r.name, locale), uiText(r.desc, locale))));
      parent.add(txt(scene, x + 16, ry, uiText(r.name, locale), 13, C.crt));
      const v = txt(scene, x + w - 16, ry, '', 13, C.crtBright, undefined, true).setOrigin(1, 0);
      parent.add(v);
      this.vals.push(v);
    });
  }

  update(c: CharacterData, k: CharacterContent): void {
    ROWS.forEach((r, i) => this.vals[i].setText(r.value(c, k)));
  }
}
