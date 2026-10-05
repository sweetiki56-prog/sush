// The ending (Chapter IX): slides picked by flags from content/endings.json — one per choice, place, faction and
// companion. A slide shows the first variant whose conditions hold; a slide with none is skipped. Pure: the UI
// only shows what this returns.
import type { Condition } from './types';

export interface EndingVariant {
  if?: Condition[];
  text: string;
}

export interface EndingSlide {
  id: string;
  title: string;
  variants: EndingVariant[];
}

export interface ShownSlide {
  id: string;
  title: string;
  text: string;
  variantIndex: number;
}

/** The slides this game has earned, in the order of the data; {name} is the hero. */
export function slidesFor(game: { testAll(c: Condition[] | undefined): boolean; char: { name: string } }, slides: EndingSlide[]): ShownSlide[] {
  const out: ShownSlide[] = [];
  for (const s of slides) {
    const variantIndex = s.variants.findIndex((x) => game.testAll(x.if));
    if (variantIndex >= 0) out.push({ id: s.id, title: s.title, text: s.variants[variantIndex].text.replaceAll('{name}', game.char.name), variantIndex });
  }
  return out;
}
