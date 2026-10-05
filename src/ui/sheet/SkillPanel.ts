// Ten skills. Modes: 'tag' (creation: click marks a main skill), 'spend' (level-up: − / +), 'view'.
import Phaser from 'phaser';
import { SKILLS, type CharacterContent, type SkillId } from '../../core/character/defs';
import { settings } from '../../core/Settings';
import { skillName } from '../../i18n/character';
import { uiText } from '../../i18n/ui';
import { C, glass, glyphButton, hitRow, title, txt } from '../theme';
import type { InfoCard } from './InfoCard';

const ROW = 34;
export type SkillMode = 'tag' | 'spend' | 'view';

export class SkillPanel {
  private rows = new Map<SkillId, { mark: Phaser.GameObjects.Text; name: Phaser.GameObjects.Text; val: Phaser.GameObjects.Text; add: Phaser.GameObjects.Text }>();
  private footer: Phaser.GameObjects.Text;
  private locale = settings().language;

  constructor(
    scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
    w: number,
    content: CharacterContent,
    info: InfoCard,
    private mode: SkillMode,
    handlers: { onTag?: (s: SkillId) => void; onSpend?: (s: SkillId, delta: 1 | -1) => void } = {},
  ) {
    const h = 44 + SKILLS.length * ROW + 30;
    const head = uiText(mode === 'tag' ? 'sheet.tagSkills' : 'sheet.skills', this.locale);
    parent.add([glass(scene, x, y, w, h), title(scene, x + 14, y + 12, head, 11, C.amber)]);
    SKILLS.forEach((s, i) => {
      const ry = y + 42 + i * ROW;
      const hit = hitRow(scene, x + 6, ry - 4, w - (mode === 'spend' ? 70 : 12), ROW - 2, () => info.show(skillName(s, this.locale), this.describe(content, s)), mode === 'tag' ? () => handlers.onTag?.(s) : undefined);
      const mark = txt(scene, x + 16, ry, '', 14, C.amber, undefined, true);
      const name = txt(scene, x + 40, ry, skillName(s, this.locale), 14, C.crt);
      const val = txt(scene, x + w - (mode === 'spend' ? 116 : 20), ry - 1, '', 16, C.crtBright, undefined, true).setOrigin(1, 0);
      const add = txt(scene, x + w - (mode === 'spend' ? 112 : 20), ry + 2, '', 12, C.amber);
      parent.add([hit, mark, name, val, add]);
      if (mode === 'spend') {
        parent.add(glyphButton(scene, x + w - 60, ry - 2, '−', () => handlers.onSpend?.(s, -1)).root);
        parent.add(glyphButton(scene, x + w - 34, ry - 2, '+', () => handlers.onSpend?.(s, 1)).root);
      }
      this.rows.set(s, { mark, name, val, add });
    });
    this.footer = txt(scene, x + 16, y + 44 + SKILLS.length * ROW, '', 13, C.amber, w - 32, true);
    parent.add(this.footer);
  }

  private describe(content: CharacterContent, s: SkillId): string {
    const extra = `\n${uiText(this.mode === 'spend' ? 'sheet.spendSkillHelp' : 'sheet.tagSkillHelp', this.locale)}`;
    return content.skills[s] + extra;
  }

  update(values: Record<SkillId, number>, tags: SkillId[], footer: string, pending: Partial<Record<SkillId, number>> = {}): void {
    for (const [s, r] of this.rows) {
      const tagged = tags.includes(s);
      r.mark.setText(tagged ? '■' : this.mode === 'tag' ? '□' : '');
      r.name.setColor(tagged ? C.amber : C.crt);
      r.val.setText(`${values[s]}%`);
      const p = pending[s] ?? 0;
      r.add.setText(p > 0 ? `+${p * (tagged ? 2 : 1)}` : '');
    }
    this.footer.setText(footer);
  }
}
