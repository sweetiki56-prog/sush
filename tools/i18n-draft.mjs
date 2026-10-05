// Fill missing content translations as machine-assisted drafts. Existing reviewed
// entries are never overwritten. Run the audit and edit prose before release.
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const extracted = spawnSync(process.execPath, ['tools/i18n-audit.mjs', '--extract'], { encoding: 'utf8' });
if (extracted.status !== 0) throw new Error(extracted.stderr);
const source = JSON.parse(extracted.stdout);
const locale = process.argv[2];
if (!['en', 'es', 'zh-Hans'].includes(locale)) throw new Error('Usage: node tools/i18n-draft.mjs en|es|zh-Hans');
const file = `src/i18n/${locale}.json`;
const catalog = JSON.parse(readFileSync(file, 'utf8'));
const missing = Object.entries(source).filter(([path]) => !catalog[path]);
const cache = new Map(Object.values(catalog).map((entry) => [entry.ru, entry[locale]]));
const placeholders = (value) => [...value.matchAll(/\{[^{}]*\}/g)].map(([token]) => token).sort().join('|');
const queue = [...new Set(missing.map(([, ru]) => ru))].filter((ru) => !cache.has(ru));
let cursor = 0;
let done = 0;
let failures = 0;
let rateLimited = false;

async function translate(ru) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const url = new URL('https://translate.googleapis.com/translate_a/single');
      url.search = new URLSearchParams({ client: 'gtx', sl: 'ru', tl: locale === 'zh-Hans' ? 'zh-CN' : locale, dt: 't', q: ru }).toString();
      const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (response.status === 429) {
        rateLimited = true;
        return null;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.json();
      const result = body[0].map((part) => part[0]).join('').trim();
      if (!result || /[А-Яа-яЁё]/.test(result) || placeholders(ru) !== placeholders(result)) throw new Error('script or placeholder mismatch');
      return result;
    } catch (error) {
      if (attempt === 2) {
        failures++;
        process.stderr.write(`Could not translate ${JSON.stringify(ru.slice(0, 80))}: ${error}\n`);
        return null;
      }
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  return null;
}

await Promise.all(Array.from({ length: 4 }, async () => {
  while (cursor < queue.length && !rateLimited) {
    const ru = queue[cursor++];
    const translated = await translate(ru);
    if (translated) cache.set(ru, translated);
    done++;
    if (done % 100 === 0) process.stderr.write(`${locale}: ${done}/${queue.length} unique strings drafted (${failures} failed)\n`);
  }
}));

for (const [path, ru] of missing) {
  const translated = cache.get(ru);
  if (translated) catalog[path] = { ru, [locale]: translated, draft: true };
}
writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`);
process.stderr.write(`${locale}: ${Object.keys(catalog).length}/${Object.keys(source).length}; ${failures} failed${rateLimited ? '; service rate-limited' : ''}\n`);
if (failures || rateLimited) process.exitCode = 1;
