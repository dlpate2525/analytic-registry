import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import os from 'node:os';

const here = path.dirname(fileURLToPath(import.meta.url));
const scratch = process.env.WORKBOOK_PREVIEW_DIR || path.resolve(here, '../../analytic-registry/.scratch/workbook');
const runtimeModules = process.env.ARTIFACT_TOOL_NODE_MODULES || path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const requireRuntime = createRequire(path.join(runtimeModules, 'runtime-resolver.cjs'));
const { Workbook, SpreadsheetFile, FileBlob } = await import(pathToFileURL(requireRuntime.resolve('@oai/artifact-tool')).href);
const contract = JSON.parse(await fs.readFile(path.join(here, 'contract.json'), 'utf8'));
const outputPath = path.join(here, 'analytic-registry-v1.2-extract.xlsx');
await fs.mkdir(scratch, { recursive: true });

async function renderTo(workbook, sheetName, range, filename) {
  const blob = await workbook.render({ sheetName, range, scale: 1, format: 'png' });
  await fs.writeFile(path.join(scratch, filename), new Uint8Array(await blob.arrayBuffer()));
}

if (process.argv.includes('--preview-existing')) {
  const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(outputPath));
  for (const [sheetName, range] of [['Alteryx_Output', 'A68:D77'], ['Alteryx_Output', 'E68:H77'], ['Object_Users', 'A1:J6']]) {
    await renderTo(workbook, sheetName, range, `before-${sheetName}-${range.split(':')[0]}.png`);
  }
  const inspect = await workbook.inspect({ kind: 'table', range: 'Alteryx_Output!A68:H77', include: 'values,formulas', tableMaxRows: 10, tableMaxCols: 8, maxChars: 12000 });
  await fs.writeFile(path.join(scratch, 'before-inspection.ndjson'), inspect.ndjson, 'utf8');
  console.log(JSON.stringify({ readOnlyPreviews: 3, directory: scratch }));
  process.exit(0);
}

