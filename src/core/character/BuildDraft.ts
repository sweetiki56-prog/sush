// Mutable character-creation draft: enforces point budget, tag and trait limits.
// The creation screen only renders it and forwards clicks.
import {
  ATTRS,
  ATTR_MAX,
  ATTR_MIN,
  ATTR_START,
  FREE_POINTS,
  LOOKS,
  MAX_TRAITS,
  NAME_MAX,
  TAG_COUNT,
  type AttrId,
  type Attrs,
  type CharacterContent,
  type CharacterData,
  type PremadeDef,
  type SkillId,
} from './defs';

export class BuildDraft {
  name = '';
  look = 0;
  attrs: Attrs;
  tags: SkillId[] = [];
  traits: string[] = [];

  constructor(private content: CharacterContent) {
    this.attrs = BuildDraft.baseAttrs();
  }

  static baseAttrs(): Attrs {
    return Object.fromEntries(ATTRS.map((a) => [a, ATTR_START])) as Attrs;
  }

  get pointsLeft(): number {
    return ATTRS.length * ATTR_START + FREE_POINTS - ATTRS.reduce((s, a) => s + this.attrs[a], 0);
  }

  inc(a: AttrId): boolean {
    if (this.pointsLeft <= 0 || this.attrs[a] >= ATTR_MAX) return false;
    this.attrs[a]++;
    return true;
  }

  dec(a: AttrId): boolean {
    if (this.attrs[a] <= ATTR_MIN) return false;
    this.attrs[a]--;
    return true;
  }

  toggleTag(s: SkillId): boolean {
    const i = this.tags.indexOf(s);
    if (i >= 0) this.tags.splice(i, 1);
    else if (this.tags.length < TAG_COUNT) this.tags.push(s);
    else return false;
    return true;
  }

  toggleTrait(t: string): boolean {
    if (!this.content.traits[t]) return false;
    const i = this.traits.indexOf(t);
    if (i >= 0) this.traits.splice(i, 1);
    else if (this.traits.length < MAX_TRAITS) this.traits.push(t);
    else return false;
    return true;
  }

  setName(name: string): void {
    this.name = name.slice(0, NAME_MAX);
  }

  cycleLook(step: number): void {
    this.look = (this.look + step + LOOKS) % LOOKS;
  }

  applyPremade(p: PremadeDef): void {
    this.name = p.name;
    this.look = p.look;
    this.attrs = { ...p.attrs };
    this.tags = [...p.tags];
    this.traits = [...p.traits];
  }

  reset(): void {
    this.attrs = BuildDraft.baseAttrs();
    this.tags = [];
    this.traits = [];
  }

  /** Why the draft cannot be finished yet, or null when it is ready. */
  problem(): string | null {
    if (this.pointsLeft > 0) return `Распределите очки характеристик: осталось ${this.pointsLeft}.`;
    if (this.tags.length < TAG_COUNT) return `Отметьте основные навыки: ${this.tags.length} из ${TAG_COUNT}.`;
    if (!this.name.trim()) return 'Введите имя.';
    return null;
  }

  /** The character sheet this draft describes (valid or not), at level 1. */
  preview(): CharacterData {
    return {
      name: this.name.trim(),
      look: this.look,
      attrs: { ...this.attrs },
      tags: [...this.tags],
      traits: [...this.traits],
      perks: [],
      level: 1,
      xp: 0,
      skillPoints: 0,
      perkPoints: 0,
      spent: {},
    };
  }

  build(): CharacterData {
    const p = this.problem();
    if (p) throw new Error(p);
    return this.preview();
  }
}
