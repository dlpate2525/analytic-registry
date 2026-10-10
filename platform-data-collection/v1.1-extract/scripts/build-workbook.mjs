import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

// Resolve only the supplied artifact-tool runtime through the workspace junction.
// Set ARTIFACT_MODULE_ROOT to a directory with a junction to the bundled node_modules.
const here = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(here, '..');
const workspace = path.resolve(here, '../../../..');
const requireRuntime = createRequire(path.join(process.env.ARTIFACT_MODULE_ROOT || path.join(workspace, 'work'), 'runtime-resolver.cjs'));
const { Workbook, SpreadsheetFile } = await import(pathToFileURL(requireRuntime.resolve('@oai/artifact-tool')).href);
const contract = JSON.parse(await fs.readFile(path.join(outputDir, 'contract.json'), 'utf8'));
const migration = JSON.parse(await fs.readFile(path.join(outputDir, 'migration-map.json'), 'utf8'));
const previewDir = path.join(workspace, 'work/v11-workbook-previews');
await fs.mkdir(previewDir, { recursive: true });

const wb = Workbook.create();
const color = { ink: '#292536', muted: '#686273', purple: '#6744C3', pale: '#F5F1FC', coral: '#E98173', line: '#E7E4ED', white: '#FFFFFF' };
const font = 'Arial'; // Verified in Windows Fonts. Excel falls back to Aptos if Arial is unavailable.
const plans = [];
const letter = number => { let text = ''; for (let n = number; n > 0; n = Math.floor((n - 1) / 26)) text = String.fromCharCode(65 + (n - 1) % 26) + text; return text; };
const sourceUrl = (table, platform) => table.sheet === 'Directory_Users' ? contract.sources.Directory : ['Run_Context', 'Coverage'].includes(table.sheet) ? 'https://github.com/dlpate2525/analytic-registry/tree/main/platform-data-collection/v1.1-extract' : platform === 'PowerBI' ? 'https://github.com/dlpate2525/analytic-registry/blob/main/platform-data-collection/v1.1-extract/fabric-query-mapping.md' : contract.sources[platform];

function tab(name, title, subtitle, headers, rows, widths, tableName, options = {}) {
  const sheet = wb.worksheets.add(name);
  const start = options.input ? 1 : 5;
  const end = start + rows.length;
  const last = letter(headers.length);
  sheet.showGridLines = false;
  sheet.tabColor = options.input ? color.purple : options.platform ? color.coral : '#A998C6';
  sheet.getRange(`A1:${last}${end}`).format = { font: { name: font, size: 10, color: color.ink }, fill: color.white, verticalAlignment: 'top', wrapText: true };
  widths.forEach((width, i) => { sheet.getRange(`${letter(i + 1)}1:${letter(i + 1)}${end}`).format.columnWidthPx = width; });
  if (!options.input) {
    sheet.getRange('A1').values = [[title]];
    sheet.getRange(`A1:${last}1`).format.wrapText = false;
    sheet.getRange('A1').format.font = { name: font, size: 18, bold: true, color: color.ink };
    sheet.getRange(`A1:${last}1`).format.rowHeightPx = 32;
    sheet.getRange('A2').values = [[subtitle]];
    sheet.getRange(`A2:${last}2`).format.wrapText = false;
    sheet.getRange(`A2:${last}2`).format.font = { name: font, size: 10, color: color.muted };
    sheet.getRange(`A2:${last}2`).format.rowHeightPx = 26;
    sheet.getRange(`A3:${last}3`).format.borders = { bottom: { style: 'thin', color: color.coral } };
    sheet.getRange(`A3:${last}4`).format.rowHeightPx = 10;
  }
  sheet.getRange(`A${start}:${last}${end}`).values = [headers, ...rows];
  const table = sheet.tables.add(`A${start}:${last}${end}`, true, tableName);
  table.style = 'TableStyleLight1';
  table.showFilterButton = true;
  sheet.getRange(`A${start}:${last}${start}`).format = { fill: color.purple, font: { name: font, size: 10, bold: true, color: color.white }, wrapText: true, verticalAlignment: 'center', rowHeightPx: options.input ? 48 : 34, borders: { insideVertical: { style: 'thin', color: '#FFFFFF' } } };
  for (let index = 0; index < rows.length; index++) {
    const rowNum = start + index + 1;
    const lines = Math.max(1, ...rows[index].map((value, col) => String(value ?? '').split('\n').reduce((n, part) => n + Math.max(1, Math.ceil(part.length / Math.max(12, Math.floor(widths[col] / 6.3)))), 0)));
    sheet.getRange(`A${rowNum}:${last}${rowNum}`).format.rowHeightPx = options.input ? 28 : Math.max(44, Math.min(240, lines * 15 + 18));
    sheet.getRange(`A${rowNum}:${last}${rowNum}`).format.fill = index % 2 ? color.pale : color.white;
  }
  if (options.input) {
    sheet.getRange(`A2:${last}${end}`).setNumberFormat('@');
    options.columns.forEach((column, index) => {
      if (/^int|^bigint|^bit/.test(column.type)) sheet.getRange(`${letter(index + 1)}2:${letter(index + 1)}${end}`).setNumberFormat('0');
    });
  }
  sheet.freezePanes.freezeRows(start);
  if (!options.input && name !== 'Guide') sheet.freezePanes.freezeColumns(2);
  plans.push({ name, tableName, range: `A${start}:${last}${end}`, previewRange: `A1:${last}${Math.min(end, options.input ? 6 : 9)}` });
  return sheet;
}

