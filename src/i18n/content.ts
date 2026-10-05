import en from './en.json';
import es from './es.json';
import zhHans from './zh-Hans.json';

export type Locale = 'ru' | 'en' | 'es' | 'zh-Hans';
export type TranslationCatalog = Record<string, { ru: string; en?: string; es?: string; 'zh-Hans'?: string; draft?: boolean }>;
const catalogs: Record<Exclude<Locale, 'ru'>, TranslationCatalog> = { en, es, 'zh-Hans': zhHans };

/** Translate display strings without changing ids, effects, conditions or save data. */
export function localizedContent<T>(source: T, locale: Locale, catalog?: TranslationCatalog): T {
  if (locale === 'ru') return source;
  const copy = structuredClone(source);
  for (const [path, entry] of Object.entries(catalog ?? catalogs[locale])) {
    const { ru } = entry;
    const translated = entry[locale];
    if (!translated) continue;
    const parts = path.slice(1).split('/').map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'));
    let parent: Record<string, unknown> | undefined = copy as Record<string, unknown>;
    for (const part of parts.slice(0, -1)) {
      const child: unknown = parent?.[part];
      parent = child && typeof child === 'object' ? child as Record<string, unknown> : undefined;
    }
    const key = parts.at(-1)!;
    if (parent?.[key] === ru) parent[key] = translated;
  }
  return copy;
}
