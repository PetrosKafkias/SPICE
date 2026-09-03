import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceFile = path.join(root, 'src', 'app', 'data', 'pilotSiteDetails.ts');
const outputDir = path.join(root, 'src', 'app', 'data', 'localized');
const targets = [['el', 'el'], ['fi', 'fi'], ['pl', 'pl'], ['pt', 'pt-PT']];

async function loadSourceData() {
  const source = await fs.readFile(sourceFile, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, { module, exports: module.exports }, { filename: sourceFile });
  return {
    details: module.exports.PILOT_SITE_DETAILS,
    conclusions: module.exports.CROSS_SITE_CONCLUSIONS,
  };
}

function collectEntries(data) {
  const entries = [];
  const add = (pathParts, value) => {
    if (typeof value === 'string' && value.trim()) entries.push({ path: pathParts, text: value });
  };

  for (const [slug, site] of Object.entries(data.details)) {
    add(['details', slug, 'theme'], site.theme);
    add(['details', slug, 'deliverable'], site.deliverable);
    add(['details', slug, 'expectedResult'], site.expectedResult);
    site.sections.forEach((section, sectionIndex) => {
      add(['details', slug, 'sections', sectionIndex, 'title'], section.title);
      section.paragraphs?.forEach((value, index) => add(['details', slug, 'sections', sectionIndex, 'paragraphs', index], value));
      section.bullets?.forEach((value, index) => add(['details', slug, 'sections', sectionIndex, 'bullets', index], value));
    });
    site.participationInsights.forEach((insight, index) => {
      add(['details', slug, 'participationInsights', index, 'title'], insight.title);
      add(['details', slug, 'participationInsights', index, 'text'], insight.text);
    });
    site.priorityGroups?.forEach((value, index) => add(['details', slug, 'priorityGroups', index], value));
    if (site.additionalNotes) {
      add(['details', slug, 'additionalNotes', 'title'], site.additionalNotes.title);
      site.additionalNotes.bullets.forEach((value, index) => add(['details', slug, 'additionalNotes', 'bullets', index], value));
    }
  }

  add(['conclusions', 'timingNote'], data.conclusions.timingNote);
  data.conclusions.bullets.forEach((value, index) => add(['conclusions', 'bullets', index], value));
  data.conclusions.perSiteStrategy.forEach((item, index) => add(['conclusions', 'perSiteStrategy', index, 'strategy'], item.strategy));
  return entries;
}

function setAtPath(target, pathParts, value) {
  let current = target;
  for (let index = 0; index < pathParts.length - 1; index += 1) current = current[pathParts[index]];
  current[pathParts.at(-1)] = value;
}

async function translate(text, target) {
  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', 'en');
  url.searchParams.set('tl', target);
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', text);
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const response = await fetch(url);
    if (response.ok) {
      const payload = await response.json();
      return payload[0].map((part) => part[0]).join('');
    }
    if (attempt === 4) throw new Error(`Translation request failed: ${response.status}`);
    await new Promise((resolve) => setTimeout(resolve, attempt * 500));
  }
  return text;
}

await fs.mkdir(outputDir, { recursive: true });
const source = await loadSourceData();
const entries = collectEntries(source);
await fs.writeFile(path.join(outputDir, 'pilotSites.en.json'), `${JSON.stringify(source, null, 2)}\n`);

for (const [locale, target] of targets) {
  const localized = structuredClone(source);
  process.stdout.write(`pilotSites.${locale}: translating ${entries.length} fields\n`);
  for (let index = 0; index < entries.length; index += 8) {
    const batch = entries.slice(index, index + 8);
    const values = await Promise.all(batch.map((entry) => translate(entry.text, target)));
    batch.forEach((entry, batchIndex) => setAtPath(localized, entry.path, values[batchIndex]));
    process.stdout.write(`pilotSites.${locale}: ${Math.min(index + 8, entries.length)}/${entries.length}\r`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  await fs.writeFile(path.join(outputDir, `pilotSites.${locale}.json`), `${JSON.stringify(localized, null, 2)}\n`);
  process.stdout.write('\n');
}
