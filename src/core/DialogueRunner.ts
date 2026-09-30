// Walks a dialogue graph: picks the entry node, filters options by conditions,
// resolves skill checks and applies effects through the Game model.
import type { Game } from './Game';
import type { Dialogue, DialogueNode, DialogueOption } from './types';

export interface ShownOption {
  index: number; // index in node.options
  label: string; // text shown to the player, with [Skill NN%] prefix for checks
  option: DialogueOption;
}

export class DialogueRunner {
  nodeId: string | null;
  /** The answers as first shown for this node: the player picks by their number, even if the bag changes meanwhile. */
  private shown: ShownOption[] | null = null;

  constructor(
    private game: Game,
    readonly dialogue: Dialogue,
    readonly id: string,
  ) {
    const entry = dialogue.entry.find((e) => game.testAll(e.if));
    if (!entry) throw new Error(`dialogue ${id}: no entry matches`);
    this.nodeId = null;
    this.enter(entry.node);
  }

  get node(): DialogueNode | null {
    return this.nodeId ? this.dialogue.nodes[this.nodeId] : null;
  }

  /** Node text with {name} filled in. */
  get text(): string {
    return this.node ? this.fill(this.node.text) : '';
  }

  /** {name} is the hero; {f:key} is a flag's value (contract progress and the like). */
  private fill(t: string): string {
    return t.replaceAll('{name}', this.game.char.name).replace(/\{f:([\w-]+)\}/g, (_m, k: string) => String(this.game.flag(k) ?? 0));
  }

  get done(): boolean {
    return this.nodeId === null;
  }

  private enter(id: string | null | undefined): void {
    this.shown = null;
    if (!id) {
      this.nodeId = null;
      return;
    }
    const node = this.dialogue.nodes[id];
    if (!node) throw new Error(`dialogue ${this.id}: missing node ${id}`);
    this.nodeId = id;
    this.game.apply(node.effects);
  }

  options(): ShownOption[] {
    return (this.shown ??= this.visible());
  }

  private visible(): ShownOption[] {
    const node = this.node;
    if (!node) return [];
    return node.options
      .map((option, index) => ({ option, index }))
      .filter(({ option }) => this.game.testAll(option.if))
      .map(({ option, index }) => {
        const c = option.check;
        const text = this.fill(option.text);
        const label = c ? `[${this.game.checkLabel(c)} ${this.game.chance(c, c.mod)}%] ${text}` : text;
        return { index, label, option };
      });
  }

  /** Choose the n-th visible option (0-based). Returns false when the dialogue has ended. */
  choose(visibleIndex: number): boolean {
    const shown = this.options()[visibleIndex];
    if (!shown) return !this.done;
    const { option } = shown;
    // it may no longer hold (the goods left the bag): show the node afresh instead
    if (!this.game.testAll(option.if)) {
      this.shown = null;
      return !this.done;
    }
    this.game.apply(option.effects);
    if (option.check) {
      const c = option.check;
      const res = this.game.check(c, c.mod ?? 0);
      this.game.apply(res.success ? c.passEffects : c.failEffects);
      this.enter(res.success ? c.pass : c.fail);
    } else {
      this.enter(option.next);
    }
    return !this.done;
  }
}