const guideRows = [
  ['Purpose', 'Provide one monthly platform extract for Registry review and manual SQL Server loading.', 'V1.1 minimum contract', ''],
  ['Workbook structure', 'Use the 11 purple input tabs. Their named tables contain five blank template rows. Coral tabs document platform output mappings.', '11 inputs; 3 guides; 3 platform references', ''],
  ['1. Prepare context', 'Create one Run_Context row for each delivery. Keep its source instance, scope, observation time, directory tenant, mapping version, and scope description.', 'Run_Context', ''],
  ['2. Declare coverage', 'Provide one Coverage row for each dataset in the agreed scope. Distinguish Complete, Partial, NotCollected, and Failed. Empty input does not prove absence.', 'Coverage', ''],
  ['3. Fill input tables', 'Use exact headers and named tables. Keep native identifiers as text. Replace blank template rows or add rows inside the named Excel table.', 'All input tables', ''],
  ['4. Validate and load', 'Ignore only fully blank template rows. Quarantine invalid nonblank rows. Validate keys, references, and coverage before manual SQL Server staging.', 'Platform Manager', ''],
  ['Run identity', 'RunKey identifies an immutable delivery. Preserve the same UUID only for retries of identical input. It does not replace enduring native object IDs.', 'Run_Context and every dataset', ''],
  ['Refresh identity', 'Resolve native objects within PlatformCode, PlatformInstanceKey, NativeScopeKey, native object type, and native ID. Names remain display fields.', 'Registry reconciliation', ''],
  ['Blank values', 'Leave unknown values blank. Never type the text NULL. Follow each platform null rule. Never create placeholder records for an uncollected dataset.', 'Column_Dictionary and platform tabs', ''],
  ['Directory resolution', 'Match exact normalized platform email to directory Mail within the configured tenant. Do not fall back to UPN. Missing or ambiguous matches go to Platform Manager.', 'Platform_Users and Directory_Users', contract.sources.Directory],
  ['Account state', 'AccountEnabled reports directory account state. False means resolved-disabled. Blank means unknown. It does not establish employment status.', 'Directory_Users', contract.sources.Directory],
  ['Ownership evidence', 'Keep technical ownership, original authorship, modification, membership, and access as separate role edges. Business ownership remains an app declaration.', 'Object_Users', ''],
  ['App-owned records', 'This workbook is an observation contract. Requests, declarations, approvals, findings, and evidence remain app-owned records in the target SQL Server model.', 'Application data model', ''],
  ['Source validation', 'Validate the query profile against the installed product version before the first live delivery. The workbook contains no source records or fabricated example data.', 'Platform Manager', ''],
  ['Tableau reference', 'Use the repository mapping in Tableau_Output. Run tableau-postgresql-selects.sql. Verify installed PostgreSQL columns and joins.', 'Tableau 2026.2', contract.sources.Tableau],
  ['Power BI reference', 'Use fabric-inventory.sql for landed Fabric inventory. PowerBI_Output distinguishes its coverage from the richer, existing JSON-export alternative. See fabric-query-mapping.md.', 'Power BI / Fabric', 'https://github.com/dlpate2525/analytic-registry/blob/main/platform-data-collection/v1.1-extract/fabric-query-mapping.md'],
  ['Alteryx reference', 'Run alteryx-sqlserver.sql against SQL Server copies through the documented adapter views. Alteryx_Output uses the linked 2025.1 fields; validate them against your 2025.2 export.', 'Alteryx 2025.2 SQL export', 'https://github.com/dlpate2525/analytic-registry/blob/main/platform-data-collection/v1.1-extract/alteryx-sqlserver-mapping.md'],
  ['Migration', 'Migration_Map explains all 117 previous dataset fields. Review every field disposition and validate before combining deliveries.', 'V1.0 to V1.1', ''],
];
tab('Guide', 'Analytic Registry extract V1.1', 'Monthly platform handoff. SQL Server remains the operational target.', ['Topic', 'Instruction', 'Applies to', 'Reference'], guideRows, [180, 630, 300, 460], 'Ref_Guide');

