import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const translationsPath = path.join(root, 'src/app/i18n/translations.ts');
const source = fs.readFileSync(translationsPath, 'utf8');
const ast = ts.createSourceFile(translationsPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const localeNames = ['en', 'el', 'fi', 'pl', 'pt'];

function localeObject(name) {
  for (const statement of ast.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (declaration.name.getText(ast) !== name || !declaration.initializer) continue;
      let node = declaration.initializer;
      if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) node = node.expression;
      if (!ts.isObjectLiteralExpression(node)) throw new Error(`${name} must be an object literal`);
      return node;
    }
  }
  throw new Error(`Locale object ${name} was not found`);
}

function entries(name) {
  const values = new Map();
  const duplicates = [];
  for (const property of localeObject(name).properties) {
    if (!ts.isPropertyAssignment(property) || !ts.isStringLiteralLike(property.initializer)) continue;
    const key = property.name.getText(ast).replace(/^['"]|['"]$/g, '');
    if (values.has(key)) duplicates.push(key);
    values.set(key, property.initializer.text);
  }
  return { values, duplicates };
}

const catalogues = Object.fromEntries(localeNames.map((name) => [name, entries(name)]));
const canonicalKeys = [...catalogues.en.values.keys()].sort();
const failures = [];

function placeholders(value) {
  return [...value.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((match) => match[1]).sort();
}

for (const locale of localeNames) {
  const { values, duplicates } = catalogues[locale];
  const missing = canonicalKeys.filter((key) => !values.has(key));
  const extra = [...values.keys()].filter((key) => !catalogues.en.values.has(key));
  const empty = [...values].filter(([, value]) => !value.trim()).map(([key]) => key);
  const placeholderMismatches = canonicalKeys.filter((key) => {
    const expected = placeholders(catalogues.en.values.get(key) || '');
    const actual = placeholders(values.get(key) || '');
    return expected.join('|') !== actual.join('|');
  });
  if (duplicates.length) failures.push(`${locale}: duplicate keys: ${duplicates.join(', ')}`);
  if (missing.length) failures.push(`${locale}: missing keys: ${missing.join(', ')}`);
  if (extra.length) failures.push(`${locale}: extra keys: ${extra.join(', ')}`);
  if (empty.length) failures.push(`${locale}: empty values: ${empty.join(', ')}`);
  if (placeholderMismatches.length) failures.push(`${locale}: interpolation placeholder mismatch: ${placeholderMismatches.join(', ')}`);
}

const greekTransliteration = /\b(?:Den|Dokimaste|Trexousa|Olokliromeno|Vrethikan|Parakalo|Syndetheite|Apothikefsi|Akyr(?:o|osi))\b/i;
const transliteratedGreek = [...catalogues.el.values]
  .filter(([, value]) => greekTransliteration.test(value))
  .map(([key]) => key);
if (transliteratedGreek.length) failures.push(`el: transliterated Greek found in: ${transliteratedGreek.join(', ')}`);

const config = fs.readFileSync(path.join(root, 'src/app/i18n/config.ts'), 'utf8');
if (!config.includes("['en', 'el', 'fi', 'pl', 'pt']")) failures.push('Central locale config must expose exactly en, el, fi, pl, pt.');
if (!config.includes("pt-PT")) failures.push('Portuguese formatting must use European Portuguese (pt-PT).');

const sourceFiles = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(fullPath);
    else if (/\.(ts|tsx)$/.test(entry.name) && !fullPath.endsWith('translations.ts')) sourceFiles.push(fullPath);
  }
}
walk(path.join(root, 'src/app'));

const rawStatusPattern = /\.replace\(\s*\/[^\n]*_.*(?:toUpperCase|toLowerCase|charAt)/;
const rawStatusFiles = sourceFiles.filter((file) => rawStatusPattern.test(fs.readFileSync(file, 'utf8')));
if (rawStatusFiles.length) failures.push(`Raw enum formatting found in: ${rawStatusFiles.map((file) => path.relative(root, file)).join(', ')}`);

const referencedKeys = new Set();
const unknownKeyReferences = [];
const hardCodedUiStrings = [];
const legacyFiles = new Set(['AIAgentPage.tsx', 'ChatbotPage.tsx', 'ForumPage.tsx', 'SetupPage.tsx', 'SpiceHeader.tsx', 'StartPage.tsx']);
const intentionalLiteral = /^(?:U|SPICE|SPICEBOT|USERWAY|SPICE Digital Toolkit|Thessaloniki|Parko Kritis|name@example\.com|facilitator@example\.org|privacy@spice-toolkit\.eu)$/;
for (const file of sourceFiles) {
  const fileSource = fs.readFileSync(file, 'utf8');
  const fileAst = ts.createSourceFile(file, fileSource, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && ['t', 'tp'].includes(node.expression.text)) {
      const argument = node.arguments[0];
      if (argument && (ts.isStringLiteralLike(argument) || (ts.isNoSubstitutionTemplateLiteral(argument)))) {
        const key = argument.text;
        referencedKeys.add(key);
        if (!catalogues.en.values.has(key)) {
          const position = fileAst.getLineAndCharacterOfPosition(argument.getStart(fileAst));
          unknownKeyReferences.push(`${path.relative(root, file)}:${position.line + 1} -> ${key}`);
        }
      }
    }
    if (!legacyFiles.has(path.basename(file))) {
      if (ts.isJsxText(node)) {
        const value = node.text.replace(/\s+/g, ' ').trim();
        if (/[A-Za-zÀ-žΑ-ω]/.test(value) && !intentionalLiteral.test(value)) {
          const position = fileAst.getLineAndCharacterOfPosition(node.getStart(fileAst));
          hardCodedUiStrings.push(`${path.relative(root, file)}:${position.line + 1} -> ${value}`);
        }
      }
      if (ts.isJsxAttribute(node) && ['placeholder', 'title', 'aria-label', 'alt'].includes(node.name.text) && node.initializer && ts.isStringLiteral(node.initializer)) {
        const value = node.initializer.text.trim();
        if (/[A-Za-zÀ-žΑ-ω]/.test(value) && !intentionalLiteral.test(value)) {
          const position = fileAst.getLineAndCharacterOfPosition(node.getStart(fileAst));
          hardCodedUiStrings.push(`${path.relative(root, file)}:${position.line + 1} -> ${node.name.text}="${value}"`);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(fileAst);
}
if (unknownKeyReferences.length) failures.push(`Unknown literal translation keys:\n  ${unknownKeyReferences.join('\n  ')}`);
if (hardCodedUiStrings.length) failures.push(`Hard-coded JSX interface strings:\n  ${hardCodedUiStrings.join('\n  ')}`);

if (failures.length) {
  console.error(`i18n audit failed (${failures.length} issue${failures.length === 1 ? '' : 's'}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`i18n audit passed: ${localeNames.length} locales, ${canonicalKeys.length} keys per locale, ${referencedKeys.size} statically referenced keys, no empty or mismatched catalogue entries.`);
