/* global console */
import { pathToFileURL } from "node:url";

const artifactModule = await import(
  pathToFileURL(
    "C:/Users/Petros Kafkias/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs",
  ).href
);

const { FileBlob, SpreadsheetFile } = artifactModule;

const sources = [
  "C:/Users/Petros Kafkias/Downloads/Glossary.xlsx",
  "C:/Users/Petros Kafkias/Downloads/Participatory tools and methods.xlsx",
];

for (const source of sources) {
  const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(source));
  const summary = [];

  for (const sheet of workbook.worksheets.items) {
    const used = sheet.getUsedRange(true);
    const values = used?.values ?? [];
    summary.push({
      sheet: sheet.name,
      rows: values.length,
      columns: values.reduce((max, row) => Math.max(max, row.length), 0),
      preview: values.slice(0, 8).map((row) => row.slice(0, 18)),
    });
  }

  console.log(JSON.stringify({ source, sheets: summary }, null, 2));
}
