// Russian number agreement for the few counted words the game prints.

/** 1 капля, 2 капли, 5 капель (the currency: Trust tokens stamped with a drop). */
export function drops(n: number): string {
  const a = Math.abs(n);
  if (a % 10 === 1 && a % 100 !== 11) return 'капля';
  if (a % 10 >= 2 && a % 10 <= 4 && (a % 100 < 12 || a % 100 > 14)) return 'капли';
  return 'капель';
}

/** A name inside a sentence: «Шайка «Жажды»» → «шайка «Жажды»» (only the first letter drops). */
export function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/** How many people, in words: двое, трое… (a number past ten stays a number). */
export function people(n: number): string {
  return ['никого', 'один', 'двое', 'трое', 'четверо', 'пятеро', 'шестеро', 'семеро', 'восьмеро', 'девятеро', 'десятеро'][n] ?? String(n);
}
