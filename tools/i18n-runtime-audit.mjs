// Inventory Russian literals in executable TypeScript, including interpolated
// messages. Content JSON is audited separately by i18n-audit.mjs.
import { readFileSync, readdirSync } from 'node:fs';
import ts from 'typescript';

const cyrillic = /[А-Яа-яЁё]/;
const source = {};

function visitDirectory(directory) {
  for (const name of readdirSync(directory, { withFileTypes: true })) {
    const path = `${directory}/${name.name}`;
    if (name.isDirectory()) {
      if (name.name !== 'i18n') visitDirectory(path);
      continue;
    }
    if (!path.endsWith('.ts')) continue;
    const file = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
    function walk(node) {
      let text = null;
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) text = node.text;
      if (ts.isTemplateExpression(node)) {
        text = node.head.text + node.templateSpans.map((span, i) => `{${i}}${span.literal.text}`).join('');
      }
      if (text && cyrillic.test(text)) (source[text] ??= []).push(path);
      ts.forEachChild(node, walk);
    }
    walk(file);
  }
}

visitDirectory('src');
if (process.argv.includes('--extract')) process.stdout.write(`${JSON.stringify(source, null, 2)}\n`);
else {
  const count = Object.keys(source).length;
  const byFile = Object.entries(source).flatMap(([text, files]) => files.map((file) => [file, text]));
  const totals = {};
  for (const [file] of byFile) totals[file] = (totals[file] ?? 0) + 1;
  process.stdout.write(`${count} distinct Russian runtime strings in ${Object.keys(totals).length} files\n`);
  for (const [file, n] of Object.entries(totals).sort((a, b) => b[1] - a[1])) process.stdout.write(`${n}\t${file}\n`);
}
