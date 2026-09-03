import fs from 'node:fs/promises';
import ts from 'typescript';

const file = new URL('../src/app/i18n/translations.ts', import.meta.url);
const source = await fs.readFile(file, 'utf8');
let ast = ts.createSourceFile(file.pathname, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

function objectFor(name) {
  for (const statement of ast.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (declaration.name.getText(ast) !== name || !declaration.initializer) continue;
      let node = declaration.initializer;
      if (ts.isAsExpression(node)) node = node.expression;
      if (!ts.isObjectLiteralExpression(node)) throw new Error(`${name} is not an object literal`);
      return node;
    }
  }
  throw new Error(`Unable to find ${name}`);
}

function entries(node) {
  const result = new Map();
  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const key = property.name.text;
    if (typeof key !== 'string') continue;
    if (!ts.isStringLiteral(property.initializer) && !ts.isNoSubstitutionTemplateLiteral(property.initializer)) continue;
    result.set(key, property.initializer.text);
  }
  return result;
}

const english = entries(objectFor('en'));
const targets = [
  ['el', 'el'],
  ['fi', 'fi'],
  ['pl', 'pl'],
  ['pt', 'pt-PT'],
];

function batches(items, maxLength = 1) {
  const result = [];
  let current = [];
  for (const item of items) {
    if (current.length >= maxLength) {
      result.push(current);
      current = [];
    }
    current.push(item);
  }
  if (current.length) result.push(current);
  return result;
}

async function translateBatch(batch, target) {
  const html = batch.map(([, value], index) => `<p id="spice-${index}">${value.replaceAll('&', '&amp;').replaceAll('<', '&lt;')}</p>`).join('');
  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', 'en');
  url.searchParams.set('tl', target);
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', html);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Translation request failed (${response.status})`);
  const payload = await response.json();
  const translatedHtml = payload[0].map((part) => part[0]).join('');
  const translated = new Map();
  for (let index = 0; index < batch.length; index += 1) {
    const [key] = batch[index];
    const match = translatedHtml.match(new RegExp(`<p id=["']spice-${index}["']>([\\s\\S]*?)<\\/p>`));
    if (!match) {
      await fs.writeFile(new URL('../.tmp-i18n-response.html', import.meta.url), translatedHtml, 'utf8');
      throw new Error(`Missing translated span for ${key}: ${translatedHtml.slice(0, 500)}`);
    }
    translated.set(key, match[1].replaceAll('&lt;', '<').replaceAll('&amp;', '&').trim());
  }
  return translated;
}

function quote(value) {
  return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'").replaceAll('\r', '').replaceAll('\n', '\\n')}'`;
}

let output = source;
for (const [name, target] of targets) {
  const existing = entries(objectFor(name));
  const missing = [...english].filter(([key]) => !existing.has(key));
  const translated = new Map();
  const groups = batches(missing);
  process.stdout.write(`${name}: translating ${missing.length} keys in ${groups.length} batches\n`);
  for (let index = 0; index < groups.length; index += 10) {
    const translatedGroups = await Promise.all(groups.slice(index, index + 10).map((group) => translateBatch(group, target)));
    for (const values of translatedGroups) for (const entry of values) translated.set(...entry);
    process.stdout.write(`${name}: ${Math.min(index + 10, groups.length)}/${groups.length}\r`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  process.stdout.write('\n');

  const object = objectFor(name);
  const insertAt = object.getEnd() - 1;
  const addition = `\n  // Generated baseline; canonical SPICE terminology is reviewed below through explicit overrides.\n${[...translated].map(([key, value]) => `  ${quote(key)}: ${quote(value)},`).join('\n')}\n`;
  output = output.slice(0, insertAt) + addition + output.slice(insertAt);

  // Reparse after each insertion so subsequent offsets remain correct.
  await fs.writeFile(file, output, 'utf8');
  const reparsed = ts.createSourceFile(file.pathname, output, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  ast = reparsed;
}

await fs.writeFile(file, output, 'utf8');
