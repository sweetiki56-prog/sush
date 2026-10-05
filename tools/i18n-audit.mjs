// Inventory Russian content and validate each reviewed translation catalog.
// Run: node tools/i18n-audit.mjs [--extract|--strict] [--locale=en|es|zh-Hans].
// Russian JSON remains the source. A single locale can pass independently.
import { readFileSync, readdirSync } from 'node:fs';

const ROOT = 'src/content';
const cyrillic = /[А-Яа-яЁё]/;
const pointer = (parts) => '/' + parts.map((part) => String(part).replaceAll('~', '~0').replaceAll('/', '~1')).join('/');
const source = {};

function collect(value, path) {
  if (typeof value === 'string') {
    if (cyrillic.test(value)) source[pointer(path)] = value;
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) collect(child, [...path, key]);
}

for (const file of readdirSync(ROOT).filter((name) => name.endsWith('.json')).sort()) {
  collect(JSON.parse(readFileSync(`${ROOT}/${file}`, 'utf8')), [file.slice(0, -5)]);
}
// Match the actual spread order in content/index.ts. A few legacy dialogue ids
// occur in more than one file, and only the last one is live in the game.
const index = readFileSync(`${ROOT}/index.ts`, 'utf8');
const imports = Object.fromEntries([...index.matchAll(/import (\w+) from '\.\/dialogues\/([^']+\.json)';/g)].map(([, name, file]) => [name, file]));
const spread = index.match(/dialogues:\s*\{([^}]+)\}/)?.[1] ?? '';
const dialogues = {};
for (const [, name] of spread.matchAll(/\.\.\.(\w+)/g)) {
  const file = imports[name];
  if (file) Object.assign(dialogues, JSON.parse(readFileSync(`${ROOT}/dialogues/${file}`, 'utf8')));
}
collect(dialogues, ['dialogues']);

const localeArg = process.argv.find((arg) => arg.startsWith('--locale='))?.slice('--locale='.length);
const locales = ['en', 'es', 'zh-Hans'];
if (localeArg && !locales.includes(localeArg)) throw new Error(`unknown locale: ${localeArg}`);

if (process.argv.includes('--extract')) {
  process.stdout.write(JSON.stringify(source, null, 2) + '\n');
} else {
  const placeholders = (value) => [...value.matchAll(/\{[^{}]*\}/g)].map(([token]) => token).sort().join('|');
  for (const locale of localeArg ? [localeArg] : locales) {
    const catalog = JSON.parse(readFileSync(`src/i18n/${locale}.json`, 'utf8'));
    const stale = [];
    const broken = [];
    const draft = [];
    for (const [key, entry] of Object.entries(catalog)) {
      if (!source[key] || source[key] !== entry.ru) stale.push(key);
      if (!entry[locale] || cyrillic.test(entry[locale]) || placeholders(entry.ru) !== placeholders(entry[locale])) broken.push(key);
      if (entry.draft) draft.push(key);
    }
    const missing = Object.keys(source).filter((key) => !catalog[key]);
    const byGroup = {};
    for (const key of Object.keys(source)) {
      const group = key.split('/')[1];
      const row = (byGroup[group] ??= { source: 0, translated: 0 });
      row.source++;
      if (catalog[key]) row.translated++;
    }
    process.stdout.write(`${locale}: ${Object.keys(catalog).length}/${Object.keys(source).length} source strings covered, ${draft.length} unreviewed drafts\n${JSON.stringify(byGroup, null, 2)}\n`);
    if (stale.length) process.stderr.write(`${locale} stale keys/source: ${stale.join(', ')}\n`);
    if (broken.length) process.stderr.write(`${locale} broken translation/placeholder: ${broken.join(', ')}\n`);
    if (missing.length && process.argv.includes('--strict')) process.stderr.write(`${locale} missing ${missing.length} keys: ${missing.join(', ')}\n`);
    if (stale.length || broken.length || (process.argv.includes('--strict') && (draft.length || missing.length))) process.exitCode = 1;
  }
}
