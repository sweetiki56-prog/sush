// Derived stats (HP, AP, sequence, crit, skill points per level) with hover explanations.
import Phaser from 'phaser';
import * as Ch from '../../core/character/Character';
import type { CharacterContent, CharacterData } from '../../core/character/defs';
import { C, glass, hitRow, title, txt } from '../theme';
import type { InfoCard } from './InfoCard';

const ROWS: { name: string; desc: string; value: (c: CharacterData, k: CharacterContent) => string }[] = [
  { name: 'Очки здоровья', desc: '15 + Сила + 2×Выносливость. С каждым уровнем растут на 3 + половину Выносливости.', value: (c, k) => String(Ch.maxHp(c, k)) },
  { name: 'Очки действия', desc: '5 + половина Ловкости. В бою каждый шаг стоит 1 ОД, выстрел из винтовки 5 ОД.', value: (c, k) => String(Ch.maxAp(c, k)) },
  { name: 'Порядок хода', desc: '2×Восприятие. Кто выше, тот ходит в бою первым.', value: (c, k) => String(Ch.sequence(c, k)) },
  { name: 'Шанс крита', desc: 'Равен Удаче. Критическое попадание наносит двойной урон.', value: (c, k) => `${Ch.critChance(c, k)}%` },
  { name: 'Очков навыков за уровень', desc: '5 + 2×Интеллект.', value: (c, k) => String(Ch.skillPointsPerLevel(c, k)) },
];

export class DerivedPanel {
  private vals: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, x: number, y: number, w: number, info: InfoCard) {
    parent.add([glass(scene, x, y, w, 40 + ROWS.length * 22), title(scene, x + 14, y + 12, 'ПОКАЗАТЕЛИ', 11, C.amber)]);
    ROWS.forEach((r, i) => {
      const ry = y + 36 + i * 22;
      parent.add(hitRow(scene, x + 6, ry - 2, w - 12, 20, () => info.show(r.name, r.desc)));
      parent.add(txt(scene, x + 16, ry, r.name, 13, C.crt));
      const v = txt(scene, x + w - 16, ry, '', 13, C.crtBright, undefined, true).setOrigin(1, 0);
      parent.add(v);
      this.vals.push(v);
    });
  }

  update(c: CharacterData, k: CharacterContent): void {
    ROWS.forEach((r, i) => this.vals[i].setText(r.value(c, k)));
  }
}
