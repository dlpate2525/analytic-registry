// Static handoff checks only. These do not execute T-SQL or DAX in Fabric.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const contract = JSON.parse(fs.readFileSync(path.join(here, '..', 'contract.json'), 'utf8'));
const sql = fs.readFileSync(path.join(here, 'fabric-inventory.sql'), 'utf8');
const dax = fs.readFileSync(path.join(here, 'fabric-model-discovery.dax'), 'utf8');
let checks = 0;
const check = (name, body) => { body(); checks++; console.log(`PASS ${name}`); };
for (const table of contract.tables) {
  check(`Fabric ${table.sheet} output headers match workbook order`, () => {
    const start = sql.indexOf(`-- ${table.sheet}`);
    assert(start !== -1, `Missing output ${table.sheet}`);
    const selectStart = sql.indexOf('SELECT ', start);
    const end = sql.indexOf(';', selectStart);
    const block = sql.slice(selectStart, end);
    const aliases = [...block.matchAll(/\bAS\s+([A-Z][A-Za-z_]+)\b/g)].map(m => m[1]);
    assert.deepEqual(aliases.slice(0, table.columns.length), table.columns.map(c => c.name));
  });
}
check('Fabric output does not introduce a second Power BI key namespace', () => {
  assert.match(sql, /'PowerBI' AS PlatformCode/);
  assert.match(sql, /THEN 'Dataset' ELSE 'Report' END AS NativeAssetType/);
  assert.match(sql, /'ContainedIn' AS NativeAssociationType/);
});
check('Fabric query has no collection call or persistent mutation', () => {
  const statements = sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '').replace(/'(?:''|[^'])*'/g, "''");
  assert.doesNotMatch(statements, /\b(?:INSERT|UPDATE|DELETE|MERGE|CREATE|ALTER|DROP|TRUNCATE|EXEC|OPENROWSET)\b/i);
  assert.doesNotMatch(statements, /\bSELECT\b[^;]*\bINTO\b/i);
  assert.doesNotMatch(statements, /https?:\/\//i);
});
check('Fabric query distinguishes partial inventory and absent evidence', () => {
  const coverage = sql.slice(sql.indexOf('-- Coverage'), sql.indexOf('-- SUPPLEMENTAL'));
  const rows = [...coverage.matchAll(/SELECT @RunKey(?: AS RunKey)?,\s*'([^']+)'(?: AS DatasetCode)?,\s*'([^']+)'/g)];
  assert.equal(rows.length, 9);
  assert.equal(rows.filter(r => r[2] === 'Partial').length, 3);
  assert.equal(rows.filter(r => r[2] === 'NotCollected').length, 6);
  assert.equal([...coverage.matchAll(/'NotCollected',CAST\(NULL AS bigint\)/g)].length, 6);
  assert.deepEqual(rows.map(r => r[1]).sort(), contract.tables.map(t => t.sheet).filter(n => !['Run_Context','Coverage'].includes(n)).sort());
  assert.doesNotMatch(coverage, /'Complete'/);
});
check('Fabric discovery does not execute invented managed-model table names', () => {
  const executable = dax.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  assert.match(executable, /INFO\.VIEW\.COLUMNS\(\)/);
  assert.doesNotMatch(executable, /REPLACE_|sys\.(?:reports|workspaces)/i);
});
check('Fabric template does not quietly accept absent or duplicate inventory', () => {
  assert.match(sql, /No inventory rows for this RunKey/);
  assert.match(sql, /Duplicate asset native key/);
  assert.match(sql, /Conflicting workspace observations/);
  assert.match(sql, /Missing native identity or name/);
});
check('Fabric query rejects oversize native values before destination load', () => {
  assert.match(sql, /Source text exceeds registry limits/);
  assert.match(sql, /Manifest text exceeds the registry contract/);
  assert.match(sql, /DATALENGTH\(CAST\(ItemName AS nvarchar\(max\)\)\)>400/);
  assert.match(sql, /DATALENGTH\(CAST\(WorkspaceType AS nvarchar\(max\)\)\)>100/);
  assert.match(sql, /DECLARE @RunKey varchar\(max\)/);
  assert.match(sql, /DATALENGTH\(@RunKey\)<>36/);
  assert.match(sql, /DATALENGTH\(ItemId\)<>DATALENGTH\(LTRIM\(RTRIM\(ItemId\)\)\)/);
});
check('Fabric validates and exports within one explicit read transaction', () => {
  assert.match(sql, /BEGIN TRY\s+BEGIN TRANSACTION/);
  assert.match(sql, /COMMIT TRANSACTION;\s+END TRY\s+BEGIN CATCH/);
  assert.match(sql, /IF @@TRANCOUNT>0 ROLLBACK TRANSACTION/);
});
console.log(`${checks} Fabric handoff checks passed; live execution remains pending.`);