if (process.argv.includes('--refresh-reference-text')) {
  const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(outputPath));
  const changes = [];
  let row = 6;
  for (const table of contract.tables) {
    for (const column of table.columns) {
      for (const platform of contract.platforms) {
        const rule = column.platforms[platform];
        const sheet = workbook.worksheets.getItem(`${platform}_Output`);
        const cells = [['D', rule.status], ['E', rule.source], ['F', rule.valueRule], ['G', rule.nullRule]];
        for (const [letter, value] of cells) {
          const address = `${letter}${row}`;
          const cell = sheet.getRange(address);
          if (cell.values[0][0] !== value) {
            changes.push({ sheet: sheet.name, address, before: cell.values[0][0], after: value });
            cell.values = [[value]];
          }
        }
      }
      row += 1;
    }
  }
  workbook.recalculate();
  const inspection = await workbook.inspect({ kind: 'table', range: 'Alteryx_Output!A68:H77', include: 'values,formulas', tableMaxRows: 10, tableMaxCols: 8, maxChars: 12000 });
  const errors = await workbook.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!', options: { useRegex: true, maxResults: 30 } });
  await fs.writeFile(path.join(scratch, 'inspection.ndjson'), `${inspection.ndjson}\n${errors.ndjson}`, 'utf8');
  await renderTo(workbook, 'Alteryx_Output', 'A68:D77', 'Alteryx_Output-fields.png');
  await renderTo(workbook, 'Alteryx_Output', 'E68:H77', 'Alteryx_Output-rules.png');
  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(outputPath);
  try { await fs.rename(`${outputPath}.inspect.ndjson`, path.join(scratch, 'export-inspection.ndjson')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  await fs.writeFile(path.join(scratch, 'reference-text-changes.json'), JSON.stringify(changes, null, 2));
  console.log(JSON.stringify({ saved: outputPath, changedReferenceCells: changes.length, directory: scratch }));
} else {

const workbook = Workbook.create();
const palette = { ink: '#292536', muted: '#686273', purple: '#6744C3', pale: '#F5F1FC', coral: '#E98173', white: '#FFFFFF' };
const plans = [];
const col = number => { let result = ''; for (let n = number; n > 0; n = Math.floor((n - 1) / 26)) result = String.fromCharCode(65 + (n - 1) % 26) + result; return result; };
const sourceUrl = (table, platform) => table.sheet === 'Directory_Users' ? contract.sources.Directory
  : ['Run_Context', 'Coverage'].includes(table.sheet) ? 'https://github.com/dlpate2525/analytic-registry/tree/main/platform-data-collection/v1.1-extract'
  : platform === 'PowerBI' ? 'https://github.com/dlpate2525/analytic-registry/blob/main/platform-data-collection/v1.1-extract/fabric-query-mapping.md'
  : contract.sources[platform];

function addSheet(name, title, subtitle, headers, rows, widths, tableName, options = {}) {
  const sheet = workbook.worksheets.add(name);
  const headerRow = options.input ? 1 : 5;
  const lastRow = headerRow + rows.length;
  const lastCol = col(headers.length);
  sheet.showGridLines = false;
  sheet.tabColor = options.input ? palette.purple : options.platform ? palette.coral : '#A998C6';
  sheet.getRange(`A1:${lastCol}${lastRow}`).format = {
    font: { name: 'Arial', size: 10, color: palette.ink }, fill: palette.white,
    verticalAlignment: 'top', wrapText: true,
  };
  widths.forEach((width, index) => { sheet.getRange(`${col(index + 1)}1:${col(index + 1)}${lastRow}`).format.columnWidthPx = width; });
  if (!options.input) {
    sheet.getRange('A1').values = [[title]];
    sheet.getRange(`A1:${lastCol}1`).format.wrapText = false;
    sheet.getRange('A1').format.font = { name: 'Arial', size: 16, bold: true, color: palette.ink };
    sheet.getRange(`A1:${lastCol}1`).format.rowHeightPx = 32;
    sheet.getRange('A2').values = [[subtitle]];
    sheet.getRange(`A2:${lastCol}2`).format.wrapText = false;
    sheet.getRange(`A2:${lastCol}2`).format.font = { name: 'Arial', size: 10, color: palette.muted };
    sheet.getRange(`A2:${lastCol}2`).format.rowHeightPx = 26;
    sheet.getRange(`A3:${lastCol}3`).format.borders = { bottom: { style: 'thin', color: palette.coral } };
    sheet.getRange(`A3:${lastCol}4`).format.rowHeightPx = 10;
  }
  sheet.getRange(`A${headerRow}:${lastCol}${lastRow}`).values = [headers, ...rows];
  const table = sheet.tables.add(`A${headerRow}:${lastCol}${lastRow}`, true, tableName);
  table.style = 'TableStyleLight1';
  table.showFilterButton = true;
  sheet.getRange(`A${headerRow}:${lastCol}${headerRow}`).format = {
    fill: palette.purple, font: { name: 'Arial', size: 10, bold: true, color: palette.white },
    wrapText: true, verticalAlignment: 'center', horizontalAlignment: 'center',
    rowHeightPx: options.input ? 48 : 34,
    borders: { insideVertical: { style: 'thin', color: palette.white } },
  };
  rows.forEach((row, index) => {
    const rowNumber = headerRow + index + 1;
    const lineCount = Math.max(1, ...row.map((value, field) => String(value ?? '').split('\n').reduce((sum, part) => sum + Math.max(1, Math.ceil(part.length / Math.max(12, Math.floor(widths[field] / 6.1)))), 0)));
    sheet.getRange(`A${rowNumber}:${lastCol}${rowNumber}`).format.rowHeightPx = options.input ? 28 : Math.max(44, lineCount * 15 + 18);
    sheet.getRange(`A${rowNumber}:${lastCol}${rowNumber}`).format.fill = index % 2 ? palette.pale : palette.white;
  });
  if (options.input) {
    sheet.getRange(`A2:${lastCol}${lastRow}`).setNumberFormat('@');
    options.columns.forEach((column, index) => {
      if (/^int|^bigint|^bit/.test(column.type)) sheet.getRange(`${col(index + 1)}2:${col(index + 1)}${lastRow}`).setNumberFormat('0');
    });
  }
  sheet.freezePanes.freezeRows(headerRow);
  if (!options.input && name !== 'Guide') sheet.freezePanes.freezeColumns(2);
  plans.push({ name, tableName, range: `A${headerRow}:${lastCol}${lastRow}`, lastRow, lastCol, input: Boolean(options.input), platform: Boolean(options.platform), rowCount: rows.length });
}

const guideRows = [
  ['Purpose', 'Supply platform observations for manual SQL Server staging and registry review. Workbook revision 1.2 uses extract schema 1.1.', '11 input tables; unchanged headers'],
  ['Use the workbook', 'Fill the purple input tables. Replace the five blank template rows or add rows inside each named table. Coral tabs explain platform mappings.', 'Column_Dictionary defines each field once.'],
  ['1. Receive', 'Retain the original files, RunKey, source scope, evidence time, and mapping revision. Reuse RunKey only for identical input.', 'Run_Context and source files'],
  ['2. Validate', 'Check headers, keys, types, duplicates, coverage, and counts. Structural errors block the whole delivery. Keep invalid rows for correction.', 'SQL staging and validation scripts'],
  ['3. Match', 'Resolve stable native identities. Match normalized SourceEmail to exactly one accepted directory Mail record within its tenant. Do not use UPN as a fallback.', 'Platform_Users and Directory_Users'],
  ['4. Compare', 'Compare observations without overwriting approved business declarations. Partial absence does not prove deletion. Preserve earlier evidence with its original date.', 'Monthly reconciliation guide'],
  ['5. Accept', 'The registry operator accepts structurally valid evidence, including Partial coverage. Assign unresolved references and disabled-account accountability review to Platform Manager.', 'Manual acceptance; no source loader is connected to the local app.'],
  ['Coverage', 'Declare all nine datasets. Complete and Partial require exact delivered row counts, including zero. Failed and NotCollected require blank counts and no rows.', 'Coverage; a count alone does not prove complete scope.'],
  ['Blank values', 'Leave unknown values blank. Never type NULL. Preserve explicit zero and false. Use no placeholder records for uncollected datasets.', 'Platform reference tabs define field-specific rules.'],
  ['Native identity', 'Keep native IDs as text with platform, instance, and scope. Asset identity also uses native type. Names, email, RunKey, and membership do not identify enduring objects.', 'RunKey identifies one immutable delivery.'],
  ['Workspace subtype', 'Retain the observed workspace subtype. A Workspace/PersonalGroup change does not create another durable workspace identity.', 'Workspaces.NativeWorkspaceType'],
  ['People and account state', 'Keep raw source references and resolved account IDs separate. Directory AccountEnabled distinguishes enabled, disabled, and unknown. Unresolved does not mean disabled.', 'Directory evidence has its own delivery and observation time.'],
  ['Business authority', 'Workspace Owner, equal Champions, accountable workspace, purpose, audience, PII, EUCT, and DMP tier come from approved business workflows.', 'Observed technical ownership, revisions, and membership do not replace business declarations.'],
  ['Connection evidence', 'Keep technology, extract state, endpoint, and authentication as separate facts. Current queries establish only Unknown credential classification. Row evidence differs from dataset coverage.', 'Keep endpoint details on each connection. Shared DataSource matching remains deferred.'],
  ['Implementation boundary', 'Prepare source files with the existing queries. The local app does not load SQL staging. An implementation receipt does not replace source evidence.', 'Installed-source and SQL Server execution remain unverified.'],
  ['Query guides', 'Use the read-only Tableau repository queries, Alteryx SQL export queries, or landed Fabric inventory query. Verify the installed mapping before live delivery.', '../v1.1-extract/source-query-design.md'],
  ['Delivery procedure', 'Use the existing staging, validation, and reconciliation guidance. The workbook revision changes reference layout, not the input schema.', '../v1.1-extract/README.md\n../v1.1-extract/monthly-reconciliation.md'],
  ['Historical migration', 'Use the retained V1.0-to-V1.1 map only when migrating older deliveries. The recurring workbook no longer repeats its 117 historical field rows.', '../v1.1-extract/migration-map.json'],
];
addSheet('Guide', 'Analytic Registry workbook V1.2', 'Manual platform evidence handoff. Compatible input schema 1.1.', ['Topic', 'Instruction', 'Reference'], guideRows, [180, 670, 450], 'Ref_Guide');

const dictionaryRows = contract.tables.flatMap(table => table.columns.map(column => [table.sheet, column.name, column.type, column.required, column.purpose]));
const csvField = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
await fs.writeFile(path.join(here, 'column-dictionary.csv'), [['Table', 'Column', 'SQL type', 'Required', 'Purpose'], ...dictionaryRows].map(row => row.map(csvField).join(',')).join('\r\n') + '\r\n', 'utf8');
addSheet('Column_Dictionary', 'Column dictionary', '72 common field definitions. Required applies to emitted rows; platform tabs define collection scope and blank handling.', ['Table', 'Column', 'SQL type', 'Required', 'Purpose'], dictionaryRows, [175, 245, 170, 90, 650], 'Ref_Column_Dictionary');

for (const table of contract.tables) {
  addSheet(table.sheet, '', '', table.columns.map(column => column.name), Array.from({ length: 5 }, () => table.columns.map(() => null)), table.columns.map(column => Math.min(310, Math.max(175, column.name.length * 8.5 + 25))), table.excelTable, { input: true, columns: table.columns });
}
for (const platform of ['Tableau', 'PowerBI', 'Alteryx']) {
  const rows = contract.tables.flatMap(table => table.columns.map(column => {
    const rule = column.platforms[platform];
    return [table.sheet, column.name, column.type, rule.status, rule.source, rule.valueRule, rule.nullRule, sourceUrl(table, platform)];
  }));
  addSheet(`${platform}_Output`, `${platform === 'PowerBI' ? 'Power BI / Fabric' : platform} output mapping`, 'Reference only. Filter Table for source fields, applicability, value rules, and blank handling.', ['Table', 'Output column', 'SQL type', 'Collection rule', 'Source', 'Value rule', 'Null rule', 'Reference'], rows, [175, 240, 170, 135, 460, 580, 460, 420], `Ref_${platform}_Output`, { platform: true });
}

workbook.recalculate();
const inspect = await workbook.inspect({ kind: 'table', range: 'Object_Users!A1:J6', include: 'values,formulas', tableMaxRows: 6, tableMaxCols: 10, maxChars: 4000 });
const errors = await workbook.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!', options: { useRegex: true, maxResults: 30 }, summary: 'Final formula error scan' });
await fs.writeFile(path.join(scratch, 'inspection.ndjson'), `${inspect.ndjson}\n${errors.ndjson}`, 'utf8');

for (const plan of plans) {
  const end = plan.input ? 6 : plan.name === 'Guide' ? 12 : 10;
  await renderTo(workbook, plan.name, `A1:${plan.platform ? 'D' : plan.lastCol}${end}`, `${plan.name}.png`);
  console.log(`Rendered ${plan.name}`);
}
await renderTo(workbook, 'Guide', 'A13:C23', 'Guide-details.png');
for (const platform of ['Tableau', 'PowerBI', 'Alteryx']) {
  await renderTo(workbook, `${platform}_Output`, 'E5:H10', `${platform}_rules.png`);
}
for (const [label, start, end] of [['workspace-subtype', 18, 23], ['connection-evidence', 34, 43], ['object-users', 68, 77]]) {
  await renderTo(workbook, 'Column_Dictionary', `A${start}:E${end}`, `Dictionary-${label}.png`);
}
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
try { await fs.rename(`${outputPath}.inspect.ndjson`, path.join(scratch, 'export-inspection.ndjson')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
await fs.writeFile(path.join(scratch, 'build-summary.json'), JSON.stringify({ workbookRevision: '1.2', inputSchemaVersion: contract.version, outputPath, sheetCount: plans.length, inputTables: contract.tables.length, inputColumns: contract.tables.reduce((total, table) => total + table.columns.length, 0), dictionaryRows: dictionaryRows.length, platformRows: 72, plans }, null, 2));
console.log(JSON.stringify({ saved: outputPath, sheets: plans.length, inputColumns: 72, dictionaryRows: dictionaryRows.length }));
}
