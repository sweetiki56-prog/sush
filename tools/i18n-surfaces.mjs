// Read-only inventory of Russian text outside the content catalogs. This is an
// inventory, not a release gate: Russian source strings remain in the game core.
import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';

const cyrillic = /[А-Яа-яЁё]/;
const groups = { runtime: {}, maps: {}, mapBuilders: {}, art: {}, metadata: {} };
const pointer = (parts) => '/' + parts.map((part) => String(part).replaceAll('~', '~0').replaceAll('/', '~1')).join('/');

const runtime = spawnSync(process.execPath, ['tools/i18n-runtime-audit.mjs', '--extract'], { encoding: 'utf8' });
if (runtime.status !== 0) throw new Error(runtime.stderr);
Object.assign(groups.runtime, JSON.parse(runtime.stdout));

function collect(value, parts, output) {
  if (typeof value === 'string') {
    if (cyrillic.test(value)) output[pointer(parts)] = value;
    return;
  }
  if (value && typeof value === 'object')
    for (const [key, child] of Object.entries(value)) collect(child, [...parts, key], output);
}

for (const file of readdirSync('public/assets/maps').filter((name) => name.endsWith('.json'))) {
  const map = JSON.parse(readFileSync(`public/assets/maps/${file}`, 'utf8'));
  const id = map.id ?? file.slice(0, -5);
  collect(map.name, [id, 'name'], groups.maps);
  for (const field of ['objects', 'actors', 'triggers', 'exits', 'cleared', 'arrive']) {
    for (const [index, entity] of (map[field] ?? []).entries()) {
      const entityId = entity.id ?? entity.group ?? String(index);
      for (const [key, value] of Object.entries(entity)) {
        if (['id', 'group', 'frame', 'sheet', 'dialogue', 'creature'].includes(key)) continue;
        collect(value, [id, field, entityId, key], groups.maps);
      }
    }
  }
}
collect(JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8')), ['manifest'], groups.metadata);
for (const [line, value] of readFileSync('index.html', 'utf8').split(/\r?\n/).entries())
  if (cyrillic.test(value)) groups.metadata[`/index.html/${line + 1}`] = value.trim();

function scan(directory, output, predicate = () => true) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) { scan(path, output, predicate); continue; }
    if (!entry.name.endsWith('.mjs') || !predicate(path)) continue;
    const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    function walk(node) {
      if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && cyrillic.test(node.text))
        output[`${path}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}`] = node.text;
      ts.forEachChild(node, walk);
    }
    walk(source);
  }
}
scan('tools/art', groups.art);
scan('tools', groups.mapBuilders, (path) => /^tools\/(build-|map-kit|hostage-hooks)/.test(path));

if (process.argv.includes('--extract')) process.stdout.write(`${JSON.stringify(groups, null, 2)}\n`);
else for (const [group, entries] of Object.entries(groups))
  process.stdout.write(`${group}: ${Object.keys(entries).length} Russian text locations, ${new Set(Object.values(entries)).size} distinct strings\n`);
