/** Static handoff checks. These do not execute T-SQL or certify an export. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const base = new URL('../', import.meta.url);
const sql = await readFile(new URL('queries/alteryx-sqlserver.sql', base), 'utf8');
const preflight = await readFile(new URL('queries/alteryx-sqlserver-preflight.sql', base), 'utf8');
const contract = JSON.parse(await readFile(new URL('contract.json', base), 'utf8'));
let checks = 0;
function check(name, f) { f(); checks++; }

// Tokenize enough T-SQL to inspect projection boundaries, ignoring comments,
// escaped string literals and nested expressions. This is not a SQL parser.
function tokens(input) {
  const out = [];
  const re = /\s+|--[^\r\n]*|\/\*[\s\S]*?\*\/|N?'(?:''|[^'])*'|\[(?:\]\]|[^\]])*\]|[A-Za-z_@#][A-Za-z_0-9@#]*|[^\s]/gy;
  let hit;
  while ((hit = re.exec(input))) {
    const text = hit[0];
    if (/^\s|^--|^\/\*/.test(text)) continue;
    out.push(/^N?'/.test(text) ? '<literal>' : text);
  }
  return out;
}
function columns(input) {
  const ts = tokens(input); let depth = 0; let begin = -1; let end = -1;
  for (let i = 0; i < ts.length; i++) {
    if (ts[i] === '(') depth++;
    else if (ts[i] === ')') depth--;
    else if (depth === 0 && ts[i].toUpperCase() === 'SELECT') begin = i + 1;
    else if (depth === 0 && begin >= 0 && ['FROM','WHERE',';'].includes(ts[i].toUpperCase())) { end = i; break; }
  }
  assert.ok(begin >= 0 && end >= begin, 'A top-level output SELECT must exist');
  const pieces = [[]]; depth = 0;
  for (const t of ts.slice(begin, end)) {
    if (t === '(') depth++;
    else if (t === ')') depth--;
    if (depth === 0 && t === ',') pieces.push([]);
    else pieces.at(-1).push(t);
  }
  return pieces.map(p => p.at(-1).replace(/^\[|\]$/g, ''));
}
const markers = [...sql.matchAll(/^-- Dataset: (\w+) \((\d+)\)/gm)];
check('11 table outputs, frozen contract width', () => {
  assert.equal(markers.length, 11);
  assert.equal(contract.tables.length, 11);
  assert.equal(contract.tables.reduce((n,t) => n+t.columns.length,0),72);
});
for (let i=0; i<markers.length; i++) {
  const m = markers[i];
  let end = markers[i+1]?.index ?? sql.indexOf('-- Supplemental diagnostic');
  const body = sql.slice(m.index,end);
  const expected = contract.tables[i];
  check(`${m[1]} ordered aliases match contract`, () => {
    assert.equal(m[1],expected.sheet);
    assert.equal(Number(m[2]),i+1);
    assert.deepEqual(columns(body), expected.columns.map(c=>c.name));
  });
}
const ts = tokens(sql);
check('No source-mutating SQL', () => {
  for (const forbidden of ['INSERT','UPDATE','DELETE','MERGE','TRUNCATE','DROP','CREATE','ALTER','EXEC','EXECUTE'])
    assert.ok(!ts.some(t=>t.toUpperCase()===forbidden), `Forbidden SQL token: ${forbidden}`);
});
check('No hidden output ahead of workbook tables', () => {
  const before = tokens(sql.slice(0,markers[0].index)); let depth=0;
  for (const t of before) {
    if(t==='(') depth++;
    else if(t===')') depth--;
    else if(t.toUpperCase()==='SELECT') assert.ok(depth>0,'Unexpected diagnostic result set before workbook');
  }
});
check('No API or live Mongo client in executable tokens', () => {
  assert.ok(!/https?:\/\/|mongosh|mongoexport|Invoke-RestMethod/i.test(ts.join(' ')));
});
check('Native ID namespaces are retained', () => {
  assert.match(sql,/CAST\(a\.AppInfoId AS nvarchar\(200\)\) AS NativeAssetID/);
  assert.match(sql,/CAST\(CollectionId AS nvarchar\(200\)\) AS NativeWorkspaceID/);
  assert.match(sql,/AlteryxMongoUserID/);
  assert.ok(!ts.some(t=>t.toUpperCase()==='NEWID'));
});
check('No fabricated complete coverage', () => {
  const coverage = sql.slice(markers[1].index,markers[2].index);
  assert.ok(!/N'Complete'/.test(coverage));
  assert.equal((coverage.match(/N'Partial'/g)||[]).length,5);
  assert.equal((coverage.match(/N'NotCollected'/g)||[]).length,4);
});
check('False, unknown and missing ownership stay distinct', () => {
  assert.match(sql,/CASE WHEN Active=1 THEN N'true' WHEN Active=0 THEN N'false' END/);
  assert.match(sql,/N'Workflow',AppInfoId,N'CreatedBy'/);
  assert.match(sql,/N'Workflow',AppInfoId,N'TechnicalOwner',CAST\(NULL/);
  assert.match(sql,/N'UnverifiedMapping'/);
});
check('Source guards and preflight exist', () => {
  assert.ok((sql.match(/THROW 510\d\d/g)||[]).length>=20);
  assert.match(sql,/COALESCE\(@ImmutableSnapshotVerified,0\) <> 1/);
  assert.match(sql,/p\.type=3 AND p\.value=N'true'/);
  assert.match(sql,/n\.PublishedCount<>1/);
  assert.match(sql,/n\.PrimaryCount<>1/);
  assert.match(sql,/Latin1_General_100_BIN2/);
  assert.match(preflight,/sys\.columns/);
  assert.match(preflight,/CompatibilityLevel/);
});
check('Manifest guards run before narrowing conversions', () => {
  for (const name of ['RunKey','PlatformInstanceKey','NativeScopeKey','ObservedAt','DirectoryTenantKey','ScopeDescription'])
    assert.match(sql,new RegExp(`DECLARE @Raw${name} nvarchar\\(max\\)`));
  const guard = sql.indexOf('DATALENGTH(@RawRunKey)<>72');
  const converted = sql.indexOf('DECLARE @RunKey uniqueidentifier = CONVERT');
  assert.ok(guard>0 && guard<converted);
  assert.match(sql,/DATALENGTH\(@RawPlatformInstanceKey\) NOT BETWEEN 2 AND 400/);
  assert.match(sql,/DATALENGTH\(@RawNativeScopeKey\) NOT BETWEEN 2 AND 400/);
  assert.match(sql,/DATALENGTH\(@RawScopeDescription\)>2000/);
  assert.match(sql,/RIGHT\(@RawObservedAt,6\).*NOT LIKE N'\[\+-\]\[0-9\]\[0-9\]:\[0-9\]\[0-9\]'/);
  assert.match(sql,/@GallerySchemaVersion IS NULL/);
  assert.match(sql,/@ServiceSchemaVersion IS NULL/);
  assert.match(sql,/@SourceProductVersion IS NULL/);
});
console.log(`Alteryx SQL Server handoff: ${checks} static checks passed. SQL Server execution remains unverified.`);
