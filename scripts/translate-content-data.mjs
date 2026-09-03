import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/(.:)/, '$1'));
const outputDir = path.join(root, 'src', 'app', 'data', 'localized');
const targets = [['el', 'el'], ['fi', 'fi'], ['pl', 'pl'], ['pt', 'pt-PT']];

const datasets = [
  {
    name: 'glossary',
    file: 'glossarySource.json',
    fields: ['term', 'definition', 'definitionOwner', 'category', 'tags.*', 'relevance', 'sourceSheet'],
  },
  {
    name: 'analogueTools',
    file: 'analogueToolsSource.json',
    fields: [
      'name', 'status', 'shortDesc', 'purpose', 'objectiveTags.*', 'mode', 'groupSize',
      'facilitatorRatio', 'suppliesRequired', 'expectedOutputs.*', 'accessibilityNotes',
      'usageTip', 'proTip', 'howTo', 'budgetAdaptation', 'examples', 'requirements',
    ],
  },
];

function walkField(item, field) {
  const [name, marker] = field.split('.');
  const value = item[name];
  if (marker === '*' && Array.isArray(value)) return value.map((text, index) => ({ path: [name, index], text }));
  return typeof value === 'string' && value.trim() ? [{ path: [name], text: value }] : [];
}

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function unescapeHtml(value) {
  return value.replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
}

function groupsBySize(items) {
  return items.map((item) => [item]);
}

async function translateGroup(group, target) {
  const html = group.map((entry, index) => `<p id="spice-${index}">${escapeHtml(entry.text)}</p>`).join('');
  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', 'en');
  url.searchParams.set('tl', target);
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', html);
  let response;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    response = await fetch(url);
    if (response.ok) break;
    if (attempt === 4) throw new Error(`Translation request failed: ${response.status}`);
    await new Promise((resolve) => setTimeout(resolve, attempt * 500));
  }
  const payload = await response.json();
  const translatedHtml = payload[0].map((part) => part[0]).join('');
  return group.map((entry, index) => {
    const match = translatedHtml.match(new RegExp(`<p id=["']spice-${index}["']>([\\s\\S]*?)<\\/p>`));
    if (!match && group.length !== 1) throw new Error(`Unable to parse translated content for ${entry.key}`);
    const value = match ? match[1] : translatedHtml.replace(/<[^>]+>/g, '');
    return { ...entry, text: unescapeHtml(value.trim()) };
  });
}

await fs.mkdir(outputDir, { recursive: true });
for (const dataset of datasets) {
  const source = JSON.parse(await fs.readFile(path.join(root, 'src', 'app', 'data', dataset.file), 'utf8'));
  await fs.writeFile(path.join(outputDir, `${dataset.name}.en.json`), `${JSON.stringify(source, null, 2)}\n`);
  const entries = source.flatMap((item, itemIndex) => dataset.fields.flatMap((field) => (
    walkField(item, field).map(({ path: fieldPath, text }) => ({ key: `${itemIndex}.${fieldPath.join('.')}`, itemIndex, fieldPath, text }))
  )));
  const groups = groupsBySize(entries);
  for (const [locale, target] of targets) {
    const outputFile = path.join(outputDir, `${dataset.name}.${locale}.json`);
    try {
      const completed = JSON.parse(await fs.readFile(outputFile, 'utf8'));
      if (Array.isArray(completed) && completed.length === source.length) {
        process.stdout.write(`${dataset.name}.${locale}: already complete\n`);
        continue;
      }
    } catch {
      // Missing or incomplete output is generated below.
    }
    const localized = structuredClone(source);
    process.stdout.write(`${dataset.name}.${locale}: ${groups.length} batches\n`);
    for (let index = 0; index < groups.length; index += 10) {
      const translated = await Promise.all(groups.slice(index, index + 10).map((group) => translateGroup(group, target)));
      for (const entry of translated.flat()) {
        const item = localized[entry.itemIndex];
        if (entry.fieldPath.length === 1) item[entry.fieldPath[0]] = entry.text;
        else item[entry.fieldPath[0]][entry.fieldPath[1]] = entry.text;
      }
      process.stdout.write(`${dataset.name}.${locale}: ${Math.min(index + 10, groups.length)}/${groups.length}\r`);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    for (const item of localized) if ('language' in item) item.language = locale;
    await fs.writeFile(outputFile, `${JSON.stringify(localized, null, 2)}\n`);
    process.stdout.write('\n');
  }
}