const dictionaryRows = contract.tables.flatMap(table => table.columns.flatMap(column => contract.platforms.map(platform => {
  const rule = column.platforms[platform];
  return [table.sheet, column.name, column.type, column.required, column.purpose, platform, rule.status, rule.source, rule.valueRule, rule.nullRule, sourceUrl(table, platform)];
})));
tab('Column_Dictionary', 'Column dictionary', 'Filter by table, column, or platform. Required applies to emitted rows; platform rules define collection scope.', ['Table', 'Column', 'SQL type', 'Required', 'Purpose', 'Platform', 'Collection rule', 'Source', 'Value rule', 'Null rule', 'Reference'], dictionaryRows, [170, 240, 170, 90, 450, 105, 130, 410, 530, 430, 420], 'Ref_Column_Dictionary');
tab('Migration_Map', 'V1.0 to V1.1 mapping', 'All 117 previous dataset columns retain an explicit disposition.', ['Table', 'Previous column', 'Action', 'V1.1 target', 'Reason'], migration.map(row => [row.Table, row.Column, row.Action, row.Target, row.Reason]), [175, 240, 185, 400, 690], 'Ref_Migration_Map');

for (const table of contract.tables) {
  tab(table.sheet, '', '', table.columns.map(column => column.name), Array.from({ length: 5 }, () => table.columns.map(() => null)), table.columns.map(column => Math.min(310, Math.max(175, column.name.length * 8.5 + 25))), table.excelTable, { input: true, columns: table.columns });
}
for (const platform of ['Tableau', 'PowerBI', 'Alteryx']) {
  const rows = contract.tables.flatMap(table => table.columns.map(column => {
    const rule = column.platforms[platform];
    return [table.sheet, column.name, column.type, rule.status, rule.source, rule.valueRule, rule.nullRule, sourceUrl(table, platform)];
  }));
  tab(`${platform}_Output`, `${platform === 'PowerBI' ? 'Power BI / Fabric' : platform} output mapping`, 'Reference only. Filter Table to see the required output columns, source fields, value rules, and null handling.', ['Table', 'Output column', 'SQL type', 'Collection rule', 'Source', 'Value rule', 'Null rule', 'Reference'], rows, [175, 240, 170, 135, 460, 580, 460, 420], `Ref_${platform}_Output`, { platform: true });
}

wb.recalculate();
const inspection = await wb.inspect({ kind: 'table', range: 'Object_Users!A1:J6', include: 'values,formulas', tableMaxRows: 6, tableMaxCols: 10, maxChars: 3000 });
const errors = await wb.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!', options: { useRegex: true, maxResults: 30 }, summary: 'Formula error scan' });
await fs.writeFile(path.join(previewDir, 'inspection.ndjson'), inspection.ndjson + '\n' + errors.ndjson, 'utf8');
for (const plan of plans.filter(plan => ['Guide','Column_Dictionary','Alteryx_Output','PowerBI_Output'].includes(plan.name))) {
  const preview = await wb.render({ sheetName: plan.name, range: plan.previewRange, scale: 1, format: 'png' });
  await fs.writeFile(path.join(previewDir, `${plan.name}.png`), new Uint8Array(await preview.arrayBuffer()));
  console.log(`Rendered ${plan.name}`);
}
const rolePreview = await wb.render({ sheetName: 'Alteryx_Output', range: 'A68:H77', scale: 1, format: 'png' });
await fs.writeFile(path.join(previewDir, 'Alteryx_Object_Users.png'), new Uint8Array(await rolePreview.arrayBuffer()));
const migrationPreview = await wb.render({ sheetName: 'Guide', range: 'A20:D23', scale: 1, format: 'png' });
await fs.writeFile(path.join(previewDir, 'Guide_Migration.png'), new Uint8Array(await migrationPreview.arrayBuffer()));
const fabricPreview = await wb.render({ sheetName: 'PowerBI_Output', range: 'A18:H33', scale: 1, format: 'png' });
await fs.writeFile(path.join(previewDir, 'Fabric_Profile.png'), new Uint8Array(await fabricPreview.arrayBuffer()));
const file = await SpreadsheetFile.exportXlsx(wb);
await file.save(path.join(outputDir, 'analytic-registry-v1.1-extract.xlsx'));
await fs.writeFile(path.join(previewDir, 'build-summary.json'), JSON.stringify({ workbook: 'analytic-registry-v1.1-extract.xlsx', inputTables: contract.tables.length, inputColumns: contract.tables.reduce((total, table) => total + table.columns.length, 0), sheets: plans, dictionaryRows: dictionaryRows.length, migrationRows: migration.length, platformReferenceRows: 72, font }, null, 2));
console.log(JSON.stringify({ saved: path.join(outputDir, 'analytic-registry-v1.1-extract.xlsx'), sheets: plans.length, inputColumns: 72, dictionaryRows: dictionaryRows.length, migrationRows: migration.length }));
